// Interact with deployed contracts - fund treasury and create tasks
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("🎮 Interactive Contract Demo\n");

    // Load deployment info
    const deploymentsDir = path.join(__dirname, "../deployments");
    const deploymentFile = path.join(deploymentsDir, "localhost.json");

    if (!fs.existsSync(deploymentFile)) {
        console.error("❌ Deployment file not found. Run deploy.js first.");
        process.exit(1);
    }

    const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
    const [deployer, account1, account2, account3] = await hre.ethers.getSigners();

    console.log("📍 Contract Addresses:");
    console.log("   Treasury:", deployment.contracts.Treasury);
    console.log("   TaskRegistry:", deployment.contracts.TaskRegistry);
    console.log("   WorkerRegistry:", deployment.contracts.WorkerRegistry);
    console.log("");

    // Get contract instances
    const Treasury = await hre.ethers.getContractFactory("Treasury");
    const treasury = Treasury.attach(deployment.contracts.Treasury);

    const TaskRegistry = await hre.ethers.getContractFactory("TaskRegistry");
    const taskRegistry = TaskRegistry.attach(deployment.contracts.TaskRegistry);

    const WorkerRegistry = await hre.ethers.getContractFactory("WorkerRegistry");
    const workerRegistry = WorkerRegistry.attach(deployment.contracts.WorkerRegistry);

    // 1. Fund Treasury
    console.log("💰 Funding Treasury...");
    const fundAmount = hre.ethers.parseEther("100");
    await deployer.sendTransaction({
        to: deployment.contracts.Treasury,
        value: fundAmount
    });

    const balance = await treasury.getBalance();
    console.log(`   ✅ Treasury funded with 100 ETH`);
    console.log(`   📊 Balance: ${hre.ethers.formatEther(balance)} ETH\n`);

    // 2. Register Workers
    console.log("👷 Registering Workers...");

    const workers = [
        { signer: account1, types: [0, 1, 2] },
        { signer: account2, types: [0, 3, 4] },
        { signer: account3, types: [1, 2, 5] },
    ];

    for (let i = 0; i < workers.length; i++) {
        try {
            const worker = workers[i];
            const address = await worker.signer.getAddress();

            // Check if already registered
            const existing = await workerRegistry.getWorker(address);
            if (existing.isActive) {
                console.log(`   ⏭️  Worker ${i + 1} already registered`);
                continue;
            }

            await workerRegistry.connect(worker.signer).registerWorker(worker.types);
            console.log(`   ✅ Worker ${i + 1} registered: ${address.slice(0, 10)}...`);
        } catch (e) {
            console.log(`   ⚠️  Worker ${i + 1}: ${e.message.slice(0, 50)}...`);
        }
    }
    console.log("");

    // 3. Create Tasks
    console.log("📋 Creating Tasks...");

    const tasks = [
        { type: 0, maxPayment: "2.5", deadline: 3600, rule: "length > 500" },
        { type: 1, maxPayment: "1.5", deadline: 7200, rule: 'contains("result")' },
        { type: 2, maxPayment: "3.0", deadline: 1800, rule: "approved" },
    ];

    for (let i = 0; i < tasks.length; i++) {
        try {
            const task = tasks[i];
            const descHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes(`Task ${i + 1} description`));
            const tx = await taskRegistry.createTask(
                task.type,
                hre.ethers.parseEther(task.maxPayment),
                Math.floor(Date.now() / 1000) + task.deadline,
                descHash,
                task.rule
            );
            await tx.wait();
            console.log(`   ✅ Task ${i + 1} created (type: ${task.type}, max: ${task.maxPayment} ETH)`);
        } catch (e) {
            console.log(`   ⚠️  Task ${i + 1}: ${e.message.slice(0, 50)}...`);
        }
    }
    console.log("");

    // 4. Display Summary
    console.log("📊 Summary:");
    const treasuryBalance = await treasury.getBalance();
    const availableBalance = await treasury.getAvailableBalance();
    const taskCount = await taskRegistry.taskCounter();

    console.log(`   Treasury: ${hre.ethers.formatEther(treasuryBalance)} ETH`);
    console.log(`   Available: ${hre.ethers.formatEther(availableBalance)} ETH`);
    console.log(`   Tasks: ${taskCount}`);
    console.log(`   Workers: ${workers.length}`);

    console.log("\n✨ Done! Refresh the dashboard to see the changes.\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
