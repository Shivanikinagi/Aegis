"""
Pytest configuration and shared fixtures for the Autonomous Treasury Agent test suite.
"""

import os
import sys
import json
import asyncio
import tempfile
import shutil
from pathlib import Path
from unittest.mock import MagicMock, AsyncMock, patch
from dataclasses import dataclass

import pytest

# Ensure agent module is importable
AGENT_DIR = str(Path(__file__).parent.parent / "agent")
if AGENT_DIR not in sys.path:
    sys.path.insert(0, AGENT_DIR)

ROOT_DIR = str(Path(__file__).parent.parent)
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)


# ============ Fixtures: Data Structures ============

@pytest.fixture
def sample_task():
    """Create a sample Task object for testing."""
    from blockchain import Task, TaskType, TaskStatus
    return Task(
        id=1,
        task_type=TaskType.DATA_ANALYSIS,
        status=TaskStatus.CREATED,
        creator="0x1234567890123456789012345678901234567890",
        assigned_worker="0x0000000000000000000000000000000000000000",
        max_payment=500000000000000000,  # 0.5 ETH
        actual_payment=0,
        deadline=9999999999,
        created_at=1700000000,
        completed_at=0,
        description_hash=b'\x01\x02\x03\x04' * 8,
        result_hash=b'\x00' * 32,
        verification_rule="manual"
    )


@pytest.fixture
def sample_completed_task():
    """Create a completed Task object."""
    from blockchain import Task, TaskType, TaskStatus
    return Task(
        id=2,
        task_type=TaskType.CODE_REVIEW,
        status=TaskStatus.COMPLETED,
        creator="0x1234567890123456789012345678901234567890",
        assigned_worker="0xabcdef1234567890abcdef1234567890abcdef12",
        max_payment=1000000000000000000,  # 1 ETH
        actual_payment=700000000000000000,  # 0.7 ETH
        deadline=9999999999,
        created_at=1700000000,
        completed_at=1700003600,
        description_hash=b'\x01\x02\x03\x04' * 8,
        result_hash=b'\xab\xcd' * 16,
        verification_rule="length > 200"
    )


@pytest.fixture
def sample_submitted_task():
    """Create a submitted Task object pending verification."""
    from blockchain import Task, TaskType, TaskStatus
    return Task(
        id=3,
        task_type=TaskType.RESEARCH,
        status=TaskStatus.SUBMITTED,
        creator="0x1234567890123456789012345678901234567890",
        assigned_worker="0xabcdef1234567890abcdef1234567890abcdef12",
        max_payment=800000000000000000,
        actual_payment=0,
        deadline=9999999999,
        created_at=1700000000,
        completed_at=0,
        description_hash=b'\x05\x06\x07\x08' * 8,
        result_hash=b'\xef\x01' * 16,
        verification_rule="manual"
    )


@pytest.fixture
def sample_worker():
    """Create a sample Worker object."""
    from blockchain import Worker
    return Worker(
        address="0xabcdef1234567890abcdef1234567890abcdef12",
        is_active=True,
        registered_at=1699900000,
        total_tasks=50,
        successful_tasks=45,
        total_earnings=25000000000000000000,  # 25 ETH
        last_task_at=1700000000,
        reliability_score=9000,
        allowed_task_types=[0, 1, 2, 3, 4, 5]
    )


@pytest.fixture
def sample_worker_history():
    """Create sample worker history for AI assessment."""
    return {
        "total_tasks": 50,
        "success_rate": 0.90,
        "avg_time": 3600,
        "reliability": 9000,
        "recent_performance": "Consistent high quality"
    }


@pytest.fixture
def worker_addresses():
    """Return a list of test worker addresses."""
    return [
        "0xabcdef1234567890abcdef1234567890abcdef12",
        "0x1111111111111111111111111111111111111111",
        "0x2222222222222222222222222222222222222222",
        "0x3333333333333333333333333333333333333333",
        "0x4444444444444444444444444444444444444444",
    ]


# ============ Fixtures: Memory & Learner ============

@pytest.fixture
def temp_data_dir():
    """Create a temporary directory for memory persistence."""
    tmpdir = tempfile.mkdtemp()
    yield tmpdir
    shutil.rmtree(tmpdir, ignore_errors=True)


@pytest.fixture
def agent_memory(temp_data_dir):
    """Create a fresh AgentMemory instance with temp storage."""
    from memory import AgentMemory
    return AgentMemory(data_dir=temp_data_dir)


@pytest.fixture
def strategy_learner(agent_memory):
    """Create a StrategyLearner instance."""
    from learner import StrategyLearner
    return StrategyLearner(
        memory=agent_memory,
        exploration_rate=0.2,
        learning_rate=0.1
    )


# ============ Fixtures: Mocked Blockchain ============

@pytest.fixture
def mock_blockchain():
    """Create a mocked BlockchainClient."""
    mock = MagicMock()
    mock.is_connected.return_value = True
    mock.get_chain_id.return_value = 10143
    mock.get_block_number.return_value = 1000000
    mock.get_coordinator_balance.return_value = 10.0
    mock.get_treasury_balance.return_value = (100.0, 10.0, 90.0)
    mock.get_treasury_rules.return_value = MagicMock(
        max_spend_per_task=5000000000000000000,
        max_spend_per_day=50000000000000000000,
        min_task_value=100000000000000000,
        cooldown_period=60
    )
    mock.get_daily_spent.return_value = 5.0
    mock.get_remaining_daily_budget.return_value = 45.0
    mock.get_open_tasks.return_value = [1, 2, 3]
    mock.get_task_count.return_value = 3

    # Mock w3 for wei conversion
    from web3 import Web3
    mock.w3 = Web3()

    return mock


@pytest.fixture
def mock_ai_reasoner():
    """Create a mocked AIReasoner."""
    mock = AsyncMock()
    mock.analyze_task.return_value = {
        "complexity": "medium",
        "required_skills": ["data_analysis", "python"],
        "estimated_time": 2.0,
        "risk_level": "low",
        "recommended_reward": 0.5,
        "reasoning": "Standard data analysis task"
    }
    mock.assess_worker_match.return_value = (0.85, "Strong match based on history")
    mock.verify_task_completion.return_value = (True, "Task completed correctly", 0.9)
    mock.natural_language_query.return_value = "The treasury has 100 MON available."
    mock.generate_task_recommendation.return_value = [
        (1, 0.9, "High priority data analysis"),
        (2, 0.7, "Medium priority code review"),
    ]
    return mock


# ============ Fixtures: Deployment Data ============

@pytest.fixture
def monad_deployment_data():
    """Return sample Monad testnet deployment data."""
    return {
        "Treasury": "0xAA777e4835bbC729a0C50F1EC63dC5Dc371379E7",
        "TaskRegistry": "0x1833f83dC4eE9175E808B4a1E95e0F0d150804ad",
        "WorkerRegistry": "0x97C9082af4cD26D52a567adF7978bA6171920473",
        "MinimalForwarder": "0xCfe6fbd39aAb896C316F6f9eb2f2b5253c1479f5",
        "AgentMarketplace": "0x3eb8ca62791F678c6bB0772d98F6bbdc73696fC6",
        "AgentToken": "0x13fd87720c1828C7519dA524bd89CEc0a6E2C2A8"
    }


# ============ Async Event Loop ============

@pytest.fixture
def event_loop():
    """Create an event loop for async tests."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()
