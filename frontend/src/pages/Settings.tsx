import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Settings as SettingsIcon,
    Server,
    Link as LinkIcon,
    Shield,
    Terminal,
    Copy,
    CheckCircle,
    ExternalLink,
    RefreshCw,
    AlertTriangle,
    Info,
    Zap,
    Database,
    Globe
} from 'lucide-react';
import { toast } from 'sonner';

const fetchHealth = async () => {
    const res = await fetch('http://localhost:8000/api/health');
    return res.json();
};

const fetchTreasury = async () => {
    const res = await fetch('http://localhost:8000/api/treasury');
    return res.json();
};

export default function Settings() {
    const [copied, setCopied] = useState<string | null>(null);

    const { data: healthData, isLoading: healthLoading, refetch: refetchHealth } = useQuery({
        queryKey: ['health'],
        queryFn: fetchHealth,
        refetchInterval: 10000,
    });

    const { data: treasuryData } = useQuery({
        queryKey: ['treasury'],
        queryFn: fetchTreasury,
    });

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        setCopied(label);
        toast.success(`${label} copied to clipboard`);
        setTimeout(() => setCopied(null), 2000);
    };

    const isConnected = healthData?.blockchain_connected;
    const isAgentRunning = healthData?.agent_running;

    const contracts = [
        { name: 'Treasury', address: treasuryData?.address || '0x...', description: 'Main treasury contract' },
        { name: 'Task Registry', address: '0x...TaskRegistry...', description: 'Task management' },
        { name: 'Worker Registry', address: '0x...WorkerRegistry...', description: 'Worker management' },
    ];

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
                    <p className="text-gray-400">Configure and monitor system status</p>
                </div>
                <button onClick={() => refetchHealth()} className="btn-secondary">
                    <RefreshCw className="w-4 h-4" />
                    Refresh Status
                </button>
            </div>

            {/* Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* API Status */}
                <div className="glass-card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-indigo-500/20 flex items-center justify-center">
                                <Server className="w-5 h-5 text-purple-400" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-white">API Server</h3>
                                <p className="text-xs text-gray-400">localhost:8000</p>
                            </div>
                        </div>
                        <div className={`flex items-center gap-2 ${healthData ? 'text-green-400' : 'text-red-400'}`}>
                            <div className={`w-3 h-3 rounded-full ${healthData ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                            <span className="text-sm font-medium">{healthData ? 'Online' : 'Offline'}</span>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Status</span>
                            <span className="text-white">{healthData?.status || 'Unknown'}</span>
                        </div>
                    </div>
                </div>

                {/* Blockchain Status */}
                <div className="glass-card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center">
                                <LinkIcon className="w-5 h-5 text-blue-400" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-white">Blockchain</h3>
                                <p className="text-xs text-gray-400">Monad Testnet</p>
                            </div>
                        </div>
                        <div className={`flex items-center gap-2 ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
                            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                            <span className="text-sm font-medium">{isConnected ? 'Connected' : 'Disconnected'}</span>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Network</span>
                            <span className="text-purple-400">Monad Testnet</span>
                        </div>
                    </div>
                </div>

                {/* Agent Status */}
                <div className="glass-card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
                                <Zap className="w-5 h-5 text-green-400" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-white">AI Agent</h3>
                                <p className="text-xs text-gray-400">Learning agent</p>
                            </div>
                        </div>
                        <div className={`flex items-center gap-2 ${isAgentRunning ? 'text-green-400' : 'text-yellow-400'}`}>
                            <div className={`w-3 h-3 rounded-full ${isAgentRunning ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
                            <span className="text-sm font-medium">{isAgentRunning ? 'Running' : 'Idle'}</span>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Mode</span>
                            <span className="text-white">Autonomous</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Contract Addresses */}
            <div className="glass-card p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-indigo-500/20 flex items-center justify-center">
                        <Database className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-white">Contract Addresses</h3>
                        <p className="text-sm text-gray-400">Smart contracts deployed on Monad Testnet</p>
                    </div>
                </div>

                <div className="space-y-4">
                    {contracts.map((contract) => (
                        <div key={contract.name} className="p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
                            <div className="flex items-center justify-between mb-2">
                                <div>
                                    <h4 className="font-medium text-white">{contract.name}</h4>
                                    <p className="text-xs text-gray-500">{contract.description}</p>
                                </div>
                                <button
                                    onClick={() => copyToClipboard(contract.address, contract.name)}
                                    className="btn-icon"
                                >
                                    {copied === contract.name ? (
                                        <CheckCircle className="w-4 h-4 text-green-400" />
                                    ) : (
                                        <Copy className="w-4 h-4" />
                                    )}
                                </button>
                            </div>
                            <code className="text-sm text-purple-400 font-mono break-all">{contract.address}</code>
                        </div>
                    ))}
                </div>
            </div>

            {/* Setup Instructions */}
            <div className="glass-card p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center">
                        <Terminal className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-white">Setup Instructions</h3>
                        <p className="text-sm text-gray-400">Get started with the Autonomous Treasury Agent</p>
                    </div>
                </div>

                <div className="space-y-4">
                    {/* Step 1 */}
                    <div className="p-4 bg-white/5 rounded-xl">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold text-sm">1</div>
                            <h4 className="font-medium text-white">Start Local Blockchain (Optional)</h4>
                        </div>
                        <div className="ml-11 space-y-2">
                            <div className="p-3 bg-black/30 rounded-lg font-mono text-sm text-gray-300 flex items-center justify-between">
                                <code>cd contracts && npx hardhat node</code>
                                <button onClick={() => copyToClipboard('cd contracts && npx hardhat node', 'Step 1')} className="text-gray-500 hover:text-white">
                                    <Copy className="w-4 h-4" />
                                </button>
                            </div>
                            <p className="text-xs text-gray-500">Starts a local Hardhat node for development</p>
                        </div>
                    </div>

                    {/* Step 2 */}
                    <div className="p-4 bg-white/5 rounded-xl">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold text-sm">2</div>
                            <h4 className="font-medium text-white">Deploy Smart Contracts</h4>
                        </div>
                        <div className="ml-11 space-y-2">
                            <div className="p-3 bg-black/30 rounded-lg font-mono text-sm text-gray-300 flex items-center justify-between">
                                <code>npx hardhat run scripts/deploy.js --network localhost</code>
                                <button onClick={() => copyToClipboard('npx hardhat run scripts/deploy.js --network localhost', 'Step 2')} className="text-gray-500 hover:text-white">
                                    <Copy className="w-4 h-4" />
                                </button>
                            </div>
                            <p className="text-xs text-gray-500">Deploys Treasury, TaskRegistry, and WorkerRegistry contracts</p>
                        </div>
                    </div>

                    {/* Step 3 */}
                    <div className="p-4 bg-white/5 rounded-xl">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold text-sm">3</div>
                            <h4 className="font-medium text-white">Setup Demo Data</h4>
                        </div>
                        <div className="ml-11 space-y-2">
                            <div className="p-3 bg-black/30 rounded-lg font-mono text-sm text-gray-300 flex items-center justify-between">
                                <code>npx hardhat run scripts/setup_demo.js --network localhost</code>
                                <button onClick={() => copyToClipboard('npx hardhat run scripts/setup_demo.js --network localhost', 'Step 3')} className="text-gray-500 hover:text-white">
                                    <Copy className="w-4 h-4" />
                                </button>
                            </div>
                            <p className="text-xs text-gray-500">Creates demo workers and tasks for testing</p>
                        </div>
                    </div>

                    {/* Step 4 */}
                    <div className="p-4 bg-white/5 rounded-xl">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold text-sm">4</div>
                            <h4 className="font-medium text-white">Start AI Agent</h4>
                        </div>
                        <div className="ml-11 space-y-2">
                            <div className="p-3 bg-black/30 rounded-lg font-mono text-sm text-gray-300 flex items-center justify-between">
                                <code>cd agent && python api.py</code>
                                <button onClick={() => copyToClipboard('cd agent && python api.py', 'Step 4')} className="text-gray-500 hover:text-white">
                                    <Copy className="w-4 h-4" />
                                </button>
                            </div>
                            <p className="text-xs text-gray-500">Starts the AI agent with API server on port 8000</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Links */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <a
                    href="https://testnet.monadvision.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="glass-card p-6 hover:bg-white/5 transition-colors group"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20 flex items-center justify-center group-hover:from-purple-500/30 group-hover:to-indigo-500/30 transition-all">
                            <Globe className="w-6 h-6 text-purple-400" />
                        </div>
                        <div className="flex-1">
                            <h4 className="font-semibold text-white group-hover:text-purple-300 transition-colors">Block Explorer</h4>
                            <p className="text-sm text-gray-400">View on Monad Explorer</p>
                        </div>
                        <ExternalLink className="w-5 h-5 text-gray-500 group-hover:text-purple-400 transition-colors" />
                    </div>
                </a>

                <a
                    href="https://github.com/Shivanikinagi/Aegis"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="glass-card p-6 hover:bg-white/5 transition-colors group"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-500/20 to-gray-600/20 flex items-center justify-center group-hover:from-gray-500/30 group-hover:to-gray-600/30 transition-all">
                            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <h4 className="font-semibold text-white group-hover:text-purple-300 transition-colors">GitHub</h4>
                            <p className="text-sm text-gray-400">Source code</p>
                        </div>
                        <ExternalLink className="w-5 h-5 text-gray-500 group-hover:text-purple-400 transition-colors" />
                    </div>
                </a>

                <a
                    href="https://docs.monad.xyz"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="glass-card p-6 hover:bg-white/5 transition-colors group"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center group-hover:from-blue-500/30 group-hover:to-cyan-500/30 transition-all">
                            <Info className="w-6 h-6 text-blue-400" />
                        </div>
                        <div className="flex-1">
                            <h4 className="font-semibold text-white group-hover:text-purple-300 transition-colors">Documentation</h4>
                            <p className="text-sm text-gray-400">Monad docs</p>
                        </div>
                        <ExternalLink className="w-5 h-5 text-gray-500 group-hover:text-purple-400 transition-colors" />
                    </div>
                </a>
            </div>

            {/* Security Notice */}
            <div className="glass-card p-6 border border-green-500/20 bg-green-500/5">
                <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
                        <Shield className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-white mb-2">Security Model</h3>
                        <p className="text-sm text-gray-400 mb-4">
                            This autonomous agent operates with strict on-chain security constraints. The agent cannot steal funds
                            or exceed spending limits, regardless of any bugs or compromises in the learning algorithm.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="flex items-center gap-2 text-sm text-gray-300">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                <span>No wallet private key access</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-300">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                <span>Contract-enforced spending limits</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-300">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                <span>100 MON daily spending cap</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-300">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                <span>10 MON maximum per task</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
