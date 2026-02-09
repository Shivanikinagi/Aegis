import { useQuery } from '@tanstack/react-query';
import {
    Activity,
    CheckCircle,
    XCircle,
    Clock,
    ExternalLink,
    Hash,
    Wallet,
    Shield,
    Zap,
    RefreshCw,
    ArrowUpRight,
    FileText,
    AlertTriangle
} from 'lucide-react';

// Fetch transactions
const fetchTransactions = async () => {
    const res = await fetch('http://localhost:8000/api/transactions');
    return res.json();
};

// Mock transactions for demonstration
const mockTransactions = [
    {
        hash: '0x1a2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890',
        type: 'TASK_CREATED',
        status: 'SUCCESS',
        timestamp: Date.now() - 300000,
        taskId: 15,
        payment: null,
        gasUsed: 85432,
        block: 1234567,
    },
    {
        hash: '0x2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890ab',
        type: 'PAYMENT_APPROVED',
        status: 'SUCCESS',
        timestamp: Date.now() - 600000,
        taskId: 14,
        payment: 1.5,
        gasUsed: 65210,
        block: 1234560,
    },
    {
        hash: '0x3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890abcd',
        type: 'WORKER_REGISTERED',
        status: 'SUCCESS',
        timestamp: Date.now() - 900000,
        taskId: null,
        payment: null,
        gasUsed: 42100,
        block: 1234555,
    },
    {
        hash: '0x4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        type: 'PAYMENT_REJECTED',
        status: 'REJECTED',
        timestamp: Date.now() - 1200000,
        taskId: 13,
        payment: 5.0,
        gasUsed: 32500,
        block: 1234550,
        reason: 'Exceeded daily limit',
    },
    {
        hash: '0x5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12',
        type: 'TASK_COMPLETED',
        status: 'SUCCESS',
        timestamp: Date.now() - 1800000,
        taskId: 12,
        payment: 0.8,
        gasUsed: 78340,
        block: 1234540,
    },
    {
        hash: '0x6f7890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234',
        type: 'PAYMENT_APPROVED',
        status: 'SUCCESS',
        timestamp: Date.now() - 2400000,
        taskId: 11,
        payment: 1.2,
        gasUsed: 65100,
        block: 1234530,
    },
];

// Transaction type config
const txTypeConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
    TASK_CREATED: { icon: Zap, color: 'purple', label: 'Task Created' },
    TASK_COMPLETED: { icon: CheckCircle, color: 'green', label: 'Task Completed' },
    PAYMENT_APPROVED: { icon: Wallet, color: 'green', label: 'Payment Approved' },
    PAYMENT_REJECTED: { icon: Shield, color: 'red', label: 'Payment Rejected' },
    WORKER_REGISTERED: { icon: Activity, color: 'blue', label: 'Worker Registered' },
};

// Format helpers
const formatHash = (hash: string) => `${hash.slice(0, 10)}...${hash.slice(-8)}`;
const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
};

// Transaction Row Component
function TransactionRow({ tx }: { tx: typeof mockTransactions[0] }) {
    const config = txTypeConfig[tx.type] || txTypeConfig.TASK_CREATED;
    const Icon = config.icon;

    const colorClasses: Record<string, string> = {
        purple: 'bg-purple-500/20 text-purple-400',
        green: 'bg-green-500/20 text-green-400',
        red: 'bg-red-500/20 text-red-400',
        blue: 'bg-blue-500/20 text-blue-400',
    };

    return (
        <div className="glass-card p-4 hover:bg-white/5 transition-colors">
            <div className="flex items-start gap-4">
                {/* Icon */}
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClasses[config.color]}`}>
                    <Icon className="w-5 h-5" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-white">{config.label}</span>
                        {tx.taskId && (
                            <span className="badge badge-purple text-xs">Task #{tx.taskId}</span>
                        )}
                        <span className={`badge text-xs ${tx.status === 'SUCCESS' ? 'badge-green' : 'badge-red'}`}>
                            {tx.status}
                        </span>
                    </div>

                    {/* Transaction Hash */}
                    <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                        <Hash className="w-3.5 h-3.5" />
                        <span className="font-mono">{formatHash(tx.hash)}</span>
                        <a
                            href={`https://testnet.monadvision.com/tx/${tx.hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-purple-400 hover:text-purple-300 transition-colors"
                        >
                            <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                    </div>

                    {/* Details Row */}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTime(tx.timestamp)}
                        </span>
                        <span className="flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            Block #{tx.block}
                        </span>
                        <span>Gas: {tx.gasUsed.toLocaleString()}</span>
                        {tx.payment && (
                            <span className="text-green-400">
                                {tx.payment} MON
                            </span>
                        )}
                    </div>

                    {/* Rejection Reason */}
                    {tx.reason && (
                        <div className="mt-2 flex items-center gap-2 text-sm text-red-400 bg-red-500/10 px-3 py-1.5 rounded-lg">
                            <AlertTriangle className="w-4 h-4" />
                            <span>Rule enforced: {tx.reason}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function ActivityPage() {
    const { data: txData, isLoading, refetch } = useQuery({
        queryKey: ['transactions'],
        queryFn: fetchTransactions,
        refetchInterval: 30000,
    });

    const transactions = txData?.transactions || mockTransactions;

    // Stats
    const successCount = transactions.filter((t: any) => t.status === 'SUCCESS').length;
    const rejectedCount = transactions.filter((t: any) => t.status === 'REJECTED').length;
    const totalPayments = transactions
        .filter((t: any) => t.type === 'PAYMENT_APPROVED')
        .reduce((sum: number, t: any) => sum + (t.payment || 0), 0);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white mb-1">On-Chain Activity</h1>
                    <p className="text-gray-400 text-sm">
                        Trustless execution logs on Monad blockchain
                    </p>
                </div>
                <button onClick={() => refetch()} className="btn-secondary">
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                </button>
            </div>

            {/* Blockchain Security Banner */}
            <div className="glass-card p-4 border-l-4 border-green-500">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                        <Shield className="w-6 h-6 text-green-400" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-white font-medium">Trustless Execution</h3>
                        <p className="text-sm text-gray-400">
                            All payments are enforced by smart contracts. The agent <span className="text-green-400 font-medium">never has wallet access</span>.
                            Transactions are verified on-chain before execution.
                        </p>
                    </div>
                    <a
                        href="https://testnet.monadvision.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary hidden md:flex"
                    >
                        <span>View on Monad</span>
                        <ArrowUpRight className="w-4 h-4" />
                    </a>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="glass-card p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                            <Activity className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-white">{transactions.length}</p>
                            <p className="text-xs text-gray-400">Total Transactions</p>
                        </div>
                    </div>
                </div>
                <div className="glass-card p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                            <CheckCircle className="w-5 h-5 text-green-400" />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-white">{successCount}</p>
                            <p className="text-xs text-gray-400">Successful</p>
                        </div>
                    </div>
                </div>
                <div className="glass-card p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                            <XCircle className="w-5 h-5 text-red-400" />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-white">{rejectedCount}</p>
                            <p className="text-xs text-gray-400">Rejected by Contract</p>
                        </div>
                    </div>
                </div>
                <div className="glass-card p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                            <Wallet className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-white">{totalPayments.toFixed(1)} MON</p>
                            <p className="text-xs text-gray-400">Total Paid</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Transaction List */}
            <div>
                <h3 className="text-lg font-semibold text-white mb-4">Recent Transactions</h3>

                {isLoading ? (
                    <div className="space-y-4">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="glass-card p-4">
                                <div className="flex items-center gap-4">
                                    <div className="skeleton w-10 h-10 rounded-lg" />
                                    <div className="flex-1">
                                        <div className="skeleton h-4 w-32 mb-2" />
                                        <div className="skeleton h-3 w-48 mb-2" />
                                        <div className="skeleton h-3 w-24" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : transactions.length > 0 ? (
                    <div className="space-y-3">
                        {transactions.map((tx: any, idx: number) => (
                            <TransactionRow key={tx.hash || idx} tx={tx} />
                        ))}
                    </div>
                ) : (
                    <div className="glass-card p-12 text-center">
                        <Activity className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-white mb-2">No Transactions Yet</h3>
                        <p className="text-gray-400 max-w-md mx-auto">
                            Create tasks and watch the blockchain activity appear here in real-time.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
