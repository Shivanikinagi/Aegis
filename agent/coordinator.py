"""
Coordinator Agent - The main AI agent for the Autonomous Treasury system.
This agent observes tasks, makes decisions, and proposes payments.
It learns from outcomes to improve over time.
"""

import asyncio
import os
import time
from typing import Dict, List, Optional
import structlog

from config import agent_config, validate_config
from memory import AgentMemory, TaskMemory, TaskOutcome
from learner import StrategyLearner, Decision
from blockchain import BlockchainClient, Task, TaskStatus, TaskType
from notifications import notify_high_value_task_completed

# Optional AI reasoning integration
try:
    from ai_reasoning import AIReasoner, LLMProvider
    AI_REASONING_AVAILABLE = True
except ImportError:
    AI_REASONING_AVAILABLE = False

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
        
        # Initialize AI Reasoner (hybrid AI: UCB1 + LLM)
        self.ai_reasoner = None
        if AI_REASONING_AVAILABLE:
            self._init_ai_reasoner()
        
        # State tracking
        self.running = False
        self.processed_tasks: set = set()
        self.pending_verifications: Dict[int, float] = {}  # task_id -> submitted_at
        
        # Metrics
        self.cycle_count = 0
        self.proposals_made = 0
        self.verifications_done = 0
        self.ai_analyses = 0
        
        logger.info("Coordinator Agent initialized",
                   exploration_rate=agent_config.exploration_rate,
                   polling_interval=agent_config.polling_interval,
                   ai_reasoning=self.ai_reasoner is not None)
    
    def _init_ai_reasoner(self):
        """Initialize AI reasoner from available API keys."""
        try:
            grok_key = os.getenv("GROK_API_KEY")
            openai_key = os.getenv("OPENAI_API_KEY")
            anthropic_key = os.getenv("ANTHROPIC_API_KEY")
            
            if grok_key:
                self.ai_reasoner = AIReasoner(
                    provider=LLMProvider.GROK,
                    grok_api_key=grok_key
                )
                logger.info("AI Reasoner initialized with Grok")
            elif openai_key:
                self.ai_reasoner = AIReasoner(
                    provider=LLMProvider.OPENAI,
                    openai_api_key=openai_key
                )
                logger.info("AI Reasoner initialized with OpenAI")
            elif anthropic_key:
                self.ai_reasoner = AIReasoner(
                    provider=LLMProvider.ANTHROPIC,
                    anthropic_api_key=anthropic_key
                )
                logger.info("AI Reasoner initialized with Anthropic")
            else:
                logger.info("No LLM API keys found, running with UCB1 only")
                self.ai_reasoner = None
        except Exception as e:
            logger.warning("Failed to initialize AI Reasoner, falling back to UCB1 only",
                         error=str(e))
            self.ai_reasoner = None
    
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
        
        # === AI-Enhanced Decision Making (Hybrid: UCB1 + LLM) ===
        ai_analysis = None
        ai_worker_scores = {}
        
        if self.ai_reasoner:
            try:
                # Use LLM to analyze task complexity and requirements
                ai_analysis = await self.ai_reasoner.analyze_task(task)
                self.ai_analyses += 1
                
                logger.info("AI task analysis complete",
                           task_id=task_id,
                           complexity=ai_analysis.get("complexity"),
                           risk=ai_analysis.get("risk_level"))
                
                # Use LLM to score each worker for this task
                for worker_addr in available_workers[:5]:  # Limit API calls
                    worker_data = self.blockchain.get_worker(worker_addr)
                    worker_mem = self.memory.get_worker(worker_addr.lower())
                    
                    worker_history = {
                        'total_tasks': worker_data.total_tasks if worker_data else 0,
                        'success_rate': worker_mem.success_rate,
                        'avg_time': worker_mem.average_completion_time,
                        'reliability': worker_data.reliability_score if worker_data else 0,
                        'recent_performance': 'Good' if worker_mem.success_rate > 0.7 else 'Average'
                    }
                    
                    score, reasoning = await self.ai_reasoner.assess_worker_match(
                        task, worker_addr, worker_history
                    )
                    ai_worker_scores[worker_addr.lower()] = score
                    
            except Exception as e:
                logger.warning("AI reasoning failed, falling back to UCB1",
                             task_id=task_id, error=str(e))
        
        # Make decision using learner (UCB1) — enhanced with AI scores
        decision = self.learner.make_decision(
            task_id=task_id,
            task_type=int(task.task_type),
            max_payment=max_payment_mon,
            available_workers=[w.lower() for w in available_workers],
            ai_scores=ai_worker_scores if ai_worker_scores else None
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
        """Verify a submitted task using AI + rule-based hybrid approach."""
        # Try AI-based verification first
        ai_verified = None
        ai_confidence = 0.0
        
        if self.ai_reasoner:
            try:
                is_valid, reasoning, confidence = await self.ai_reasoner.verify_task_completion(
                    task,
                    proposed_outcome=task.verification_rule or "Task completion",
                    worker_submission=f"Result hash: {task.result_hash.hex() if isinstance(task.result_hash, bytes) else task.result_hash}"
                )
                ai_verified = is_valid
                ai_confidence = confidence
                
                logger.info("AI verification result",
                           task_id=task.id,
                           ai_verified=ai_verified,
                           confidence=f"{ai_confidence:.2f}",
                           reasoning=reasoning[:100])
            except Exception as e:
                logger.warning("AI verification failed, using rule-based",
                             task_id=task.id, error=str(e))
        
        # Rule-based verification as fallback or confirmation
        rule_verified = self._apply_verification_rule(task)
        
        # Hybrid decision: if AI is confident, use AI; otherwise fallback to rules
        if ai_verified is not None and ai_confidence >= 0.7:
            verified = ai_verified
        elif ai_verified is not None and ai_confidence >= 0.5:
            # Medium confidence: agree with rules if both say the same thing
            verified = ai_verified and rule_verified
        else:
            verified = rule_verified
        
        success, result = self.blockchain.verify_and_complete(task.id, verified)
        
        if success:
            self.verifications_done += 1
            
            logger.info("Task verification submitted",
                       task_id=task.id,
                       verified=verified,
                       method="ai+rules" if ai_verified is not None else "rules",
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

        # Notify if high value
        if actual_payment_mon > 100:
             asyncio.create_task(notify_high_value_task_completed(
                task_id=task.id,
                worker=task.assigned_worker,
                amount=actual_payment_mon,
                success=success
            ))
        
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
            "ai_analyses": self.ai_analyses,
            "ai_reasoning_enabled": self.ai_reasoner is not None,
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
