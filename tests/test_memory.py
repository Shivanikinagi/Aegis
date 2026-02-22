"""
Unit tests for the Memory module.
Tests WorkerMemory, TaskMemory, StrategyMetrics, and AgentMemory.
"""

import os
import sys
import json
import tempfile
import shutil
from pathlib import Path

import pytest

# Ensure imports work
AGENT_DIR = str(Path(__file__).parent.parent / "agent")
if AGENT_DIR not in sys.path:
    sys.path.insert(0, AGENT_DIR)

from memory import (
    WorkerMemory, TaskMemory, TaskOutcome,
    StrategyMetrics, AgentMemory
)


class TestWorkerMemory:
    """Tests for WorkerMemory dataclass."""

    def test_default_values(self):
        worker = WorkerMemory(address="0xtest")
        assert worker.total_tasks == 0
        assert worker.successful_tasks == 0
        assert worker.failed_tasks == 0
        assert worker.success_rate == 0.5  # Default neutral

    def test_success_rate_calculation(self):
        worker = WorkerMemory(
            address="0xtest",
            total_tasks=10,
            successful_tasks=8,
            failed_tasks=2
        )
        assert worker.success_rate == 0.8

    def test_update_on_success(self):
        worker = WorkerMemory(address="0xtest")
        worker.update(TaskOutcome.SUCCESS, task_type=0, earnings=1.0, completion_time=100)

        assert worker.total_tasks == 1
        assert worker.successful_tasks == 1
        assert worker.failed_tasks == 0
        assert worker.total_earnings == 1.0
        assert worker.reliability_score == 0.55  # 0.5 + 0.05
        assert worker.average_completion_time == 100

    def test_update_on_failure(self):
        worker = WorkerMemory(address="0xtest")
        worker.update(TaskOutcome.FAILURE, task_type=0)

        assert worker.total_tasks == 1
        assert worker.successful_tasks == 0
        assert worker.failed_tasks == 1
        assert worker.reliability_score == 0.4  # 0.5 - 0.1

    def test_multiple_updates(self):
        worker = WorkerMemory(address="0xtest")

        # 3 successes
        for _ in range(3):
            worker.update(TaskOutcome.SUCCESS, task_type=0, earnings=0.5, completion_time=60)

        assert worker.total_tasks == 3
        assert worker.successful_tasks == 3
        assert worker.success_rate == 1.0
        assert worker.reliability_score == pytest.approx(0.65)  # 0.5 + 3*0.05

        # 1 failure
        worker.update(TaskOutcome.FAILURE, task_type=0)
        assert worker.total_tasks == 4
        assert worker.success_rate == 0.75
        assert worker.reliability_score == pytest.approx(0.55)  # 0.65 - 0.1

    def test_task_type_scores(self):
        worker = WorkerMemory(address="0xtest")
        worker.update(TaskOutcome.SUCCESS, task_type=0)
        worker.update(TaskOutcome.SUCCESS, task_type=0)
        worker.update(TaskOutcome.FAILURE, task_type=1)

        assert worker.task_type_scores[0] == 0.7  # 0.5 + 0.1 + 0.1
        assert worker.task_type_scores[1] == 0.35  # 0.5 - 0.15

    def test_reliability_clamped(self):
        worker = WorkerMemory(address="0xtest")
        # Push reliability to maximum
        for _ in range(20):
            worker.update(TaskOutcome.SUCCESS, task_type=0)
        assert worker.reliability_score <= 1.0

        # Reset and push to minimum
        worker = WorkerMemory(address="0xtest")
        for _ in range(10):
            worker.update(TaskOutcome.FAILURE, task_type=0)
        assert worker.reliability_score >= 0.0


class TestTaskMemory:
    """Tests for TaskMemory dataclass."""

    def test_creation(self):
        task = TaskMemory(
            task_id=1,
            task_type=0,
            worker_address="0xtest",
            proposed_payment=0.5,
            actual_payment=0.4,
            outcome="success",
            created_at=1700000000.0,
            completed_at=1700003600.0,
            completion_time=3600.0,
            verification_result=True
        )
        assert task.task_id == 1
        assert task.outcome == "success"
        assert task.completion_time == 3600.0


class TestStrategyMetrics:
    """Tests for StrategyMetrics."""

    def test_default_values(self):
        metrics = StrategyMetrics()
        assert metrics.total_decisions == 0
        assert metrics.roi == 0.0

    def test_update_success(self):
        metrics = StrategyMetrics()
        metrics.update(success=True, cost=1.0, value=1.5)

        assert metrics.total_decisions == 1
        assert metrics.successful_allocations == 1
        assert metrics.total_spent == 1.0
        assert metrics.total_value_delivered == 1.5
        assert metrics.roi == 1.5

    def test_update_failure(self):
        metrics = StrategyMetrics()
        metrics.update(success=False, cost=1.0, value=0)

        assert metrics.total_decisions == 1
        assert metrics.failed_allocations == 1
        assert metrics.total_spent == 1.0
        assert metrics.roi == 0.0

    def test_cost_efficiency_trend(self):
        metrics = StrategyMetrics()
        for i in range(5):
            metrics.update(success=True, cost=1.0, value=1.5)

        assert len(metrics.cost_efficiency_trend) == 5
        assert all(c > 0 for c in metrics.cost_efficiency_trend)

    def test_decision_quality(self):
        metrics = StrategyMetrics()
        for _ in range(10):
            metrics.update(success=True, cost=1.0, value=2.0)

        # 100% success + high ROI should give high quality
        assert metrics.decision_quality_score > 0.8


class TestAgentMemory:
    """Tests for AgentMemory with persistence."""

    def test_initialization(self, temp_data_dir):
        memory = AgentMemory(data_dir=temp_data_dir)
        assert len(memory.workers) == 0
        assert len(memory.tasks) == 0

    def test_get_worker_creates_new(self, agent_memory):
        worker = agent_memory.get_worker("0xtest")
        assert worker.address == "0xtest"
        assert worker.total_tasks == 0

    def test_get_worker_returns_existing(self, agent_memory):
        w1 = agent_memory.get_worker("0xtest")
        w1.total_tasks = 5
        w2 = agent_memory.get_worker("0xtest")
        assert w2.total_tasks == 5

    def test_record_task(self, agent_memory):
        task = TaskMemory(
            task_id=1, task_type=0, worker_address="0xworker",
            proposed_payment=0.5, actual_payment=0.4,
            outcome="success", created_at=1.0, completed_at=2.0,
            completion_time=1.0
        )
        agent_memory.record_task(task)

        assert 1 in agent_memory.tasks
        worker = agent_memory.get_worker("0xworker")
        assert worker.total_tasks == 1
        assert worker.successful_tasks == 1

    def test_record_decision(self, agent_memory):
        agent_memory.record_decision({"task_id": 1, "worker": "0xtest"})
        assert len(agent_memory.decision_history) == 1
        assert "timestamp" in agent_memory.decision_history[0]

    def test_persistence(self, temp_data_dir):
        # Save data
        memory1 = AgentMemory(data_dir=temp_data_dir)
        memory1.get_worker("0xworker").total_tasks = 10
        task = TaskMemory(
            task_id=1, task_type=0, worker_address="0xworker",
            proposed_payment=0.5, actual_payment=0.4,
            outcome="success", created_at=1.0, completed_at=2.0,
            completion_time=1.0
        )
        memory1.record_task(task)

        # Load in new instance
        memory2 = AgentMemory(data_dir=temp_data_dir)
        assert len(memory2.tasks) == 1
        assert "0xworker" in memory2.workers

    def test_get_metrics_summary(self, agent_memory):
        summary = agent_memory.get_metrics_summary()
        assert "total_workers" in summary
        assert "total_tasks" in summary
        assert "strategy" in summary
        assert "top_workers" in summary

    def test_get_best_workers(self, agent_memory):
        # Create workers with different scores
        w1 = agent_memory.get_worker("0xgood")
        w1.reliability_score = 0.9
        w1.task_type_scores[0] = 0.8

        w2 = agent_memory.get_worker("0xbad")
        w2.reliability_score = 0.2  # Below threshold, should be filtered

        w3 = agent_memory.get_worker("0xmedium")
        w3.reliability_score = 0.6
        w3.task_type_scores[0] = 0.5

        best = agent_memory.get_best_workers_for_task(task_type=0)
        assert "0xgood" in best
        assert "0xbad" not in best  # Filtered

    def test_get_learning_insights_insufficient(self, agent_memory):
        insights = agent_memory.get_learning_insights()
        assert insights["status"] == "insufficient_data"

    def test_get_learning_insights_with_data(self, agent_memory):
        # Add enough tasks
        for i in range(10):
            task = TaskMemory(
                task_id=i, task_type=0, worker_address="0xworker",
                proposed_payment=0.5, actual_payment=0.4,
                outcome="success" if i > 3 else "failure",
                created_at=float(i), completed_at=float(i + 1),
                completion_time=1.0
            )
            agent_memory.record_task(task)

        insights = agent_memory.get_learning_insights()
        assert insights["status"] == "learning"
        assert "improvements" in insights

    def test_decision_history_limit(self, agent_memory):
        for i in range(1100):
            agent_memory.record_decision({"task_id": i})
        assert len(agent_memory.decision_history) <= 1000
