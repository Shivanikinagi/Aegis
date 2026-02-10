# 🚀 Complete Deployment Guide - Hackathon Ready

This guide will help you deploy the fully-featured Autonomous Treasury Agent to Monad testnet with all competition-winning features enabled.

## 📋 Features Checklist

✅ **Agent-to-Agent Interaction** - Multi-agent negotiation and bidding  
✅ **Real LLM Integration** - GPT-4/Claude for AI reasoning  
✅ **Token on nad.fun** - Launch your agent token  
✅ **Wallet Connect** - MetaMask integration in frontend  
✅ **Monad Testnet** - Live deployment ready  
✅ **On-chain Indexing** - Envio for fast data access  

---

## 🎯 Quick Start (15 Minutes)

### 1. Prerequisites

- Node.js 18+ and npm
- Python 3.9+
- MetaMask wallet
- Monad testnet MON (from https://faucet.monad.xyz)

### 2. Get API Keys

```bash
# OpenAI (required for AI features)
# Get from: https://platform.openai.com/api-keys

# Anthropic Claude (optional)
# Get from: https://console.anthropic.com/

# nad.fun (optional for token launch)
# Get from: https://nad.fun/developers
```

### 3. Clone & Configure

```bash
# Copy environment template
cp .env.example .env

# Edit .env and fill in:
# - DEPLOYER_PRIVATE_KEY (your wallet private key)
# - COORDINATOR_PRIVATE_KEY (generate new address)
# - OPENAI_API_KEY (your OpenAI key)
# - WORKER_AGENT_X_PRIVATE_KEY (generate 3 new addresses)
```

### 4. Deploy Smart Contracts

```bash
cd contracts

# Install dependencies
npm install

# Deploy to Monad testnet
npx hardhat run scripts/deploy_testnet.js --network monad-testnet

# Save the contract addresses displayed
# Update .env with the addresses
```

### 5. Setup Python Environment

```bash
cd ../agent

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 6. Launch Agent System

```bash
# Start the coordinator agent
python main.py

# In a new terminal, start multi-agent system (optional)
python -c "from multi_agent import MultiAgentOrchestrator; import asyncio; asyncio.run(MultiAgentOrchestrator('MARKETPLACE_ADDRESS').start())"
```

### 7. Start Frontend

```bash
cd ../frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:5173
```

### 8. Setup Indexer (Optional but Recommended)

```bash
cd ../indexer

# Install Envio
npm install -g envio

# Update envio.yaml with your contract addresses

# Start indexer
envio dev
```

---

## 📖 Detailed Setup Guide

### Part 1: Smart Contract Deployment

#### Step 1.1: Get Testnet Funds

1. Visit https://faucet.monad.xyz
2. Enter your deployer address
3. Request testnet MON
4. Wait for confirmation (~30 seconds)

#### Step 1.2: Deploy Contracts

```bash
cd contracts

# Deploy all contracts (takes ~2 minutes)
npx hardhat run scripts/deploy_testnet.js --network monad-testnet
```

You'll see output like:
```
✅ MinimalForwarder: 0x1234...
✅ Treasury: 0x5678...
✅ WorkerRegistry: 0x9abc...
✅ TaskRegistry: 0xdef0...
✅ AgentMarketplace: 0x1357...
✅ AgentToken: 0x2468...
```

#### Step 1.3: Update Configuration

Update `.env` with the deployed addresses:
```bash
TREASURY_CONTRACT_ADDRESS=0x5678...
TASK_REGISTRY_ADDRESS=0xdef0...
WORKER_REGISTRY_ADDRESS=0x9abc...
AGENT_MARKETPLACE_ADDRESS=0x1357...
AGENT_TOKEN_ADDRESS=0x2468...
```

### Part 2: Agent Configuration

#### Step 2.1: Generate Agent Wallets

```bash
cd contracts

# Generate 3 worker agent wallets
node scripts/generate_wallet.js
node scripts/generate_wallet.js
node scripts/generate_wallet.js
```

Save the private keys to `.env`:
```bash
WORKER_AGENT_1_PRIVATE_KEY=0x...
WORKER_AGENT_2_PRIVATE_KEY=0x...
WORKER_AGENT_3_PRIVATE_KEY=0x...
```

#### Step 2.2: Fund Agent Wallets

Send ~1 MON to each agent address for gas fees.

#### Step 2.3: Configure AI

Add your API keys to `.env`:
```bash
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...  # Optional
LLM_PROVIDER=openai
LLM_MODEL=gpt-4o-mini
```

### Part 3: Launch Token on nad.fun

#### Step 3.1: Prepare Token Metadata

```bash
cd agent

# Generate nad.fun listing
python -c "from nad_fun import generate_nad_fun_listing; import json; print(json.dumps(generate_nad_fun_listing(), indent=2))" > token_listing.json
```

#### Step 3.2: Register on nad.fun

1. Visit https://nad.fun
2. Connect your wallet
3. Click "Launch Token"
4. Upload `token_listing.json`
5. Or use the API:

```python
from agent.nad_fun import NadFunIntegration

nad = NadFunIntegration(
    token_address="YOUR_TOKEN_ADDRESS",
    agent_address="YOUR_AGENT_ADDRESS"
)

metadata = generate_nad_fun_listing()
result = nad.register_token(metadata)
print(result)
```

#### Step 3.3: Create Liquidity Pool

```bash
# Approve tokens
# Create pool with initial liquidity
# Details in nad_fun.py module
```

### Part 4: Multi-Agent System

#### Step 4.1: Configure Agents

Edit `agent/config.py` or set environment variables:
```bash
ENABLE_MULTI_AGENT=true
NUM_AGENTS=3
ENABLE_AI_REASONING=true
ENABLE_MARKETPLACE=true
```

#### Step 4.2: Start Agent Orchestrator

```python
from agent.multi_agent import MultiAgentOrchestrator, AgentPersonality
from blockchain import TaskType

# Create orchestrator
orchestrator = MultiAgentOrchestrator(marketplace_address="0x...")

# Create diverse agents
orchestrator.create_agent(
    name="AggressiveBidder",
    private_key=WORKER_AGENT_1_PRIVATE_KEY,
    personality=AgentPersonality.AGGRESSIVE,
    capabilities=[TaskType.DATA_PROCESSING, TaskType.COMPUTATION]
)

orchestrator.create_agent(
    name="ConservativeWorker",
    private_key=WORKER_AGENT_2_PRIVATE_KEY,
    personality=AgentPersonality.CONSERVATIVE,
    capabilities=[TaskType.VERIFICATION, TaskType.REPORT_GENERATION]
)

orchestrator.create_agent(
    name="CollaborativeAgent",
    private_key=WORKER_AGENT_3_PRIVATE_KEY,
    personality=AgentPersonality.COLLABORATIVE,
    capabilities=[TaskType.DATA_PROCESSING, TaskType.COMPUTATION, TaskType.VERIFICATION]
)

# Start the system
await orchestrator.start()
```

### Part 5: Frontend Wallet Integration

The frontend now includes:
- MetaMask connection button
- Network switching to Monad
- Task creation from UI
- Worker registration
- Agent bidding interface
- Token staking

Connect your wallet and interact directly!

### Part 6: Envio Indexer

#### Step 6.1: Setup Database

```bash
# Using Docker
docker run -d \
  --name treasury-postgres \
  -e POSTGRES_PASSWORD=indexer \
  -e POSTGRES_DB=treasury_indexer \
  -p 5432:5432 \
  postgres:15
```

#### Step 6.2: Configure Indexer

```bash
cd indexer

# Install Envio CLI
npm install -g envio

# Update envio.yaml with your contract addresses
# Set start_block to your deployment block
```

#### Step 6.3: Start Indexing

```bash
# Development mode
envio dev

# Production mode
envio codegen
envio start
```

Access GraphQL API at http://localhost:8080/graphql

---

## 🎬 Demo Flow for Judges

### 1. System Overview (1 minute)
- Show dashboard with live metrics
- Explain autonomous treasury concept
- Highlight AI+Multi-agent features

### 2. Agent-to-Agent Interaction (2 minutes)
- Create a task via frontend
- Show multiple agents bidding
- Demonstrate negotiation
- Show winning bid selected

### 3. AI Reasoning (1 minute)
- Display AI analysis of task
- Show worker capability matching
- Explain decision-making process

### 4. Token Economics (1 minute)
- Show token on nad.fun
- Explain revenue sharing
- Demonstrate staking
- Show governance features

### 5. Live Transactions (1 minute)
- Execute task creation with MetaMask
- Show on-chain verification
- Display in explorer
- Show indexed data update

### 6. Analytics & Learning (1 minute)
- Show learning curves
- Display performance metrics
- Explain UCB1 + LLM hybrid approach

---

## 🔧 Troubleshooting

### Common Issues

**"Insufficient funds for gas"**
```bash
# Get more testnet MON
Visit https://faucet.monad.xyz
```

**"Network not found"**
```bash
# Add Monad to MetaMask manually
Network Name: Monad Testnet
RPC URL: https://testnet-rpc.monad.xyz
Chain ID: 10143
Currency: MON
Explorer: https://testnet.monadvision.com
```

**"OpenAI API error"**
```bash
# Check API key is valid
# Check you have credits
# Try anthropic as fallback
```

**"Indexer not syncing"**
```bash
# Check contract addresses in envio.yaml
# Verify start_block is correct
# Check PostgreSQL is running
```

### Getting Help

- GitHub Issues: [your-repo]/issues
- Discord: [your-discord]
- Email: support@your-project.com

---

## 📊 Monitoring

### Check System Status

```bash
# Agent status
curl http://localhost:8000/health

# Contract status
npx hardhat run scripts/check_status.js --network monad-testnet

# Indexer status
curl http://localhost:8080/health
```

### View Logs

```bash
# Agent logs
tail -f agent/logs/agent.log

# Indexer logs
envio logs

# Frontend logs
# Check browser console
```

---

## 🏆 Competition Checklist

Before submitting:

- [ ] All contracts deployed to Monad testnet
- [ ] Agent token registered on nad.fun
- [ ] Multi-agent system running with 3+ agents
- [ ] AI reasoning enabled (GPT-4 or Claude)
- [ ] Wallet Connect working in frontend
- [ ] Envio indexer syncing
- [ ] Demo video recorded (2-3 minutes)
- [ ] GitHub repo public and documented
- [ ] README includes architecture diagram
- [ ] Submission form completed

---

## 🎥 Demo Video Script

**30 seconds - Problem & Solution**
"Traditional treasuries require manual oversight. Our Autonomous Treasury Agent uses AI and multi-agent coordination to manage funds autonomously on Monad."

**60 seconds - Key Features**
- Show agent-to-agent bidding
- Display AI reasoning
- Demonstrate wallet integration
- Show token on nad.fun

**30 seconds - Technical Highlights**
- "Built on Monad for high performance"
- "Uses GPT-4 for intelligent decisions"
- "Multi-agent marketplace for competition"
- "Indexed with Envio for fast queries"

**30 seconds - Impact & Future**
"Enables truly autonomous DAOs. No human intervention needed. Learn and improve over time."

---

## 🚀 Go Live!

You're now ready to compete! Your project has:

✅ **Agent-to-Agent Transactions** - Multi-agent marketplace  
✅ **Real AI** - GPT-4/Claude reasoning  
✅ **Token Launch** - nad.fun integration  
✅ **Full Frontend** - Wallet Connect enabled  
✅ **Production Ready** - Deployed on Monad testnet  
✅ **Fast Queries** - Envio indexing  

**Good luck with the hackathon! 🎉**
