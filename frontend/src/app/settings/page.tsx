'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { Badge } from '@/components/StatCard';
import { formatMON } from '@/lib/hooks';
import {
    Settings as SettingsIcon,
    Shield,
    Wallet,
    Network,
    Copy,
    ExternalLink,
    CheckCircle,
    AlertTriangle,
    RefreshCw
} from 'lucide-react';

// Demo configuration
const config = {
    network: {
        name: 'Monad Testnet',
        rpcUrl: 'https://testnet-rpc.monad.xyz',
        chainId: 10143,
        explorer: 'https://testnet.monadvision.com',
        status: 'connected'
    },
    contracts: {
        treasury: '0x1234567890abcdef1234567890abcdef12345678',
        taskRegistry: '0xabcdef1234567890abcdef1234567890abcdef12',
        workerRegistry: '0x567890abcdef1234567890abcdef1234567890ab'
    },
    agent: {
        coordinatorAddress: '0x9876543210fedcba9876543210fedcba98765432',
        pollingInterval: 5,
        learningRate: 0.1,
        explorationDecay: 0.99,
        minExploration: 0.05
    },
    treasury: {
        maxSpendPerTask: 10,
        maxSpendPerDay: 100,
        minTaskValue: 0.1,
        cooldownPeriod: 300
    }
};

export default function SettingsPage() {
    const [copied, setCopied] = useState<string | null>(null);

    const copyToClipboard = (text: string, key: string) => {
        navigator.clipboard.writeText(text);
        setCopied(key);
        setTimeout(() => setCopied(null), 2000);
    };

    const ContractRow = ({ name, address }: { name: string; address: string }) => (
        <div className="flex items-center justify-between py-4 border-b border-[#27272a] last:border-0">
            <div>
                <p className="text-white font-medium">{name}</p>
                <p className="text-xs text-gray-500 font-mono mt-1">{address}</p>
            </div>
            <div className="flex items-center gap-2">
                <button
                    onClick={() => copyToClipboard(address, name)}
                    className="p-2 hover:bg-[#27272a] rounded-lg transition-colors"
                >
                    {copied === name ? (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                    ) : (
                        <Copy className="w-4 h-4 text-gray-400" />
                    )}
                </button>
                <a
                    href={`${config.network.explorer}/address/${address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 hover:bg-[#27272a] rounded-lg transition-colors"
                >
                    <ExternalLink className="w-4 h-4 text-gray-400" />
                </a>
            </div>
        </div>
    );

    return (
        <div className="flex min-h-screen bg-[#0a0a0f]">
            <Sidebar />

            <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
                    <p className="text-gray-400">
                        System configuration and contract addresses
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Network Configuration */}
                    <div className="glass-card p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                                <Network className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-white">Network</h2>
                                <p className="text-sm text-gray-400">Blockchain connection</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-[#1e1e2e] rounded-xl">
                                <span className="text-gray-400">Network</span>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-purple-500 rounded-full" />
                                    <span className="text-white font-medium">{config.network.name}</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-[#1e1e2e] rounded-xl">
                                <span className="text-gray-400">Status</span>
                                <Badge variant="success">Connected</Badge>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-[#1e1e2e] rounded-xl">
                                <span className="text-gray-400">Chain ID</span>
                                <span className="text-white font-mono">{config.network.chainId}</span>
                            </div>

                            <div className="p-4 bg-[#1e1e2e] rounded-xl">
                                <span className="text-gray-400 block mb-2">RPC URL</span>
                                <code className="text-sm text-purple-400 break-all">{config.network.rpcUrl}</code>
                            </div>

                            <a
                                href={config.network.explorer}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-between p-4 bg-[#1e1e2e] rounded-xl hover:bg-[#27272a] transition-colors"
                            >
                                <span className="text-gray-400">Block Explorer</span>
                                <div className="flex items-center gap-2 text-purple-400">
                                    <span>View</span>
                                    <ExternalLink className="w-4 h-4" />
                                </div>
                            </a>
                        </div>
                    </div>

                    {/* Contract Addresses */}
                    <div className="glass-card p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                                <Shield className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-white">Contracts</h2>
                                <p className="text-sm text-gray-400">Deployed addresses</p>
                            </div>
                        </div>

                        <div>
                            <ContractRow name="Treasury" address={config.contracts.treasury} />
                            <ContractRow name="Task Registry" address={config.contracts.taskRegistry} />
                            <ContractRow name="Worker Registry" address={config.contracts.workerRegistry} />
                        </div>
                    </div>

                    {/* Agent Configuration */}
                    <div className="glass-card p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
                                <SettingsIcon className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-white">Agent Settings</h2>
                                <p className="text-sm text-gray-400">AI coordinator configuration</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-[#1e1e2e] rounded-xl">
                                <span className="text-gray-400">Polling Interval</span>
                                <span className="text-white">{config.agent.pollingInterval}s</span>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-[#1e1e2e] rounded-xl">
                                <span className="text-gray-400">Learning Rate (α)</span>
                                <span className="text-white font-mono">{config.agent.learningRate}</span>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-[#1e1e2e] rounded-xl">
                                <span className="text-gray-400">Exploration Decay (γ)</span>
                                <span className="text-white font-mono">{config.agent.explorationDecay}</span>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-[#1e1e2e] rounded-xl">
                                <span className="text-gray-400">Min Exploration (ε)</span>
                                <span className="text-white font-mono">{config.agent.minExploration}</span>
                            </div>

                            <div className="p-4 bg-[#1e1e2e] rounded-xl">
                                <span className="text-gray-400 block mb-2">Coordinator Address</span>
                                <code className="text-sm text-purple-400 break-all">{config.agent.coordinatorAddress}</code>
                            </div>
                        </div>
                    </div>

                    {/* Treasury Rules */}
                    <div className="glass-card p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center">
                                <Wallet className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-white">Treasury Rules</h2>
                                <p className="text-sm text-gray-400">On-chain spending limits</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-[#1e1e2e] rounded-xl">
                                <span className="text-gray-400">Max per Task</span>
                                <span className="text-white font-mono">{formatMON(config.treasury.maxSpendPerTask)}</span>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-[#1e1e2e] rounded-xl">
                                <span className="text-gray-400">Max per Day</span>
                                <span className="text-white font-mono">{formatMON(config.treasury.maxSpendPerDay)}</span>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-[#1e1e2e] rounded-xl">
                                <span className="text-gray-400">Min Task Value</span>
                                <span className="text-white font-mono">{formatMON(config.treasury.minTaskValue)}</span>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-[#1e1e2e] rounded-xl">
                                <span className="text-gray-400">Cooldown Period</span>
                                <span className="text-white">{config.treasury.cooldownPeriod}s</span>
                            </div>

                            <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                                <div className="flex items-start gap-3">
                                    <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
                                    <div>
                                        <p className="text-sm text-yellow-400 font-medium">Immutable Rules</p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            These rules are enforced by the smart contract and cannot be changed by the agent.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Links */}
                <div className="mt-8 glass-card p-6">
                    <h2 className="text-lg font-semibold text-white mb-4">Quick Links</h2>
                    <div className="grid grid-cols-4 gap-4">
                        <a
                            href="https://testnet.monad.xyz"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-4 bg-[#1e1e2e] rounded-xl hover:bg-[#27272a] transition-colors text-center group"
                        >
                            <div className="text-2xl mb-2">🚰</div>
                            <p className="text-white font-medium group-hover:text-purple-400">Faucet</p>
                            <p className="text-xs text-gray-500">Get testnet tokens</p>
                        </a>
                        <a
                            href={config.network.explorer}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-4 bg-[#1e1e2e] rounded-xl hover:bg-[#27272a] transition-colors text-center group"
                        >
                            <div className="text-2xl mb-2">🔍</div>
                            <p className="text-white font-medium group-hover:text-purple-400">Explorer</p>
                            <p className="text-xs text-gray-500">View transactions</p>
                        </a>
                        <a
                            href="https://docs.monad.xyz"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-4 bg-[#1e1e2e] rounded-xl hover:bg-[#27272a] transition-colors text-center group"
                        >
                            <div className="text-2xl mb-2">📚</div>
                            <p className="text-white font-medium group-hover:text-purple-400">Docs</p>
                            <p className="text-xs text-gray-500">Monad documentation</p>
                        </a>
                        <a
                            href="https://github.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-4 bg-[#1e1e2e] rounded-xl hover:bg-[#27272a] transition-colors text-center group"
                        >
                            <div className="text-2xl mb-2">📖</div>
                            <p className="text-white font-medium group-hover:text-purple-400">GitHub</p>
                            <p className="text-xs text-gray-500">Source code</p>
                        </a>
                    </div>
                </div>
            </main>
        </div>
    );
}
