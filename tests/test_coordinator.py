"""
Tests for the Coordinator Agent.
Tests the main decision loop with mocked blockchain and AI.
"""

import os
import sys
import time
from pathlib import Path
from unittest.mock import MagicMock, AsyncMock, patch, PropertyMock

import pytest

AGENT_DIR = str(Path(__file__).parent.parent / "agent")
if AGENT_DIR not in sys.path:
    sys.path.insert(0, AGENT_DIR)

from blockchain import Task, TaskType, TaskStatus, Worker


class TestCoordinatorAgent:
    """Tests for the CoordinatorAgent class."""

    @pytest.fixture
    def mock_deps(self, temp_data_dir, sample_task, sample_submitted_task):
        """Patch all dependencies for coordinator."""
        patches = {}

        # Mock BlockchainClient
        mock_bc = MagicMock()
        mock_bc.is_connected.return_value = True
        mock_bc.get_chain_id.return_value = 10143
        mock_bc.get_block_number.return_value = 1000000
        mock_bc.get_treasury_balance.return_value = (100.0, 10.0, 90.0)
        mock_bc.get_remaining_daily_budget.return_value = 45.0
        mock_bc.get_daily_spent.return_value = 5.0
        mock_bc.get_open_tasks.return_value = [1]
        mock_bc.get_task_count.return_value = 3
        mock_bc.get_task.side_effect = lambda tid: {
            1: sample_task,
            3: sample_submitted_task,
        }.get(tid)
        mock_bc.get_workers_for_task_type.return_value = [
            "0xabcdef1234567890abcdef1234567890abcdef12"
        ]
        mock_bc.get_worker.return_value = Worker(
            address="0xabcdef1234567890abcdef1234567890abcdef12",
            is_active=True, registered_at=1699900000,
            total_tasks=10, successful_tasks=8,
            total_earnings=5000000000000000000,
            last_task_at=1700000000,
            reliability_score=8000,
            allowed_task_types=[0, 1, 2, 3, 4, 5]
        )
        mock_bc.propose_assignment.return_value = (True, "0xtxhash")
        mock_bc.verify_and_complete.return_value = (True, "0xtxhash")

        from web3 import Web3
        mock_bc.w3 = Web3()

        patches['blockchain'] = mock_bc

        return patches

    @pytest.fixture
    def coordinator(self, mock_deps, temp_data_dir):
        """Create a CoordinatorAgent with mocked dependencies."""
        with patch('coordinator.BlockchainClient', return_value=mock_deps['blockchain']), \
             patch('coordinator.AgentMemory') as mock_mem_cls, \
             patch('coordinator.AI_REASONING_AVAILABLE', False), \
             patch('coordinator.validate_config', return_value=True):

            mock_memory = MagicMock()
            mock_memory.get_worker.return_value = MagicMock(
                reliability_score=0.8,
                success_rate=0.9,
                average_completion_time=3600,
                task_type_scores={}
            )
            mock_memory.workers = {}
            mock_memory.get_metrics_summary.return_value = {
                "total_workers": 1,
                "total_tasks": 10,
                "recent_success_rate": 0.8,
                "improvement_percentage": 5.0,
                "strategy": {
                    "total_decisions": 10,
                    "successful_allocations": 8,
                    "failed_allocations": 2,
                    "total_spent": 5.0,
                    "total_value_delivered": 7.5,
                    "average_cost_per_success": 0.625,
                    "roi": 1.5,
                    "recent_success_rate": 0.8,
                    "historical_success_rate": 0.8,
                    "cost_efficiency_trend": [],
                    "decision_quality_score": 0.7
                },
                "top_workers": []
            }
            mock_mem_cls.return_value = mock_memory

            from coordinator import CoordinatorAgent
            agent = CoordinatorAgent()
            agent.blockchain = mock_deps['blockchain']
            return agent

    def test_initialization(self, coordinator):
        assert coordinator.cycle_count == 0
        assert coordinator.proposals_made == 0
        assert coordinator.running is False

    def test_get_status(self, coordinator):
        status = coordinator.get_status()
        assert "running" in status
        assert "treasury" in status
        assert "learning" in status
        assert "ai_reasoning_enabled" in status

    @pytest.mark.asyncio
    async def test_run_cycle(self, coordinator):
        """Test one decision cycle."""
        await coordinator._run_cycle()
        assert coordinator.cycle_count == 1

    @pytest.mark.asyncio
    async def test_process_task(self, coordinator, sample_task):
        """Test processing a single task."""
        await coordinator._process_task(
            task_id=1, available_balance=90.0, remaining_budget=45.0
        )
        # Should have made a proposal
        assert coordinator.proposals_made == 1
        assert 1 in coordinator.processed_tasks

    @pytest.mark.asyncio
    async def test_process_expired_task(self, coordinator):
        """Test that expired tasks are skipped."""
        from blockchain import Task, TaskType, TaskStatus
        expired = Task(
            id=99, task_type=TaskType.DATA_ANALYSIS,
            status=TaskStatus.CREATED,
            creator="0x1234567890123456789012345678901234567890",
            assigned_worker="0x0000000000000000000000000000000000000000",
            max_payment=500000000000000000,
            actual_payment=0, deadline=1,  # Expired
            created_at=0, completed_at=0,
            description_hash=b'\x00' * 32,
            result_hash=b'\x00' * 32,
            verification_rule=""
        )
        # Override side_effect to return the expired task for id 99
        original_side_effect = coordinator.blockchain.get_task.side_effect
        coordinator.blockchain.get_task.side_effect = lambda tid: expired if tid == 99 else (
            original_side_effect(tid) if callable(original_side_effect) else None
        )

        await coordinator._process_task(99, 90.0, 45.0)
        assert 99 in coordinator.processed_tasks
        assert coordinator.proposals_made == 0  # No proposal for expired

    @pytest.mark.asyncio
    async def test_verify_task_rule_based(self, coordinator, sample_submitted_task):
        """Test task verification with rule-based approach."""
        await coordinator._verify_task(sample_submitted_task)
        assert coordinator.verifications_done == 1
        coordinator.blockchain.verify_and_complete.assert_called_once()

    def test_apply_verification_rule_with_result(self, coordinator, sample_submitted_task):
        """Test verification rule when result hash exists."""
        result = coordinator._apply_verification_rule(sample_submitted_task)
        assert result is True

    def test_apply_verification_rule_no_result(self, coordinator):
        """Test verification rule when no result submitted."""
        from blockchain import Task, TaskType, TaskStatus
        task = Task(
            id=5, task_type=TaskType.DATA_ANALYSIS,
            status=TaskStatus.SUBMITTED,
            creator="0x1234567890123456789012345678901234567890",
            assigned_worker="0xabcdef1234567890abcdef1234567890abcdef12",
            max_payment=100, actual_payment=0,
            deadline=9999999999, created_at=0, completed_at=0,
            description_hash=b'\x00' * 32,
            result_hash=bytes(32),  # Empty hash
            verification_rule=""
        )
        result = coordinator._apply_verification_rule(task)
        assert result is False

    def test_stop(self, coordinator):
        coordinator.running = True
        coordinator.stop()
        assert coordinator.running is False

    @pytest.mark.asyncio
    async def test_learn_from_task(self, coordinator, sample_completed_task):
        """Test learning from a completed task."""
        await coordinator._learn_from_task(sample_completed_task)
        assert sample_completed_task.id in coordinator.processed_tasks


class TestCoordinatorWithAI:
    """Tests for coordinator with AI reasoning enabled."""

    @pytest.fixture
    def ai_coordinator(self, mock_ai_reasoner, temp_data_dir):
        """Create a coordinator with mocked AI reasoner."""
        with patch('coordinator.BlockchainClient') as mock_bc_cls, \
             patch('coordinator.AgentMemory') as mock_mem_cls, \
             patch('coordinator.AI_REASONING_AVAILABLE', True), \
             patch('coordinator.validate_config', return_value=True):

            mock_bc = MagicMock()
            mock_bc.is_connected.return_value = True
            mock_bc.get_chain_id.return_value = 10143
            mock_bc.get_block_number.return_value = 1000000
            mock_bc.get_treasury_balance.return_value = (100.0, 10.0, 90.0)
            mock_bc.get_remaining_daily_budget.return_value = 45.0
            mock_bc.get_daily_spent.return_value = 5.0
            from web3 import Web3
            mock_bc.w3 = Web3()
            mock_bc_cls.return_value = mock_bc

            mock_memory = MagicMock()
            mock_memory.get_worker.return_value = MagicMock(
                reliability_score=0.8, success_rate=0.9,
                average_completion_time=3600, task_type_scores={}
            )
            mock_memory.workers = {}
            mock_memory.get_metrics_summary.return_value = {"total_workers": 0, "total_tasks": 0, "strategy": {"roi": 0}, "top_workers": []}
            mock_mem_cls.return_value = mock_memory

            from coordinator import CoordinatorAgent

            # Patch the _init_ai_reasoner to inject our mock
            with patch.object(CoordinatorAgent, '_init_ai_reasoner'):
                agent = CoordinatorAgent()
                agent.blockchain = mock_bc
                agent.ai_reasoner = mock_ai_reasoner
                return agent

    @pytest.mark.asyncio
    async def test_ai_task_analysis(self, ai_coordinator, sample_task):
        """Test that AI analysis is called during task processing."""
        ai_coordinator.blockchain.get_open_tasks.return_value = [1]
        ai_coordinator.blockchain.get_task.return_value = sample_task
        ai_coordinator.blockchain.get_workers_for_task_type.return_value = [
            "0xabcdef1234567890abcdef1234567890abcdef12"
        ]
        ai_coordinator.blockchain.get_worker.return_value = MagicMock(
            reliability_score=8000, total_tasks=10
        )
        ai_coordinator.blockchain.propose_assignment.return_value = (True, "0xtxhash")

        await ai_coordinator._process_task(1, 90.0, 45.0)

        # AI analyze_task should have been called
        ai_coordinator.ai_reasoner.analyze_task.assert_called_once()
        assert ai_coordinator.ai_analyses == 1

    @pytest.mark.asyncio
    async def test_ai_verification(self, ai_coordinator, sample_submitted_task):
        """Test AI-enhanced verification."""
        ai_coordinator.blockchain.verify_and_complete.return_value = (True, "0xtxhash")

        await ai_coordinator._verify_task(sample_submitted_task)

        ai_coordinator.ai_reasoner.verify_task_completion.assert_called_once()
        assert ai_coordinator.verifications_done == 1
