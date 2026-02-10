"""
Multi-Agent System for Agent-to-Agent Interaction
Implements autonomous agents that negotiate, bid, and transact with each other.
"""

import asyncio
import random
from typing import Dict, List, Optional, Tuple
from enum import Enum
import structlog
from web3 import Web3

from blockchain import BlockchainClient, Task, TaskType
from config import blockchain_config

logger = structlog.get_logger()


class AgentPersonality(Enum):
    """Different agent personalities for diverse behavior"""
    AGGRESSIVE = "aggressive"  # Bids low, fast decisions
    CONSERVATIVE = "conservative"  # Bids high, careful decisions  
    OPPORTUNISTIC = "opportunistic"  # Dynamic based on market
    COLLABORATIVE = "collaborative"  # Prefers negotiation


class AutonomousAgent:
    """
    An autonomous agent that can:
    - Register on the marketplace
    - Bid on tasks
    - Negotiate with other agents
    - Execute tasks
    - Learn from outcomes
    """
    
    def __init__(
        self,
        name: str,
        private_key: str,
        personality: AgentPersonality,
        capabilities: List[TaskType],
        marketplace_address: str
    ):
        self.name = name
        self.private_key = private_key
        self.personality = personality
        self.capabilities = capabilities
        self.marketplace_address = marketplace_address
        
        # Initialize blockchain client
        self.blockchain = BlockchainClient()
        self.address = self.blockchain.w3.eth.account.from_key(private_key).address
        
        # Agent state
        self.registered = False
        self.active_bids: List[int] = []
        self.active_negotiations: List[int] = []
        self.completed_tasks: List[int] = []
        self.earnings = 0.0
        
        # Load marketplace contract
        self._load_marketplace_contract()
        
        logger.info(f"Agent {name} initialized",
                   address=self.address,
                   personality=personality.value)
    
    def _load_marketplace_contract(self):
        """Load marketplace contract ABI"""
        # In production, load from artifacts
        # For now, simplified version
        self.marketplace_contract = None
    
    async def register(self):
        """Register agent on the marketplace"""
        if self.registered:
            return
        
        try:
            # Build capabilities string
            capabilities_str = ",".join([str(c.value) for c in self.capabilities])
            
            # Call registerAgent on marketplace
            # Simplified - in production use proper web3 transaction
            logger.info(f"Agent {self.name} registering on marketplace",
                       capabilities=capabilities_str)
            
            self.registered = True
            logger.info(f"Agent {self.name} registered successfully")
            
        except Exception as e:
            logger.error(f"Agent {self.name} registration failed", error=str(e))
    
    def calculate_bid_price(self, task: Task, market_data: Dict) -> float:
        """Calculate bid price based on personality and market conditions"""
        base_reward = float(Web3.from_wei(task.reward, 'ether'))
        
        if self.personality == AgentPersonality.AGGRESSIVE:
            # Bid 10-20% below base to win more
            return base_reward * random.uniform(0.80, 0.90)
        
        elif self.personality == AgentPersonality.CONSERVATIVE:
            # Bid at or above base for safety
            return base_reward * random.uniform(1.0, 1.1)
        
        elif self.personality == AgentPersonality.OPPORTUNISTIC:
            # Dynamic based on competition
            num_competitors = market_data.get('num_bidders', 1)
            if num_competitors > 5:
                # High competition, bid lower
                return base_reward * random.uniform(0.85, 0.95)
            else:
                # Low competition, bid higher
                return base_reward * random.uniform(0.95, 1.05)
        
        else:  # COLLABORATIVE
            # Fair price, prefer negotiation
            return base_reward * random.uniform(0.90, 1.0)
    
    def should_bid_on_task(self, task: Task) -> bool:
        """Decide if agent should bid on this task"""
        # Check if task type matches capabilities
        if task.taskType not in self.capabilities:
            return False
        
        # Check if already too busy
        if len(self.active_bids) >= 5:
            return False
        
        # Personality-based decisions
        if self.personality == AgentPersonality.AGGRESSIVE:
            return random.random() > 0.2  # 80% chance to bid
        elif self.personality == AgentPersonality.CONSERVATIVE:
            return random.random() > 0.5  # 50% chance to bid
        else:
            return random.random() > 0.3  # 70% chance to bid
    
    async def submit_bid(self, task: Task, market_data: Dict) -> Optional[int]:
        """Submit a bid on a task"""
        if not self.should_bid_on_task(task):
            return None
        
        try:
            # Calculate bid price
            bid_price = self.calculate_bid_price(task, market_data)
            estimated_time = random.randint(300, 3600)  # 5-60 minutes
            
            # Generate proposal
            proposal = self._generate_proposal(task, bid_price)
            
            logger.info(f"Agent {self.name} submitting bid",
                       task_id=task.id,
                       price=f"{bid_price:.4f}",
                       estimated_time=estimated_time)
            
            # Submit bid to marketplace
            # Simplified - in production use proper web3 transaction
            bid_id = len(self.active_bids) + 1
            self.active_bids.append(bid_id)
            
            return bid_id
            
        except Exception as e:
            logger.error(f"Agent {self.name} bid submission failed", error=str(e))
            return None
    
    def _generate_proposal(self, task: Task, bid_price: float) -> str:
        """Generate a proposal text for the bid"""
        proposals = [
            f"I can complete {task.description} efficiently for {bid_price:.4f} ETH",
            f"Experienced in {task.taskType.name} tasks. Price: {bid_price:.4f} ETH",
            f"Quick turnaround guaranteed. Bid: {bid_price:.4f} ETH",
            f"High quality {task.taskType.name} work. Price: {bid_price:.4f} ETH"
        ]
        return random.choice(proposals)
    
    async def negotiate_with_agent(
        self,
        other_agent_address: str,
        task_id: int,
        initial_offer: float
    ) -> Optional[int]:
        """Start negotiation with another agent"""
        if self.personality != AgentPersonality.COLLABORATIVE:
            # Only collaborative agents actively negotiate
            if random.random() > 0.3:
                return None
        
        try:
            logger.info(f"Agent {self.name} starting negotiation",
                       counterparty=other_agent_address,
                       offer=f"{initial_offer:.4f}")
            
            # Submit negotiation to marketplace
            # Simplified - in production use proper web3 transaction
            neg_id = len(self.active_negotiations) + 1
            self.active_negotiations.append(neg_id)
            
            return neg_id
            
        except Exception as e:
            logger.error(f"Agent {self.name} negotiation failed", error=str(e))
            return None
    
    async def respond_to_negotiation(
        self,
        negotiation_id: int,
        initiator_offer: float,
        task_data: Dict
    ) -> Tuple[bool, Optional[float]]:
        """Respond to a negotiation from another agent"""
        # Decide whether to accept, counter, or reject
        base_reward = task_data.get('reward', initiator_offer)
        
        # Calculate acceptable range
        if self.personality == AgentPersonality.AGGRESSIVE:
            min_acceptable = base_reward * 0.85
        elif self.personality == AgentPersonality.CONSERVATIVE:
            min_acceptable = base_reward * 1.0
        else:
            min_acceptable = base_reward * 0.90
        
        if initiator_offer >= min_acceptable:
            # Accept
            logger.info(f"Agent {self.name} accepting negotiation",
                       negotiation_id=negotiation_id,
                       price=f"{initiator_offer:.4f}")
            return True, initiator_offer
        
        elif initiator_offer >= min_acceptable * 0.9:
            # Counter offer
            counter = (initiator_offer + min_acceptable) / 2
            logger.info(f"Agent {self.name} counter offering",
                       negotiation_id=negotiation_id,
                       counter=f"{counter:.4f}")
            return False, counter
        
        else:
            # Reject
            logger.info(f"Agent {self.name} rejecting negotiation",
                       negotiation_id=negotiation_id)
            return False, None
    
    async def execute_task(self, task: Task) -> bool:
        """Execute the assigned task"""
        logger.info(f"Agent {self.name} executing task", task_id=task.id)
        
        # Simulate task execution
        execution_time = random.randint(1, 5)  # 1-5 seconds for demo
        await asyncio.sleep(execution_time)
        
        # Success rate based on personality
        success_rates = {
            AgentPersonality.AGGRESSIVE: 0.75,
            AgentPersonality.CONSERVATIVE: 0.90,
            AgentPersonality.OPPORTUNISTIC: 0.80,
            AgentPersonality.COLLABORATIVE: 0.85
        }
        
        success = random.random() < success_rates[self.personality]
        
        if success:
            logger.info(f"Agent {self.name} completed task", task_id=task.id)
            self.completed_tasks.append(task.id)
            self.earnings += float(Web3.from_wei(task.reward, 'ether'))
        else:
            logger.warning(f"Agent {self.name} failed task", task_id=task.id)
        
        return success
    
    async def pay_another_agent(
        self,
        recipient_address: str,
        amount: float,
        reason: str
    ) -> bool:
        """Pay another agent directly"""
        try:
            logger.info(f"Agent {self.name} paying agent",
                       recipient=recipient_address,
                       amount=f"{amount:.4f}",
                       reason=reason)
            
            # In production, execute actual transaction
            # For demo, just log
            self.earnings -= amount
            
            return True
            
        except Exception as e:
            logger.error(f"Agent {self.name} payment failed", error=str(e))
            return False
    
    def get_stats(self) -> Dict:
        """Get agent statistics"""
        return {
            "name": self.name,
            "address": self.address,
            "personality": self.personality.value,
            "active_bids": len(self.active_bids),
            "active_negotiations": len(self.active_negotiations),
            "completed_tasks": len(self.completed_tasks),
            "earnings": f"{self.earnings:.4f} ETH"
        }


class MultiAgentOrchestrator:
    """
    Orchestrates multiple autonomous agents
    Manages agent lifecycle and facilitates agent-to-agent interactions
    """
    
    def __init__(self, marketplace_address: str):
        self.marketplace_address = marketplace_address
        self.agents: Dict[str, AutonomousAgent] = {}
        self.running = False
        
        logger.info("MultiAgentOrchestrator initialized")
    
    def create_agent(
        self,
        name: str,
        private_key: str,
        personality: AgentPersonality,
        capabilities: List[TaskType]
    ) -> AutonomousAgent:
        """Create and register a new agent"""
        agent = AutonomousAgent(
            name=name,
            private_key=private_key,
            personality=personality,
            capabilities=capabilities,
            marketplace_address=self.marketplace_address
        )
        
        self.agents[agent.address] = agent
        logger.info(f"Agent {name} created", address=agent.address)
        
        return agent
    
    async def start(self):
        """Start all agents"""
        logger.info("Starting multi-agent system",
                   num_agents=len(self.agents))
        
        # Register all  agents
        for agent in self.agents.values():
            await agent.register()
        
        self.running = True
        
        # Start agent loops
        tasks = [
            asyncio.create_task(self._agent_loop(agent))
            for agent in self.agents.values()
        ]
        
        await asyncio.gather(*tasks)
    
    async def _agent_loop(self, agent: AutonomousAgent):
        """Main loop for an individual agent"""
        while self.running:
            try:
                # Agent decision cycle
                await self._agent_decision_cycle(agent)
                
                # Wait before next cycle
                await asyncio.sleep(random.randint(3, 10))
                
            except Exception as e:
                logger.error(f"Agent {agent.name} loop error", error=str(e))
                await asyncio.sleep(5)
    
    async def _agent_decision_cycle(self, agent: AutonomousAgent):
        """One decision cycle for an agent"""
        # 1. Check for new tasks to bid on
        # 2. Check for pending negotiations
        # 3. Execute assigned tasks
        # In production, implement full logic
        pass
    
    def stop(self):
        """Stop all agents"""
        logger.info("Stopping multi-agent system")
        self.running = False
    
    def get_all_stats(self) -> List[Dict]:
        """Get statistics for all agents"""
        return [agent.get_stats() for agent in self.agents.values()]
