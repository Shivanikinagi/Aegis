"""
nad.fun Token Integration
Handles integration with the nad.fun platform for agent token launch
"""

import os
from typing import Dict, Optional
import structlog
import requests
from web3 import Web3

logger = structlog.get_logger()


class NadFunIntegration:
    """
    Integration with nad.fun platform for agent token
    
    nad.fun is the premier platform for launching agent tokens on Monad
    Features:
    - Token launch and liquidity
    - Agent discovery
    - Token trading
    - Agent reputation
    """
    
    def __init__(
        self,
        token_address: str,
        agent_address: str,
        nad_fun_api_url: str = "https://api.nad.fun",
        nad_fun_api_key: Optional[str] = None
    ):
        self.token_address = token_address
        self.agent_address = agent_address
        self.api_url = nad_fun_api_url
        self.api_key = nad_fun_api_key or os.getenv("NAD_FUN_API_KEY")
        
        self.session = requests.Session()
        if self.api_key:
            self.session.headers.update({
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            })
        
        logger.info("nad.fun integration initialized",
                   token=token_address,
                   agent=agent_address)
    
    def register_token(self, metadata: Dict) -> Dict:
        """
        Register token on nad.fun platform
        
        metadata should include:
        - name: Token name
        - symbol: Token symbol
        - description: Token/agent description
        - website: Project website
        - twitter: Twitter handle (optional)
        - telegram: Telegram link (optional)
        - github: GitHub repo (optional)
        - category: "Agent+AI"
        - logo_url: Token logo URL
        """
        try:
            payload = {
                "token_address": self.token_address,
                "agent_address": self.agent_address,
                "chain": "monad",
                **metadata
            }
            
            response = self.session.post(
                f"{self.api_url}/v1/tokens/register",
                json=payload
            )
            
            if response.status_code == 200:
                result = response.json()
                logger.info("Token registered on nad.fun",
                           token_id=result.get("token_id"))
                return result
            else:
                logger.error("Token registration failed",
                           status=response.status_code,
                           error=response.text)
                return {"error": response.text}
                
        except Exception as e:
            logger.error("nad.fun registration error", error=str(e))
            return {"error": str(e)}
    
    def update_agent_stats(self, stats: Dict) -> bool:
        """
        Update agent performance stats on nad.fun
        
        stats should include:
        - total_tasks: Total tasks completed
        - success_rate: Success rate (0-1)
        - total_revenue: Revenue generated
        - active_workers: Number of active workers
        - treasury_value: Current treasury value
        """
        try:
            response = self.session.post(
                f"{self.api_url}/v1/agents/{self.agent_address}/stats",
                json=stats
            )
            
            if response.status_code == 200:
                logger.info("Agent stats updated on nad.fun")
                return True
            else:
                logger.error("Stats update failed",
                           status=response.status_code)
                return False
                
        except Exception as e:
            logger.error("Stats update error", error=str(e))
            return False
    
    def get_token_price(self) -> Optional[float]:
        """Get current token price from nad.fun"""
        try:
            response = self.session.get(
                f"{self.api_url}/v1/tokens/{self.token_address}/price"
            )
            
            if response.status_code == 200:
                data = response.json()
                price = data.get("price_usd")
                logger.debug("Token price fetched", price=price)
                return price
            
            return None
            
        except Exception as e:
            logger.error("Price fetch error", error=str(e))
            return None
    
    def get_token_holders(self) -> Optional[int]:
        """Get number of token holders"""
        try:
            response = self.session.get(
                f"{self.api_url}/v1/tokens/{self.token_address}/holders"
            )
            
            if response.status_code == 200:
                data = response.json()
                return data.get("holder_count")
            
            return None
            
        except Exception as e:
            logger.error("Holder fetch error", error=str(e))
            return None
    
    def create_liquidity_pool(
        self,
        initial_token_amount: int,
        initial_eth_amount: int
    ) -> Dict:
        """
        Create liquidity pool on nad.fun DEX
        
        Args:
            initial_token_amount: Amount of tokens (in wei)
            initial_eth_amount: Amount of ETH (in wei)
        """
        try:
            payload = {
                "token_address": self.token_address,
                "token_amount": str(initial_token_amount),
                "eth_amount": str(initial_eth_amount)
            }
            
            response = self.session.post(
                f"{self.api_url}/v1/pools/create",
                json=payload
            )
            
            if response.status_code == 200:
                result = response.json()
                logger.info("Liquidity pool created",
                           pool_address=result.get("pool_address"))
                return result
            else:
                logger.error("Pool creation failed",
                           status=response.status_code)
                return {"error": response.text}
                
        except Exception as e:
            logger.error("Pool creation error", error=str(e))
            return {"error": str(e)}
    
    def get_agent_ranking(self) -> Optional[Dict]:
        """Get agent ranking on nad.fun leaderboard"""
        try:
            response = self.session.get(
                f"{self.api_url}/v1/agents/{self.agent_address}/ranking"
            )
            
            if response.status_code == 200:
                return response.json()
            
            return None
            
        except Exception as e:
            logger.error("Ranking fetch error", error=str(e))
            return None


def calculate_token_distribution() -> Dict[str, int]:
    """
    Calculate recommended token distribution for launch
    
    Returns token amounts for different purposes
    """
    TOTAL_SUPPLY = 1_000_000 * 10**18  # 1M tokens
    
    distribution = {
        "public_sale": int(TOTAL_SUPPLY * 0.40),      # 40% public
        "liquidity": int(TOTAL_SUPPLY * 0.20),        # 20% LP
        "team": int(TOTAL_SUPPLY * 0.15),             # 15% team (vested)
        "treasury": int(TOTAL_SUPPLY * 0.10),         # 10% treasury
        "staking_rewards": int(TOTAL_SUPPLY * 0.10),  # 10% staking
        "airdrop": int(TOTAL_SUPPLY * 0.05),          # 5% airdrop
    }
    
    return distribution


def generate_nad_fun_listing() -> Dict:
    """
    Generate metadata for nad.fun listing
    
    This is what appears on the nad.fun platform
    """
    return {
        "name": "Autonomous Treasury Agent",
        "symbol": "ATAI",
        "description": (
            "The first fully autonomous treasury agent on Monad. "
            "Manages treasury funds using AI, coordinates multiple agents, "
            "and automatically handles task allocation and verification. "
            "Token holders earn revenue from agent fees and govern agent parameters."
        ),
        "category": "Agent+AI",
        "tags": ["treasury", "autonomous", "multi-agent", "AI", "DeFi"],
        "website": "https://autonomous-treasury-agent.com",
        "github": "https://github.com/your-org/autonomous-treasury-agent",
        "twitter": "@ATreasury_Agent",
        "telegram": "https://t.me/autonomous_treasury",
        "logo_url": "https://your-cdn.com/atai-logo.png",
        
        # Agent-specific fields
        "agent_type": "treasury_management",
        "capabilities": [
            "Autonomous fund management",
            "Multi-agent coordination",
            "AI-powered task allocation",
            "On-chain governance",
            "Real-time market analysis"
        ],
        
        # Tokenomics
        "total_supply": "1,000,000",
        "initial_market_cap": "$100,000",
        "revenue_share": "2.5% of task fees",
        "staking_apy": "5%",
        
        # Launch details
        "launch_date": "TBD",
        "initial_price": "$0.10",
        "hard_cap": "$400,000"
    }


# Example usage in deployment script
if __name__ == "__main__":
    import json
    
    # Generate listing metadata
    listing = generate_nad_fun_listing()
    print("nad.fun Listing Metadata:")
    print(json.dumps(listing, indent=2))
    
    print("\n" + "="*60)
    
    # Generate token distribution
    distribution = calculate_token_distribution()
    print("\nToken Distribution:")
    for category, amount in distribution.items():
        tokens = amount / 10**18
        percent = (amount / (1_000_000 * 10**18)) * 100
        print(f"  {category}: {tokens:,.0f} tokens ({percent:.0f}%)")
