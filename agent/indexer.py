"""
Envio Indexer Integration
Connects to Envio indexer for fast on-chain data access
"""

import os
from typing import Dict, List, Optional, Any
import structlog
import requests
from datetime import datetime, timedelta

logger = structlog.get_logger()


class EnvioIndexer:
    """
    Client for Envio blockchain indexer
    Provides fast access to indexed on-chain data
    """
    
    def __init__(
        self,
        api_url: Optional[str] = None,
        api_key: Optional[str] = None
    ):
        self.api_url = api_url or os.getenv("ENVIO_API_URL", "http://localhost:8080")
        self.api_key = api_key or os.getenv("ENVIO_API_KEY")
        
        self.session = requests.Session()
        if self.api_key:
            self.session.headers.update({
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            })
        
        logger.info("Envio indexer initialized", api_url=self.api_url)
    
    def query_graphql(self, query: str, variables: Optional[Dict] = None) -> Dict:
        """Execute GraphQL query against Envio"""
        try:
            response = self.session.post(
                f"{self.api_url}/graphql",
                json={
                    "query": query,
                    "variables": variables or {}
                }
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                logger.error("GraphQL query failed",
                           status=response.status_code,
                           error=response.text)
                return {"error": response.text}
                
        except Exception as e:
            logger.error("Envio query error", error=str(e))
            return {"error": str(e)}
    
    def get_tasks(
        self,
        status: Optional[str] = None,
        limit: int = 100
    ) -> List[Dict]:
        """Get tasks from indexer"""
        query = """
        query GetTasks($status: String, $limit: Int!) {
            tasks(
                where: { status: $status }
                limit: $limit
                orderBy: createdAt
                orderDirection: desc
            ) {
                id
                taskId
                creator
                taskType
                description
                reward
                status
                assignedWorker
                createdAt
                completedAt
            }
        }
        """
        
        result = self.query_graphql(query, {
            "status": status,
            "limit": limit
        })
        
        return result.get("data", {}).get("tasks", [])
    
    def get_workers(self, active_only: bool = True) -> List[Dict]:
        """Get workers from indexer"""
        query = """
        query GetWorkers($activeOnly: Boolean!) {
            workers(
                where: { isActive: $activeOnly }
                orderBy: reliabilityScore
                orderDirection: desc
            ) {
                id
                address
                metadata
                isActive
                reliabilityScore
                totalTasks
                completedTasks
                failedTasks
                registeredAt
            }
        }
        """
        
        result = self.query_graphql(query, {"activeOnly": active_only})
        return result.get("data", {}).get("workers", [])
    
    def get_treasury_balance(self) -> Dict:
        """Get current treasury balance"""
        query = """
        query GetTreasuryBalance {
            treasury(id: "1") {
                totalBalance
                availableBalance
                reservedBalance
                totalDeposited
                totalSpent
                dailySpent
                lastResetTimestamp
            }
        }
        """
        
        result = self.query_graphql(query)
        return result.get("data", {}).get("treasury", {})
    
    def get_agent_bids(self, task_id: Optional[int] = None) -> List[Dict]:
        """Get agent marketplace bids"""
        query = """
        query GetBids($taskId: Int) {
            bids(
                where: { taskId: $taskId }
                orderBy: proposedPrice
                orderDirection: asc
            ) {
                id
                bidId
                taskId
                bidder
                proposedPrice
                estimatedTime
                proposal
                status
                createdAt
            }
        }
        """
        
        result = self.query_graphql(query, {"taskId": task_id})
        return result.get("data", {}).get("bids", [])
    
    def get_agent_profile(self, address: str) -> Optional[Dict]:
        """Get agent profile from marketplace"""
        query = """
        query GetAgentProfile($address: String!) {
            agent(id: $address) {
                address
                name
                capabilities
                reputation
                totalBidsWon
                totalTasksCompleted
                isActive
                registeredAt
            }
        }
        """
        
        result = self.query_graphql(query, {"address": address.lower()})
        return result.get("data", {}).get("agent")
    
    def get_token_holders(self, limit: int = 100) -> List[Dict]:
        """Get agent token holders"""
        query = """
        query GetTokenHolders($limit: Int!) {
            tokenHolders(
                limit: $limit
                orderBy: balance
                orderDirection: desc
            ) {
                address
                balance
                stakedBalance
                claimableRevenue
                lastUpdate
            }
        }
        """
        
        result = self.query_graphql(query, {"limit": limit})
        return result.get("data", {}).get("tokenHolders", [])
    
    def get_recent_events(
        self,
        event_type: Optional[str] = None,
        hours: int = 24,
        limit: int = 100
    ) -> List[Dict]:
        """Get recent events of any type"""
        since = int((datetime.now() - timedelta(hours=hours)).timestamp())
        
        query = """
        query GetRecentEvents($eventType: String, $since: Int!, $limit: Int!) {
            events(
                where: { 
                    eventType: $eventType
                    timestamp_gte: $since
                }
                limit: $limit
                orderBy: timestamp
                orderDirection: desc
            ) {
                id
                eventType
                blockNumber
                transactionHash
                timestamp
                data
            }
        }
        """
        
        result = self.query_graphql(query, {
            "eventType": event_type,
            "since": since,
            "limit": limit
        })
        
        return result.get("data", {}).get("events", [])
    
    def get_statistics(self) -> Dict:
        """Get aggregated statistics"""
        query = """
        query GetStatistics {
            statistics(id: "global") {
                totalTasks
                completedTasks
                failedTasks
                totalWorkers
                activeWorkers
                totalAgents
                totalBids
                acceptedBids
                totalVolume
                totalRevenue
                tokenHolders
                stakedTokens
            }
        }
        """
        
        result = self.query_graphql(query)
        return result.get("data", {}).get("statistics", {})
    
    def subscribe_to_events(
        self,
        event_types: List[str],
        callback: callable
    ):
        """
        Subscribe to real-time events via WebSocket
        (Simplified - full implementation would use WebSocket)
        """
        logger.info("Event subscription requested",
                   event_types=event_types)
        
        # In production, implement WebSocket connection
        # For now, polling-based approach
        import time
        
        last_check = datetime.now()
        while True:
            try:
                for event_type in event_types:
                    events = self.get_recent_events(
                        event_type=event_type,
                        hours=1,
                        limit=10
                    )
                    
                    # Filter to only new events
                    new_events = [
                        e for e in events
                        if datetime.fromtimestamp(e['timestamp']) > last_check
                    ]
                    
                    for event in new_events:
                        callback(event)
                
                last_check = datetime.now()
                time.sleep(5)  # Poll every 5 seconds
                
            except KeyboardInterrupt:
                break
            except Exception as e:
                logger.error("Event subscription error", error=str(e))
                time.sleep(10)


# Convenience function for agent integration
def get_indexer() -> EnvioIndexer:
    """Get configured Envio indexer instance"""
    return EnvioIndexer()


# Example usage
if __name__ == "__main__":
    indexer = get_indexer()
    
    # Get recent tasks
    tasks = indexer.get_tasks(limit=10)
    print(f"Recent tasks: {len(tasks)}")
    
    # Get active workers
    workers = indexer.get_workers(active_only=True)
    print(f"Active workers: {len(workers)}")
    
    # Get statistics
    stats = indexer.get_statistics()
    print(f"Statistics: {stats}")
