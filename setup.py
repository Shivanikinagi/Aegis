#!/usr/bin/env python3
"""
Quick Setup Script for Autonomous Treasury Agent
Helps with initial configuration and wallet generation
"""

import os
import json
from pathlib import Path
from web3 import Web3
from eth_account import Account

def print_banner():
    print("""
╔═══════════════════════════════════════════════════════════╗
║   Autonomous Treasury Agent - Quick Setup                 ║
║   Competition-Ready Version                               ║
╚═══════════════════════════════════════════════════════════╝
    """)

def generate_wallets():
    """Generate wallets for agents"""
    print("\n📝 Generating Agent Wallets...")
    print("=" * 60)
    
    wallets = {
        "coordinator": Account.create(),
        "agent_1": Account.create(),
        "agent_2": Account.create(),
        "agent_3": Account.create(),
    }
    
    for name, account in wallets.items():
        print(f"\n{name.upper()}:")
        print(f"  Address:     {account.address}")
        print(f"  Private Key: {account.key.hex()}")
        print(f"  Get testnet MON: https://faucet.monad.xyz")
    
    return wallets

def create_env_file(wallets):
    """Create .env file with generated wallets"""
    print("\n📄 Creating .env file...")
    
    env_template = Path(".env.example").read_text()
    
    # Replace placeholders
    env_content = env_template.replace(
        "COORDINATOR_PRIVATE_KEY=",
        f"COORDINATOR_PRIVATE_KEY={wallets['coordinator'].key.hex()}"
    )
    env_content = env_content.replace(
        "WORKER_AGENT_1_PRIVATE_KEY=",
        f"WORKER_AGENT_1_PRIVATE_KEY={wallets['agent_1'].key.hex()}"
    )
    env_content = env_content.replace(
        "WORKER_AGENT_2_PRIVATE_KEY=",
        f"WORKER_AGENT_2_PRIVATE_KEY={wallets['agent_2'].key.hex()}"
    )
    env_content = env_content.replace(
        "WORKER_AGENT_3_PRIVATE_KEY=",
        f"WORKER_AGENT_3_PRIVATE_KEY={wallets['agent_3'].key.hex()}"
    )
    
    # Save to .env
    Path(".env").write_text(env_content)
    print("✅ .env file created")
    print("⚠️  IMPORTANT: Add your DEPLOYER_PRIVATE_KEY manually!")
    print("⚠️  IMPORTANT: Add your OPENAI_API_KEY manually!")

def check_dependencies():
    """Check if required dependencies are installed"""
    print("\n🔍 Checking Dependencies...")
    print("=" * 60)
    
    issues = []
    
    # Check Node.js
    if os.system("node --version > /dev/null 2>&1") != 0:
        issues.append("Node.js not found - install from https://nodejs.org")
    else:
        print("✅ Node.js installed")
    
    # Check Python
    if os.system("python --version > /dev/null 2>&1") != 0:
        issues.append("Python not found - install from https://python.org")
    else:
        print("✅ Python installed")
    
    # Check npm packages
    if not Path("contracts/node_modules").exists():
        print("⚠️  Node packages not installed in contracts/")
        print("   Run: cd contracts && npm install")
    else:
        print("✅ Contract dependencies installed")
    
    # Check Python packages
    try:
        import web3
        import openai
        print("✅ Python packages installed")
    except ImportError:
        print("⚠️  Python packages not installed")
        print("   Run: cd agent && pip install -r requirements.txt")
    
    return issues

def display_next_steps(wallets):
    """Display next steps for the user"""
    print("\n🎯 Next Steps:")
    print("=" * 60)
    
    print("\n1. Fund Your Wallets (REQUIRED)")
    print("   Visit: https://faucet.monad.xyz")
    print(f"   Fund deployer address: [YOUR_ADDRESS]")
    print(f"   Fund coordinator: {wallets['coordinator'].address}")
    print(f"   Fund agent 1: {wallets['agent_1'].address}")
    print(f"   Fund agent 2: {wallets['agent_2'].address}")
    print(f"   Fund agent 3: {wallets['agent_3'].address}")
    
    print("\n2. Add API Keys to .env (REQUIRED)")
    print("   - DEPLOYER_PRIVATE_KEY (your wallet)")
    print("   - OPENAI_API_KEY (from https://platform.openai.com)")
    print("   - ANTHROPIC_API_KEY (optional, from https://console.anthropic.com)")
    print("   - NAD_FUN_API_KEY (optional, from https://nad.fun/developers)")
    
    print("\n3. Install Dependencies")
    print("   cd contracts && npm install")
    print("   cd agent && pip install -r requirements.txt")
    print("   cd frontend && npm install")
    
    print("\n4. Deploy Contracts")
    print("   cd contracts")
    print("   npx hardhat run scripts/deploy_testnet.js --network monad-testnet")
    
    print("\n5. Update .env with Contract Addresses")
    print("   Copy addresses from deployment output to .env")
    
    print("\n6. Start Agent System")
    print("   cd agent")
    print("   python main.py")
    
    print("\n7. Start Frontend")
    print("   cd frontend")
    print("   npm run dev")
    
    print("\n8. (Optional) Setup Indexer")
    print("   cd indexer")
    print("   npm install -g envio")
    print("   envio dev")
    
    print("\n✅ Setup Complete!")
    print("📖 See DEPLOYMENT_GUIDE.md for detailed instructions")
    print("🚀 See NEW_FEATURES.md for feature overview")

def save_wallet_backup(wallets):
    """Save wallet backup to secure location"""
    backup_dir = Path("agent/data")
    backup_dir.mkdir(parents=True, exist_ok=True)
    
    backup_file = backup_dir / "wallets_backup.json"
    
    backup_data = {
        name: {
            "address": account.address,
            "private_key": account.key.hex()
        }
        for name, account in wallets.items()
    }
    
    with open(backup_file, 'w') as f:
        json.dump(backup_data, f, indent=2)
    
    print(f"\n💾 Wallet backup saved to: {backup_file}")
    print("⚠️  Keep this file secure! Never commit to git!")
    
    # Add to .gitignore
    gitignore = Path(".gitignore")
    if gitignore.exists():
        content = gitignore.read_text()
        if "wallets_backup.json" not in content:
            with open(gitignore, 'a') as f:
                f.write("\n# Wallet backups\nagent/data/wallets_backup.json\n")

def main():
    print_banner()
    
    print("This script will help you set up the Autonomous Treasury Agent.")
    print("It will:")
    print("  • Generate wallets for coordinator and agents")
    print("  • Create .env configuration file")
    print("  • Check dependencies")
    print("  • Show next steps")
    
    input("\nPress Enter to continue...")
    
    # Check dependencies first
    issues = check_dependencies()
    if issues:
        print("\n⚠️  Issues found:")
        for issue in issues:
            print(f"   - {issue}")
        print("\nPlease resolve these issues and run the script again.")
        return
    
    # Generate wallets
    wallets = generate_wallets()
    
    # Create .env file
    if Path(".env").exists():
        response = input("\n.env file already exists. Overwrite? (y/N): ")
        if response.lower() != 'y':
            print("Skipping .env creation")
        else:
            create_env_file(wallets)
    else:
        create_env_file(wallets)
    
    # Save backup
    save_wallet_backup(wallets)
    
    # Display next steps
    display_next_steps(wallets)
    
    print("\n" + "=" * 60)
    print("🎉 Setup script completed!")
    print("=" * 60)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n❌ Setup cancelled by user")
    except Exception as e:
        print(f"\n\n❌ Error: {e}")
        print("Please report this issue on GitHub")
