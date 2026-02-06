const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Setup demo workers for the Autonomous Treasury Agent
 * Registers initial workers and configures the system
 */
async function main() {
    console.log("🔧 Setting up demo workers...\n");

    // Load deployment info
    const deploymentsDir = path.join(__dirname, "../deployments");
    const deploymentFile = path.join(deploymentsDir, `${hre.network.name}.json`);

    if (!fs.existsSync(deploymentFile)) {
        console.error("❌ Deployment file not found. Run deploy.js first.");
        process.exit(1);
    }

    const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
    const [deployer, worker1, worker2, worker3] = await hre.ethers.getSigners();

    console.log("📍 Using deployment:", deployment.network);
    console.log("📍 Worker Registry:", deployment.contracts.WorkerRegistry);

    // Get contract instance
    const WorkerRegistry = await hre.ethers.getContractFactory("WorkerRegistry");
    const workerRegistry = WorkerRegistry.attach(deployment.contracts.WorkerRegistry);

    // Define workers to register
    const workers = [
        {
            signer: worker1 || deployer,
            name: "Worker 1 (Data Analyst)",
            taskTypes: [0, 1, 2], // DATA_ANALYSIS, TEXT_GENERATION, CODE_REVIEW
        },
        {
            signer: worker2 || deployer,
            name: "Worker 2 (Researcher)",
            taskTypes: [0, 3, 5], // DATA_ANALYSIS, RESEARCH, OTHER
        },
        {
            signer: worker3 || deployer,
            name: "Worker 3 (Generalist)",
            taskTypes: [0, 1, 2, 3, 4, 5], // All types
        },
    ];

    console.log("\n📝 Registering workers...\n");

    for (const worker of workers) {
        try {
            const address = await worker.signer.getAddress();

            // Check if already registered
            const existing = await workerRegistry.getWorker(address);
            if (existing.isActive) {
                console.log(`   ⏭️  ${worker.name} already registered: ${address}`);
                continue;
            }

            // Register worker
            const tx = await workerRegistry.connect(worker.signer).registerWorker(worker.taskTypes);
            await tx.wait();

            console.log(`   ✅ ${worker.name} registered`);
            console.log(`      Address: ${address}`);
            console.log(`      Task types: [${worker.taskTypes.join(", ")}]`);

        } catch (error) {
            console.log(`   ❌ Failed to register ${worker.name}: ${error.message}`);
        }
    }

    // Set coordinator address
    console.log("\n🔐 Setting coordinator...\n");

    const coordinatorAddress = process.env.COORDINATOR_ADDRESS || deployer.address;

    try {
        // Set in TaskRegistry
        const TaskRegistry = await hre.ethers.getContractFactory("TaskRegistry");
        const taskRegistry = TaskRegistry.attach(deployment.contracts.TaskRegistry);

        await taskRegistry.setCoordinator(coordinatorAddress);
        console.log(`   ✅ TaskRegistry coordinator set: ${coordinatorAddress}`);

        // Set in Treasury
        const Treasury = await hre.ethers.getContractFactory("Treasury");
        const treasury = Treasury.attach(deployment.contracts.Treasury);

        await treasury.setCoordinator(coordinatorAddress);
        console.log(`   ✅ Treasury coordinator set: ${coordinatorAddress}`);

        // Set in WorkerRegistry
        await workerRegistry.setCoordinator(coordinatorAddress);
        console.log(`   ✅ WorkerRegistry coordinator set: ${coordinatorAddress}`);

    } catch (error) {
        console.log(`   ❌ Failed to set coordinator: ${error.message}`);
    }

    // Fund treasury (for testing)
    console.log("\n💰 Funding treasury...\n");

    try {
        const Treasury = await hre.ethers.getContractFactory("Treasury");
        const treasury = Treasury.attach(deployment.contracts.Treasury);

        const fundAmount = hre.ethers.parseEther("50"); // 50 MON

        const tx = await deployer.sendTransaction({
            to: deployment.contracts.Treasury,
            value: fundAmount
        });
        await tx.wait();

        const balance = await treasury.getBalance();
        console.log(`   ✅ Treasury funded with 50 MON`);
        console.log(`   📊 Current balance: ${hre.ethers.formatEther(balance)} MON`);

    } catch (error) {
        console.log(`   ❌ Failed to fund treasury: ${error.message}`);
    }

    console.log("\n✨ Setup complete!\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
