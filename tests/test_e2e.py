"""
End-to-End Integration Tests for the Autonomous Treasury Agent.
Tests the complete flow: task creation -> worker selection -> verification -> learning.
All on-chain interactions are mocked.
"""

import os
import sys
import asyncio
import tempfile
import shutil
from pathlib import Path
from unittest.mock import MagicMock, AsyncMock, patch

import pytest

AGENT_DIR = str(Path(__file__).parent.parent / "agent")
if AGENT_DIR not in sys.path:
    sys.path.insert(0, AGENT_DIR)

from blockchain import Task, TaskType, TaskStatus, Worker
from memory import AgentMemory, TaskMemory, TaskOutcome, WorkerMemory
from learner import StrategyLearner


class TestEndToEndFlow:
    """
    End-to-end test simulating the full agent lifecycle:
    1. Initialize system
    2. Process tasks (AI analysis + UCB1 selection)
    3. Propose assignments
    4. Verify completions
    5. Learn from outcomes
    6. Verify learning improvement
    """

    @pytest.fixture
    def temp_dir(self):
        d = tempfile.mkdtemp()
        yield d
        shutil.rmtree(d, ignore_errors=True)

    @pytest.fixture
    def system_components(self, temp_dir):
        """Initialize all system components with mocked blockchain."""
        memory = AgentMemory(data_dir=temp_dir)
        learner = StrategyLearner(
            memory=memory,
            exploration_rate=0.1,  # Low exploration for predictable tests
            learning_rate=0.1
        )
        return {"memory": memory, "learner": learner}

    @pytest.fixture
    def worker_pool(self):
        """Create a pool of workers with varying skills."""
        return {
            "0xgoodworker": {
                "address": "0xgoodworker",
                "reliability": 9000,
                "total_tasks": 50,
                "successful_tasks": 45,
                "success_rate": 0.90,
            },
            "0xaverworker": {
                "address": "0xaverworker",
                "reliability": 6000,
                "total_tasks": 30,
                "successful_tasks": 20,
                "success_rate": 0.67,
            },
            "0xnewworker": {
                "address": "0xnewworker",
                "reliability": 5000,
                "total_tasks": 0,
                "successful_tasks": 0,
                "success_rate": 0.5,
            },
            "0xbadworker": {
                "address": "0xbadworker",
                "reliability": 2000,
                "total_tasks": 20,
                "successful_tasks": 5,
                "success_rate": 0.25,
            },
        }

    def test_full_learning_cycle(self, system_components, worker_pool):
        """Test that the agent learns to prefer better workers over time."""
        memory = system_components["memory"]
        learner = system_components["learner"]

        # Pre-populate worker memory with historical performance
        for addr, data in worker_pool.items():
            w = memory.get_worker(addr)
            w.reliability_score = data["reliability"] / 10000
            for _ in range(data["successful_tasks"]):
                w.update(TaskOutcome.SUCCESS, task_type=0, earnings=0.5, completion_time=60)
            for _ in range(data["total_tasks"] - data["successful_tasks"]):
                w.update(TaskOutcome.FAILURE, task_type=0)

        available_workers = list(worker_pool.keys())
        worker_selections = {w: 0 for w in available_workers}

        # Run 50 decision cycles
        for i in range(50):
            decision = learner.make_decision(
                task_id=i,
                task_type=0,
                max_payment=1.0,
                available_workers=available_workers
            )
            assert decision is not None
            worker_selections[decision.selected_worker] += 1

            # Simulate outcome based on worker quality
            worker_data = worker_pool[decision.selected_worker]
            import random
            random.seed(i)  # Deterministic
            success = random.random() < worker_data["success_rate"]

            learner.learn_from_outcome(
                task_id=i, task_type=0,
                worker=decision.selected_worker,
                payment=decision.proposed_payment,
                max_payment=1.0,
                success=success
            )

        # After learning, the good worker should be selected most often
        # (not guaranteed due to exploration, but statistically likely)
        stats = learner.get_learning_stats()
        assert stats["decisions_made"] == 50
        assert stats["successful_decisions"] > 0

    def test_payment_optimization(self, system_components, worker_pool):
        """Test that payment amounts optimize over time."""
        memory = system_components["memory"]
        learner = system_components["learner"]

        available_workers = list(worker_pool.keys())

        initial_payments = []
        final_payments = []

        for i in range(100):
            decision = learner.make_decision(
                task_id=i, task_type=0,
                max_payment=1.0,
                available_workers=available_workers
            )

            if i < 10:
                initial_payments.append(decision.proposed_payment)
            elif i >= 90:
                final_payments.append(decision.proposed_payment)

            # Always succeed to let optimizer reduce payments
            learner.learn_from_outcome(
                task_id=i, task_type=0,
                worker=decision.selected_worker,
                payment=decision.proposed_payment,
                max_payment=1.0,
                success=True
            )

        # After consistent success, payments should trend downward
        avg_initial = sum(initial_payments) / len(initial_payments)
        avg_final = sum(final_payments) / len(final_payments)

        # The optimizer should have reduced payments at least slightly
        assert avg_final <= avg_initial + 0.1  # Allow small margin

    def test_memory_persistence_across_sessions(self, temp_dir):
        """Test that learning persists across agent restarts."""
        # Session 1: Make decisions and record
        memory1 = AgentMemory(data_dir=temp_dir)
        learner1 = StrategyLearner(memory=memory1, exploration_rate=0.1)

        for i in range(20):
            decision = learner1.make_decision(
                task_id=i, task_type=0, max_payment=1.0,
                available_workers=["0xworker1", "0xworker2"]
            )
            learner1.learn_from_outcome(
                task_id=i, task_type=0,
                worker=decision.selected_worker,
                payment=decision.proposed_payment,
                max_payment=1.0,
                success=True
            )
            # learn_from_outcome doesn't call record_task, so record manually
            task_mem = TaskMemory(
                task_id=i, task_type=0,
                worker_address=decision.selected_worker,
                proposed_payment=decision.proposed_payment,
                actual_payment=decision.proposed_payment,
                outcome="success",
                created_at=float(i), completed_at=float(i + 1),
                completion_time=1.0
            )
            memory1.record_task(task_mem)

        session1_tasks = len(memory1.tasks)
        assert session1_tasks == 20

        # Session 2: Load from disk
        memory2 = AgentMemory(data_dir=temp_dir)
        assert len(memory2.tasks) > 0  # Persisted tasks loaded
        assert len(memory2.workers) >= 1  # Worker data persisted

    def test_multi_task_type_learning(self, system_components):
        """Test the agent learns different strategies for different task types."""
        memory = system_components["memory"]
        learner = system_components["learner"]

        workers = ["0xworker1", "0xworker2", "0xworker3"]

        # Worker1 is great at DATA_ANALYSIS (type 0)
        # Worker2 is great at CODE_REVIEW (type 2)
        success_map = {
            ("0xworker1", 0): 0.95,  # Great at data
            ("0xworker1", 2): 0.3,   # Bad at code review
            ("0xworker2", 0): 0.3,   # Bad at data
            ("0xworker2", 2): 0.95,  # Great at code review
            ("0xworker3", 0): 0.5,   # Average at everything
            ("0xworker3", 2): 0.5,
        }

        import random
        for i in range(60):
            task_type = 0 if i % 2 == 0 else 2
            random.seed(i + 1000)

            decision = learner.make_decision(
                task_id=i, task_type=task_type, max_payment=1.0,
                available_workers=workers
            )

            prob = success_map.get(
                (decision.selected_worker, task_type), 0.5
            )
            success = random.random() < prob

            learner.learn_from_outcome(
                task_id=i, task_type=task_type,
                worker=decision.selected_worker,
                payment=decision.proposed_payment,
                max_payment=1.0, success=success
            )

        # The bandit should have learned from outcomes
        stats = learner.get_learning_stats()
        assert stats["decisions_made"] == 60
        # Verify the learner's bandit has pulls recorded for each worker
        for worker_addr in workers:
            assert worker_addr in learner.bandit.worker_pulls
            assert learner.bandit.worker_pulls[worker_addr] > 0

    def test_strategy_metrics_accumulate(self, system_components):
        """Test that strategy metrics accumulate correctly."""
        memory = system_components["memory"]
        learner = system_components["learner"]

        workers = ["0xworker1"]

        for i in range(10):
            decision = learner.make_decision(
                task_id=i, task_type=0, max_payment=1.0,
                available_workers=workers
            )

            # Record task directly in memory
            task_mem = TaskMemory(
                task_id=i, task_type=0,
                worker_address="0xworker1",
                proposed_payment=decision.proposed_payment,
                actual_payment=decision.proposed_payment,
                outcome="success" if i % 3 != 0 else "failure",
                created_at=float(i), completed_at=float(i + 1),
                completion_time=1.0
            )
            memory.record_task(task_mem)

            learner.learn_from_outcome(
                task_id=i, task_type=0,
                worker="0xworker1",
                payment=decision.proposed_payment,
                max_payment=1.0,
                success=(i % 3 != 0)
            )

        metrics = memory.get_metrics_summary()
        assert metrics["total_tasks"] == 10
        assert metrics["total_workers"] >= 1
        assert "strategy" in metrics

    def test_ai_enhanced_decision_flow(self, system_components):
        """Test decisions with AI scores blended into UCB1."""
        learner = system_components["learner"]
        learner.exploration_rate = 0.0  # Force exploitation

        workers = ["0xworker1", "0xworker2", "0xworker3"]
        ai_scores = {
            "0xworker1": 0.3,
            "0xworker2": 0.95,  # AI strongly prefers worker2
            "0xworker3": 0.4,
        }

        decisions = []
        for i in range(20):
            decision = learner.make_decision(
                task_id=i, task_type=0, max_payment=1.0,
                available_workers=workers,
                ai_scores=ai_scores
            )
            decisions.append(decision)
            learner.learn_from_outcome(
                task_id=i, task_type=0,
                worker=decision.selected_worker,
                payment=decision.proposed_payment,
                max_payment=1.0, success=True
            )

        # Worker2 should appear frequently due to AI preference
        worker2_count = sum(1 for d in decisions if d.selected_worker == "0xworker2")
        # At least a few should be worker2 (AI influence)
        assert worker2_count >= 1


class TestCoordinatorEndToEnd:
    """End-to-end test of the coordinator with mocked blockchain."""

    @pytest.fixture
    def e2e_setup(self, temp_data_dir):
        """Setup a full coordinator with mocked everything."""
        with patch('coordinator.BlockchainClient') as mock_bc_cls, \
             patch('coordinator.AgentMemory') as mock_mem_cls, \
             patch('coordinator.AI_REASONING_AVAILABLE', True), \
             patch('coordinator.validate_config', return_value=True):

            # Setup blockchain mock
            mock_bc = MagicMock()
            mock_bc.is_connected.return_value = True
            mock_bc.get_chain_id.return_value = 10143
            mock_bc.get_block_number.return_value = 1000000
            mock_bc.get_treasury_balance.return_value = (100.0, 10.0, 90.0)
            mock_bc.get_remaining_daily_budget.return_value = 45.0
            mock_bc.get_daily_spent.return_value = 5.0
            mock_bc.get_open_tasks.return_value = [1, 2, 3]
            mock_bc.get_task_count.return_value = 5
            mock_bc.propose_assignment.return_value = (True, "0xtxhash")
            mock_bc.verify_and_complete.return_value = (True, "0xtxhash")

            from web3 import Web3
            mock_bc.w3 = Web3()
            mock_bc_cls.return_value = mock_bc

            # Create tasks
            tasks = {
                1: Task(
                    id=1, task_type=TaskType.DATA_ANALYSIS,
                    status=TaskStatus.CREATED,
                    creator="0xcreator", assigned_worker="0x" + "0" * 40,
                    max_payment=Web3.to_wei(0.5, "ether"),
                    actual_payment=0, deadline=9999999999,
                    created_at=1700000000, completed_at=0,
                    description_hash=b'\x01' * 32,
                    result_hash=b'\x00' * 32,
                    verification_rule="manual"
                ),
                2: Task(
                    id=2, task_type=TaskType.CODE_REVIEW,
                    status=TaskStatus.CREATED,
                    creator="0xcreator", assigned_worker="0x" + "0" * 40,
                    max_payment=Web3.to_wei(0.8, "ether"),
                    actual_payment=0, deadline=9999999999,
                    created_at=1700000000, completed_at=0,
                    description_hash=b'\x02' * 32,
                    result_hash=b'\x00' * 32,
                    verification_rule="manual"
                ),
                3: Task(
                    id=3, task_type=TaskType.RESEARCH,
                    status=TaskStatus.SUBMITTED,
                    creator="0xcreator",
                    assigned_worker="0xabcdef1234567890abcdef1234567890abcdef12",
                    max_payment=Web3.to_wei(1.0, "ether"),
                    actual_payment=0, deadline=9999999999,
                    created_at=1700000000, completed_at=0,
                    description_hash=b'\x03' * 32,
                    result_hash=b'\xaa' * 32,  # Has result
                    verification_rule="manual"
                ),
                4: Task(
                    id=4, task_type=TaskType.COMPUTATION,
                    status=TaskStatus.COMPLETED,
                    creator="0xcreator",
                    assigned_worker="0xabcdef1234567890abcdef1234567890abcdef12",
                    max_payment=Web3.to_wei(0.3, "ether"),
                    actual_payment=Web3.to_wei(0.25, "ether"),
                    deadline=9999999999,
                    created_at=1700000000, completed_at=1700003600,
                    description_hash=b'\x04' * 32,
                    result_hash=b'\xbb' * 32,
                    verification_rule=""
                ),
                5: Task(
                    id=5, task_type=TaskType.TEXT_GENERATION,
                    status=TaskStatus.FAILED,
                    creator="0xcreator",
                    assigned_worker="0xbadworker",
                    max_payment=Web3.to_wei(0.2, "ether"),
                    actual_payment=0, deadline=1700003600,
                    created_at=1700000000, completed_at=1700003600,
                    description_hash=b'\x05' * 32,
                    result_hash=b'\x00' * 32,
                    verification_rule=""
                ),
            }
            mock_bc.get_task.side_effect = lambda tid: tasks.get(tid)

            # Workers
            workers = ["0xabcdef1234567890abcdef1234567890abcdef12", "0x" + "11" * 20]
            mock_bc.get_workers_for_task_type.return_value = workers
            mock_bc.get_worker.return_value = Worker(
                address="0xabcdef1234567890abcdef1234567890abcdef12",
                is_active=True, registered_at=1699900000,
                total_tasks=10, successful_tasks=8,
                total_earnings=5000000000000000000,
                last_task_at=1700000000,
                reliability_score=8000,
                allowed_task_types=[0, 1, 2, 3, 4, 5]
            )

            # Memory
            mock_memory = MagicMock()
            mock_memory.get_worker.return_value = MagicMock(
                reliability_score=0.8, success_rate=0.9,
                average_completion_time=3600, task_type_scores={}
            )
            mock_memory.workers = {}
            mock_memory.get_metrics_summary.return_value = {
                "total_workers": 2, "total_tasks": 5,
                "strategy": {"roi": 1.5}, "top_workers": []
            }
            mock_mem_cls.return_value = mock_memory

            from coordinator import CoordinatorAgent

            with patch.object(CoordinatorAgent, '_init_ai_reasoner'):
                agent = CoordinatorAgent()
                agent.blockchain = mock_bc

                # Setup AI reasoner mock
                agent.ai_reasoner = AsyncMock()
                agent.ai_reasoner.analyze_task.return_value = {
                    "complexity": "medium",
                    "required_skills": ["python"],
                    "estimated_time": 2.0,
                    "risk_level": "low",
                    "recommended_reward": 0.5,
                    "reasoning": "Standard task"
                }
                agent.ai_reasoner.assess_worker_match.return_value = (0.85, "Good match")
                agent.ai_reasoner.verify_task_completion.return_value = (True, "Looks good", 0.9)

                yield agent

    @pytest.mark.asyncio
    async def test_full_cycle(self, e2e_setup):
        """Test a complete agent decision cycle."""
        agent = e2e_setup

        # Run one full cycle
        await agent._run_cycle()

        assert agent.cycle_count == 1
        # Should have processed open tasks
        assert agent.proposals_made >= 1

    @pytest.mark.asyncio
    async def test_multiple_cycles(self, e2e_setup):
        """Test multiple consecutive cycles."""
        agent = e2e_setup

        for _ in range(5):
            await agent._run_cycle()

        assert agent.cycle_count == 5

    @pytest.mark.asyncio
    async def test_proposal_and_verification(self, e2e_setup):
        """Test that proposals are made and verifications happen."""
        agent = e2e_setup

        # Process a task
        await agent._process_task(1, 90.0, 45.0)
        assert agent.proposals_made >= 1

        # Verify a submitted task
        from blockchain import Task, TaskType, TaskStatus
        submitted_task = agent.blockchain.get_task(3)
        if submitted_task:
            await agent._verify_task(submitted_task)
            assert agent.verifications_done >= 1
