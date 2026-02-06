"""
Configuration module for the Autonomous Treasury Agent.
Loads environment variables and provides configuration settings.
"""

import os
from dataclasses import dataclass
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(env_path)


@dataclass
class BlockchainConfig:
    """Blockchain connection configuration."""
    rpc_url: str = os.getenv("MONAD_RPC_URL", "https://testnet-rpc.monad.xyz")
    chain_id: int = int(os.getenv("MONAD_CHAIN_ID", "10143"))
    explorer_url: str = os.getenv("MONAD_EXPLORER_URL", "https://testnet.monadvision.com")
    
    # Contract addresses
    treasury_address: str = os.getenv("TREASURY_CONTRACT_ADDRESS", "")
    task_registry_address: str = os.getenv("TASK_REGISTRY_ADDRESS", "")
    worker_registry_address: str = os.getenv("WORKER_REGISTRY_ADDRESS", "")
    
    # Coordinator private key (for signing proposals)
    coordinator_private_key: str = os.getenv("COORDINATOR_PRIVATE_KEY", "")


@dataclass
class AgentConfig:
    """Agent behavior configuration."""
    polling_interval: int = int(os.getenv("AGENT_POLLING_INTERVAL", "5"))
    max_concurrent_tasks: int = int(os.getenv("MAX_CONCURRENT_TASKS", "10"))
    
    # Learning parameters
    learning_rate: float = float(os.getenv("LEARNING_RATE", "0.1"))
    exploration_rate: float = float(os.getenv("EXPLORATION_RATE", "0.2"))
    
    # Decision thresholds
    min_reliability_score: int = 3000  # 30% minimum reliability
    min_success_rate: float = 0.5  # 50% minimum success rate
    max_concurrent_worker_tasks: int = 3  # Max tasks per worker at once


@dataclass
class APIConfig:
    """API server configuration."""
    host: str = os.getenv("API_HOST", "0.0.0.0")
    port: int = int(os.getenv("API_PORT", "8000"))
    debug: bool = os.getenv("DEBUG", "false").lower() == "true"


# Global config instances
blockchain_config = BlockchainConfig()
agent_config = AgentConfig()
api_config = APIConfig()


def validate_config() -> bool:
    """Validate that all required configuration is present."""
    errors = []
    
    if not blockchain_config.treasury_address:
        errors.append("TREASURY_CONTRACT_ADDRESS not set")
    if not blockchain_config.task_registry_address:
        errors.append("TASK_REGISTRY_ADDRESS not set")
    if not blockchain_config.worker_registry_address:
        errors.append("WORKER_REGISTRY_ADDRESS not set")
    if not blockchain_config.coordinator_private_key:
        errors.append("COORDINATOR_PRIVATE_KEY not set")
    
    if errors:
        print("Configuration errors:")
        for error in errors:
            print(f"  - {error}")
        return False
    
    return True
