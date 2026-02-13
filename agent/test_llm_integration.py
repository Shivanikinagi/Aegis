import asyncio
import os
import json
import sys

# Ensure we can import modules whether run from root or agent dir
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.append(parent_dir)
if current_dir not in sys.path:
    sys.path.append(current_dir)

from unittest.mock import MagicMock

# Try imports with fallback
try:
    from agent.ai_reasoning import AIReasoner, LLMProvider
    from agent.blockchain import Task, TaskType, TaskStatus
except ImportError:
    try:
        from ai_reasoning import AIReasoner, LLMProvider
        from blockchain import Task, TaskType, TaskStatus
    except ImportError as e:
        print(f"❌ Import Error: {e}")
        print(f"Sys Path: {sys.path}")
        sys.exit(1)

# Mock Task object
def create_mock_task():
    task = MagicMock(spec=Task)
    task.id = 1
    task.taskType = MagicMock()
    task.taskType.name = "DATA_ANALYSIS"
    task.description = "Analyze the last 1000 blocks for transaction volume spikes."
    task.reward = 500000000000000000  # 0.5 ETH
    task.creator = "0x1234567890123456789012345678901234567890"
    return task

async def test_llm_integration():
    print("🧪 Starting LLM Integration Test...")
    
    # Check for keys
    openai_key = os.getenv("OPENAI_API_KEY")
    anthropic_key = os.getenv("ANTHROPIC_API_KEY")
    
    if not openai_key and not anthropic_key:
        print("⚠️  No API keys found in environment. Skipping live API calls.")
        return

    provider = LLMProvider.OPENAI if openai_key else LLMProvider.ANTHROPIC
    print(f"🤖 Using provider: {provider.value}")

    try:
        reasoner = AIReasoner(provider=provider)
        
        # 1. Test Task Analysis
        print("\n1️⃣  Testing Task Analysis...")
        task = create_mock_task()
        analysis = await reasoner.analyze_task(task)
        print("   ✅ Analysis result:", json.dumps(analysis, indent=2))
        
        # 2. Test Worker Assessment
        print("\n2️⃣  Testing Worker Assessment...")
        worker_history = {
            "total_tasks": 50,
            "success_rate": 0.95,
            "avg_time": 3600,
            "reliability": 9500,
            "recent_performance": "Consistent high quality"
        }
        score, reason = await reasoner.assess_worker_match(task, "0xWorkerAddress", worker_history)
        print(f"   ✅ Score: {score}")
        
        print("\n✨ All LLM Integration Tests Passed!")
        
    except Exception as e:
        print(f"\n❌ Test Failed: {str(e)}")

if __name__ == "__main__":
    try:
        from dotenv import load_dotenv
        load_dotenv()
    except ImportError:
        pass

    asyncio.run(test_llm_integration())
