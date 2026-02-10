const hre = require("hardhat");
const fs = require("fs");

/**
 * Deploy all contracts to Monad Testnet
 * This script handles full system deployment with all new features
 */
async function main() {
  console.log("🚀 Deploying to Monad Testnet...\n");
  console.log("Network:", hre.network.name);
  console.log("Chain ID:", (await hre.ethers.provider.getNetwork()).chainId);

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "MON\n");

  if (balance === 0n) {
    console.error("❌ Deployer account has no balance!");
    console.log("Get testnet MON from: https://faucet.monad.xyz");
    process.exit(1);
  }

  const deployments = {};

  // 1. Deploy MinimalForwarder (for meta-transactions)
  console.log("📦 Deploying MinimalForwarder...");
  const MinimalForwarder = await hre.ethers.getContractFactory("MinimalForwarder");
  const forwarder = await MinimalForwarder.deploy();
  await forwarder.waitForDeployment();
  const forwarderAddress = await forwarder.getAddress();
  console.log("✅ MinimalForwarder:", forwarderAddress);
  deployments.MinimalForwarder = forwarderAddress;

  // 2. Deploy Treasury
  console.log("\n💰 Deploying Treasury...");
  const Treasury = await hre.ethers.getContractFactory("Treasury");
  const treasury = await Treasury.deploy(
    hre.ethers.parseEther("10"),    // maxSpendPerTask: 10 ETH
    hre.ethers.parseEther("100"),   // maxSpendPerDay: 100 ETH
    hre.ethers.parseEther("0.01"),  // minTaskValue: 0.01 ETH
    300                              // cooldownPeriod: 5 minutes
  );
  await treasury.waitForDeployment();
  const treasuryAddress = await treasury.getAddress();
  console.log("✅ Treasury:", treasuryAddress);
  deployments.Treasury = treasuryAddress;

  // 3. Deploy WorkerRegistry
  console.log("\n👥 Deploying WorkerRegistry...");
  const WorkerRegistry = await hre.ethers.getContractFactory("WorkerRegistry");
  const workerRegistry = await WorkerRegistry.deploy();
  await workerRegistry.waitForDeployment();
  const workerRegistryAddress = await workerRegistry.getAddress();
  console.log("✅ WorkerRegistry:", workerRegistryAddress);
  deployments.WorkerRegistry = workerRegistryAddress;

  // 4. Deploy TaskRegistry
  console.log("\n📋 Deploying TaskRegistry...");
  const TaskRegistry = await hre.ethers.getContractFactory("TaskRegistry");
  const taskRegistry = await TaskRegistry.deploy(treasuryAddress, workerRegistryAddress, forwarderAddress);
  await taskRegistry.waitForDeployment();
  const taskRegistryAddress = await taskRegistry.getAddress();
  console.log("✅ TaskRegistry:", taskRegistryAddress);
  deployments.TaskRegistry = taskRegistryAddress;

  // 5. Deploy AgentMarketplace (NEW)
  console.log("\n🤝 Deploying AgentMarketplace...");
  const AgentMarketplace = await hre.ethers.getContractFactory("AgentMarketplace");
  const marketplace = await AgentMarketplace.deploy(taskRegistryAddress, treasuryAddress);
  await marketplace.waitForDeployment();
  const marketplaceAddress = await marketplace.getAddress();
  console.log("✅ AgentMarketplace:", marketplaceAddress);
  deployments.AgentMarketplace = marketplaceAddress;

  // 6. Deploy AgentToken (NEW)
  console.log("\n🪙 Deploying AgentToken...");
  const AgentToken = await hre.ethers.getContractFactory("AgentToken");
  const agentToken = await AgentToken.deploy(treasuryAddress);
  await agentToken.waitForDeployment();
  const tokenAddress = await agentToken.getAddress();
  console.log("✅ AgentToken:", tokenAddress);
  deployments.AgentToken = tokenAddress;

  // Get token details
  const totalSupply = await agentToken.totalSupply();
  const symbol = await agentToken.symbol();
  console.log(`   Symbol: ${symbol}`);
  console.log(`   Initial Supply: ${hre.ethers.formatEther(totalSupply)} tokens`);

  // 7. Configure contracts
  console.log("\n⚙️  Configuring contracts...");

  // Set coordinator in Treasury
  console.log("  Setting coordinator in Treasury...");
  let tx = await treasury.setCoordinator(deployer.address);
  await tx.wait();
  console.log("  ✅ Coordinator set");

  // Set coordinator in TaskRegistry
  console.log("  Setting coordinator in TaskRegistry...");
  tx = await taskRegistry.setCoordinator(deployer.address);
  await tx.wait();
  console.log("  ✅ Coordinator set");

  // Fund Treasury (optional - for demo)
  const fundAmount = hre.ethers.parseEther("10.0"); // 10 MON
  if (balance > fundAmount) {
    console.log("  Funding Treasury with initial balance...");
    tx = await treasury.deposit({ value: fundAmount });
    await tx.wait();
    console.log(`  ✅ Treasury funded with ${hre.ethers.formatEther(fundAmount)} MON`);
  }

  // 8. Save deployment info
  const network = hre.network.name;
  const deploymentInfo = {
    network,
    chainId: Number((await hre.ethers.provider.getNetwork()).chainId),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: deployments,
    explorerBaseUrl: "https://testnet.monadvision.com"
  };

  const filePath = `./deployments/${network}.json`;
  fs.writeFileSync(filePath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n💾 Deployment info saved to ${filePath}`);

  // 9. Generate frontend config
  const frontendConfig = {
    ...deployments,
    rpcUrl: process.env.MONAD_RPC_URL || "https://testnet-rpc.monad.xyz",
    chainId: 10143,
    explorerUrl: "https://testnet.monadvision.com"
  };

  fs.writeFileSync(
    "../frontend/public/contracts/deployments/monad-testnet.json",
    JSON.stringify(frontendConfig, null, 2)
  );
  console.log("💾 Frontend config saved");

  // 10. Print summary
  console.log("\n" + "=".repeat(60));
  console.log("✅ DEPLOYMENT COMPLETE!");
  console.log("=".repeat(60));
  console.log("\n📜 Deployed Contracts:");
  for (const [name, address] of Object.entries(deployments)) {
    console.log(`   ${name}: ${address}`);
    console.log(`   Explorer: https://testnet.monadvision.com/address/${address}`);
  }

  console.log("\n🔧 Next Steps:");
  console.log("1. Update .env with contract addresses");
  console.log("2. Register token on nad.fun:");
  console.log(`   Token: ${tokenAddress}`);
  console.log("3. Start the agent coordinator:");
  console.log("   cd agent && python main.py");
  console.log("4. Launch frontend:");
  console.log("   cd frontend && npm run dev");
  console.log("5. Verify contracts:");
  console.log(`   npx hardhat verify --network monad-testnet ${treasuryAddress} ${deployer.address}`);

  console.log("\n📊 System Ready!");
  console.log("Dashboard: http://localhost:5173");
  console.log("Explorer: https://testnet.monadvision.com");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
