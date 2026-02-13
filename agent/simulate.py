import asyncio
import os
import random
import time
from typing import List, Dict
from web3 import Web3
from eth_account import Account
import structlog
from dotenv import load_dotenv

from blockchain import BlockchainClient, TaskType, TaskStatus

# Load env to get private keys if needed
load_dotenv()

# Configure logging
structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer()
    ],
    logger_factory=structlog.stdlib.LoggerFactory(),
)

logger = structlog.get_logger()

# Monad testnet accounts
WORKERS = [
    {
        "address": "0xBb6ef05F40f3AFCF853C3b648EC5edB6f0D9CdB8",
        "key": "0d4b9fbd73e15dcac593162ca41b6da61b3f5b02d73bd40be3bc72f1f2fe96a8",
        "name": "Coordinator Agent"
    }
]

# User account - Use deployer for testing
USER_KEY = "0x33fb63a123a56154565ec1240723c5114e681a4c4f61da133a99c0970aace352"
USER_ADDRESS = "0x6B845996450ecf86cC2CBc4b92C69d37F87f42d4"

class EcosystemSimulator:
    def __init__(self):
        self.client = BlockchainClient()
        self.w3 = self.client.w3
        self.running = True
        
    async def start(self):
        print("""
        ╔═══════════════════════════════════════════════════════════╗
        ║       🌍 AUTONOMOUS ECOSYSTEM SIMULATOR 🌍                 ║
        ║                                                           ║
        ║   • Generating User Tasks                                 ║
        ║   • Simulating Worker Activity                            ║
        ╚═══════════════════════════════════════════════════════════╝
        """)
        
        await asyncio.gather(
            self.user_loop(),
            self.worker_loop()
        )

    async def user_loop(self):
        """Simulate users creating tasks."""
        print("🔵 User Simulator started")
        logger.info("User Simulator started")
        
        while self.running:
            try:
                # 1. Randomize task details
                task_type = random.choice([0, 1, 2, 3, 4]) # Random Enum
                payment = random.uniform(0.1, 2.0) # ETH
                
                # 2. Create Task on-chain
                print(f"💼 Creating task: Type={task_type}, Payment={payment:.2f} MON")
                await self.create_task(task_type, payment)
                print(f"✅ Task created successfully!")
                
            except Exception as e:
                print(f"❌ User failed: {e}")
                logger.error("User failed", error=str(e))
                
            # Wait 10-20 seconds before next task
            wait_time = random.randint(10, 20)
            print(f"⏰ Waiting {wait_time} seconds before next task...")
            await asyncio.sleep(wait_time)

    async def worker_loop(self):
        """Simulate workers checking and completing tasks."""
        print("🤖 Worker Simulator started")
        logger.info("Worker Simulator started")
        
        while self.running:
            try:
                # Check all workers
                for worker in WORKERS:
                    await self.process_worker(worker)
                    
            except Exception as e:
                print(f"❌ Worker loop error: {e}")
                logger.error("Worker loop error", error=str(e))
                
            await asyncio.sleep(5)

    async def create_task(self, task_type: int, payment_eth: float):
        """Transaction to create a new task."""
        if not self.client.task_registry:
            print("❌ Task registry not available")
            return
            
        payment_wei = self.w3.to_wei(payment_eth, "ether")
        deadline = int(time.time()) + 3600 # 1 hour from now
        
        # Build transaction
        tx = self.client.task_registry.functions.createTask(
            task_type,
            payment_wei,
            deadline,
            b"0"*32, # Dummy description hash
            "length > 0" # Simple rule
        ).build_transaction({
            "from": USER_ADDRESS,
            "nonce": self.w3.eth.get_transaction_count(USER_ADDRESS),
            "gas": 500000,
            "gasPrice": self.w3.eth.gas_price
        })
        
        # Sign and send
        signed = self.w3.eth.account.sign_transaction(tx, USER_KEY)
        tx_hash = self.w3.eth.send_raw_transaction(signed.raw_transaction)
        
        print(f"📝 Task created - TX: {tx_hash.hex()[:10]}... Type: {TaskType(task_type).name}, Payment: {payment_eth:.2f} MON")
        logger.info("User created task", 
                   type=TaskType(task_type).name, 
                   payment=f"{payment_eth:.2f} MON")

    async def process_worker(self, worker_info):
        """Check if worker has assigned tasks and complete them."""
        worker_addr = worker_info["address"]
        worker_key = worker_info["key"]
        
        # Get on-chain data directly
        # Mapping: workerTasks[worker]
        # But for simplicity, let's just use the client to get the task if status is ASSIGNED
        
        # We can iterate through recent tasks to find assigned ones
        # This is inefficient but fine for sim
        task_count = self.client.get_task_count()
        
        # Check last 10 tasks
        for task_id in range(task_count, max(0, task_count - 10), -1):
            task = self.client.get_task(task_id)
            if not task: 
                continue
                
            # If assigned to THIS worker
            if (task.status == TaskStatus.ASSIGNED and 
                task.assigned_worker.lower() == worker_addr.lower()):
                
                # Simulate work time
                logger.info("Worker working...", name=worker_info["name"], task=task_id)
                await asyncio.sleep(2) 
                
                # Submit result
                await self.submit_result(task_id, worker_info)

    async def submit_result(self, task_id, worker_info):
        """Submit specific result for a task."""
        try:
            tx = self.client.task_registry.functions.submitResult(
                task_id,
                b"1"*32 # Dummy result hash
            ).build_transaction({
                "from": worker_info["address"],
                "nonce": self.w3.eth.get_transaction_count(worker_info["address"]),
                "gas": 500000,
                "gasPrice": self.w3.eth.gas_price
            })
            
            signed = self.w3.eth.account.sign_transaction(tx, worker_info["key"])
            tx_hash = self.w3.eth.send_raw_transaction(signed.raw_transaction)
            
            logger.info("Worker submitted result", 
                       name=worker_info["name"], 
                       task=task_id)
                       
        except Exception as e:
            logger.error("Result submission failed", error=str(e))

if __name__ == "__main__":
    sim = EcosystemSimulator()
    asyncio.run(sim.start())
