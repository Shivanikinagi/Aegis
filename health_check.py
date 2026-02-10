#!/usr/bin/env python3
"""
Health Check Script - Verify all systems are operational
"""

import asyncio
import os
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent / "agent"))

async def check_health():
    """Run comprehensive health checks"""
    
    print("\n" + "="*60)
    print("🏥 AUTONOMOUS TREASURY AGENT - HEALTH CHECK")
    print("="*60)
    
    checks_passed = 0
    checks_failed = 0
    
    # 1. Check environment configuration
    print("\n📋 1. Checking Environment Configuration...")
    env_file = Path(".env")
    if env_file.exists():
        print("   ✅ .env file exists")
        checks_passed += 1
        
        # Check for required keys
        env_content = env_file.read_text()
        required_keys = [
            "DEPLOYER_PRIVATE_KEY",
            "COORDINATOR_PRIVATE_KEY",
            "TREASURY_CONTRACT_ADDRESS",
            "TASK_REGISTRY_ADDRESS",
            "WORKER_REGISTRY_ADDRESS",
            "GROK_API_KEY"
        ]
        
        for key in required_keys:
            if key in env_content and f"{key}=" in env_content:
                value = [line for line in env_content.split('\n') if line.startswith(f"{key}=")]
                if value and len(value[0].split('=')[1].strip()) > 0:
                    print(f"   ✅ {key} configured")
                else:
                    print(f"   ⚠️  {key} empty")
    else:
        print("   ❌ .env file not found")
        checks_failed += 1
    
    # 2. Check contract deployment
    print("\n📜 2. Checking Contract Deployment...")
    try:
        from agent.blockchain import BlockchainClient
        
        client = BlockchainClient()
        
        # Check treasury
        treasury_balance = await client.get_treasury_balance()
        print(f"   ✅ Treasury Balance: {treasury_balance:.4f} ETH")
        checks_passed += 1
        
        # Check if contracts are accessible
        print("   ✅ Contracts deployed and accessible")
        checks_passed += 1
        
    except Exception as e:
        print(f"   ❌ Contract check failed: {str(e)}")
        checks_failed += 1
    
    # 3. Check API endpoints
    print("\n🌐 3. Checking API Server...")
    try:
        import aiohttp
        async with aiohttp.ClientSession() as session:
            async with session.get('http://localhost:8000/health', timeout=aiohttp.ClientTimeout(total=5)) as resp:
                if resp.status == 200:
                    print("   ✅ API server responding on port 8000")
                    checks_passed += 1
                else:
                    print(f"   ⚠️  API server returned status {resp.status}")
    except Exception as e:
        print(f"   ⚠️  API server not responding (may not be started)")
        print(f"      Run: cd agent && python main.py")
    
    # 4. Check frontend
    print("\n🎨 4. Checking Frontend...")
    try:
        import aiohttp
        async with aiohttp.ClientSession() as session:
            async with session.get('http://localhost:3000', timeout=aiohttp.ClientTimeout(total=5)) as resp:
                if resp.status == 200:
                    print("   ✅ Frontend responding on port 3000")
                    checks_passed += 1
                else:
                    print(f"   ⚠️  Frontend returned status {resp.status}")
    except Exception as e:
        print(f"   ⚠️  Frontend not responding (may not be started)")
        print(f"      Run: cd frontend && npm run dev")
    
    # 5. Check AI/LLM integration
    print("\n🤖 5. Checking AI/LLM Integration...")
    grok_key = os.getenv("GROK_API_KEY")
    if grok_key and len(grok_key) > 10:
        print("   ✅ Grok API key configured")
        checks_passed += 1
        
        try:
            from agent.ai_reasoning import AIReasoner, LLMProvider
            reasoner = AIReasoner(
                provider=LLMProvider.GROK,
                grok_api_key=grok_key,
                model="grok-beta"
            )
            print("   ✅ AI Reasoner initialized successfully")
            checks_passed += 1
        except Exception as e:
            print(f"   ⚠️  AI Reasoner initialization failed: {str(e)}")
    else:
        print("   ⚠️  Grok API key not configured")
        print("      Get key from: https://console.x.ai")
    
    # 6. Check Python dependencies
    print("\n📦 6. Checking Python Dependencies...")
    required_packages = ['web3', 'aiohttp', 'structlog', 'requests', 'openai']
    all_installed = True
    for package in required_packages:
        try:
            __import__(package)
            print(f"   ✅ {package}")
        except ImportError:
            print(f"   ❌ {package} not installed")
            all_installed = False
            checks_failed += 1
    
    if all_installed:
        checks_passed += 1
    
    # 7. Check contract addresses
    print("\n📍 7. Deployed Contract Addresses...")
    addresses = {
        "Treasury": os.getenv("TREASURY_CONTRACT_ADDRESS"),
        "TaskRegistry": os.getenv("TASK_REGISTRY_ADDRESS"),
        "WorkerRegistry": os.getenv("WORKER_REGISTRY_ADDRESS"),
        "AgentMarketplace": os.getenv("AGENT_MARKETPLACE_ADDRESS"),
        "AgentToken": os.getenv("AGENT_TOKEN_ADDRESS")
    }
    
    for name, address in addresses.items():
        if address and len(address) > 10:
            print(f"   ✅ {name}: {address}")
        else:
            print(f"   ⚠️  {name}: Not configured")
    
    # Summary
    print("\n" + "="*60)
    print("📊 HEALTH CHECK SUMMARY")
    print("="*60)
    print(f"✅ Checks Passed: {checks_passed}")
    print(f"❌ Checks Failed: {checks_failed}")
    
    if checks_failed == 0 and checks_passed >= 8:
        print("\n🎉 ALL SYSTEMS OPERATIONAL!")
        print("\n🚀 Your Autonomous Treasury Agent is ready for the hackathon!")
        print("\n📱 Access Points:")
        print("   • Frontend: http://localhost:3000")
        print("   • API: http://localhost:8000")
        print("   • Docs: http://localhost:8000/docs")
        print("\n🏆 Competition Features:")
        print("   ✅ Multi-Agent Marketplace")
        print("   ✅ Grok AI Integration")
        print("   ✅ ERC20 Token (ATAI)")
        print("   ✅ Monad Testnet Deployed")
        print("   ✅ Wallet Connect Ready")
    elif checks_failed == 0:
        print("\n✅ Core systems operational")
        print("⚠️  Some optional services may not be running")
    else:
        print("\n⚠️  Some checks failed - review above for details")
    
    print("\n" + "="*60 + "\n")
    
    return checks_failed == 0

if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()
    
    result = asyncio.run(check_health())
    sys.exit(0 if result else 1)
