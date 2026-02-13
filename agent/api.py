"""
API Server for the Autonomous Treasury Agent.
Provides REST endpoints for the frontend dashboard.
"""

import asyncio
import hashlib
import time
from typing import Dict, Optional
from dataclasses import asdict
import json

from aiohttp import web
import structlog

from config import api_config, blockchain_config
from coordinator import CoordinatorAgent
from memory import AgentMemory
from blockchain import BlockchainClient, TaskStatus
from notifications import notify_high_value_task_created

logger = structlog.get_logger()


class APIServer:
    """
    REST API server for the Treasury Agent dashboard.
    """
    
    def __init__(self, agent: Optional[CoordinatorAgent] = None):
        self.agent = agent
        self.app = web.Application()
        self.blockchain = BlockchainClient()
        self.memory = AgentMemory(data_dir="data")
        
        self._setup_routes()
        self._setup_cors()
    
    def _setup_routes(self):
        """Setup API routes."""
        self.app.router.add_get("/api/health", self.health_check)
        self.app.router.add_get("/api/status", self.get_status)
        self.app.router.add_get("/api/treasury", self.get_treasury)
        self.app.router.add_get("/api/tasks", self.get_tasks)
        self.app.router.add_get("/api/tasks/{task_id}", self.get_task)
        self.app.router.add_post("/api/tasks", self.create_task)
        self.app.router.add_get("/api/workers", self.get_workers)
        self.app.router.add_get("/api/workers/{address}", self.get_worker)
        self.app.router.add_get("/api/metrics", self.get_metrics)
        self.app.router.add_get("/api/learning", self.get_learning_stats)
        self.app.router.add_get("/api/transactions", self.get_transactions)
        self.app.router.add_get("/api/treasury/history", self.get_treasury_history)
    
    def _setup_cors(self):
        """Setup CORS middleware."""
        @web.middleware
        async def cors_middleware(request, handler):
            if request.method == "OPTIONS":
                return web.Response(
                    status=200,
                    headers={
                        "Access-Control-Allow-Origin": "*",
                        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                        "Access-Control-Allow-Headers": "Content-Type"
                    }
                )
            
            response = await handler(request)
            response.headers["Access-Control-Allow-Origin"] = "*"
            return response
        
        self.app.middlewares.append(cors_middleware)
    
    # ============ Endpoints ============
    
    async def health_check(self, request: web.Request) -> web.Response:
        """Health check endpoint."""
        return web.json_response({
            "status": "healthy",
            "blockchain_connected": self.blockchain.is_connected(),
            "agent_running": self.agent.running if self.agent else False
        })
    
    async def get_status(self, request: web.Request) -> web.Response:
        """Get overall system status."""
        if self.agent:
            status = self.agent.get_status()
        else:
            total, reserved, available = self.blockchain.get_treasury_balance()
            status = {
                "running": False,
                "treasury": {
                    "total": total,
                    "reserved": reserved,
                    "available": available
                },
                "metrics": self.memory.get_metrics_summary()
            }
        
        return web.json_response(status)
    
    async def get_treasury(self, request: web.Request) -> web.Response:
        """Get treasury status and rules."""
        total, reserved, available = self.blockchain.get_treasury_balance()
        rules = self.blockchain.get_treasury_rules()
        
        return web.json_response({
            "balance": {
                "total": total,
                "reserved": reserved,
                "available": available
            },
            "daily": {
                "spent": self.blockchain.get_daily_spent(),
                "remaining": self.blockchain.get_remaining_daily_budget()
            },
            "rules": {
                "maxSpendPerTask": float(self.blockchain.w3.from_wei(rules.max_spend_per_task, "ether")) if rules else 0,
                "maxSpendPerDay": float(self.blockchain.w3.from_wei(rules.max_spend_per_day, "ether")) if rules else 0,
                "minTaskValue": float(self.blockchain.w3.from_wei(rules.min_task_value, "ether")) if rules else 0,
                "cooldownPeriod": rules.cooldown_period if rules else 0
            },
            "address": blockchain_config.treasury_address
        })
    
    async def get_tasks(self, request: web.Request) -> web.Response:
        """Get list of tasks."""
        status_filter = request.query.get("status")
        limit = int(request.query.get("limit", 50))
        
        task_count = self.blockchain.get_task_count()
        tasks = []
        
        # Get tasks in reverse order (newest first)
        for task_id in range(task_count, max(0, task_count - limit), -1):
            task = self.blockchain.get_task(task_id)
            if task:
                task_dict = {
                    "id": task.id,
                    "taskType": task.task_type.name,
                    "status": task.status.name,
                    "creator": task.creator,
                    "assignedWorker": task.assigned_worker if task.assigned_worker != "0x" + "0" * 40 else None,
                    "maxPayment": float(self.blockchain.w3.from_wei(task.max_payment, "ether")),
                    "actualPayment": float(self.blockchain.w3.from_wei(task.actual_payment, "ether")),
                    "deadline": task.deadline,
                    "createdAt": task.created_at,
                    "completedAt": task.completed_at,
                    "verificationRule": task.verification_rule
                }
                
                if status_filter and task.status.name != status_filter.upper():
                    continue
                
                tasks.append(task_dict)
        
        return web.json_response({
            "tasks": tasks,
            "total": task_count,
            "openCount": len(self.blockchain.get_open_tasks())
        })
    
    async def get_task(self, request: web.Request) -> web.Response:
        """Get single task by ID."""
        task_id = int(request.match_info["task_id"])
        task = self.blockchain.get_task(task_id)
        
        if not task:
            return web.json_response({"error": "Task not found"}, status=404)
        
        return web.json_response({
            "id": task.id,
            "taskType": task.task_type.name,
            "status": task.status.name,
            "creator": task.creator,
            "assignedWorker": task.assigned_worker if task.assigned_worker != "0x" + "0" * 40 else None,
            "maxPayment": float(self.blockchain.w3.from_wei(task.max_payment, "ether")),
            "actualPayment": float(self.blockchain.w3.from_wei(task.actual_payment, "ether")),
            "deadline": task.deadline,
            "createdAt": task.created_at,
            "completedAt": task.completed_at,
            "descriptionHash": "0x" + task.description_hash.hex() if task.description_hash else None,
            "resultHash": "0x" + task.result_hash.hex() if task.result_hash and task.result_hash != bytes(32) else None,
            "verificationRule": task.verification_rule
        })
    
    async def create_task(self, request: web.Request) -> web.Response:
        """Create a new task via the smart contract."""
        try:
            data = await request.json()
            
            # Extract task parameters
            task_type = data.get('taskType', 'COMPUTE')
            max_payment = data.get('maxPayment', 1.0)
            deadline = data.get('deadline', 0)
            description = data.get('description', '')
            verification_rule = data.get('verificationRule', 'manual')
            
            # Convert task type to enum value
            from blockchain import TaskType
            task_type_map = {
                'COMPUTE': TaskType.COMPUTATION,
                'DATA_PROCESSING': TaskType.DATA_ANALYSIS,
                'API_CALL': TaskType.OTHER,
                'ANALYSIS': TaskType.DATA_ANALYSIS,
                'CODE_REVIEW': TaskType.CODE_REVIEW,
                'TEXT_GENERATION': TaskType.TEXT_GENERATION,
                'RESEARCH': TaskType.RESEARCH,
            }
            
            task_type_enum = task_type_map.get(task_type, TaskType.COMPUTATION)
            
            # Create task on blockchain
            max_payment_wei = self.blockchain.w3.to_wei(max_payment, 'ether')
            
            # Create description hash
            import hashlib
            description_hash = hashlib.sha256(description.encode()).digest()
            
            logger.info("Creating task via API", 
                       task_type=task_type,
                       max_payment=max_payment,
                       deadline=deadline)
            
            # Call blockchain to create task
            success, tx_hash, task_id = self.blockchain.create_task(
                task_type=task_type_enum,
                max_payment=max_payment_wei,
                deadline=int(deadline) if deadline else 0,
                description_hash=description_hash,
                verification_rule=verification_rule
            )
            
            if success:
                # Notify if high value
                if float(max_payment) > 100:
                     asyncio.create_task(notify_high_value_task_created(
                        task_id=task_id,
                        creator="API User",
                        amount=float(max_payment),
                        description=description
                    ))

                return web.json_response({
                    "success": True,
                    "taskId": task_id,
                    "txHash": tx_hash,
                    "message": "Task created successfully"
                })
            else:
                return web.json_response({
                    "error": f"Failed to create task: {tx_hash}"
                }, status=500)
                
        except Exception as e:
            logger.error("Task creation failed", error=str(e))
            return web.json_response({
                "error": f"Task creation failed: {str(e)}"
            }, status=500)
    
    async def get_workers(self, request: web.Request) -> web.Response:
        """Get list of workers."""
        active_only = request.query.get("active", "true").lower() == "true"
        
        workers = []
        worker_addresses = self.blockchain.get_active_workers()
        
        for address in worker_addresses:
            worker = self.blockchain.get_worker(address)
            if worker:
                # Get memory data
                worker_mem = self.memory.get_worker(address.lower())
                
                workers.append({
                    "address": address,
                    "isActive": worker.is_active,
                    "registeredAt": worker.registered_at,
                    "totalTasks": worker.total_tasks,
                    "successfulTasks": worker.successful_tasks,
                    "totalEarnings": float(self.blockchain.w3.from_wei(worker.total_earnings, "ether")),
                    "reliabilityScore": worker.reliability_score / 100,  # Convert to percentage
                    "allowedTaskTypes": [t for t in worker.allowed_task_types],
                    "memoryReliability": worker_mem.reliability_score,
                    "memorySuccessRate": worker_mem.success_rate
                })
        
        return web.json_response({
            "workers": workers,
            "totalActive": len(workers)
        })
    
    async def get_worker(self, request: web.Request) -> web.Response:
        """Get single worker by address."""
        address = request.match_info["address"]
        
        worker = self.blockchain.get_worker(address)
        if not worker:
            return web.json_response({"error": "Worker not found"}, status=404)
        
        worker_mem = self.memory.get_worker(address.lower())
        
        return web.json_response({
            "address": address,
            "isActive": worker.is_active,
            "registeredAt": worker.registered_at,
            "onChain": {
                "totalTasks": worker.total_tasks,
                "successfulTasks": worker.successful_tasks,
                "totalEarnings": float(self.blockchain.w3.from_wei(worker.total_earnings, "ether")),
                "reliabilityScore": worker.reliability_score / 100,
                "lastTaskAt": worker.last_task_at,
                "allowedTaskTypes": [t for t in worker.allowed_task_types]
            },
            "agentMemory": {
                "totalTasks": worker_mem.total_tasks,
                "successfulTasks": worker_mem.successful_tasks,
                "failedTasks": worker_mem.failed_tasks,
                "reliabilityScore": worker_mem.reliability_score,
                "successRate": worker_mem.success_rate,
                "averageCompletionTime": worker_mem.average_completion_time,
                "taskTypeScores": worker_mem.task_type_scores
            }
        })
    
    async def get_metrics(self, request: web.Request) -> web.Response:
        """Get agent metrics."""
        metrics = self.memory.get_metrics_summary()
        
        # Add treasury metrics
        total, reserved, available = self.blockchain.get_treasury_balance()
        metrics["treasury"] = {
            "total": total,
            "reserved": reserved,
            "available": available,
            "utilizationRate": reserved / total if total > 0 else 0
        }
        
        return web.json_response(metrics)
    
    async def get_learning_stats(self, request: web.Request) -> web.Response:
        """Get learning algorithm statistics and improvement metrics."""
        # Get learning insights from memory
        insights = self.memory.get_learning_insights()
        
        # Add agent-specific stats if agent is running
        if self.agent:
            insights["agent_status"] = {
                "running": self.agent.running,
                "cycle_count": getattr(self.agent, 'cycle_count', 0),
                "uptime_seconds": time.time() - getattr(self.agent, 'start_time', time.time())
            }
            
            # Get worker selection stats from learner
            if hasattr(self.agent, 'learner'):
                learner = self.agent.learner
                if hasattr(learner, 'bandit'):
                    insights["worker_selection"] = {
                        "total_pulls": learner.bandit.total_pulls,
                        "exploration_rate": learner.bandit.exploration_constant,
                        "worker_pull_counts": learner.bandit.worker_pulls
                    }
        else:
            insights["agent_status"] = {
                "running": False,
                "message": "Agent not currently active"
            }
        
        return web.json_response(insights)
    
    async def get_transactions(self, request: web.Request) -> web.Response:
        """Get REAL blockchain transactions from events."""
        limit = int(request.query.get("limit", 20))
        
        # Get Contract Registry
        registry = self.blockchain.task_registry
        if not registry:
             return web.json_response({"transactions": []})
        
        events_list = []
        try:
            # Determine block range (last 1000 blocks or from 0 for local)
            current_block = self.blockchain.w3.eth.block_number
            from_block = max(0, current_block - 1000)
            
            # 1. Created
            logs_created = registry.events.TaskCreated.create_filter(fromBlock=from_block).get_all_entries()
            for log in logs_created:
                events_list.append({
                    "log": log,
                    "type": "TASK_CREATED",
                    "id": log.args.taskId,
                    "payment": None
                })
                
            # 2. Assigned
            logs_assigned = registry.events.TaskAssigned.create_filter(fromBlock=from_block).get_all_entries()
            for log in logs_assigned:
                events_list.append({
                    "log": log,
                    "type": "PAYMENT_APPROVED",
                    "id": log.args.taskId,
                    "payment": float(self.blockchain.w3.from_wei(log.args.payment, "ether"))
                })
                
            # 3. Completed
            logs_completed = registry.events.TaskCompleted.create_filter(fromBlock=from_block).get_all_entries()
            for log in logs_completed:
                events_list.append({
                    "log": log,
                    "type": "TASK_COMPLETED",
                    "id": log.args.taskId,
                    "payment": float(self.blockchain.w3.from_wei(log.args.actualPayment, "ether"))
                })
        except Exception as e:
            logger.error("Failed to fetch transaction logs", error=str(e))
            # Fallback to empty if filter fails (e.g. RPC issue)
            return web.json_response({"transactions": []})

        # Sort by block number descending
        events_list.sort(key=lambda x: x["log"].blockNumber, reverse=True)
        events_list = events_list[:limit]
        
        transactions = []
        for item in events_list:
            log = item["log"]
            # Estimate timestamp: current_time - (blocks_ago * 2s) - assuming 2s block time on hardhat
            age_blocks = current_block - log.blockNumber
            timestamp_ms = (time.time() - (age_blocks * 2)) * 1000
            
            transactions.append({
                "hash": log.transactionHash.hex(),
                "type": item["type"],
                "status": "SUCCESS",
                "timestamp": timestamp_ms,
                "taskId": item["id"],
                "payment": item.get("payment"),
                "gasUsed": 150000 + (log.blockNumber % 50000), # Mock gas variation
                "block": log.blockNumber
            })
            
        return web.json_response({"transactions": transactions})

    async def get_treasury_history(self, request: web.Request) -> web.Response:
        """Get treasury balance history for visualization."""
        limit = int(request.query.get("limit", 50))
        
        # 1. Get current balance
        total, reserved, available = self.blockchain.get_treasury_balance()
        
        # 2. Get transaction log to reconstruct history
        current_block = self.blockchain.w3.eth.block_number
        from_block = max(0, current_block - 2000)
        
        registry = self.blockchain.task_registry
        
        # Start with current balance at "now"
        current_time = time.time()
        
        try:
            if not registry:
                return web.json_response({"history": []})

            logs_assigned = registry.events.TaskAssigned.create_filter(fromBlock=from_block).get_all_entries()
            logs_completed = registry.events.TaskCompleted.create_filter(fromBlock=from_block).get_all_entries()
            
            events = []
            for log in logs_assigned:
                events.append({
                    "block": log.blockNumber,
                    "type": "ASSIGNED",
                    "amount": float(self.blockchain.w3.from_wei(log.args.payment, "ether"))
                })
            for log in logs_completed:
                events.append({
                    "block": log.blockNumber,
                    "type": "COMPLETED",
                    "amount": float(self.blockchain.w3.from_wei(log.args.actualPayment, "ether"))
                })
                
            # Sort by block
            events.sort(key=lambda x: x["block"])
            

            # Calculate total spending in this window
            total_window_spending = sum(e["amount"] for e in events if e["type"] == "COMPLETED")
            
            # Reconstruct balance history
            # Start balance = Current Balance + Total Spent in Window
            current_balance = total
            start_balance = current_balance + total_window_spending
            
            running_balance = start_balance
            data = []
            
            # Initial point
            start_time = current_time - ((current_block - from_block) * 2) 
            data.append({
                "timestamp": start_time * 1000,
                "balance": running_balance
            })
            
            for event in events:
                if event["type"] == "COMPLETED":
                    running_balance -= event["amount"]
                    
                    time_diff = (current_block - event["block"]) * 2
                    timestamp = current_time - time_diff
                    
                    data.append({
                        "timestamp": timestamp * 1000,
                        "balance": running_balance
                    })
            
            # Ensure final point matches current
            data.append({
                "timestamp": current_time * 1000,
                "balance": current_balance
            })
            
            return web.json_response({"history": data})
            
        except Exception as e:
            logger.error("Failed to fetch history", error=str(e))
            return web.json_response({"history": []})
    
    def run(self, host: str = None, port: int = None):
        """Run the API server."""
        host = host or api_config.host
        port = port or api_config.port
        
        logger.info("Starting API server", host=host, port=port)
        web.run_app(self.app, host=host, port=port)


def create_app(agent: Optional[CoordinatorAgent] = None) -> web.Application:
    """Create the API application."""
    server = APIServer(agent)
    return server.app


if __name__ == "__main__":
    server = APIServer()
    server.run()
