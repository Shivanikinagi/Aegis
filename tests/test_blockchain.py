"""
Tests for the Blockchain Client module.
Tests data structures and client methods with mocked web3.
"""

import os
import sys
import json
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

AGENT_DIR = str(Path(__file__).parent.parent / "agent")
if AGENT_DIR not in sys.path:
    sys.path.insert(0, AGENT_DIR)

from blockchain import Task, TaskType, TaskStatus, Worker, TreasuryRules


class TestDataStructures:
    """Tests for blockchain data structures."""

    def test_task_type_enum(self):
        assert TaskType.DATA_ANALYSIS == 0
        assert TaskType.TEXT_GENERATION == 1
        assert TaskType.CODE_REVIEW == 2
        assert TaskType.RESEARCH == 3
        assert TaskType.COMPUTATION == 4
        assert TaskType.OTHER == 5

    def test_task_status_enum(self):
        assert TaskStatus.CREATED == 0
        assert TaskStatus.ASSIGNED == 1
        assert TaskStatus.SUBMITTED == 2
        assert TaskStatus.VERIFIED == 3
        assert TaskStatus.COMPLETED == 4
        assert TaskStatus.FAILED == 5
        assert TaskStatus.CANCELLED == 6

    def test_task_creation(self, sample_task):
        assert sample_task.id == 1
        assert sample_task.task_type == TaskType.DATA_ANALYSIS
        assert sample_task.status == TaskStatus.CREATED
        assert sample_task.max_payment == 500000000000000000

    def test_worker_creation(self, sample_worker):
        assert sample_worker.is_active is True
        assert sample_worker.reliability_score == 9000
        assert len(sample_worker.allowed_task_types) == 6

    def test_treasury_rules(self):
        rules = TreasuryRules(
            max_spend_per_task=5000000000000000000,
            max_spend_per_day=50000000000000000000,
            min_task_value=100000000000000000,
            cooldown_period=60
        )
        assert rules.max_spend_per_task == 5000000000000000000
        assert rules.cooldown_period == 60


class TestBlockchainClient:
    """Tests for BlockchainClient with mocked web3."""

    @pytest.fixture
    def mock_client(self):
        """Create a BlockchainClient with mocked dependencies."""
        with patch('blockchain.Web3') as mock_web3_cls, \
             patch('blockchain.blockchain_config') as mock_config, \
             patch('blockchain.Account') as mock_account_cls:

            mock_config.rpc_url = "https://testnet-rpc.monad.xyz"
            mock_config.chain_id = 10143
            mock_config.coordinator_private_key = "0x" + "ab" * 32
            mock_config.treasury_address = "0xTreasury"
            mock_config.task_registry_address = "0xTaskRegistry"
            mock_config.worker_registry_address = "0xWorkerRegistry"

            from web3 import Web3 as RealWeb3

            mock_w3 = MagicMock()
            mock_w3.is_connected.return_value = True
            mock_w3.eth.chain_id = 10143
            mock_w3.eth.block_number = 1000000
            mock_w3.from_wei = RealWeb3.from_wei  # Use real conversion
            mock_web3_cls.return_value = mock_w3
            mock_web3_cls.HTTPProvider = MagicMock()
            mock_web3_cls.to_checksum_address = lambda a: a

            mock_account = MagicMock()
            mock_account.address = "0xCoordinator"
            mock_account_cls.from_key.return_value = mock_account

            from blockchain import BlockchainClient

            with patch.object(BlockchainClient, '_load_contracts'):
                client = BlockchainClient()
                client.w3 = mock_w3
                client.account = mock_account
                client.address = "0xCoordinator"
                client.treasury = MagicMock()
                client.task_registry = MagicMock()
                client.worker_registry = MagicMock()
                yield client

    def test_is_connected(self, mock_client):
        assert mock_client.is_connected() is True

    def test_get_chain_id(self, mock_client):
        assert mock_client.get_chain_id() == 10143

    def test_get_block_number(self, mock_client):
        assert mock_client.get_block_number() == 1000000

    def test_get_treasury_balance(self, mock_client):
        mock_client.treasury.functions.getBalance.return_value.call.return_value = 100 * 10**18
        mock_client.treasury.functions.getReservedBalance.return_value.call.return_value = 10 * 10**18
        mock_client.treasury.functions.getAvailableBalance.return_value.call.return_value = 90 * 10**18

        total, reserved, available = mock_client.get_treasury_balance()
        assert total == 100.0
        assert reserved == 10.0
        assert available == 90.0

    def test_get_treasury_balance_no_contract(self, mock_client):
        mock_client.treasury = None
        total, reserved, available = mock_client.get_treasury_balance()
        assert total == 0.0

    def test_get_open_tasks(self, mock_client):
        mock_client.task_registry.functions.getOpenTasks.return_value.call.return_value = [1, 2, 3]
        tasks = mock_client.get_open_tasks()
        assert tasks == [1, 2, 3]

    def test_get_open_tasks_no_contract(self, mock_client):
        mock_client.task_registry = None
        assert mock_client.get_open_tasks() == []

    def test_get_task_count(self, mock_client):
        mock_client.task_registry.functions.getTaskCount.return_value.call.return_value = 42
        assert mock_client.get_task_count() == 42

    def test_get_task_count_no_contract(self, mock_client):
        mock_client.task_registry = None
        assert mock_client.get_task_count() == 0

    def test_get_active_workers(self, mock_client):
        mock_client.worker_registry.functions.getAllActiveWorkers.return_value.call.return_value = [
            "0xworker1", "0xworker2"
        ]
        workers = mock_client.get_active_workers()
        assert len(workers) == 2

    def test_get_active_workers_no_contract(self, mock_client):
        mock_client.worker_registry = None
        assert mock_client.get_active_workers() == []

    def test_get_remaining_daily_budget(self, mock_client):
        mock_client.treasury.functions.getRemainingDailyBudget.return_value.call.return_value = 45 * 10**18
        budget = mock_client.get_remaining_daily_budget()
        assert budget == 45.0

    def test_get_daily_spent_no_contract(self, mock_client):
        mock_client.treasury = None
        assert mock_client.get_daily_spent() == 0.0

    def test_propose_assignment_success(self, mock_client):
        mock_client.w3.eth.get_transaction_count.return_value = 5
        mock_client.w3.eth.gas_price = 50000000000
        mock_client.task_registry.functions.proposeAssignment.return_value.build_transaction.return_value = {}
        mock_client.w3.eth.account.sign_transaction.return_value = MagicMock(
            raw_transaction=b'\x00'
        )
        mock_client.w3.eth.send_raw_transaction.return_value = b'\xab' * 32
        mock_client.w3.eth.wait_for_transaction_receipt.return_value = {"status": 1}

        # Use a valid checksum address
        valid_worker = "0xAbCdEf1234567890aBcDeF1234567890AbCdEf12"
        success, result = mock_client.propose_assignment(1, valid_worker, 1000)
        assert success is True

    def test_propose_assignment_no_account(self, mock_client):
        mock_client.account = None
        success, result = mock_client.propose_assignment(1, "0xAbCdEf1234567890aBcDeF1234567890AbCdEf12", 1000)
        assert success is False

    def test_verify_and_complete_success(self, mock_client):
        mock_client.w3.eth.get_transaction_count.return_value = 5
        mock_client.w3.eth.gas_price = 50000000000
        mock_client.task_registry.functions.verifyAndComplete.return_value.build_transaction.return_value = {}
        mock_client.w3.eth.account.sign_transaction.return_value = MagicMock(
            raw_transaction=b'\x00'
        )
        mock_client.w3.eth.send_raw_transaction.return_value = b'\xab' * 32
        mock_client.w3.eth.wait_for_transaction_receipt.return_value = {"status": 1}

        success, result = mock_client.verify_and_complete(1, True)
        assert success is True

    def test_get_recent_events(self, mock_client):
        mock_client.w3.eth.block_number = 100000
        mock_event = MagicMock()
        mock_event.get_logs.return_value = []
        mock_client.task_registry.events.TaskCreated = mock_event

        events = mock_client.get_recent_events("TaskCreated")
        assert isinstance(events, list)

    def test_get_recent_events_no_contract(self, mock_client):
        mock_client.task_registry = None
        assert mock_client.get_recent_events("TaskCreated") == []
