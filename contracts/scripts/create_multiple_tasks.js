const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Create multiple sample tasks to demonstrate real-time agent processing
 */
async function main() {
    console.log("📝 Creating multiple tasks for real-time demo...\n");

    const deploymentFile = path.join(__dirname, "../deployments", `${hre.network.name}.json`);
    if (!fs.existsSync(deploymentFile)) {
        console.error("❌ Deployment file not found. Run deploy.js first.");
        process.exit(1);
    }

    const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
    const [creator] = await hre.ethers.getSigners();

    const TaskRegistry = await hre.ethers.getContractFactory("TaskRegistry");
    const taskRegistry = TaskRegistry.attach(deployment.contracts.TaskRegistry);

    const tasks = [
        {
            type: 0, // DATA_ANALYSIS
            payment: "2.0",
            description: "Analyze Q1 2026 financial data"
        },
        {
            type: 1, // TEXT_GENERATION
            payment: "1.5",
            description: "Generate market report summary"
        },
        {
            type: 2, // CODE_REVIEW
            payment: "3.0",
            description: "Review smart contract security"
        },
        {
            type: 0, // DATA_ANALYSIS
            payment: "2.5",
            description: "Customer sentiment analysis"
        },
        {
            type: 3, // RESEARCH
            payment: "4.0",
            description: "Research DeFi trends 2026"
        }
    ];

    console.log(`📤 Creating ${tasks.length} tasks...\n`);

    for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        const maxPayment = hre.ethers.parseEther(task.payment);
        const deadline = Math.floor(Date.now() / 1000) + 86400; // 24 hours
        const descriptionHash = hre.ethers.id(task.description);

        try {
            const tx = await taskRegistry.createTask(
                task.type,
                maxPayment,
                deadline,
                descriptionHash,
                "MANUAL_APPROVAL"
            );
            await tx.wait();

            console.log(`✅ Task ${i + 1}/${tasks.length} created`);
            console.log(`   Type: ${task.type}, Payment: ${task.payment} MON`);
            console.log(`   Description: ${task.description}\n`);

            // Small delay between tasks
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
            console.error(`❌ Failed to create task ${i + 1}:`, error.message);
        }
    }

    console.log("✨ All tasks created!");
    console.log("💡 Watch the agent process them in real-time at http://localhost:3000");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ Error:", error.message);
        process.exit(1);
    });
