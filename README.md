# 🏦 Autonomous Treasury Agent

> **"The agent decides. The contract enforces."**

An AI-powered autonomous treasury management system built on **Monad Testnet**. The agent learns optimal worker selection and payment strategies while smart contracts guarantee safety through immutable spending rules.

![Monad](https://img.shields.io/badge/Monad-Testnet-purple)
![Solidity](https://img.shields.io/badge/Solidity-0.8.24-blue)
![Python](https://img.shields.io/badge/Python-3.11+-green)
![Next.js](https://img.shields.io/badge/Next.js-16-black)

## 📸 Dashboard Preview

![Dashboard Screenshot](https://via.placeholder.com/800x400?text=Upload+Your+Dashboard+Screenshot+Here)
*Real-time autonomous agent activity on Monad local devnet*

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
- **Gasless Transactions** via EIP-2771 (users don't pay gas)

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

## 🚀 Quick Start (Local Development)

Run the entire system locally with these steps. You will need **4 separate terminals**.

### 1. Start Local Blockchain
**Terminal 1:**
```bash
cd contracts
npx hardhat node
```

### 2. Deploy Contracts & Setup Data
**Terminal 2:**
```bash
cd contracts
# Deploy contracts
npx hardhat run scripts/deploy.js --network localhost

# Setup demo data (workers, initial funds)
npx hardhat run scripts/setup_demo.js --network localhost
```
*Note: Copy the contract addresses output here into your `.env` file if they changed.*

### 3. Start Unified Agent Backend
**Terminal 2 (reused) or 3:**
```bash
cd agent
# Install dependencies
pip install -r requirements.txt

# Run the API Server + Agent Loop
python main.py
```
*Server runs at http://localhost:8000*

### 4. Start Ecosystem Simulator (Generates Activity)
**Terminal 3:**
```bash
cd agent
# Run the simulation script
python simulate.py
```
*This simulates users creating tasks and workers submitting results.*

### 5. Launch Frontend Dashboard
**Terminal 4:**
```bash
cd frontend
npm install
npm run dev
```
*Dashboard runs at http://localhost:3000*

---

## 🎮 How it Works
1. **Simulator** creates a task on the local blockchain.
2. **Agent** (running in `main.py`) detects the event.
3. **Agent** selects the best worker using UCB1 logic and proposes assignment.
4. **Simulator** (acting as worker) sees assignment and submits a result.
5. **Agent** verifies the result and completes the task.
6. **Frontend** updates in real-time showing the full lifecycle.

---

## 📦 Project Structure

```
Autonomous Treasury Agent/
├── contracts/               # Solidity smart contracts
│   ├── src/
│   │   ├── Treasury.sol          # Fund management & rules
│   │   ├── TaskRegistry.sol      # Task lifecycle (Gasless)
│   │   ├── MinimalForwarder.sol  # EIP-2771 Relayer
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
