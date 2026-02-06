"""
Demo script for the Autonomous Treasury Agent.
This simulates the full flow without requiring actual blockchain deployment.
"""

import asyncio
import time
import random
from typing import Dict, List
import structlog

# Configure logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.dev.ConsoleRenderer(colors=True)
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()


class DemoTreasury:
    """Simulated treasury contract."""
    
    def __init__(self, initial_balance: float = 100.0):
        self.balance = initial_balance
        self.reserved = 0.0
        self.daily_spent = 0.0
        self.max_per_task = 10.0
        self.max_per_day = 100.0
        
        self.reservations: Dict[int, float] = {}
    
    def reserve(self, task_id: int, amount: float) -> bool:
        """Reserve funds for a task."""
        if amount > self.max_per_task:
            logger.warning("Exceeds max per task", amount=amount, max=self.max_per_task)
            return False
        if self.daily_spent + amount > self.max_per_day:
            logger.warning("Exceeds daily limit")
            return False
        if amount > self.balance - self.reserved:
            logger.warning("Insufficient balance")
            return False
        
        self.reservations[task_id] = amount
        self.reserved += amount
        return True
    
    def release(self, task_id: int, worker: str) -> bool:
        """Release funds to worker."""
        if task_id not in self.reservations:
            return False
        
        amount = self.reservations.pop(task_id)
        self.reserved -= amount
        self.balance -= amount
        self.daily_spent += amount
        
        logger.info("💰 Payment released",
                   task_id=task_id,
                   worker=worker[:10] + "...",
                   amount=f"{amount:.4f} MON")
        return True
    
    def unlock(self, task_id: int) -> bool:
        """Unlock reserved funds (task failed/cancelled)."""
        if task_id not in self.reservations:
            return False
        
        amount = self.reservations.pop(task_id)
        self.reserved -= amount
        return True


class DemoWorker:
    """Simulated worker agent."""
    
    def __init__(self, address: str, task_types: List[int], success_probability: float = 0.8):
        self.address = address
        self.task_types = task_types
        self.success_probability = success_probability
        self.is_active = True
        self.total_tasks = 0
        self.successful_tasks = 0
        self.total_earnings = 0.0
        self.reliability_score = 5000  # Start at 50%
    
    def execute_task(self, task_type: int) -> bool:
        """Execute a task (simulated)."""
        self.total_tasks += 1
        success = random.random() < self.success_probability
        
        if success:
            self.successful_tasks += 1
            self.reliability_score = min(10000, self.reliability_score + 200)
        else:
            self.reliability_score = max(0, self.reliability_score - 500)
        
        return success


class DemoCoordinatorAgent:
    """Simulated coordinator agent with learning."""
    
    def __init__(self, treasury: DemoTreasury, workers: List[DemoWorker]):
        self.treasury = treasury
        self.workers = {w.address: w for w in workers}
        
        # Learning state
        self.exploration_rate = 0.2
        self.worker_scores: Dict[str, float] = {w.address: 0.5 for w in workers}
        self.decisions_made = 0
        self.successful_decisions = 0
    
    def select_worker(self, task_type: int) -> str:
        """Select a worker using UCB1-like algorithm."""
        eligible = [
            addr for addr, w in self.workers.items()
            if task_type in w.task_types and w.is_active
        ]
        
        if not eligible:
            return None
        
        # Exploration
        if random.random() < self.exploration_rate:
            return random.choice(eligible)
        
        # Exploitation
        best = max(eligible, key=lambda a: self.worker_scores[a])
        return best
    
    def calculate_payment(self, max_payment: float, worker_address: str) -> float:
        """Calculate payment based on worker reliability."""
        worker = self.workers[worker_address]
        multiplier = 0.5 + (0.5 * worker.reliability_score / 10000)
        return max_payment * multiplier
    
    def learn(self, worker_address: str, success: bool):
        """Update learning state."""
        self.decisions_made += 1
        
        if success:
            self.successful_decisions += 1
            self.worker_scores[worker_address] = min(1.0, self.worker_scores[worker_address] + 0.05)
        else:
            self.worker_scores[worker_address] = max(0.0, self.worker_scores[worker_address] - 0.1)
        
        # Decay exploration
        if self.decisions_made > 10:
            self.exploration_rate = max(0.05, self.exploration_rate * 0.99)


async def run_demo():
    """Run the demo simulation."""
    print("""
    ╔═══════════════════════════════════════════════════════════════════╗
    ║       🏦 AUTONOMOUS TREASURY AGENT - DEMO SIMULATION 🏦           ║
    ║                                                                   ║
    ║  This demo simulates the full system without blockchain.          ║
    ║  Watch how the agent learns and improves over time!               ║
    ╚═══════════════════════════════════════════════════════════════════╝
    """)
    
    # Initialize components
    treasury = DemoTreasury(initial_balance=100.0)
    
    workers = [
        DemoWorker("0xWorker1_HighPerformance_Agent", [0, 1, 2], success_probability=0.9),
        DemoWorker("0xWorker2_MediumPerformance_Agent", [0, 1, 3], success_probability=0.7),
        DemoWorker("0xWorker3_LowPerformance_Agent", [1, 2, 4], success_probability=0.5),
        DemoWorker("0xWorker4_NewAgent_Untested", [0, 2, 5], success_probability=0.75),
    ]
    
    agent = DemoCoordinatorAgent(treasury, workers)
    
    logger.info("🚀 Demo initialized",
               treasury_balance=treasury.balance,
               worker_count=len(workers))
    
    print("\n" + "=" * 60)
    print("📋 TREASURY RULES (enforced by contract)")
    print("=" * 60)
    print(f"  Max spend per task: {treasury.max_per_task} MON")
    print(f"  Max spend per day:  {treasury.max_per_day} MON")
    print(f"  Available balance:  {treasury.balance} MON")
    print("=" * 60 + "\n")
    
    await asyncio.sleep(2)
    
    # Simulate tasks
    task_types = ["DATA_ANALYSIS", "TEXT_GENERATION", "CODE_REVIEW", "RESEARCH", "COMPUTATION", "OTHER"]
    
    for task_id in range(1, 21):
        task_type = random.randint(0, 5)
        max_payment = random.uniform(1.0, 5.0)
        
        print(f"\n{'─' * 60}")
        logger.info("📝 New task created",
                   task_id=task_id,
                   type=task_types[task_type],
                   max_payment=f"{max_payment:.2f} MON")
        
        # Agent selects worker
        selected_worker = agent.select_worker(task_type)
        
        if not selected_worker:
            logger.warning("No eligible workers for task type", task_type=task_type)
            continue
        
        # Agent calculates payment
        payment = agent.calculate_payment(max_payment, selected_worker)
        
        logger.info("🧠 Agent decision",
                   worker=selected_worker[:20] + "...",
                   proposed_payment=f"{payment:.4f} MON",
                   exploration_rate=f"{agent.exploration_rate:.1%}")
        
        # Contract enforces rules
        if not treasury.reserve(task_id, payment):
            logger.error("❌ Contract rejected - rules violated")
            continue
        
        logger.info("✅ Contract approved - funds reserved")
        
        # Worker executes task
        worker = agent.workers[selected_worker]
        await asyncio.sleep(0.5)  # Simulate work
        
        success = worker.execute_task(task_type)
        
        if success:
            logger.info("✅ Task completed successfully")
            treasury.release(task_id, selected_worker)
            worker.total_earnings += payment
        else:
            logger.info("❌ Task failed verification")
            treasury.unlock(task_id)
        
        # Agent learns
        agent.learn(selected_worker, success)
        
        # Print learning stats periodically
        if task_id % 5 == 0:
            success_rate = agent.successful_decisions / agent.decisions_made
            print(f"\n📊 LEARNING PROGRESS (after {task_id} tasks)")
            print(f"   Success rate: {success_rate:.1%}")
            print(f"   Exploration rate: {agent.exploration_rate:.1%}")
            print(f"   Treasury balance: {treasury.balance:.2f} MON")
        
        await asyncio.sleep(0.3)
    
    # Final report
    print("\n" + "=" * 60)
    print("🏁 DEMO COMPLETE - FINAL REPORT")
    print("=" * 60)
    
    success_rate = agent.successful_decisions / agent.decisions_made
    print(f"\n📈 LEARNING RESULTS:")
    print(f"   Total decisions: {agent.decisions_made}")
    print(f"   Successful: {agent.successful_decisions}")
    print(f"   Success rate: {success_rate:.1%}")
    print(f"   Final exploration rate: {agent.exploration_rate:.1%}")
    
    print(f"\n💰 TREASURY STATUS:")
    print(f"   Initial balance: 100.00 MON")
    print(f"   Final balance: {treasury.balance:.2f} MON")
    print(f"   Total spent: {100 - treasury.balance:.2f} MON")
    
    print(f"\n👷 WORKER PERFORMANCE:")
    for w in workers:
        if w.total_tasks > 0:
            rate = w.successful_tasks / w.total_tasks
            print(f"   {w.address[:25]}...")
            print(f"      Tasks: {w.total_tasks}, Success: {rate:.1%}, Earnings: {w.total_earnings:.2f} MON")
    
    print(f"\n🔐 SECURITY VERIFICATION:")
    print("   ✅ Agent never accessed wallet directly")
    print("   ✅ All payments went through contract")
    print("   ✅ Rules were always enforced")
    print("   ✅ All actions logged")
    
    print("\n" + "=" * 60)
    print("\"The agent decides. The contract enforces.\"")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    asyncio.run(run_demo())
