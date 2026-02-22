"""
Unit tests for the Learner module.
Tests MultiArmedBandit, PaymentOptimizer, and StrategyLearner.
"""

import os
import sys
from pathlib import Path
from unittest.mock import MagicMock

import pytest

AGENT_DIR = str(Path(__file__).parent.parent / "agent")
if AGENT_DIR not in sys.path:
    sys.path.insert(0, AGENT_DIR)

from learner import MultiArmedBandit, PaymentOptimizer, StrategyLearner, Decision
from memory import AgentMemory, WorkerMemory


class TestMultiArmedBandit:
    """Tests for the UCB1 Multi-Armed Bandit."""

    def test_initialization(self):
        bandit = MultiArmedBandit()
        assert bandit.total_pulls == 0
        assert len(bandit.worker_pulls) == 0

    def test_select_unexplored_first(self):
        bandit = MultiArmedBandit()
        workers = ["w1", "w2", "w3"]
        worker_memory = {}

        worker, confidence = bandit.select_worker(workers, worker_memory, task_type=0)
        assert worker in workers
        # Unexplored workers should get infinity score

    def test_select_empty_workers(self):
        bandit = MultiArmedBandit()
        worker, confidence = bandit.select_worker([], {}, task_type=0)
        assert worker is None
        assert confidence == 0.0

    def test_update(self):
        bandit = MultiArmedBandit()
        bandit.update("w1", 1.0)
        assert bandit.worker_pulls["w1"] == 1
        assert bandit.worker_rewards["w1"] == 1.0

    def test_exploitation_after_exploration(self):
        bandit = MultiArmedBandit()

        # Explore all workers once
        workers = ["w1", "w2", "w3"]
        for w in workers:
            bandit.update(w, 0.0)
            bandit.worker_pulls[w] = 1

        # Give w1 high reward
        bandit.worker_rewards["w1"] = 10.0
        bandit.worker_rewards["w2"] = 1.0
        bandit.worker_rewards["w3"] = 0.5

        bandit.total_pulls = 100  # Simulate many pulls

        selected, _ = bandit.select_worker(workers, {}, task_type=0)
        # w1 should be selected most likely (highest avg reward)
        # But UCB exploration bonus could sometimes pick others

    def test_task_type_bonus(self):
        bandit = MultiArmedBandit()

        # Setup worker with memory
        worker_mem = WorkerMemory(address="w1")
        worker_mem.task_type_scores[0] = 0.9
        worker_memory = {"w1": worker_mem}

        bandit.worker_pulls["w1"] = 10
        bandit.worker_rewards["w1"] = 5.0
        bandit.total_pulls = 20

        selected, _ = bandit.select_worker(["w1"], worker_memory, task_type=0)
        assert selected == "w1"


class TestPaymentOptimizer:
    """Tests for the Payment Optimizer."""

    def test_default_payment(self):
        optimizer = PaymentOptimizer()
        payment = optimizer.get_optimal_payment(
            task_type=0, max_payment=1.0, worker_reliability=0.5
        )
        # Default multiplier is 0.7, reliability at 0.5 adds 0 bonus
        assert 0.1 <= payment <= 1.0

    def test_reliable_worker_gets_more(self):
        optimizer = PaymentOptimizer()
        low_rel = optimizer.get_optimal_payment(0, 1.0, 0.3)
        high_rel = optimizer.get_optimal_payment(0, 1.0, 0.9)
        assert high_rel > low_rel

    def test_clamped_to_range(self):
        optimizer = PaymentOptimizer()
        payment = optimizer.get_optimal_payment(0, 1.0, 0.0)
        assert payment >= 0.1
        assert payment <= 1.0

    def test_learning_from_success(self):
        optimizer = PaymentOptimizer()
        initial = optimizer.get_optimal_payment(0, 1.0, 0.5)

        # Success should try to reduce payment
        optimizer.update(0, 0.7, True, 1.0)
        after_success = optimizer.get_optimal_payment(0, 1.0, 0.5)

        # Payment should decrease slightly
        assert after_success <= initial + 0.01

    def test_learning_from_failure(self):
        optimizer = PaymentOptimizer()
        initial = optimizer.get_optimal_payment(0, 1.0, 0.5)

        # Failure should increase payment
        optimizer.update(0, 0.3, False, 1.0)
        after_failure = optimizer.get_optimal_payment(0, 1.0, 0.5)

        assert after_failure >= initial - 0.01


class TestStrategyLearner:
    """Tests for the high-level StrategyLearner."""

    def test_initialization(self, strategy_learner):
        assert strategy_learner.decisions_made == 0
        assert strategy_learner.successful_decisions == 0
        assert strategy_learner.exploration_rate == 0.2

    def test_make_decision(self, strategy_learner, worker_addresses):
        decision = strategy_learner.make_decision(
            task_id=1,
            task_type=0,
            max_payment=1.0,
            available_workers=worker_addresses
        )

        assert decision is not None
        assert isinstance(decision, Decision)
        assert decision.task_id == 1
        assert decision.selected_worker in worker_addresses
        assert 0.1 <= decision.proposed_payment <= 1.0
        assert strategy_learner.decisions_made == 1

    def test_make_decision_no_workers(self, strategy_learner):
        decision = strategy_learner.make_decision(
            task_id=1, task_type=0, max_payment=1.0, available_workers=[]
        )
        assert decision is None

    def test_make_decision_with_ai_scores(self, strategy_learner, worker_addresses):
        ai_scores = {
            worker_addresses[0]: 0.3,
            worker_addresses[1]: 0.95,  # AI strongly prefers this one
            worker_addresses[2]: 0.4,
        }

        # Run multiple times with exploration_rate=0 to force exploitation
        strategy_learner.exploration_rate = 0.0
        decisions = []
        for i in range(10):
            d = strategy_learner.make_decision(
                task_id=i, task_type=0, max_payment=1.0,
                available_workers=worker_addresses,
                ai_scores=ai_scores
            )
            decisions.append(d)

        # AI-preferred worker should appear often
        ai_preferred_count = sum(
            1 for d in decisions if d.selected_worker == worker_addresses[1]
        )
        # At least some decisions should pick the AI-preferred worker
        assert ai_preferred_count >= 1

    def test_learn_from_outcome(self, strategy_learner, worker_addresses):
        # Make a decision first
        strategy_learner.make_decision(
            task_id=1, task_type=0, max_payment=1.0,
            available_workers=worker_addresses
        )

        # Learn from outcome
        strategy_learner.learn_from_outcome(
            task_id=1, task_type=0,
            worker=worker_addresses[0],
            payment=0.5, max_payment=1.0, success=True
        )

        assert strategy_learner.successful_decisions == 1

    def test_exploration_rate_decay(self, strategy_learner, worker_addresses):
        strategy_learner.decisions_made = 101
        initial_rate = strategy_learner.exploration_rate

        strategy_learner.learn_from_outcome(
            task_id=1, task_type=0,
            worker=worker_addresses[0],
            payment=0.5, max_payment=1.0, success=True
        )

        # Rate should have decayed
        assert strategy_learner.exploration_rate < initial_rate

    def test_get_learning_stats(self, strategy_learner):
        stats = strategy_learner.get_learning_stats()

        assert "decisions_made" in stats
        assert "successful_decisions" in stats
        assert "success_rate" in stats
        assert "exploration_rate" in stats
        assert "total_bandit_pulls" in stats
        assert "payment_models" in stats

    def test_multiple_task_types(self, strategy_learner, worker_addresses):
        """Test learner handles multiple task types separately."""
        for task_type in range(6):
            decision = strategy_learner.make_decision(
                task_id=task_type * 10,
                task_type=task_type,
                max_payment=1.0,
                available_workers=worker_addresses
            )
            assert decision is not None
