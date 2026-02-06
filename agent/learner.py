"""
Learner module for the Autonomous Treasury Agent.
Implements learning algorithms for improving decision-making over time.
"""

import random
import math
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple
import numpy as np
import structlog

from memory import AgentMemory, WorkerMemory, TaskOutcome

logger = structlog.get_logger()


@dataclass
class Decision:
    """A decision made by the learner."""
    task_id: int
    task_type: int
    selected_worker: str
    proposed_payment: float
    confidence: float
    reasoning: str


class MultiArmedBandit:
    """
    Multi-Armed Bandit algorithm for worker selection.
    Uses Upper Confidence Bound (UCB1) for exploration/exploitation.
    """
    
    def __init__(self, exploration_constant: float = 2.0):
        self.exploration_constant = exploration_constant
        self.worker_pulls: Dict[str, int] = {}
        self.worker_rewards: Dict[str, float] = {}
        self.total_pulls: int = 0
    
    def select_worker(
        self, 
        available_workers: List[str],
        worker_memory: Dict[str, WorkerMemory],
        task_type: int
    ) -> Tuple[str, float]:
        """
        Select the best worker using UCB1 algorithm.
        Returns (worker_address, confidence_score).
        """
        if not available_workers:
            return None, 0.0
        
        self.total_pulls += 1
        
        # Initialize new workers
        for worker in available_workers:
            if worker not in self.worker_pulls:
                self.worker_pulls[worker] = 0
                self.worker_rewards[worker] = 0.0
        
        # Calculate UCB1 scores
        scores = []
        for worker in available_workers:
            pulls = self.worker_pulls[worker]
            
            if pulls == 0:
                # Prioritize unexplored workers
                score = float('inf')
            else:
                # Average reward + exploration bonus
                avg_reward = self.worker_rewards[worker] / pulls
                
                # Add task-specific performance from memory
                memory = worker_memory.get(worker)
                if memory:
                    task_bonus = memory.task_type_scores.get(task_type, 0.5)
                    avg_reward = 0.7 * avg_reward + 0.3 * task_bonus
                
                exploration_bonus = self.exploration_constant * math.sqrt(
                    math.log(self.total_pulls) / pulls
                )
                score = avg_reward + exploration_bonus
            
            scores.append((worker, score))
        
        # Select worker with highest score
        scores.sort(key=lambda x: x[1], reverse=True)
        selected_worker, confidence = scores[0]
        
        return selected_worker, min(1.0, confidence / 2)  # Normalize confidence
    
    def update(self, worker: str, reward: float):
        """Update bandit with observed reward."""
        self.worker_pulls[worker] = self.worker_pulls.get(worker, 0) + 1
        self.worker_rewards[worker] = self.worker_rewards.get(worker, 0.0) + reward


class PaymentOptimizer:
    """
    Learns optimal payment amounts based on historical data.
    Uses gradient descent to minimize cost while maintaining task completion.
    """
    
    def __init__(self, learning_rate: float = 0.1):
        self.learning_rate = learning_rate
        # Task type -> (base_multiplier, adjustment)
        self.payment_models: Dict[int, Tuple[float, float]] = {}
    
    def get_optimal_payment(
        self,
        task_type: int,
        max_payment: float,
        worker_reliability: float
    ) -> float:
        """Calculate optimal payment amount."""
        base_mult, adjustment = self.payment_models.get(task_type, (0.7, 0.0))
        
        # Base payment from model
        base_payment = max_payment * base_mult
        
        # Adjust for worker reliability (pay more for reliable workers)
        reliability_bonus = (worker_reliability - 0.5) * 0.2 * max_payment
        
        # Apply adjustment from learning
        optimal = base_payment + reliability_bonus + adjustment
        
        # Clamp to valid range
        return max(0.1, min(max_payment, optimal))
    
    def update(self, task_type: int, payment: float, success: bool, max_payment: float):
        """Update payment model based on outcome."""
        base_mult, adjustment = self.payment_models.get(task_type, (0.7, 0.0))
        
        if success:
            # Try to reduce payment next time (successful at this level)
            gradient = -self.learning_rate * (payment / max_payment) * 0.1
        else:
            # Increase payment (wasn't enough incentive)
            gradient = self.learning_rate * (1 - payment / max_payment) * 0.2
        
        new_adjustment = adjustment + gradient
        self.payment_models[task_type] = (base_mult, new_adjustment)
        
        logger.debug("Payment model updated",
                    task_type=task_type,
                    adjustment=new_adjustment)


class StrategyLearner:
    """
    High-level learning strategy that combines worker selection and payment optimization.
    """
    
    def __init__(
        self,
        memory: AgentMemory,
        exploration_rate: float = 0.2,
        learning_rate: float = 0.1
    ):
        self.memory = memory
        self.exploration_rate = exploration_rate
        
        self.bandit = MultiArmedBandit()
        self.payment_optimizer = PaymentOptimizer(learning_rate)
        
        # Performance tracking
        self.decisions_made = 0
        self.successful_decisions = 0
        
        logger.info("Strategy learner initialized",
                   exploration_rate=exploration_rate,
                   learning_rate=learning_rate)
    
    def make_decision(
        self,
        task_id: int,
        task_type: int,
        max_payment: float,
        available_workers: List[str]
    ) -> Optional[Decision]:
        """
        Make a decision about which worker to assign and how much to pay.
        This is the main learning algorithm entry point.
        """
        if not available_workers:
            logger.warning("No available workers for task", task_id=task_id)
            return None
        
        self.decisions_made += 1
        
        # Exploration vs exploitation
        if random.random() < self.exploration_rate:
            # Explore: random selection
            selected_worker = random.choice(available_workers)
            confidence = 0.3
            reasoning = "Exploration: random worker selection"
            logger.debug("Exploration decision", task_id=task_id, worker=selected_worker[:10])
        else:
            # Exploit: use bandit algorithm
            selected_worker, confidence = self.bandit.select_worker(
                available_workers,
                self.memory.workers,
                task_type
            )
            reasoning = f"Exploitation: UCB1 score-based selection (confidence: {confidence:.2f})"
            logger.debug("Exploitation decision", task_id=task_id, worker=selected_worker[:10])
        
        # Get worker data
        worker_memory = self.memory.get_worker(selected_worker)
        
        # Calculate optimal payment
        proposed_payment = self.payment_optimizer.get_optimal_payment(
            task_type=task_type,
            max_payment=max_payment,
            worker_reliability=worker_memory.reliability_score
        )
        
        decision = Decision(
            task_id=task_id,
            task_type=task_type,
            selected_worker=selected_worker,
            proposed_payment=proposed_payment,
            confidence=confidence,
            reasoning=reasoning
        )
        
        # Record decision for learning
        self.memory.record_decision({
            "task_id": task_id,
            "task_type": task_type,
            "worker": selected_worker,
            "payment": proposed_payment,
            "confidence": confidence,
            "exploration": reasoning.startswith("Exploration")
        })
        
        logger.info("Decision made",
                   task_id=task_id,
                   worker=selected_worker[:10] + "...",
                   payment=f"{proposed_payment:.4f}",
                   confidence=f"{confidence:.2f}")
        
        return decision
    
    def learn_from_outcome(
        self,
        task_id: int,
        task_type: int,
        worker: str,
        payment: float,
        max_payment: float,
        success: bool
    ):
        """
        Update learning models based on task outcome.
        This is called after a task completes.
        """
        # Calculate reward (higher for success with lower payment)
        if success:
            reward = 1.0 - (payment / max_payment) * 0.3  # Bonus for efficiency
            self.successful_decisions += 1
        else:
            reward = -0.5
        
        # Update bandit
        self.bandit.update(worker, reward)
        
        # Update payment model
        self.payment_optimizer.update(task_type, payment, success, max_payment)
        
        # Decay exploration rate over time
        if self.decisions_made > 100 and self.exploration_rate > 0.05:
            self.exploration_rate *= 0.999
        
        success_rate = self.successful_decisions / max(1, self.decisions_made)
        
        logger.info("Learned from outcome",
                   task_id=task_id,
                   success=success,
                   reward=f"{reward:.2f}",
                   overall_success_rate=f"{success_rate:.2%}",
                   exploration_rate=f"{self.exploration_rate:.2%}")
    
    def get_learning_stats(self) -> Dict:
        """Get current learning statistics."""
        return {
            "decisions_made": self.decisions_made,
            "successful_decisions": self.successful_decisions,
            "success_rate": self.successful_decisions / max(1, self.decisions_made),
            "exploration_rate": self.exploration_rate,
            "total_bandit_pulls": self.bandit.total_pulls,
            "payment_models": len(self.payment_optimizer.payment_models)
        }
