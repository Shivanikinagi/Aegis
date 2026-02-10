#!/usr/bin/env python3
"""
Example script showing how to use Grok AI with the Autonomous Treasury Agent
"""

import asyncio
import os
from agent.ai_reasoning import AIReasoner, LLMProvider
from agent.blockchain import Task, TaskType, TaskStatus

async def test_grok_integration():
    """Test Grok integration with sample task analysis"""
    
    print("\n🤖 Testing Grok AI Integration")
    print("=" * 60)
    
    # Check for API key
    grok_key = os.getenv("GROK_API_KEY")
    if not grok_key:
        print("❌ GROK_API_KEY not found in environment")
        print("Get your API key from https://x.ai")
        print("Add it to .env file: GROK_API_KEY=xai-...")
        return
    
    # Initialize Grok reasoner
    print("\n1. Initializing Grok AI reasoner...")
    reasoner = AIReasoner(
        provider=LLMProvider.GROK,
        grok_api_key=grok_key,
        model="grok-beta"
    )
    print("✅ Grok initialized with grok-beta model")
    
    # Create a sample task
    print("\n2. Creating sample task...")
    sample_task = Task(
        id=1,
        taskType=TaskType.CODE_REVIEW,
        description="Review smart contract for security vulnerabilities in DeFi protocol",
        reward=1000000000000000000,  # 1 ETH in wei
        creator="0x1234567890123456789012345678901234567890",
        worker="0x0000000000000000000000000000000000000000",
        status=TaskStatus.OPEN,
        createdAt=int(asyncio.get_event_loop().time()),
        deadline=0
    )
    print(f"✅ Task created: {sample_task.description}")
    
    # Test task analysis
    print("\n3. Analyzing task with Grok...")
    analysis = await reasoner.analyze_task(sample_task)
    print("✅ Analysis complete:")
    print(f"   - Complexity: {analysis['complexity']}")
    print(f"   - Estimated Time: {analysis['estimated_time']} hours")
    print(f"   - Risk Level: {analysis['risk_level']}")
    print(f"   - Required Skills: {', '.join(analysis['required_skills'])}")
    print(f"   - Recommended Reward: {analysis['recommended_reward']} ETH")
    print(f"   - Reasoning: {analysis['reasoning']}")
    
    # Test worker matching
    print("\n4. Testing worker match assessment...")
    worker_history = {
        "total_tasks": 15,
        "success_rate": 0.87,
        "avg_time": 3600,
        "reliability": 7500,
        "recent_performance": "Good"
    }
    
    match_score, reasoning = await reasoner.assess_worker_match(
        task=sample_task,
        worker_address="0xWorker123...",
        worker_history=worker_history
    )
    print(f"✅ Worker match score: {match_score:.2f}/1.0")
    print(f"   Reasoning: {reasoning}")
    
    # Test natural language query
    print("\n5. Testing natural language interaction...")
    context = {
        "total_tasks": 42,
        "active_tasks": 7,
        "treasury_balance": "10.5 ETH",
        "total_workers": 12
    }
    
    query = "What's the current status of the treasury?"
    response = await reasoner.natural_language_query(query, context)
    print(f"✅ Query: {query}")
    print(f"   Response: {response}")
    
    print("\n" + "=" * 60)
    print("✅ All Grok AI tests passed!")
    print("\n💡 Grok is now integrated with your autonomous agent!")
    print("   Edit .env to set: LLM_PROVIDER=grok")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(test_grok_integration())
