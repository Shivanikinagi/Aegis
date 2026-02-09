import { useQuery } from '@tanstack/react-query';
import {
    Wallet,
    Shield,
    TrendingUp,
    TrendingDown,
    ArrowUpRight,
    ArrowDownLeft,
    Clock,
    CheckCircle,
    AlertTriangle,
    RefreshCw,
    ExternalLink,
    Lock,
    Zap
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

// Fetch treasury data
const fetchTreasury = async () => {
    const res = await fetch('http://localhost:8000/api/treasury');
    return res.json();
};

// Spending history mock
const spendingHistory = [
    { day: 'Mon', spent: 12.5, limit: 100 },
    { day: 'Tue', spent: 18.2, limit: 100 },
    { day: 'Wed', spent: 8.7, limit: 100 },
    { day: 'Thu', spent: 22.1, limit: 100 },
    { day: 'Fri', spent: 15.3, limit: 100 },
    { day: 'Sat', spent: 5.8, limit: 100 },
    { day: 'Sun', spent: 3.2, limit: 100 },
];

// Allocation data
const allocationData = [
    { name: 'Available', value: 75, color: '#8b5cf6' },
    { name: 'Pending', value: 15, color: '#3b82f6' },
    { name: 'Reserved', value: 10, color: '#6b7280' },
];

export default function Treasury() {
    const { data: treasury, isLoading, refetch } = useQuery({
        queryKey: ['treasury'],
        queryFn: fetchTreasury,
    });

    const balance = treasury?.balance?.total || 0;
    const available = treasury?.balance?.available || 0;
    const dailySpent = treasury?.daily?.spent || 0;
    const dailyLimit = treasury?.daily?.limit || 100;
    const dailyRemaining = dailyLimit - dailySpent;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white mb-1">Treasury</h1>
                    <p className="text-gray-400 text-sm">Contract-managed funds with enforced spending limits</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => refetch()} className="btn-secondary">
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                    </button>
                    <a
                        href="https://testnet.monad.xyz"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-primary"
                    >
                        <ExternalLink className="w-4 h-4" />
                        View Contract
                    </a>
                </div>
            </div>

            {/* Security Notice */}
            <div className="glass-card p-4 border-l-4 border-green-500">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                        <Shield className="w-6 h-6 text-green-400" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-white font-medium">Contract-Enforced Security</h3>
                        <p className="text-sm text-gray-400">
                            Agent <span className="text-green-400 font-medium">cannot access wallet</span>.
                            All payments require contract verification. Daily spending cap: {dailyLimit} MON.
                        </p>
                    </div>
                    <div className="text-right hidden md:block">
                        <div className="flex items-center gap-1.5 text-green-400">
                            <Lock className="w-4 h-4" />
                            <span className="text-sm font-medium">Secure</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Balance Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Total Balance */}
                <div className="glass-card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-sm text-gray-400">Total Balance</span>
                        <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                            <Wallet className="w-5 h-5 text-purple-400" />
                        </div>
                    </div>
                    {isLoading ? (
                        <div className="skeleton h-10 w-32" />
                    ) : (
                        <div>
                            <p className="text-3xl font-bold text-white">{balance.toFixed(2)}</p>
                            <p className="text-sm text-gray-500 mt-1">MON</p>
                        </div>
                    )}
                </div>

                {/* Available */}
                <div className="glass-card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-sm text-gray-400">Available to Spend</span>
                        <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                            <ArrowUpRight className="w-5 h-5 text-green-400" />
                        </div>
                    </div>
                    {isLoading ? (
                        <div className="skeleton h-10 w-32" />
                    ) : (
                        <div>
                            <p className="text-3xl font-bold text-green-400">{available.toFixed(2)}</p>
                            <p className="text-sm text-gray-500 mt-1">MON available</p>
                        </div>
                    )}
                </div>

                {/* Daily Remaining */}
                <div className="glass-card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-sm text-gray-400">Daily Limit Remaining</span>
                        <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                            <Clock className="w-5 h-5 text-blue-400" />
                        </div>
                    </div>
                    {isLoading ? (
                        <div className="skeleton h-10 w-32" />
                    ) : (
                        <div>
                            <p className="text-3xl font-bold text-white">{dailyRemaining.toFixed(2)}</p>
                            <p className="text-sm text-gray-500 mt-1">of {dailyLimit} MON daily</p>
                        </div>
                    )}
                    {/* Progress bar */}
                    <div className="mt-4">
                        <div className="progress-bar">
                            <div
                                className="progress-fill bg-gradient-to-r from-purple-500 to-blue-500"
                                style={{ width: `${(dailySpent / dailyLimit) * 100}%` }}
                            />
                        </div>
                        <p className="text-xs text-gray-500 mt-2">{dailySpent.toFixed(2)} MON spent today</p>
                    </div>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Spending History */}
                <div className="lg:col-span-2 glass-card p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-semibold text-white">Spending History</h3>
                            <p className="text-sm text-gray-400">Daily spending over the past week</p>
                        </div>
                        <div className="badge badge-blue">
                            <TrendingDown className="w-3 h-3" />
                            <span>Avg: 12.3 MON/day</span>
                        </div>
                    </div>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={spendingHistory}>
                                <defs>
                                    <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#1a1a2e',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '8px',
                                    }}
                                    formatter={(value: number) => [`${value} MON`, 'Spent']}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="spent"
                                    stroke="#8b5cf6"
                                    strokeWidth={3}
                                    fill="url(#spendGradient)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Fund Allocation */}
                <div className="glass-card p-6">
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-white">Fund Allocation</h3>
                        <p className="text-sm text-gray-400">Current distribution</p>
                    </div>
                    <div className="h-48 flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={allocationData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={70}
                                    paddingAngle={4}
                                    dataKey="value"
                                >
                                    {allocationData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#1a1a2e',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '8px',
                                    }}
                                    formatter={(value: number) => [`${value}%`, '']}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    {/* Legend */}
                    <div className="space-y-2 mt-4">
                        {allocationData.map((item) => (
                            <div key={item.name} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                                    <span className="text-gray-400">{item.name}</span>
                                </div>
                                <span className="text-white font-medium">{item.value}%</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Contract Rules */}
            <div className="glass-card p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                        <AlertTriangle className="w-5 h-5 text-yellow-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-white">Contract-Enforced Rules</h3>
                        <p className="text-sm text-gray-400">These limits are enforced on-chain and cannot be bypassed</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 bg-white/5 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span className="text-sm font-medium text-white">Daily Limit</span>
                        </div>
                        <p className="text-2xl font-bold text-white">{dailyLimit} MON</p>
                        <p className="text-xs text-gray-500">Max spending per day</p>
                    </div>
                    <div className="p-4 bg-white/5 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span className="text-sm font-medium text-white">Per Task Limit</span>
                        </div>
                        <p className="text-2xl font-bold text-white">10 MON</p>
                        <p className="text-xs text-gray-500">Max per single task</p>
                    </div>
                    <div className="p-4 bg-white/5 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span className="text-sm font-medium text-white">Verification</span>
                        </div>
                        <p className="text-2xl font-bold text-white">Required</p>
                        <p className="text-xs text-gray-500">Before payment release</p>
                    </div>
                    <div className="p-4 bg-white/5 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span className="text-sm font-medium text-white">Wallet Access</span>
                        </div>
                        <p className="text-2xl font-bold text-red-400">None</p>
                        <p className="text-xs text-gray-500">Agent cannot access wallet</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
