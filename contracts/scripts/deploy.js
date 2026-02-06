const hre = require("hardhat");

async function main() {
    console.log("🚀 Deploying Autonomous Treasury Agent Contracts...\n");

    const [deployer] = await hre.ethers.getSigners();
    console.log("📍 Deployer address:", deployer.address);

    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("💰 Deployer balance:", hre.ethers.formatEther(balance), "MON\n");

    // ============ Deploy Treasury ============
    console.log("1️⃣ Deploying Treasury...");

    const Treasury = await hre.ethers.getContractFactory("Treasury");
    const treasury = await Treasury.deploy(
        hre.ethers.parseEther("10"),    // maxSpendPerTask: 10 MON
        hre.ethers.parseEther("100"),   // maxSpendPerDay: 100 MON
        hre.ethers.parseEther("0.1"),   // minTaskValue: 0.1 MON
        300                              // cooldownPeriod: 5 minutes
    );
    await treasury.waitForDeployment();
    const treasuryAddress = await treasury.getAddress();
    console.log("   ✅ Treasury deployed at:", treasuryAddress);

    // ============ Deploy WorkerRegistry ============
    console.log("\n2️⃣ Deploying WorkerRegistry...");

    const WorkerRegistry = await hre.ethers.getContractFactory("WorkerRegistry");
    const workerRegistry = await WorkerRegistry.deploy();
    await workerRegistry.waitForDeployment();
    const workerRegistryAddress = await workerRegistry.getAddress();
    console.log("   ✅ WorkerRegistry deployed at:", workerRegistryAddress);

    // ============ Deploy TaskRegistry ============
    console.log("\n3️⃣ Deploying TaskRegistry...");

    const TaskRegistry = await hre.ethers.getContractFactory("TaskRegistry");
    const taskRegistry = await TaskRegistry.deploy(treasuryAddress, workerRegistryAddress);
    await taskRegistry.waitForDeployment();
    const taskRegistryAddress = await taskRegistry.getAddress();
    console.log("   ✅ TaskRegistry deployed at:", taskRegistryAddress);

    // ============ Configure Contracts ============
    console.log("\n4️⃣ Configuring contracts...");

    // Set TaskRegistry in Treasury
    await treasury.setTaskRegistry(taskRegistryAddress);
    console.log("   ✅ Treasury: TaskRegistry set");

    // Set TaskRegistry in WorkerRegistry
    await workerRegistry.setTaskRegistry(taskRegistryAddress);
    console.log("   ✅ WorkerRegistry: TaskRegistry set");

    // ============ Summary ============
    console.log("\n" + "=".repeat(60));
    console.log("📋 DEPLOYMENT SUMMARY");
    console.log("=".repeat(60));
    console.log(`Network:         ${hre.network.name}`);
    console.log(`Treasury:        ${treasuryAddress}`);
    console.log(`WorkerRegistry:  ${workerRegistryAddress}`);
    console.log(`TaskRegistry:    ${taskRegistryAddress}`);
    console.log("=".repeat(60));

    // ============ Save Addresses ============
    const fs = require("fs");
    const path = require("path");

    const deploymentInfo = {
        network: hre.network.name,
        chainId: (await hre.ethers.provider.getNetwork()).chainId.toString(),
        deployedAt: new Date().toISOString(),
        deployer: deployer.address,
        contracts: {
            Treasury: treasuryAddress,
            WorkerRegistry: workerRegistryAddress,
            TaskRegistry: taskRegistryAddress
        }
    };

    const deploymentsDir = path.join(__dirname, "../deployments");
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    const filename = path.join(deploymentsDir, `${hre.network.name}.json`);
    fs.writeFileSync(filename, JSON.stringify(deploymentInfo, null, 2));
    console.log(`\n💾 Deployment info saved to: ${filename}`);

    // ============ Verification Instructions ============
    console.log("\n📝 NEXT STEPS:");
    console.log("1. Fund the Treasury with test tokens");
    console.log("2. Set the Coordinator address in all contracts");
    console.log("3. Register worker agents in WorkerRegistry");
    console.log("4. Update .env with contract addresses");

    return deploymentInfo;
}

main()
    .then((info) => {
        console.log("\n✨ Deployment completed successfully!");
        process.exit(0);
    })
    .catch((error) => {
        console.error("\n❌ Deployment failed:", error);
        process.exit(1);
    });
