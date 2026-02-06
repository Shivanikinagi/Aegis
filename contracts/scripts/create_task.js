const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Create a sample task for the agent to process
 */
async function main() {
    console.log("📝 Creating sample task...\n");

    // Load deployment info
    const deploymentFile = path.join(__dirname, "../deployments", `${hre.network.name}.json`);
    if (!fs.existsSync(deploymentFile)) {
        console.error("❌ Deployment file not found. Run deploy.js first.");
        process.exit(1);
    }

    const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
    const [creator] = await hre.ethers.getSigners();

    console.log("📍 Task Registry:", deployment.contracts.TaskRegistry);
    console.log("📍 Creator:", creator.address);

    // Get contract instance
    const TaskRegistry = await hre.ethers.getContractFactory("TaskRegistry");
    const taskRegistry = TaskRegistry.attach(deployment.contracts.TaskRegistry);

    // Create task
    const taskType = 0; // DATA_ANALYSIS
    const maxPayment = hre.ethers.parseEther("2.5"); // 2.5 MON
    const deadline = Math.floor(Date.now() / 1000) + 86400; // 24 hours from now
    const description = "Analyze market trends for Q1 2026";
    const descriptionHash = hre.ethers.id(description);
    const verificationRule = "MANUAL_APPROVAL";

    console.log("\n📤 Submitting task...");
    console.log("   Type: DATA_ANALYSIS");
    console.log("   Max Payment:", hre.ethers.formatEther(maxPayment), "MON");
    console.log("   Deadline:", new Date(deadline * 1000).toISOString());
    console.log("   Description:", description);

    const tx = await taskRegistry.createTask(taskType, maxPayment, deadline, descriptionHash, verificationRule);
    const receipt = await tx.wait();

    // Find TaskCreated event
    const event = receipt.logs.find(log => {
        try {
            return taskRegistry.interface.parseLog(log).name === "TaskCreated";
        } catch {
            return false;
        }
    });

    if (event) {
        const parsed = taskRegistry.interface.parseLog(event);
        const taskId = parsed.args.taskId;
        console.log("\n✅ Task created successfully!");
        console.log("   Task ID:", taskId.toString());
        console.log("   Transaction:", receipt.hash);
    }

    console.log("\n✨ Task creation complete!");
    console.log("💡 The agent will pick this up in the next polling cycle.");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ Error:", error.message);
        process.exit(1);
    });
