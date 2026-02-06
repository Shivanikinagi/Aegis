"""
Coordinator Agent - The main AI agent for the Autonomous Treasury system.
This agent observes tasks, makes decisions, and proposes payments.
It learns from outcomes to improve over time.
"""

import asyncio
import time
from typing import Dict, List, Optional
import structlog

from config import agent_config, validate_config
from memory import AgentMemory, TaskMemory, TaskOutcome
from learner import StrategyLearner, Decision
from blockchain import BlockchainClient, Task, TaskStatus, TaskType

logger = structlog.get_logger()


class CoordinatorAgent:
    """
    The Coordinator Agent that manages the treasury autonomously.
    
    Key responsibilities:
    1. Monitor for new tasks
    2. Select optimal workers
    3. Propose payments (within rules)
    4. Verify task completion
    5. Learn from outcomes
    
    IMPORTANT: This agent CANNOT move funds directly.
    It can only propose - the contract enforces all rules.
    """
    
    def __init__(self):
        # Initialize components
        self.memory = AgentMemory(data_dir="data")
        self.learner = StrategyLearner(
            memory=self.memory,
            exploration_rate=agent_config.exploration_rate,
            learning_rate=agent_config.learning_rate
        )
        self.blockchain = BlockchainClient()
        
        # State tracking
        self.running = False
        self.processed_tasks: set = set()
        self.pending_verifications: Dict[int, float] = {}  # task_id -> submitted_at
        
        # Metrics
        self.cycle_count = 0
        self.proposals_made = 0
        self.verifications_done = 0
        
        logger.info("Coordinator Agent initialized",
                   exploration_rate=agent_config.exploration_rate,
                   polling_interval=agent_config.polling_interval)
    
    async def start(self):
        """Start the agent's main loop."""
        logger.info("Starting Coordinator Agent...")
        
        if not self.blockchain.is_connected():
            logger.error("Cannot connect to blockchain")
            return
        
        logger.info("Connected to blockchain",
                   chain_id=self.blockchain.get_chain_id(),
                   block=self.blockchain.get_block_number())
        
        self.running = True
        
        try:
            while self.running:
                await self._run_cycle()
                await asyncio.sleep(agent_config.polling_interval)
        except KeyboardInterrupt:
            logger.info("Agent stopped by user")
        except Exception as e:
            logger.error("Agent error", error=str(e))
            raise
        finally:
            self.running = False
            logger.info("Agent stopped")
    
    async def _run_cycle(self):
        """Run one decision cycle."""
        self.cycle_count += 1
        
        logger.debug("Running cycle", cycle=self.cycle_count)
        
        # 1. Check treasury status
        total, reserved, available = self.blockchain.get_treasury_balance()
        remaining_budget = self.blockchain.get_remaining_daily_budget()
        
        logger.debug("Treasury status",
                    total=f"{total:.4f}",
                    available=f"{available:.4f}",
                    daily_remaining=f"{remaining_budget:.4f}")
        
        if available <= 0 or remaining_budget <= 0:
            logger.warning("Insufficient funds or budget exhausted")
            return
        
        # 2. Get open tasks
        open_task_ids = self.blockchain.get_open_tasks()
        
        for task_id in open_task_ids:
            if task_id in self.processed_tasks:
                continue
            
            await self._process_task(task_id, available, remaining_budget)
        
        # 3. Check for tasks needing verification
        await self._check_pending_verifications()
        
        # 4. Log metrics periodically
        if self.cycle_count % 10 == 0:
            self._log_metrics()
    
    async def _process_task(
        self,
        task_id: int,
        available_balance: float,
        remaining_budget: float
    ):
        """Process a single open task."""
        task = self.blockchain.get_task(task_id)
        
        if not task:
            logger.warning("Could not fetch task", task_id=task_id)
            return
        
        # Check if task is still open
        if task.status != TaskStatus.CREATED:
            self.processed_tasks.add(task_id)
            return
        
        # Check deadline
        if task.deadline < time.time():
            logger.info("Task expired", task_id=task_id)
            self.processed_tasks.add(task_id)
            return
        
        max_payment_mon = float(self.blockchain.w3.from_wei(task.max_payment, "ether"))
        
        # Check if we can afford this task
        if max_payment_mon > available_balance or max_payment_mon > remaining_budget:
            logger.debug("Cannot afford task",
                        task_id=task_id,
                        max_payment=max_payment_mon)
            return
        
        # Get available workers for this task type
        available_workers = self.blockchain.get_workers_for_task_type(int(task.task_type))
        
        if not available_workers:
            logger.warning("No workers available for task type",
                          task_id=task_id,
                          task_type=task.task_type.name)
            return
        
        # Sync worker data to memory
        for worker_addr in available_workers:
            worker_data = self.blockchain.get_worker(worker_addr)
            if worker_data:
                worker_mem = self.memory.get_worker(worker_addr.lower())
                # Sync on-chain reliability to memory
                worker_mem.reliability_score = worker_data.reliability_score / 10000
        
        # Make decision using learner
        decision = self.learner.make_decision(
            task_id=task_id,
            task_type=int(task.task_type),
            max_payment=max_payment_mon,
            available_workers=[w.lower() for w in available_workers]
        )
        
        if not decision:
            logger.warning("Learner could not make decision", task_id=task_id)
            return
        
        # Propose assignment on-chain
        payment_wei = self.blockchain.w3.to_wei(decision.proposed_payment, "ether")
        
        success, result = self.blockchain.propose_assignment(
            task_id=task_id,
            worker=decision.selected_worker,
            payment=payment_wei
        )
        
        if success:
            self.proposals_made += 1
            self.processed_tasks.add(task_id)
            
            logger.info("Proposal accepted",
                       task_id=task_id,
                       worker=decision.selected_worker[:10] + "...",
                       payment=f"{decision.proposed_payment:.4f} MON")
        else:
            logger.warning("Proposal rejected",
                          task_id=task_id,
                          reason=result)
    
    async def _check_pending_verifications(self):
        """Check tasks that need verification."""
        # Get all tasks and check for submitted ones
        task_count = self.blockchain.get_task_count()
        
        for task_id in range(1, task_count + 1):
            task = self.blockchain.get_task(task_id)
            
            if not task:
                continue
            
            if task.status == TaskStatus.SUBMITTED:
                await self._verify_task(task)
            elif task.status in [TaskStatus.COMPLETED, TaskStatus.FAILED]:
                if task_id not in self.processed_tasks:
                    await self._learn_from_task(task)
    
    async def _verify_task(self, task: Task):
        """Verify a submitted task."""
        # Simple verification logic based on verification rule
        # In production, this would be more sophisticated
        
        verified = self._apply_verification_rule(task)
        
        success, result = self.blockchain.verify_and_complete(task.id, verified)
        
        if success:
            self.verifications_done += 1
            
            logger.info("Task verification submitted",
                       task_id=task.id,
                       verified=verified,
                       tx_hash=result)
    
    def _apply_verification_rule(self, task: Task) -> bool:
        """
        Apply the verification rule to determine if task succeeded.
        This is a simplified implementation - production would be more robust.
        """
        # If there's a result hash, assume it's valid (simplified)
        if task.result_hash and task.result_hash != bytes(32):
            return True
        
        # Parse verification rule (e.g., "length > 200")
        rule = task.verification_rule.lower().strip()
        
        if not rule:
            # No rule = auto-pass if result submitted
            return task.result_hash != bytes(32)
        
        # For demo: just check that result was submitted before deadline
        return time.time() <= task.deadline
    
    async def _learn_from_task(self, task: Task):
        """Learn from a completed/failed task."""
        self.processed_tasks.add(task.id)
        
        success = task.status == TaskStatus.COMPLETED
        
        max_payment_mon = float(self.blockchain.w3.from_wei(task.max_payment, "ether"))
        actual_payment_mon = float(self.blockchain.w3.from_wei(task.actual_payment, "ether"))
        
        # Update learner
        self.learner.learn_from_outcome(
            task_id=task.id,
            task_type=int(task.task_type),
            worker=task.assigned_worker.lower(),
            payment=actual_payment_mon,
            max_payment=max_payment_mon,
            success=success
        )
        
        # Record in memory
        completion_time = task.completed_at - task.created_at if task.completed_at > 0 else 0
        
        task_memory = TaskMemory(
            task_id=task.id,
            task_type=int(task.task_type),
            worker_address=task.assigned_worker.lower(),
            proposed_payment=actual_payment_mon,  # We don't have original proposal
            actual_payment=actual_payment_mon,
            outcome=TaskOutcome.SUCCESS.value if success else TaskOutcome.FAILURE.value,
            created_at=float(task.created_at),
            completed_at=float(task.completed_at),
            completion_time=float(completion_time),
            verification_result=success
        )
        
        self.memory.record_task(task_memory)
        
        logger.info("Learned from task",
                   task_id=task.id,
                   success=success,
                   payment=f"{actual_payment_mon:.4f} MON")
    
    def _log_metrics(self):
        """Log current agent metrics."""
        metrics = self.memory.get_metrics_summary()
        learning_stats = self.learner.get_learning_stats()
        
        logger.info("Agent metrics",
                   cycles=self.cycle_count,
                   proposals=self.proposals_made,
                   verifications=self.verifications_done,
                   success_rate=f"{learning_stats['success_rate']:.2%}",
                   exploration_rate=f"{learning_stats['exploration_rate']:.2%}",
                   total_tasks=metrics['total_tasks'],
                   roi=f"{metrics['strategy']['roi']:.2f}")
    
    def get_status(self) -> Dict:
        """Get current agent status."""
        total, reserved, available = self.blockchain.get_treasury_balance()
        
        return {
            "running": self.running,
            "cycle_count": self.cycle_count,
            "proposals_made": self.proposals_made,
            "verifications_done": self.verifications_done,
            "treasury": {
                "total": total,
                "reserved": reserved,
                "available": available,
                "daily_spent": self.blockchain.get_daily_spent(),
                "daily_remaining": self.blockchain.get_remaining_daily_budget()
            },
            "learning": self.learner.get_learning_stats(),
            "metrics": self.memory.get_metrics_summary()
        }
    
    def stop(self):
        """Stop the agent."""
        self.running = False
        logger.info("Agent stop requested")


async def main():
    """Main entry point."""
    print("""
    ╔═══════════════════════════════════════════════════════════╗
    ║       🏦 AUTONOMOUS TREASURY AGENT - COORDINATOR 🏦        ║
    ║                                                           ║
    ║  "The agent decides. The contract enforces."              ║
    ╚═══════════════════════════════════════════════════════════╝
    """)
    
    # Validate configuration
    if not validate_config():
        print("\n❌ Configuration invalid. Please check your .env file.")
        print("See .env.example for required variables.")
        return
    
    # Create and start agent
    agent = CoordinatorAgent()
    
    try:
        await agent.start()
    except KeyboardInterrupt:
        print("\n👋 Shutting down gracefully...")
        agent.stop()


if __name__ == "__main__":
    asyncio.run(main())
