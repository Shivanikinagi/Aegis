"""
Blockchain interaction module for the Autonomous Treasury Agent.
Handles all on-chain communication with smart contracts.
"""

import json
import time
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from enum import IntEnum

from web3 import Web3
from web3.middleware import ExtraDataToPOAMiddleware
from eth_account import Account
import structlog

from config import blockchain_config

logger = structlog.get_logger()


class TaskType(IntEnum):
    """Task types matching the smart contract enum."""
    DATA_ANALYSIS = 0
    TEXT_GENERATION = 1
    CODE_REVIEW = 2
    RESEARCH = 3
    COMPUTATION = 4
    OTHER = 5


class TaskStatus(IntEnum):
    """Task status matching the smart contract enum."""
    CREATED = 0
    ASSIGNED = 1
    SUBMITTED = 2
    VERIFIED = 3
    COMPLETED = 4
    FAILED = 5
    CANCELLED = 6


@dataclass
class Task:
    """Task data structure."""
    id: int
    task_type: TaskType
    status: TaskStatus
    creator: str
    assigned_worker: str
    max_payment: int  # In wei
    actual_payment: int
    deadline: int  # Unix timestamp
    created_at: int
    completed_at: int
    description_hash: bytes
    result_hash: bytes
    verification_rule: str


@dataclass
class Worker:
    """Worker data structure."""
    address: str
    is_active: bool
    registered_at: int
    total_tasks: int
    successful_tasks: int
    total_earnings: int
    last_task_at: int
    reliability_score: int  # Basis points (10000 = 100%)
    allowed_task_types: List[int]


@dataclass
class TreasuryRules:
    """Treasury rules structure."""
    max_spend_per_task: int
    max_spend_per_day: int
    min_task_value: int
    cooldown_period: int


class BlockchainClient:
    """
    Client for interacting with the blockchain and smart contracts.
    """
    
    def __init__(self):
        self.w3 = Web3(Web3.HTTPProvider(blockchain_config.rpc_url))
        
        # Add POA middleware for Monad
        self.w3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)
        
        # Load account
        if blockchain_config.coordinator_private_key:
            self.account = Account.from_key(blockchain_config.coordinator_private_key)
            self.address = self.account.address
        else:
            self.account = None
            self.address = None
        
        # Load contract ABIs
        self.contracts_dir = Path(__file__).parent.parent / "contracts"
        self._load_contracts()
        
        logger.info("Blockchain client initialized",
                   rpc=blockchain_config.rpc_url,
                   chain_id=blockchain_config.chain_id,
                   coordinator=self.address[:10] + "..." if self.address else "Not set")
    
    def _load_contracts(self):
        """Load contract ABIs and create instances."""
        artifacts_dir = self.contracts_dir / "artifacts" / "src"
        
        # Treasury contract
        treasury_abi = self._load_abi(artifacts_dir / "Treasury.sol" / "Treasury.json")
        if blockchain_config.treasury_address and treasury_abi:
            self.treasury = self.w3.eth.contract(
                address=Web3.to_checksum_address(blockchain_config.treasury_address),
                abi=treasury_abi
            )
        else:
            self.treasury = None
        
        # TaskRegistry contract
        task_registry_abi = self._load_abi(artifacts_dir / "TaskRegistry.sol" / "TaskRegistry.json")
        if blockchain_config.task_registry_address and task_registry_abi:
            self.task_registry = self.w3.eth.contract(
                address=Web3.to_checksum_address(blockchain_config.task_registry_address),
                abi=task_registry_abi
            )
        else:
            self.task_registry = None
        
        # WorkerRegistry contract
        worker_registry_abi = self._load_abi(artifacts_dir / "WorkerRegistry.sol" / "WorkerRegistry.json")
        if blockchain_config.worker_registry_address and worker_registry_abi:
            self.worker_registry = self.w3.eth.contract(
                address=Web3.to_checksum_address(blockchain_config.worker_registry_address),
                abi=worker_registry_abi
            )
        else:
            self.worker_registry = None
    
    def _load_abi(self, path: Path) -> Optional[List]:
        """Load ABI from compiled contract JSON."""
        if not path.exists():
            logger.warning("Contract artifact not found", path=str(path))
            return None
        
        with open(path, "r") as f:
            data = json.load(f)
        return data.get("abi", [])
    
    def is_connected(self) -> bool:
        """Check if connected to the blockchain."""
        try:
            return self.w3.is_connected()
        except Exception:
            return False
    
    def get_chain_id(self) -> int:
        """Get the current chain ID."""
        return self.w3.eth.chain_id
    
    def get_block_number(self) -> int:
        """Get the current block number."""
        return self.w3.eth.block_number
    
    def get_coordinator_balance(self) -> float:
        """Get coordinator wallet balance in MON."""
        if not self.address:
            return 0.0
        balance_wei = self.w3.eth.get_balance(self.address)
        return float(self.w3.from_wei(balance_wei, "ether"))
    
    # ============ Treasury Functions ============
    
    def get_treasury_balance(self) -> Tuple[float, float, float]:
        """Get treasury balances (total, reserved, available) in MON."""
        if not self.treasury:
            return (0.0, 0.0, 0.0)
        
        total = self.w3.from_wei(self.treasury.functions.getBalance().call(), "ether")
        reserved = self.w3.from_wei(self.treasury.functions.getReservedBalance().call(), "ether")
        available = self.w3.from_wei(self.treasury.functions.getAvailableBalance().call(), "ether")
        
        return (float(total), float(reserved), float(available))
    
    def get_treasury_rules(self) -> Optional[TreasuryRules]:
        """Get treasury spending rules."""
        if not self.treasury:
            return None
        
        rules = self.treasury.functions.getRules().call()
        return TreasuryRules(
            max_spend_per_task=rules[0],
            max_spend_per_day=rules[1],
            min_task_value=rules[2],
            cooldown_period=rules[3]
        )
    
    def get_daily_spent(self) -> float:
        """Get amount spent today in MON."""
        if not self.treasury:
            return 0.0
        spent = self.treasury.functions.getDailySpent().call()
        return float(self.w3.from_wei(spent, "ether"))
    
    def get_remaining_daily_budget(self) -> float:
        """Get remaining daily budget in MON."""
        if not self.treasury:
            return 0.0
        remaining = self.treasury.functions.getRemainingDailyBudget().call()
        return float(self.w3.from_wei(remaining, "ether"))
    
    # ============ Task Functions ============
    
    def get_open_tasks(self) -> List[int]:
        """Get list of open task IDs."""
        if not self.task_registry:
            return []
        return self.task_registry.functions.getOpenTasks().call()
    
    def get_task(self, task_id: int) -> Optional[Task]:
        """Get task details by ID."""
        if not self.task_registry:
            return None
        
        task_data = self.task_registry.functions.getTask(task_id).call()
        
        return Task(
            id=task_data[0],
            task_type=TaskType(task_data[1]),
            status=TaskStatus(task_data[2]),
            creator=task_data[3],
            assigned_worker=task_data[4],
            max_payment=task_data[5],
            actual_payment=task_data[6],
            deadline=task_data[7],
            created_at=task_data[8],
            completed_at=task_data[9],
            description_hash=task_data[10],
            result_hash=task_data[11],
            verification_rule=task_data[12]
        )
    
    def get_task_count(self) -> int:
        """Get total number of tasks."""
        if not self.task_registry:
            return 0
        return self.task_registry.functions.getTaskCount().call()
    
    def propose_assignment(
        self,
        task_id: int,
        worker: str,
        payment: int  # In wei
    ) -> Tuple[bool, str]:
        """
        Propose a worker assignment for a task.
        Returns (success, tx_hash or error message).
        """
        if not self.task_registry or not self.account:
            return (False, "Contracts or account not configured")
        
        try:
            worker_checksum = Web3.to_checksum_address(worker)
            
            # Build transaction
            tx = self.task_registry.functions.proposeAssignment(
                task_id,
                worker_checksum,
                payment
            ).build_transaction({
                "from": self.address,
                "nonce": self.w3.eth.get_transaction_count(self.address),
                "gas": 500000,
                "gasPrice": self.w3.eth.gas_price
            })
            
            # Sign and send
            signed_tx = self.w3.eth.account.sign_transaction(tx, self.account.key)
            tx_hash = self.w3.eth.send_raw_transaction(signed_tx.raw_transaction)
            
            # Wait for receipt
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
            
            if receipt["status"] == 1:
                logger.info("Assignment proposed successfully",
                           task_id=task_id,
                           worker=worker[:10] + "...",
                           tx_hash=tx_hash.hex())
                return (True, tx_hash.hex())
            else:
                return (False, "Transaction failed")
                
        except Exception as e:
            logger.error("Failed to propose assignment",
                        task_id=task_id,
                        error=str(e))
            return (False, str(e))
    
    def verify_and_complete(self, task_id: int, success: bool) -> Tuple[bool, str]:
        """
        Verify a task result and complete/fail it.
        Returns (success, tx_hash or error message).
        """
        if not self.task_registry or not self.account:
            return (False, "Contracts or account not configured")
        
        try:
            tx = self.task_registry.functions.verifyAndComplete(
                task_id,
                success
            ).build_transaction({
                "from": self.address,
                "nonce": self.w3.eth.get_transaction_count(self.address),
                "gas": 300000,
                "gasPrice": self.w3.eth.gas_price
            })
            
            signed_tx = self.w3.eth.account.sign_transaction(tx, self.account.key)
            tx_hash = self.w3.eth.send_raw_transaction(signed_tx.raw_transaction)
            
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
            
            if receipt["status"] == 1:
                logger.info("Task verification complete",
                           task_id=task_id,
                           success=success,
                           tx_hash=tx_hash.hex())
                return (True, tx_hash.hex())
            else:
                return (False, "Transaction failed")
                
        except Exception as e:
            logger.error("Failed to verify task",
                        task_id=task_id,
                        error=str(e))
            return (False, str(e))
    
    # ============ Worker Functions ============
    
    def get_active_workers(self) -> List[str]:
        """Get list of all active worker addresses."""
        if not self.worker_registry:
            return []
        return self.worker_registry.functions.getAllActiveWorkers().call()
    
    def get_workers_for_task_type(self, task_type: int) -> List[str]:
        """Get workers that can handle a specific task type."""
        if not self.worker_registry:
            return []
        return self.worker_registry.functions.getWorkersByTaskType(task_type).call()
    
    def get_worker(self, address: str) -> Optional[Worker]:
        """Get worker details."""
        if not self.worker_registry:
            return None
        
        try:
            worker_data = self.worker_registry.functions.getWorker(
                Web3.to_checksum_address(address)
            ).call()
            
            return Worker(
                address=worker_data[0],
                is_active=worker_data[1],
                registered_at=worker_data[2],
                total_tasks=worker_data[3],
                successful_tasks=worker_data[4],
                total_earnings=worker_data[5],
                last_task_at=worker_data[6],
                reliability_score=worker_data[7],
                allowed_task_types=list(worker_data[8])
            )
        except Exception as e:
            logger.error("Failed to get worker", address=address, error=str(e))
            return None
    
    def get_worker_reliability(self, address: str) -> int:
        """Get worker reliability score (0-10000)."""
        if not self.worker_registry:
            return 0
        return self.worker_registry.functions.getWorkerReliability(
            Web3.to_checksum_address(address)
        ).call()
    
    def is_worker_allowed(self, address: str, task_type: int) -> bool:
        """Check if a worker can handle a task type."""
        if not self.worker_registry:
            return False
        return self.worker_registry.functions.isWorkerAllowed(
            Web3.to_checksum_address(address),
            task_type
        ).call()
    
    # ============ Event Listening ============
    
    def get_recent_events(self, event_name: str, from_block: int = None) -> List[Dict]:
        """Get recent events from the task registry."""
        if not self.task_registry:
            return []
        
        if from_block is None:
            from_block = max(0, self.get_block_number() - 1000)
        
        try:
            event = getattr(self.task_registry.events, event_name)
            events = event.get_logs(fromBlock=from_block)
            return [dict(e) for e in events]
        except Exception as e:
            logger.error("Failed to get events", event_name=event_name, error=str(e))
            return []
