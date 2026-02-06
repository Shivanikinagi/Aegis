"""
Real-time monitoring dashboard for the Autonomous Treasury Agent.
Displays live updates of agent activity, tasks, and worker performance.
"""

import asyncio
import aiohttp
import time
from datetime import datetime

API_BASE = "http://localhost:8000"

async def fetch_status():
    """Fetch current system status."""
    async with aiohttp.ClientSession() as session:
        async with session.get(f"{API_BASE}/api/status") as resp:
            return await resp.json()

async def fetch_tasks():
    """Fetch current tasks."""
    async with aiohttp.ClientSession() as session:
        async with session.get(f"{API_BASE}/api/tasks") as resp:
            return await resp.json()

async def fetch_workers():
    """Fetch worker stats."""
    async with aiohttp.ClientSession() as session:
        async with session.get(f"{API_BASE}/api/workers") as resp:
            return await resp.json()

def clear_screen():
    """Clear the terminal."""
    print("\033[2J\033[H", end="")

async def monitor():
    """Main monitoring loop."""
    print("🔄 Starting real-time monitoring...")
    print("Press Ctrl+C to stop\n")
    await asyncio.sleep(2)
    
    while True:
        try:
            clear_screen()
            print("═" * 80)
            print(f"🏦 AUTONOMOUS TREASURY AGENT - REAL-TIME MONITOR")
            print(f"⏰ {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
            print("═" * 80)
            
            # Fetch data
            status = await fetch_status()
            tasks = await fetch_tasks()
            workers = await fetch_workers()
            
            # Treasury Status
            print("\n💰 TREASURY STATUS")
            print("─" * 80)
            treasury = status["treasury"]
            print(f"  Total Balance:     {treasury['total']:.4f} MON")
            print(f"  Available:         {treasury['available']:.4f} MON")
            print(f"  Reserved:          {treasury['reserved']:.4f} MON")
            
            # Tasks Summary
            print("\n📋 TASKS OVERVIEW")
            print("─" * 80)
            task_list = tasks.get("tasks", [])
            
            if task_list:
                status_counts = {}
                for task in task_list:
                    status = task["status"]
                    status_counts[status] = status_counts.get(status, 0) + 1
                
                print(f"  Total Tasks: {len(task_list)}")
                for status, count in status_counts.items():
                    icon = "🟢" if status == "COMPLETED" else "🟡" if status == "ASSIGNED" else "⚪"
                    print(f"  {icon} {status}: {count}")
                
                # Show recent tasks
                print("\n  Recent Tasks:")
                for task in task_list[-5:]:
                    status_icon = "✅" if task["status"] == "COMPLETED" else "⏳" if task["status"] == "ASSIGNED" else "📝"
                    print(f"    {status_icon} Task #{task['id']}: {task['taskType']} - {task['status']}")
            else:
                print("  No tasks yet")
            
            # Workers
            print("\n👷 WORKERS")
            print("─" * 80)
            worker_list = workers.get("workers", [])
            if worker_list:
                for worker in worker_list[:5]:
                    addr = worker["address"][:10] + "..."
                    reliability = worker.get("reliabilityScore", 0) / 100
                    success_rate = worker.get("successRate", 0) * 100
                    total_tasks = worker.get("totalTasks", 0)
                    
                    print(f"  {addr} - Tasks: {total_tasks:2d} | Success: {success_rate:5.1f}% | Score: {reliability:.2f}")
            
            # Agent Metrics
            print("\n📊 AGENT PERFORMANCE")
            print("─" * 80)
            metrics = status.get("metrics", {})
            strategy = metrics.get("strategy", {})
            
            total_decisions = strategy.get("total_decisions", 0)
            successful = strategy.get("successful_allocations", 0)
            failed = strategy.get("failed_allocations", 0)
            
            if total_decisions > 0:
                success_rate = (successful / total_decisions) * 100
                print(f"  Total Decisions:   {total_decisions}")
                print(f"  Successful:        {successful} ({success_rate:.1f}%)")
                print(f"  Failed:            {failed}")
                print(f"  Total Spent:       {strategy.get('total_spent', 0):.4f} MON")
                print(f"  ROI:               {strategy.get('roi', 0):.2f}%")
            else:
                print("  Waiting for agent decisions...")
            
            print("\n" + "═" * 80)
            print("🔄 Refreshing in 3 seconds... (Ctrl+C to stop)")
            
            await asyncio.sleep(3)
            
        except aiohttp.ClientError as e:
            print(f"\n❌ Connection error: {e}")
            print("Retrying in 5 seconds...")
            await asyncio.sleep(5)
        except KeyboardInterrupt:
            print("\n\n👋 Monitoring stopped.")
            break
        except Exception as e:
            print(f"\n❌ Error: {e}")
            await asyncio.sleep(3)

if __name__ == "__main__":
    try:
        asyncio.run(monitor())
    except KeyboardInterrupt:
        print("\n\n👋 Goodbye!")
