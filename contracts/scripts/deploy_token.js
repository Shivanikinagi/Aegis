const hre = require("hardhat");

/**
 * Deploy Agent Token for nad.fun platform
 * This script deploys the AgentToken contract and prepares for nad.fun listing
 */
async function main() {
  console.log("Deploying Agent Token for nad.fun...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

  // Load existing treasury address
  const deployments = require("../deployments/localhost.json");
  const treasuryAddress = deployments.Treasury;
  
  if (!treasuryAddress) {
    throw new Error("Treasury not deployed. Run deploy.js first.");
  }
  
  console.log("Using Treasury at:", treasuryAddress);

  // Deploy AgentToken
  console.log("\nDeploying AgentToken...");
  const AgentToken = await hre.ethers.getContractFactory("AgentToken");
  const agentToken = await AgentToken.deploy(treasuryAddress);
  await agentToken.waitForDeployment();
  
  const tokenAddress = await agentToken.getAddress();
  console.log("AgentToken deployed to:", tokenAddress);

  // Get token details
  const totalSupply = await agentToken.totalSupply();
  const maxSupply = await agentToken.MAX_SUPPLY();
  const symbol = await agentToken.symbol();
  const name = await agentToken.name();
  
  console.log("\nToken Details:");
  console.log("  Name:", name);
  console.log("  Symbol:", symbol);
  console.log("  Initial Supply:", hre.ethers.formatEther(totalSupply), "tokens");
  console.log("  Max Supply:", hre.ethers.formatEther(maxSupply), "tokens");
  
  // Calculate token distribution
  const distribution = {
    publicSale: maxSupply * 40n / 100n,
    liquidity: maxSupply * 20n / 100n,
    team: maxSupply * 15n / 100n,
    treasury: maxSupply * 10n / 100n,
    stakingRewards: maxSupply * 10n / 100n,
    airdrop: maxSupply * 5n / 100n,
  };
  
  console.log("\nRecommended Token Distribution:");
  for (const [category, amount] of Object.entries(distribution)) {
    const tokens = hre.ethers.formatEther(amount);
    const percent = Number(amount * 100n / maxSupply);
    console.log(`  ${category}: ${tokens} tokens (${percent}%)`);
  }
  
  // Setup initial distribution (optional - comment out if not ready)
  console.log("\nSetting up initial distribution...");
  
  // Example: Mint tokens for liquidity pool
  const liquidityAmount = distribution.liquidity;
  const tx1 = await agentToken.mintTokens(deployer.address, liquidityAmount);
  await tx1.wait();
  console.log("  Minted liquidity tokens");
  
  // Save deployment info
  const deploymentInfo = {
    ...deployments,
    AgentToken: tokenAddress,
    tokenDetails: {
      name,
      symbol,
      totalSupply: totalSupply.toString(),
      maxSupply: maxSupply.toString()
    },
    distribution: {
      publicSale: distribution.publicSale.toString(),
      liquidity: distribution.liquidity.toString(),
      team: distribution.team.toString(),
      treasury: distribution.treasury.toString(),
      stakingRewards: distribution.stakingRewards.toString(),
      airdrop: distribution.airdrop.toString()
    }
  };

  const fs = require("fs");
  const network = hre.network.name;
  const filePath = `./deployments/${network}.json`;
  
  fs.writeFileSync(filePath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\nDeployment info saved to ${filePath}`);

  // Generate nad.fun metadata
  const nadFunMetadata = {
    tokenAddress,
    agentAddress: deployer.address,
    chain: "monad",
    name,
    symbol,
    description: "The first fully autonomous treasury agent on Monad. Token holders earn revenue from agent operations and govern agent parameters.",
    category: "Agent+AI",
    website: "https://your-agent-site.com",
    logoUrl: "https://your-cdn.com/atai-logo.png",
    capabilities: [
      "Autonomous treasury management",
      "Multi-agent coordination",
      "AI-powered decision making",
      "On-chain governance",
      "Revenue sharing"
    ],
    tokenomics: {
      totalSupply: hre.ethers.formatEther(maxSupply),
      initialSupply: hre.ethers.formatEther(totalSupply),
      revenueShare: "2.5% of task fees",
      stakingAPY: "5%"
    }
  };
  
  fs.writeFileSync(
    "./deployments/nad-fun-metadata.json",
    JSON.stringify(nadFunMetadata, null, 2)
  );
  console.log("nad.fun metadata saved to ./deployments/nad-fun-metadata.json");

  console.log("\n✅ Token deployment complete!");
  console.log("\nNext steps:");
  console.log("1. Register token on nad.fun platform");
  console.log("2. Create liquidity pool");
  console.log("3. Announce token launch");
  console.log("4. Enable revenue sharing in Treasury contract");
  console.log("\nTo register on nad.fun, use the Python integration:");
  console.log("  python -c 'from agent.nad_fun import NadFunIntegration; ...'");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
