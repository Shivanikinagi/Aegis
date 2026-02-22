"""
Tests for the API Server module.
Tests REST endpoints with a test client.
"""

import os
import sys
import json
from pathlib import Path
from unittest.mock import MagicMock, AsyncMock, patch

import pytest
from aiohttp import web
from aiohttp.test_utils import AioHTTPTestCase, TestClient, TestServer

AGENT_DIR = str(Path(__file__).parent.parent / "agent")
if AGENT_DIR not in sys.path:
    sys.path.insert(0, AGENT_DIR)


class TestAPIServer:
    """Tests for the API Server endpoints."""

    @pytest.fixture
    def mock_agent(self):
        """Create a mocked CoordinatorAgent."""
        agent = MagicMock()
        agent.running = True
        agent.cycle_count = 42
        agent.proposals_made = 10
        agent.verifications_done = 5
        agent.ai_analyses = 3
        agent.ai_reasoner = MagicMock()
        agent.start_time = 0
        # Set concrete values on learner.bandit so they are JSON serializable
        agent.learner.bandit.total_pulls = 90
        agent.learner.bandit.exploration_constant = 2.0
        agent.learner.bandit.worker_pulls = {"0xworker1": 45, "0xworker2": 45}
        agent.get_status.return_value = {
            "running": True,
            "cycle_count": 42,
            "proposals_made": 10,
            "verifications_done": 5,
            "ai_analyses": 3,
            "ai_reasoning_enabled": True,
            "treasury": {
                "total": 100.0,
                "reserved": 10.0,
                "available": 90.0,
                "daily_spent": 5.0,
                "daily_remaining": 45.0
            },
            "learning": {
                "decisions_made": 100,
                "successful_decisions": 80,
                "success_rate": 0.8,
                "exploration_rate": 0.15,
                "total_bandit_pulls": 90,
                "payment_models": 6
            },
            "metrics": {
                "total_workers": 5,
                "total_tasks": 100,
                "strategy": {"roi": 1.5},
                "top_workers": []
            }
        }
        return agent

    @pytest.fixture
    async def api_client(self, mock_agent):
        """Create a test client for the API server."""
        with patch('api.BlockchainClient') as mock_bc_cls, \
             patch('api.AgentMemory') as mock_mem_cls, \
             patch('api.EXPLORER_AVAILABLE', False):

            mock_bc = MagicMock()
            mock_bc.is_connected.return_value = True
            mock_bc.get_treasury_balance.return_value = (100.0, 10.0, 90.0)
            mock_bc.get_treasury_rules.return_value = MagicMock(
                max_spend_per_task=5000000000000000000,
                max_spend_per_day=50000000000000000000,
                min_task_value=100000000000000000,
                cooldown_period=60
            )
            mock_bc.get_daily_spent.return_value = 5.0
            mock_bc.get_remaining_daily_budget.return_value = 45.0
            mock_bc.get_task_count.return_value = 0
            mock_bc.get_open_tasks.return_value = []
            mock_bc.get_active_workers.return_value = []

            from web3 import Web3
            mock_bc.w3 = Web3()
            mock_bc_cls.return_value = mock_bc

            mock_memory = MagicMock()
            mock_memory.workers = {}
            mock_memory.tasks = {}
            mock_memory.get_metrics_summary.return_value = {
                "total_workers": 0, "total_tasks": 0,
                "strategy": {"roi": 0}, "top_workers": []
            }
            mock_memory.get_learning_insights.return_value = {
                "status": "insufficient_data"
            }
            mock_mem_cls.return_value = mock_memory

            from api import APIServer
            server = APIServer(agent=mock_agent)

            async with TestClient(TestServer(server.app)) as client:
                yield client

    @pytest.mark.asyncio
    async def test_health_check(self, api_client):
        resp = await api_client.get("/api/health")
        assert resp.status == 200
        data = await resp.json()
        assert data["status"] == "healthy"
        assert data["blockchain_connected"] is True
        assert data["agent_running"] is True

    @pytest.mark.asyncio
    async def test_get_status(self, api_client):
        resp = await api_client.get("/api/status")
        assert resp.status == 200
        data = await resp.json()
        assert data["running"] is True
        assert data["cycle_count"] == 42
        assert "treasury" in data
        assert "learning" in data

    @pytest.mark.asyncio
    async def test_get_treasury(self, api_client):
        resp = await api_client.get("/api/treasury")
        assert resp.status == 200
        data = await resp.json()
        assert "balance" in data
        assert data["balance"]["total"] == 100.0
        assert "daily" in data
        assert "rules" in data

    @pytest.mark.asyncio
    async def test_get_tasks_empty(self, api_client):
        resp = await api_client.get("/api/tasks")
        assert resp.status == 200
        data = await resp.json()
        assert "tasks" in data
        assert data["total"] == 0

    @pytest.mark.asyncio
    async def test_get_workers_empty(self, api_client):
        resp = await api_client.get("/api/workers")
        assert resp.status == 200
        data = await resp.json()
        assert "workers" in data

    @pytest.mark.asyncio
    async def test_get_metrics(self, api_client):
        resp = await api_client.get("/api/metrics")
        assert resp.status == 200
        data = await resp.json()
        assert "total_workers" in data

    @pytest.mark.asyncio
    async def test_get_learning_stats(self, api_client):
        resp = await api_client.get("/api/learning")
        assert resp.status == 200
        data = await resp.json()
        assert "decisions_made" in data or "status" in data

    @pytest.mark.asyncio
    async def test_cors_headers(self, api_client):
        resp = await api_client.get("/api/health")
        assert "Access-Control-Allow-Origin" in resp.headers
        assert resp.headers["Access-Control-Allow-Origin"] == "*"

    @pytest.mark.asyncio
    async def test_create_task_missing_fields(self, api_client):
        resp = await api_client.post("/api/tasks", json={})
        # Should return an error for missing fields
        assert resp.status in [400, 500]


class TestAPIServerWithoutAgent:
    """Tests for API server when no agent is running."""

    @pytest.fixture
    async def api_client_no_agent(self):
        """Create a test client without an active agent."""
        with patch('api.BlockchainClient') as mock_bc_cls, \
             patch('api.AgentMemory') as mock_mem_cls, \
             patch('api.EXPLORER_AVAILABLE', False):

            mock_bc = MagicMock()
            mock_bc.is_connected.return_value = True
            mock_bc.get_treasury_balance.return_value = (50.0, 5.0, 45.0)
            mock_bc.get_treasury_rules.return_value = None
            mock_bc.get_daily_spent.return_value = 2.0
            mock_bc.get_remaining_daily_budget.return_value = 48.0
            mock_bc.get_task_count.return_value = 0
            from web3 import Web3
            mock_bc.w3 = Web3()
            mock_bc_cls.return_value = mock_bc

            mock_memory = MagicMock()
            mock_memory.workers = {}
            mock_memory.tasks = {}
            mock_memory.get_metrics_summary.return_value = {
                "total_workers": 0, "total_tasks": 0,
                "strategy": {"roi": 0}, "top_workers": []
            }
            mock_mem_cls.return_value = mock_memory

            from api import APIServer
            server = APIServer(agent=None)

            async with TestClient(TestServer(server.app)) as client:
                yield client

    @pytest.mark.asyncio
    async def test_health_no_agent(self, api_client_no_agent):
        resp = await api_client_no_agent.get("/api/health")
        assert resp.status == 200
        data = await resp.json()
        assert data["agent_running"] is False

    @pytest.mark.asyncio
    async def test_status_no_agent(self, api_client_no_agent):
        resp = await api_client_no_agent.get("/api/status")
        assert resp.status == 200
        data = await resp.json()
        assert data["running"] is False
