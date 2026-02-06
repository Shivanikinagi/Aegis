# 🏦 Autonomous Treasury Agent

> **"The agent decides. The contract enforces."**

An AI-powered autonomous treasury management system built on **Monad Testnet**. The agent learns optimal worker selection and payment strategies while smart contracts guarantee safety through immutable spending rules.

![Monad](https://img.shields.io/badge/Monad-Testnet-purple)
![Solidity](https://img.shields.io/badge/Solidity-0.8.24-blue)
![Python](https://img.shields.io/badge/Python-3.11+-green)
![Next.js](https://img.shields.io/badge/Next.js-16-black)

---

## 🎯 What This Project Does

This system demonstrates **safe AI agent autonomy** in economic coordination:

1. **Tasks** are created with requirements, budgets, and verification rules
2. **AI Agent** observes tasks and learns which workers perform best
3. **Agent proposes** worker assignments and payment amounts
4. **Smart contracts** enforce spending limits and release payments
5. **Agent learns** from outcomes to improve future decisions

### Key Innovation

- Agents have **decision authority** but no **fund access**
- All spending goes through **contract-enforced rules**
- High-frequency payments optimized for **Monad's performance**
- **Multi-Armed Bandit** learning for worker selection

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (Next.js)                     │
│        Dashboard • Tasks • Workers • Learning • Metrics     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    AI COORDINATOR AGENT                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Memory    │  │   Learner   │  │  Blockchain Client  │  │
│  │ (persistent)│  │ (UCB1 MAB)  │  │    (web3.py)        │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    MONAD TESTNET                             │
│  ┌─────────────┐  ┌───────────────┐  ┌─────────────────┐    │
│  │  Treasury   │  │ Task Registry │  │ Worker Registry │    │
│  │  (funds)    │  │  (lifecycle)  │  │   (stats)       │    │
│  └─────────────┘  └───────────────┘  └─────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Python 3.11+
- A wallet with MON testnet tokens

### 1. Clone and Setup

```bash
git clone <your-repo-url>
cd "Autonomous Treasury Agent"

# Copy environment file
cp .env.example .env
```

### 2. Get Testnet Tokens

1. Visit **https://testnet.monad.xyz** (official faucet)
2. Connect your wallet
3. Request MON tokens (you'll need ~5 MON for deployment and testing)

### 3. Configure Environment

Edit `.env` and add your private key:

```env
# WARNING: Use testnet wallet only!
DEPLOYER_PRIVATE_KEY=your_testnet_private_key_here
COORDINATOR_PRIVATE_KEY=your_coordinator_private_key_here
```

### 4. Deploy Smart Contracts

```bash
cd contracts
npm install
npx hardhat run scripts/deploy.js --network monad-testnet
```

After deployment, update `.env` with the contract addresses:

```env
TREASURY_ADDRESS=0x...
TASK_REGISTRY_ADDRESS=0x...
WORKER_REGISTRY_ADDRESS=0x...
```

### 5. Start the Agent

```bash
cd agent
pip install -r requirements.txt
python coordinator.py
```

### 6. Launch Dashboard

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:3000** to view the dashboard.

---

## 🎮 Running the Demo (No Blockchain Needed)

For hackathon demos, you can run a simulation without deploying contracts:

```bash
pip install structlog
python scripts/demo.py
```

This simulates the full learning loop and shows:
- Task creation and assignment
- Agent decision-making
- Contract rule enforcement
- Learning progression
- Final performance report

---

## 📦 Project Structure

```
Autonomous Treasury Agent/
├── contracts/               # Solidity smart contracts
│   ├── src/
│   │   ├── Treasury.sol          # Fund management & rules
│   │   ├── TaskRegistry.sol      # Task lifecycle
│   │   ├── WorkerRegistry.sol    # Worker management
│   │   └── interfaces/           # Contract interfaces
│   ├── scripts/
│   │   └── deploy.js             # Deployment script
│   └── hardhat.config.js         # Monad network config
│
├── agent/                   # Python AI Agent
│   ├── coordinator.py            # Main agent loop
│   ├── learner.py                # UCB1 + payment optimizer
│   ├── memory.py                 # Persistent state
│   ├── blockchain.py             # Contract interactions
│   ├── api.py                    # REST API server
│   └── config.py                 # Configuration
│
├── frontend/                # Next.js Dashboard
│   └── src/
│       ├── app/                  # Pages
│       ├── components/           # UI components
│       └── lib/                  # Utilities
│
├── scripts/                 # Demo & setup scripts
│   ├── demo.py                   # Simulation demo
│   └── setup_demo.js             # Worker registration
│
├── .env.example             # Environment template
└── README.md                # This file
```

---

## 🌐 Monad Testnet Configuration

| Setting | Value |
|---------|-------|
| **Network Name** | Monad Testnet |
| **RPC URL** | `https://testnet-rpc.monad.xyz` |
| **Chain ID** | `10143` |
| **Currency** | MON |
| **Block Explorer** | `https://testnet.monadvision.com` |
| **Faucet** | `https://testnet.monad.xyz` |

### Add to MetaMask

1. Open MetaMask → Networks → Add Network
2. Enter the details above
3. Save and switch to Monad Testnet

---

## 🧠 Learning Algorithm

### Multi-Armed Bandit (UCB1)

The agent balances **exploration** (trying uncertain workers) with **exploitation** (using known good workers):

```
UCB1 Score = average_reward + c × √(ln(total_pulls) / worker_pulls)
```

- **Higher c**: More exploration
- **Exploration decays**: Over time, agent exploits learned knowledge
- **Reward signal**: `success ? (value - cost) : -cost`

### Payment Optimization

Uses gradient descent to learn optimal payment amounts:

```python
# If task succeeded with lower payment, learn to pay less
# If task failed, learn the minimum payment needed
optimal_payment = reliability_score × max_payment × learned_multiplier
```

---

## 🔐 Security Model

| Attack Vector | Protection |
|--------------|------------|
| Agent steals funds | **Impossible** - Agent has no wallet access |
| Agent overspends | **Contract limits** - Max per task/day enforced |
| Agent picks bad worker | **Worker registry** - Only whitelisted workers |
| Task fails | **Automatic unlock** - Reserved funds returned |
| Hidden actions | **Full audit log** - All actions on-chain |

### The Core Principle

```solidity
// Agent CANNOT do this:
payable(worker).transfer(amount);  // ❌ No direct access

// Agent CAN do this:
taskRegistry.proposeAssignment(taskId, worker, payment);  // ✅ Proposal only
// Contract then enforces rules and conditionally releases funds
```

---

## 📊 Dashboard Features

- **Real-time Status**: Agent activity, cycle count, success rate
- **Treasury View**: Balance, spending limits, transaction history
- **Task Management**: Create tasks, view status, track completion
- **Worker Analytics**: Performance scores, reliability, earnings
- **Learning Metrics**: Success rate over time, exploration decay
- **Settings**: Network config, contract addresses, agent params

---

## 🛠️ API Endpoints

The agent exposes a REST API for the dashboard:

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | System health check |
| `GET /api/status` | Full agent status |
| `GET /api/treasury` | Treasury details |
| `GET /api/tasks` | List all tasks |
| `GET /api/workers` | List all workers |
| `GET /api/metrics` | Performance metrics |
| `GET /api/learning` | Learning statistics |

---

## 🏆 Hackathon Value Proposition

### Why Monad?

1. **High throughput** - Handle many micro-payments
2. **Low latency** - Fast agent decision loops
3. **EVM compatible** - Standard tooling works
4. **Growing ecosystem** - Novel use case showcase

### Why This Matters

- **AI Agents need money rails** - This is how they get them safely
- **Autonomy without risk** - Agent intelligence + contract safety
- **Learning over time** - System improves with usage
- **Audit trail** - Every decision recorded on-chain

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

## 📄 License

MIT License - see LICENSE file for details.

---

## 🙏 Acknowledgments

- **Monad Labs** for the testnet infrastructure
- **OpenZeppelin** for secure contract patterns
- **Hardhat** for development tooling

---

<p align="center">
  <strong>"The agent decides. The contract enforces."</strong>
</p>
