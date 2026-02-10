# 🏦 Autonomous Treasury Agent - Demo Walkthrough

This document provides a step-by-step script and guide for demonstrating the **Autonomous Treasury Agent**. It covers setup, the narrative to follow, and a backup plan.

## 📋 Preparation (Before the Demo)

You need **4 separate terminals** running to show the full system.

1.  **Terminal 1: Local Blockchain**
    ```powershell
    cd contracts
    npx hardhat node
    ```

2.  **Terminal 2: Deploy & Setup**
    *Run this EVERY time you restart the node in Terminal 1.*
    ```powershell
    cd contracts
    # Deploy contracts
    npx hardhat run scripts/deploy.js --network localhost
    
    # Setup demo data (workers, initial funds)
    npx hardhat run scripts/setup_demo.js --network localhost
    ```
    ⚠️ **CRITICAL:** 
    1. Copy the contract addresses from the output.
    2. Update your root `.env` file (for the Agent).
    3. Update `frontend/.env.local` file (for the Dashboard).
    *If these don't match, the frontend will show 0 balance and the agent won't see tasks.*

3.  **Terminal 3: Agent Backend**
    ```powershell
    cd agent
    # Ensure virtual env is active if you use one
    pip install -r requirements.txt
    python main.py
    ```

4.  **Terminal 4: Frontend Dashboard**
    ```powershell
    cd frontend
    npm run dev
    ```
    *Open [http://localhost:3000](http://localhost:3000) in your browser.*

---

## 🗣️ The Demo Script (Narrative)

### Scene 1: The Problem & The Hook
*Stat with the slide or just the title page of the Dashboard.*

> "DAOs and AI agents are efficient, but giving an AI access to a treasury wallet is dangerous. If the model hallucinates or is hacked, the funds are gone. Today, we demonstrate the **Autonomous Treasury Agent**."

> "Our core principle is: **The Agent Decides. The Contract Enforces.**"

### Scene 2: The Empty State (Trust)
*Show the Dashboard at [http://localhost:3000](http://localhost:3000).*

1.  Navigate to the **Treasury** tab.
2.  Show the **Balance** and **Daily Limits**.
    > "Here is our on-chain Treasury. It has strict rules: max spend per task and max spend per day. The Agent can propose payments, but it cannot bypass these rules."

### Scene 3: The Action (Simulation)
*Open a new terminal (Terminal 5) or use the 'Deploy' terminal.*

1.  Run the ecosystem simulator:
    ```powershell
    cd agent
    python simulate.py
    ```
2.  **Switch back to the Dashboard immediately.**

> "I am now starting the 'Ecosystem Simulator'. This mimics users creating tasks and workers submitting results on the blockchain."

### Scene 4: Observing Autonomy
*Stay on the Dashboard 'Tasks' page.*

1.  Watch as **new tasks appear** in the list.
2.  Point out the status changes: `CREATED` → `ASSIGNED` → `COMPLETED`.
    > "You can see tasks coming in. The Agent (backend) is monitoring the chain. It analyzes the task type (Data Analysis, Research, etc.) and selects the best worker."

3.  Click on a specific **Task** to show details.
    > "The Agent uses a generic UCB1 algorithm (Multi-Armed Bandit) to balance exploration and exploitation. It's learning which workers are reliable."

### Scene 5: The "Learning"
*Navigate to the 'Workers' or 'Analytics' tab.*

1.  Show the **Reliability Scores** updating.
    > "Notice how Worker scores change. If a worker submits bad data, the Agent 'punishes' them by lowering their score and payment multiplier. If they succeed, they get more work."

### Scene 6: The "Decisions" Page (AI Reasoning)
*Navigate to the 'Decisions' tab in the sidebar.*

1.  This page provides **Explainable AI** features.
2.  Show a "Decision Card" which breaks down *why* a worker was chosen.
    > "Trust is built on transparency. Here, the Agent explains its choice: 'High success rate', 'Fast completion', or 'Within budget'. We don't just see the result; we see the reasoning."

### Scene 7: Security Verification
*Show the Agent Logs (Terminal 3).*

1.  Briefly show the scrolling logs.
    > "Behind the scenes, the Agent is just signing 'Proposals'. It never touches the funds directly. The Smart Contract verifies the proposal matches the rules before releasing any MON."

### Scene 8: Conclusion
*Stop the simulator (Ctrl+C).*

> "This architecture allows us to deploy autonomous AI agents on high-performance chains like **Monad** safely. We get the speed of AI judgment with the security of immutable code."

---

## 🚨 Plan B: The "Offline" Demo

If the live demo fails (demo gods are cruel), use the standalone simulation script. This requires NO blockchain and NO frontend.

1.  Run the standalone demo:
    ```powershell
    cd scripts
    python demo.py
    ```

2.  This behaves exactly like the real system but runs entirely in memory and prints a beautiful text-based interface to the console.
    > "Since we are having network issues, let me show you the logic simulation which runs the exact same code in an isolated environment."
