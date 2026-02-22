"""
Tests for the Multi-Agent system.
Tests AutonomousAgent, MultiAgentOrchestrator, and agent interactions.
"""

import os
import sys
import asyncio
from pathlib import Path
from unittest.mock import MagicMock, AsyncMock, patch

import pytest

AGENT_DIR = str(Path(__file__).parent.parent / "agent")
if AGENT_DIR not in sys.path:
    sys.path.insert(0, AGENT_DIR)

from multi_agent import AutonomousAgent, AgentPersonality, MultiAgentOrchestrator
from blockchain import Task, TaskType, TaskStatus


class TestAgentPersonality:
    """Tests for AgentPersonality enum."""

    def test_personalities_exist(self):
        assert AgentPersonality.AGGRESSIVE.value == "aggressive"
        assert AgentPersonality.CONSERVATIVE.value == "conservative"
        assert AgentPersonality.OPPORTUNISTIC.value == "opportunistic"
        assert AgentPersonality.COLLABORATIVE.value == "collaborative"


class TestAutonomousAgent:
    """Tests for AutonomousAgent."""

    @pytest.fixture
    def mock_agent(self):
        """Create an AutonomousAgent with mocked blockchain."""
        with patch('multi_agent.BlockchainClient') as mock_bc_cls:
            mock_bc = MagicMock()
            mock_bc.w3 = MagicMock()
            mock_account = MagicMock()
            mock_account.address = "0xAgent1234567890123456789012345678"
            mock_bc.w3.eth.account.from_key.return_value = mock_account
            mock_bc_cls.return_value = mock_bc

            agent = AutonomousAgent(
                name="TestAgent",
                private_key="0x" + "ab" * 32,
                personality=AgentPersonality.AGGRESSIVE,
                capabilities=[TaskType.DATA_ANALYSIS, TaskType.CODE_REVIEW],
                marketplace_address="0xMarketplace"
            )
            return agent

    def test_initialization(self, mock_agent):
        assert mock_agent.name == "TestAgent"
        assert mock_agent.personality == AgentPersonality.AGGRESSIVE
        assert len(mock_agent.capabilities) == 2
        assert mock_agent.registered is False
        assert mock_agent.earnings == 0.0

    @pytest.mark.asyncio
    async def test_register(self, mock_agent):
        await mock_agent.register()
        assert mock_agent.registered is True

        # Should not re-register
        await mock_agent.register()

    def test_calculate_bid_price_aggressive(self, mock_agent):
        task = MagicMock()
        task.max_payment = 1000000000000000000  # 1 ETH
        market_data = {"num_bidders": 3}

        price = mock_agent.calculate_bid_price(task, market_data)
        # Aggressive bids 80-90% of base
        assert 0.8 <= price <= 0.9

    def test_calculate_bid_price_conservative(self, mock_agent):
        mock_agent.personality = AgentPersonality.CONSERVATIVE
        task = MagicMock()
        task.max_payment = 1000000000000000000
        market_data = {}

        price = mock_agent.calculate_bid_price(task, market_data)
        # Conservative bids 100-110% of base
        assert 1.0 <= price <= 1.1

    def test_should_bid_capability_mismatch(self, mock_agent):
        task = MagicMock()
        task.task_type = TaskType.COMPUTATION  # Not in capabilities
        task.taskType = TaskType.COMPUTATION  # Support both field names

        assert mock_agent.should_bid_on_task(task) is False

    def test_should_bid_too_many_active(self, mock_agent):
        mock_agent.active_bids = list(range(5))
        task = MagicMock()
        task.task_type = TaskType.DATA_ANALYSIS
        task.taskType = TaskType.DATA_ANALYSIS

        assert mock_agent.should_bid_on_task(task) is False

    @pytest.mark.asyncio
    async def test_execute_task(self, mock_agent):
        task = MagicMock()
        task.id = 1
        task.max_payment = 500000000000000000  # 0.5 ETH

        result = await mock_agent.execute_task(task)
        assert isinstance(result, bool)

    def test_get_stats(self, mock_agent):
        stats = mock_agent.get_stats()
        assert stats["name"] == "TestAgent"
        assert "personality" in stats
        assert "active_bids" in stats
        assert "earnings" in stats

    @pytest.mark.asyncio
    async def test_submit_bid(self, mock_agent):
        task = MagicMock()
        task.id = 1
        task.task_type = TaskType.DATA_ANALYSIS
        task.taskType = TaskType.DATA_ANALYSIS
        task.max_payment = 1000000000000000000

        market_data = {"num_bidders": 2}

        # May or may not bid depending on random decision
        bid_id = await mock_agent.submit_bid(task, market_data)
        # Either None (didn't bid) or an int (bid submitted)
        assert bid_id is None or isinstance(bid_id, int)


class TestMultiAgentOrchestrator:
    """Tests for MultiAgentOrchestrator."""

    @pytest.fixture
    def orchestrator(self):
        with patch('multi_agent.BlockchainClient'):
            return MultiAgentOrchestrator(
                marketplace_address="0xMarketplace"
            )

    def test_initialization(self, orchestrator):
        assert len(orchestrator.agents) == 0
        assert orchestrator.running is False

    def test_create_agent(self, orchestrator):
        agent = orchestrator.create_agent(
            name="Agent1",
            private_key="0x" + "ab" * 32,
            personality=AgentPersonality.AGGRESSIVE,
            capabilities=[TaskType.DATA_ANALYSIS]
        )
        assert agent.name == "Agent1"
        assert len(orchestrator.agents) == 1

    def test_create_multiple_agents(self, orchestrator):
        for i in range(4):
            orchestrator.create_agent(
                name=f"Agent{i}",
                private_key=f"0x{str(i).zfill(2)}" + "ab" * 31,
                personality=list(AgentPersonality)[i],
                capabilities=[TaskType(i % 6)]
            )
        assert len(orchestrator.agents) == 4

    def test_get_all_stats(self, orchestrator):
        orchestrator.create_agent(
            name="Agent1",
            private_key="0x" + "ab" * 32,
            personality=AgentPersonality.AGGRESSIVE,
            capabilities=[TaskType.DATA_ANALYSIS]
        )
        stats = orchestrator.get_all_stats()
        assert len(stats) == 1
        assert stats[0]["name"] == "Agent1"

    def test_stop(self, orchestrator):
        orchestrator.running = True
        orchestrator.stop()
        assert orchestrator.running is False

    @pytest.mark.asyncio
    async def test_decision_cycle(self, orchestrator):
        """Test one agent decision cycle."""
        agent = orchestrator.create_agent(
            name="TestAgent",
            private_key="0x" + "ab" * 32,
            personality=AgentPersonality.AGGRESSIVE,
            capabilities=[TaskType.DATA_ANALYSIS]
        )

        # Mock blockchain for decision cycle
        with patch('multi_agent.BlockchainClient') as mock_bc_cls:
            mock_bc = MagicMock()
            mock_bc.get_open_tasks.return_value = []
            mock_bc.get_task_count.return_value = 0
            mock_bc_cls.return_value = mock_bc

            # Should not raise
            await orchestrator._agent_decision_cycle(agent)
