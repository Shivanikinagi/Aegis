#!/usr/bin/env python3
"""Quick non-interactive setup - generates wallets and .env"""

import os
from pathlib import Path
from eth_account import Account

print("\n🔐 Generating Wallets...")
print("=" * 60)

# Generate wallets
wallets = {
    "coordinator": Account.create(),
    "agent_1": Account.create(),
    "agent_2": Account.create(),
    "agent_3": Account.create(),
}

# Display wallets
for name, wallet in wallets.items():
    print(f"\n{name.upper()}:")
    print(f"  Address: {wallet.address}")
    print(f"  Private Key: {wallet.key.hex()}")

# Save wallet backup
backup_data = {
    name: {
        "address": wallet.address,
        "private_key": wallet.key.hex()
    }
    for name, wallet in wallets.items()
}

import json
Path("wallets_backup.json").write_text(json.dumps(backup_data, indent=2))
print("\n✅ Wallets saved to wallets_backup.json")

# Read .env.example
env_example_path = Path(".env.example")
if not env_example_path.exists():
    print("\n⚠️  .env.example not found!")
    exit(1)

env_content = env_example_path.read_text()

# Replace wallet keys
env_content = env_content.replace(
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

# Save .env
Path(".env").write_text(env_content)
print("\n✅ .env file created")

print("\n" + "=" * 60)
print("⚠️  IMPORTANT: Manually add these to .env:")
print("   1. DEPLOYER_PRIVATE_KEY (your testnet wallet)")
print("   2. OPENAI_API_KEY or ANTHROPIC_API_KEY")
print("   3. Get MON from: https://faucet.monad.xyz")
print("=" * 60)
print("\n✅ Setup complete! Next: Deploy contracts\n")
