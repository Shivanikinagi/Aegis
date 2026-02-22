"""
Monad Explorer Integration Module
Provides utilities for:
- Generating Monad testnet explorer links
- Verifying transactions on-chain
- Checking contract deployment status
- Querying block and transaction data
- Testing connectivity to Monad testnet
"""

import time
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
import structlog

try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False

from web3 import Web3
from web3.middleware import ExtraDataToPOAMiddleware

from config import blockchain_config

logger = structlog.get_logger()

# Monad Testnet Explorer URLs
MONAD_EXPLORER_BASE = blockchain_config.explorer_url or "https://testnet.monadvision.com"
MONAD_RPC_URL = blockchain_config.rpc_url or "https://testnet-rpc.monad.xyz"
MONAD_CHAIN_ID = blockchain_config.chain_id or 10143


@dataclass
class ExplorerLink:
    """Generated explorer link with metadata."""
    url: str
    link_type: str  # "tx", "address", "block", "token"
    identifier: str
    label: str


@dataclass
class TransactionVerification:
    """Result of verifying a transaction on-chain."""
    tx_hash: str
    exists: bool
    status: Optional[int]  # 1 = success, 0 = reverted
    block_number: Optional[int]
    gas_used: Optional[int]
    from_address: Optional[str]
    to_address: Optional[str]
    value_wei: Optional[int]
    timestamp: Optional[int]
    error: Optional[str]


@dataclass
class ContractVerification:
    """Result of verifying a contract deployment."""
    address: str
    is_deployed: bool
    code_size: int
    balance_wei: int
    explorer_url: str
    error: Optional[str]


class MonadExplorer:
    """
    Monad Testnet Explorer integration.
    Provides link generation, transaction verification, and chain queries.
    """

    def __init__(self, rpc_url: str = None, explorer_base: str = None):
        self.rpc_url = rpc_url or MONAD_RPC_URL
        self.explorer_base = explorer_base or MONAD_EXPLORER_BASE
        self.chain_id = MONAD_CHAIN_ID

        self.w3 = Web3(Web3.HTTPProvider(self.rpc_url))
        self.w3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)

        logger.info("MonadExplorer initialized",
                    rpc=self.rpc_url,
                    explorer=self.explorer_base)

    # ============ Connection Testing ============

    def test_connection(self) -> Dict:
        """Test connectivity to Monad testnet RPC."""
        result = {
            "rpc_url": self.rpc_url,
            "connected": False,
            "chain_id": None,
            "block_number": None,
            "peer_count": None,
            "latency_ms": None,
            "error": None
        }

        try:
            start = time.time()
            connected = self.w3.is_connected()
            latency = (time.time() - start) * 1000

            result["connected"] = connected
            result["latency_ms"] = round(latency, 2)

            if connected:
                result["chain_id"] = self.w3.eth.chain_id
                result["block_number"] = self.w3.eth.block_number
                try:
                    result["peer_count"] = self.w3.net.peer_count
                except Exception:
                    result["peer_count"] = "N/A"

                # Verify chain ID matches expected
                if result["chain_id"] != self.chain_id:
                    result["error"] = (
                        f"Chain ID mismatch: expected {self.chain_id}, "
                        f"got {result['chain_id']}"
                    )

        except Exception as e:
            result["error"] = str(e)

        logger.info("Connection test", **result)
        return result

    # ============ Explorer Link Generation ============

    def tx_link(self, tx_hash: str) -> ExplorerLink:
        """Generate explorer link for a transaction."""
        url = f"{self.explorer_base}/tx/{tx_hash}"
        return ExplorerLink(
            url=url, link_type="tx",
            identifier=tx_hash,
            label=f"TX {tx_hash[:10]}..."
        )

    def address_link(self, address: str) -> ExplorerLink:
        """Generate explorer link for an address."""
        url = f"{self.explorer_base}/address/{address}"
        return ExplorerLink(
            url=url, link_type="address",
            identifier=address,
            label=f"Address {address[:10]}..."
        )

    def block_link(self, block_number: int) -> ExplorerLink:
        """Generate explorer link for a block."""
        url = f"{self.explorer_base}/block/{block_number}"
        return ExplorerLink(
            url=url, link_type="block",
            identifier=str(block_number),
            label=f"Block #{block_number}"
        )

    def token_link(self, token_address: str) -> ExplorerLink:
        """Generate explorer link for a token contract."""
        url = f"{self.explorer_base}/token/{token_address}"
        return ExplorerLink(
            url=url, link_type="token",
            identifier=token_address,
            label=f"Token {token_address[:10]}..."
        )

    def generate_all_contract_links(self) -> Dict[str, ExplorerLink]:
        """Generate explorer links for all deployed contracts."""
        contracts = {
            "Treasury": blockchain_config.treasury_address,
            "TaskRegistry": blockchain_config.task_registry_address,
            "WorkerRegistry": blockchain_config.worker_registry_address,
        }

        links = {}
        for name, address in contracts.items():
            if address:
                links[name] = self.address_link(address)

        return links

    # ============ Transaction Verification ============

    def verify_transaction(self, tx_hash: str) -> TransactionVerification:
        """Verify a transaction exists and check its status."""
        try:
            receipt = self.w3.eth.get_transaction_receipt(tx_hash)
            tx = self.w3.eth.get_transaction(tx_hash)

            # Get block timestamp
            block = self.w3.eth.get_block(receipt["blockNumber"])
            timestamp = block.get("timestamp", None)

            return TransactionVerification(
                tx_hash=tx_hash,
                exists=True,
                status=receipt["status"],
                block_number=receipt["blockNumber"],
                gas_used=receipt["gasUsed"],
                from_address=receipt.get("from", tx.get("from")),
                to_address=receipt.get("to", tx.get("to")),
                value_wei=tx.get("value", 0),
                timestamp=timestamp,
                error=None
            )
        except Exception as e:
            return TransactionVerification(
                tx_hash=tx_hash,
                exists=False,
                status=None,
                block_number=None,
                gas_used=None,
                from_address=None,
                to_address=None,
                value_wei=None,
                timestamp=None,
                error=str(e)
            )

    def verify_contract(self, address: str) -> ContractVerification:
        """Verify a contract is deployed at the given address."""
        try:
            checksum = Web3.to_checksum_address(address)
            code = self.w3.eth.get_code(checksum)
            balance = self.w3.eth.get_balance(checksum)

            return ContractVerification(
                address=address,
                is_deployed=len(code) > 2,  # "0x" means no code
                code_size=len(code),
                balance_wei=balance,
                explorer_url=self.address_link(address).url,
                error=None
            )
        except Exception as e:
            return ContractVerification(
                address=address,
                is_deployed=False,
                code_size=0,
                balance_wei=0,
                explorer_url=self.address_link(address).url,
                error=str(e)
            )

    # ============ Chain Queries ============

    def get_block_info(self, block_number: int = None) -> Dict:
        """Get information about a block."""
        try:
            if block_number is None:
                block_number = self.w3.eth.block_number

            block = self.w3.eth.get_block(block_number, full_transactions=False)
            return {
                "number": block["number"],
                "hash": block["hash"].hex() if isinstance(block["hash"], bytes) else block["hash"],
                "timestamp": block.get("timestamp"),
                "transaction_count": len(block.get("transactions", [])),
                "gas_used": block.get("gasUsed"),
                "gas_limit": block.get("gasLimit"),
                "miner": block.get("miner"),
                "explorer_url": self.block_link(block["number"]).url
            }
        except Exception as e:
            logger.error("Failed to get block info", error=str(e))
            return {"error": str(e)}

    def get_account_info(self, address: str) -> Dict:
        """Get information about an account."""
        try:
            checksum = Web3.to_checksum_address(address)
            balance = self.w3.eth.get_balance(checksum)
            tx_count = self.w3.eth.get_transaction_count(checksum)
            code = self.w3.eth.get_code(checksum)

            return {
                "address": address,
                "balance_wei": balance,
                "balance_mon": float(self.w3.from_wei(balance, "ether")),
                "transaction_count": tx_count,
                "is_contract": len(code) > 2,
                "code_size": len(code),
                "explorer_url": self.address_link(address).url
            }
        except Exception as e:
            logger.error("Failed to get account info", error=str(e))
            return {"address": address, "error": str(e)}

    def get_gas_price(self) -> Dict:
        """Get current gas price information."""
        try:
            gas_price = self.w3.eth.gas_price
            return {
                "gas_price_wei": gas_price,
                "gas_price_gwei": float(self.w3.from_wei(gas_price, "gwei")),
                "estimated_tx_cost_mon": float(
                    self.w3.from_wei(gas_price * 21000, "ether")
                )
            }
        except Exception as e:
            return {"error": str(e)}

    # ============ Full System Verification ============

    def verify_all_contracts(self) -> Dict[str, ContractVerification]:
        """Verify all deployed contracts exist on-chain."""
        contracts = {
            "Treasury": blockchain_config.treasury_address,
            "TaskRegistry": blockchain_config.task_registry_address,
            "WorkerRegistry": blockchain_config.worker_registry_address,
        }

        results = {}
        for name, address in contracts.items():
            if address:
                results[name] = self.verify_contract(address)
                logger.info(f"Contract verification: {name}",
                           deployed=results[name].is_deployed,
                           code_size=results[name].code_size,
                           balance=self.w3.from_wei(results[name].balance_wei, "ether"))
            else:
                results[name] = ContractVerification(
                    address="", is_deployed=False, code_size=0,
                    balance_wei=0, explorer_url="",
                    error="Address not configured"
                )

        return results

    def run_full_diagnostics(self) -> Dict:
        """Run comprehensive diagnostics on Monad testnet connection and contracts."""
        diagnostics = {
            "timestamp": int(time.time()),
            "connection": self.test_connection(),
            "gas_price": self.get_gas_price(),
            "contracts": {},
            "explorer_links": {},
            "summary": {
                "all_connected": False,
                "all_contracts_deployed": False,
                "issues": []
            }
        }

        # Test connection
        if not diagnostics["connection"]["connected"]:
            diagnostics["summary"]["issues"].append("Cannot connect to Monad testnet RPC")
            return diagnostics

        diagnostics["summary"]["all_connected"] = True

        # Verify contracts
        contract_results = self.verify_all_contracts()
        all_deployed = True
        for name, result in contract_results.items():
            diagnostics["contracts"][name] = {
                "address": result.address,
                "deployed": result.is_deployed,
                "code_size": result.code_size,
                "balance_mon": float(self.w3.from_wei(result.balance_wei, "ether")),
                "explorer_url": result.explorer_url,
                "error": result.error
            }
            if not result.is_deployed:
                all_deployed = False
                diagnostics["summary"]["issues"].append(
                    f"{name} contract not deployed at {result.address}"
                )

        diagnostics["summary"]["all_contracts_deployed"] = all_deployed

        # Generate explorer links
        links = self.generate_all_contract_links()
        for name, link in links.items():
            diagnostics["explorer_links"][name] = link.url

        # Latest block info
        diagnostics["latest_block"] = self.get_block_info()

        return diagnostics


# ============ Standalone Testing ============

def run_explorer_tests():
    """Run Monad Explorer tests as a standalone script."""
    print("=" * 70)
    print("  MONAD TESTNET EXPLORER - DIAGNOSTIC TEST SUITE")
    print("=" * 70)

    explorer = MonadExplorer()

    # Test 1: Connection
    print("\n[1/5] Testing Monad Testnet Connection...")
    conn = explorer.test_connection()
    if conn["connected"]:
        print(f"  OK  Connected to Monad Testnet")
        print(f"       Chain ID: {conn['chain_id']}")
        print(f"       Block Number: {conn['block_number']}")
        print(f"       Latency: {conn['latency_ms']}ms")
    else:
        print(f"  FAIL Cannot connect: {conn['error']}")

    # Test 2: Gas Price
    print("\n[2/5] Checking Gas Price...")
    gas = explorer.get_gas_price()
    if "error" not in gas:
        print(f"  OK  Gas Price: {gas['gas_price_gwei']:.2f} Gwei")
        print(f"       Est. TX Cost: {gas['estimated_tx_cost_mon']:.6f} MON")
    else:
        print(f"  FAIL {gas['error']}")

    # Test 3: Contract Verification
    print("\n[3/5] Verifying Deployed Contracts...")
    contracts = explorer.verify_all_contracts()
    all_ok = True
    for name, result in contracts.items():
        if result.is_deployed:
            balance = float(explorer.w3.from_wei(result.balance_wei, "ether"))
            print(f"  OK  {name}: {result.address[:20]}...")
            print(f"       Code Size: {result.code_size} bytes | Balance: {balance:.4f} MON")
        elif result.error == "Address not configured":
            print(f"  SKIP {name}: Not configured in .env")
        else:
            print(f"  FAIL {name}: Not deployed - {result.error}")
            all_ok = False

    # Test 4: Explorer Links
    print("\n[4/5] Generating Explorer Links...")
    links = explorer.generate_all_contract_links()
    for name, link in links.items():
        print(f"  {name}: {link.url}")

    # Test 5: Block Info
    print("\n[5/5] Latest Block Info...")
    block = explorer.get_block_info()
    if "error" not in block:
        print(f"  OK  Block #{block['number']}")
        print(f"       Transactions: {block['transaction_count']}")
        print(f"       Gas Used: {block['gas_used']}")
        print(f"       Explorer: {block['explorer_url']}")
    else:
        print(f"  FAIL {block['error']}")

    # Summary
    print("\n" + "=" * 70)
    print("  SUMMARY")
    print("=" * 70)
    if conn["connected"] and all_ok:
        print("  All systems operational on Monad Testnet")
    else:
        print("  Some issues detected - review output above")

    return conn["connected"] and all_ok


if __name__ == "__main__":
    import sys
    sys.path.insert(0, str(__import__('pathlib').Path(__file__).parent))
    success = run_explorer_tests()
    sys.exit(0 if success else 1)
