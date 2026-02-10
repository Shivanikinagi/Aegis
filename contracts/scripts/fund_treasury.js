const hre = require("hardhat");

/**
 * Fund the Treasury contract with testnet MON
 */
async function main() {
  console.log("\n💰 Funding Treasury Contract...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Funding from:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "MON");

  // Treasury address from deployment
  const treasuryAddress = "0xAA777e4835bbC729a0C50F1EC63dC5Dc371379E7";
  
  // Send 2 MON to treasury
  const fundAmount = hre.ethers.parseEther("2.0");
  
  console.log("\nSending", hre.ethers.formatEther(fundAmount), "MON to Treasury...");
  
  const tx = await deployer.sendTransaction({
    to: treasuryAddress,
    value: fundAmount
  });
  
  await tx.wait();
  console.log("✅ Transaction confirmed:", tx.hash);
  
  const treasuryBalance = await hre.ethers.provider.getBalance(treasuryAddress);
  console.log("\n📊 Treasury Balance:", hre.ethers.formatEther(treasuryBalance), "MON");
  console.log("\n✅ Treasury funded successfully!\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
