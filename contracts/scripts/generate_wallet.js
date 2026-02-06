// Generate a new wallet for deployment
const { ethers } = require("ethers");

const wallet = ethers.Wallet.createRandom();

console.log("╔════════════════════════════════════════════════════════════════╗");
console.log("║         🔐 NEW TESTNET WALLET GENERATED                        ║");
console.log("╚════════════════════════════════════════════════════════════════╝");
console.log("");
console.log("📍 Address:", wallet.address);
console.log("");
console.log("🔑 Private Key:", wallet.privateKey);
console.log("");
console.log("╔════════════════════════════════════════════════════════════════╗");
console.log("║  ⚠️  SAVE YOUR PRIVATE KEY! You'll need it for .env            ║");
console.log("║  🚰 Get tokens from: https://testnet.monad.xyz                 ║");
console.log("╚════════════════════════════════════════════════════════════════╝");
