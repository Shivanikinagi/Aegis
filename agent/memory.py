"""
Memory module for the Autonomous Treasury Agent.
Maintains agent state, historical data, and learning metrics.
"""

import json
import time
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Dict, List, Optional
from enum import Enum
import structlog

logger = structlog.get_logger()


class TaskOutcome(Enum):
    """Possible outcomes for a task."""
    SUCCESS = "success"
    FAILURE = "failure"
    TIMEOUT = "timeout"
    CANCELLED = "cancelled"


@dataclass
class WorkerMemory:
    """Memory of a worker's performance."""
    address: str
    total_tasks: int = 0
    successful_tasks: int = 0
    failed_tasks: int = 0
    total_earnings: float = 0.0
    average_completion_time: float = 0.0
    reliability_score: float = 0.5  # 0-1 scale
    task_type_scores: Dict[int, float] = field(default_factory=dict)
    last_task_at: float = 0.0
    
    @property
    def success_rate(self) -> float:
        """Calculate success rate."""
        if self.total_tasks == 0:
            return 0.5  # Default neutral
        return self.successful_tasks / self.total_tasks
    
    def update(self, outcome: TaskOutcome, task_type: int, earnings: float = 0, completion_time: float = 0):
        """Update worker memory with new task outcome."""
        self.total_tasks += 1
        self.last_task_at = time.time()
        
        if outcome == TaskOutcome.SUCCESS:
            self.successful_tasks += 1
            self.total_earnings += earnings
            
            # Update average completion time
            if self.average_completion_time == 0:
                self.average_completion_time = completion_time
            else:
                self.average_completion_time = (
                    0.7 * self.average_completion_time + 0.3 * completion_time
                )
            
            # Update task type score
            current_score = self.task_type_scores.get(task_type, 0.5)
            self.task_type_scores[task_type] = min(1.0, current_score + 0.1)
            
            # Update reliability
            self.reliability_score = min(1.0, self.reliability_score + 0.05)
        else:
            self.failed_tasks += 1
            
            # Update task type score
            current_score = self.task_type_scores.get(task_type, 0.5)
            self.task_type_scores[task_type] = max(0.0, current_score - 0.15)
            
            # Update reliability
            self.reliability_score = max(0.0, self.reliability_score - 0.1)


@dataclass
class TaskMemory:
    """Memory of a task execution."""
    task_id: int
    task_type: int
    worker_address: str
    proposed_payment: float
    actual_payment: float
    outcome: str
    created_at: float
    completed_at: float
    completion_time: float
    verification_result: Optional[bool] = None


@dataclass
class StrategyMetrics:
    """Metrics for evaluating strategy performance."""
    total_decisions: int = 0
    successful_allocations: int = 0
    failed_allocations: int = 0
    total_spent: float = 0.0
    total_value_delivered: float = 0.0
    average_cost_per_success: float = 0.0
    roi: float = 0.0  # Return on investment (value / cost)
    
    # Learning improvement metrics
    recent_success_rate: float = 0.0  # Last 10 tasks
    historical_success_rate: float = 0.0  # Overall
    cost_efficiency_trend: List[float] = field(default_factory=list)  # Cost per success over time
    decision_quality_score: float = 0.0  # 0-1 scale
    
    def update(self, success: bool, cost: float, value: float = 0):
        """Update strategy metrics."""
        self.total_decisions += 1
        self.total_spent += cost
        
        if success:
            self.successful_allocations += 1
            self.total_value_delivered += value
        else:
            self.failed_allocations += 1
        
        # Calculate averages
        if self.successful_allocations > 0:
            self.average_cost_per_success = self.total_spent / self.successful_allocations
            
            # Track cost efficiency trend
            self.cost_efficiency_trend.append(self.average_cost_per_success)
            if len(self.cost_efficiency_trend) > 50:  # Keep last 50
                self.cost_efficiency_trend.pop(0)
        
        if self.total_spent > 0:
            self.roi = self.total_value_delivered / self.total_spent
        
        # Calculate overall success rate
        if self.total_decisions > 0:
            self.historical_success_rate = self.successful_allocations / self.total_decisions
        
        # Calculate decision quality (combines success rate and cost efficiency)
        success_factor = self.historical_success_rate
        efficiency_factor = min(1.0, self.roi / 2.0) if self.roi > 0 else 0
        self.decision_quality_score = 0.6 * success_factor + 0.4 * efficiency_factor


class AgentMemory:
    """
    Main memory class for the Coordinator Agent.
    Persists to disk and provides fast in-memory access.
    """
    
    def __init__(self, data_dir: str = "data"):
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)
        
        # In-memory state
        self.workers: Dict[str, WorkerMemory] = {}
        self.tasks: Dict[int, TaskMemory] = {}
        self.strategy_metrics = StrategyMetrics()
        
        # Decision history for learning
        self.decision_history: List[Dict] = []
        
        # Load existing data
        self._load()
        
        logger.info("Agent memory initialized", 
                   workers=len(self.workers), 
                   tasks=len(self.tasks))
    
    def get_worker(self, address: str) -> WorkerMemory:
        """Get or create worker memory."""
        address = address.lower()
        if address not in self.workers:
            self.workers[address] = WorkerMemory(address=address)
        return self.workers[address]
    
    def record_task(self, task_memory: TaskMemory):
        """Record a completed task."""
        self.tasks[task_memory.task_id] = task_memory
        
        # Update worker memory
        worker = self.get_worker(task_memory.worker_address)
        outcome = TaskOutcome(task_memory.outcome)
        worker.update(
            outcome=outcome,
            task_type=task_memory.task_type,
            earnings=task_memory.actual_payment,
            completion_time=task_memory.completion_time
        )
        
        # Update strategy metrics
        success = outcome == TaskOutcome.SUCCESS
        self.strategy_metrics.update(
            success=success,
            cost=task_memory.actual_payment,
            value=task_memory.actual_payment * 1.5 if success else 0  # Assume 1.5x value
        )
        
        # Save to disk
        self._save()
        
        logger.info("Task recorded",
                   task_id=task_memory.task_id,
                   outcome=task_memory.outcome,
                   worker=task_memory.worker_address[:10] + "...")
    
    def record_decision(self, decision: Dict):
        """Record a decision for learning."""
        decision["timestamp"] = time.time()
        self.decision_history.append(decision)
        
        # Keep only last 1000 decisions
        if len(self.decision_history) > 1000:
            self.decision_history = self.decision_history[-1000:]
        
        self._save()
    
    def get_best_workers_for_task(self, task_type: int, limit: int = 5) -> List[str]:
        """Get the best workers for a specific task type."""
        scored_workers = []
        
        for address, worker in self.workers.items():
            if worker.reliability_score < 0.3:  # Skip unreliable workers
                continue
            
            task_score = worker.task_type_scores.get(task_type, 0.5)
            combined_score = (
                0.4 * worker.reliability_score +
                0.4 * task_score +
                0.2 * worker.success_rate
            )
            
            scored_workers.append((address, combined_score))
        
        # Sort by score descending
        scored_workers.sort(key=lambda x: x[1], reverse=True)
        
        return [w[0] for w in scored_workers[:limit]]
    
    def get_recommended_payment(self, worker_address: str, max_payment: float) -> float:
        """Get recommended payment based on worker performance."""
        worker = self.get_worker(worker_address)
        
        # High performers get more
        multiplier = 0.5 + (0.5 * worker.reliability_score)
        
        recommended = max_payment * multiplier
        return max(0.1, min(max_payment, recommended))  # Clamp to valid range
    
    def get_metrics_summary(self) -> Dict:
        """Get a summary of current metrics."""
        # Calculate recent performance (last 20 tasks)
        recent_tasks = list(self.tasks.values())[-20:]
        recent_successes = sum(1 for t in recent_tasks if t.outcome == "success")
        recent_success_rate = recent_successes / len(recent_tasks) if recent_tasks else 0
        
        # Calculate improvement trend
        if len(self.strategy_metrics.cost_efficiency_trend) >= 10:
            early_avg = sum(self.strategy_metrics.cost_efficiency_trend[:5]) / 5
            recent_avg = sum(self.strategy_metrics.cost_efficiency_trend[-5:]) / 5
            improvement = ((early_avg - recent_avg) / early_avg * 100) if early_avg > 0 else 0
        else:
            improvement = 0
        
        return {
            "total_workers": len(self.workers),
            "total_tasks": len(self.tasks),
            "recent_success_rate": recent_success_rate,
            "improvement_percentage": improvement,
            "strategy": asdict(self.strategy_metrics),
            "top_workers": [
                {
                    "address": addr[:10] + "...",
                    "reliability": w.reliability_score,
                    "success_rate": w.success_rate,
                    "total_tasks": w.total_tasks
                }
                for addr, w in sorted(
                    self.workers.items(),
                    key=lambda x: x[1].reliability_score,
                    reverse=True
                )[:5]
            ]
        }
    
    def get_learning_insights(self) -> Dict:
        """Get insights about agent learning and improvement."""
        tasks_list = list(self.tasks.values())
        
        if len(tasks_list) < 5:
            return {
                "status": "insufficient_data",
                "message": "Need at least 5 tasks to show learning trends",
                "total_tasks": len(tasks_list)
            }
        
        # Split into early and recent periods
        split_point = len(tasks_list) // 2
        early_tasks = tasks_list[:split_point]
        recent_tasks = tasks_list[split_point:]
        
        # Calculate metrics for each period
        early_success = sum(1 for t in early_tasks if t.outcome == "success")
        recent_success = sum(1 for t in recent_tasks if t.outcome == "success")
        
        early_success_rate = early_success / len(early_tasks)
        recent_success_rate = recent_success / len(recent_tasks)
        
        early_avg_cost = sum(t.actual_payment for t in early_tasks) / len(early_tasks)
        recent_avg_cost = sum(t.actual_payment for t in recent_tasks) / len(recent_tasks)
        
        success_improvement = ((recent_success_rate - early_success_rate) / early_success_rate * 100) if early_success_rate > 0 else 0
        cost_reduction = ((early_avg_cost - recent_avg_cost) / early_avg_cost * 100) if early_avg_cost > 0 else 0
        
        return {
            "status": "learning",
            "total_tasks_analyzed": len(tasks_list),
            "early_period": {
                "tasks": len(early_tasks),
                "success_rate": early_success_rate,
                "avg_cost": early_avg_cost
            },
            "recent_period": {
                "tasks": len(recent_tasks),
                "success_rate": recent_success_rate,
                "avg_cost": recent_avg_cost
            },
            "improvements": {
                "success_rate_change": success_improvement,
                "cost_reduction": cost_reduction,
                "decision_quality": self.strategy_metrics.decision_quality_score
            },
            "message": f"Agent {'improving' if success_improvement > 0 else 'learning'}: {abs(success_improvement):.1f}% success change, {abs(cost_reduction):.1f}% cost {'reduction' if cost_reduction > 0 else 'increase'}"
        }
    
    def _save(self):
        """Save memory to disk."""
        data = {
            "workers": {k: asdict(v) for k, v in self.workers.items()},
            "tasks": {str(k): asdict(v) for k, v in self.tasks.items()},
            "strategy_metrics": asdict(self.strategy_metrics),
            "decision_history": self.decision_history[-100:]  # Keep last 100
        }
        
        filepath = self.data_dir / "memory.json"
        with open(filepath, "w") as f:
            json.dump(data, f, indent=2)
    
    def _load(self):
        """Load memory from disk."""
        filepath = self.data_dir / "memory.json"
        if not filepath.exists():
            return
        
        try:
            with open(filepath, "r") as f:
                data = json.load(f)
            
            # Restore workers
            for addr, worker_data in data.get("workers", {}).items():
                self.workers[addr] = WorkerMemory(**worker_data)
            
            # Restore tasks
            for task_id, task_data in data.get("tasks", {}).items():
                self.tasks[int(task_id)] = TaskMemory(**task_data)
            
            # Restore strategy metrics
            if "strategy_metrics" in data:
                self.strategy_metrics = StrategyMetrics(**data["strategy_metrics"])
            
            # Restore decision history
            self.decision_history = data.get("decision_history", [])
            
            logger.info("Memory loaded from disk",
                       workers=len(self.workers),
                       tasks=len(self.tasks))
        except Exception as e:
            logger.error("Failed to load memory", error=str(e))
