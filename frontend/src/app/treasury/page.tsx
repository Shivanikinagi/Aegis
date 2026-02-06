'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import StatCard, { ProgressBar, Badge } from '@/components/StatCard';
import { formatMON, formatAddress, formatTimestamp } from '@/lib/hooks';
import { getTreasuryData, getProvider, getTreasuryContract } from '@/lib/blockchain';
import { ethers } from 'ethers';
import {
    Wallet,
    TrendingUp,
    Shield,
    Clock,
    ArrowUpRight,
    ArrowDownRight,
    RefreshCw,
    ExternalLink
} from 'lucide-react';

interface Transaction {
    type: 'deposit' | 'payment' | 'reserve' | 'release';
    amount: number;
    timestamp: number;
    taskId?: number;
    worker?: string;
    txHash: string;
}

interface TreasuryData {
    balance: { total: number; available: number; reserved: number };
    daily: { spent: number; remaining: number };
    address: string | undefined;
}

const treasuryRules = {
    maxSpendPerTask: 10,
    maxSpendPerDay: 100,
    minTaskValue: 0.1,
    cooldownPeriod: 300,
};

export default function TreasuryPage() {
    const [treasury, setTreasury] = useState<TreasuryData | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [blockNumber, setBlockNumber] = useState(0);
    const [lastUpdate, setLastUpdate] = useState<string>('');

    const fetchData = async () => {
        setIsRefreshing(true);
        try {
            const treasuryData = await getTreasuryData();
            if (treasuryData) {
                setTreasury(treasuryData);
            }

            // Get block number
            const provider = getProvider();
            if (provider) {
                const block = await provider.getBlockNumber();
                setBlockNumber(block);
            }

            // Events would require full ABI - for now just show empty transactions
            // In production, you would use a proper indexer like The Graph
            setTransactions([]);
        } catch (error) {
            console.error('Error fetching treasury data:', error);
        } finally {
            setIsRefreshing(false);
            setLastUpdate(new Date().toLocaleTimeString());
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, []);

    const usagePercent = treasury ? (treasury.daily.spent / treasuryRules.maxSpendPerDay) * 100 : 0;

    return (
        <div className="flex min-h-screen bg-[#0a0a0f]">
            <Sidebar />

            <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">Treasury</h1>
                        <p className="text-gray-400">
                            Real-time fund management and transaction history
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-xs text-gray-500">Block #{blockNumber}</p>
                            <p className="text-sm text-gray-400">{lastUpdate || '—'}</p>
                        </div>
                        <button
                            onClick={fetchData}
                            className={`btn-secondary flex items-center gap-2 ${isRefreshing ? 'opacity-50' : ''}`}
                            disabled={isRefreshing}
                        >
                            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                    </div>
                </div>

                {/* Treasury Address */}
                {treasury?.address && (
                    <div className="glass-card p-4 mb-8 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-400">Treasury Contract Address</p>
                            <p className="text-white font-mono">{treasury.address}</p>
                        </div>
                        <a
                            href={`http://localhost:8545`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-secondary flex items-center gap-2"
                        >
                            <ExternalLink className="w-4 h-4" />
                            View on Explorer
                        </a>
                    </div>
                )}

                {/* Main Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <StatCard
                        title="Total Balance"
                        value={treasury ? formatMON(treasury.balance.total, 4) : '—'}
                        icon={Wallet}
                        accentColor="purple"
                    >
                        <div className="mt-4 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-400">Available</span>
                                <span className="text-green-400">{treasury ? formatMON(treasury.balance.available, 4) : '—'}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-400">Reserved</span>
                                <span className="text-yellow-400">{treasury ? formatMON(treasury.balance.reserved, 4) : '—'}</span>
                            </div>
                        </div>
                    </StatCard>

                    <StatCard
                        title="Daily Spending"
                        value={treasury ? formatMON(treasury.daily.spent, 4) : '—'}
                        subtitle={`of ${treasuryRules.maxSpendPerDay} MON limit`}
                        icon={TrendingUp}
                        accentColor="blue"
                    >
                        <div className="mt-4">
                            <ProgressBar
                                value={treasury?.daily.spent || 0}
                                max={treasuryRules.maxSpendPerDay}
                                label="Budget used"
                                color="blue"
                            />
                        </div>
                    </StatCard>

                    <StatCard
                        title="Daily Remaining"
                        value={treasury ? formatMON(treasury.daily.remaining, 4) : '—'}
                        subtitle="Available for today"
                        icon={Clock}
                        accentColor="green"
                    />
                </div>

                {/* Treasury Rules */}
                <div className="glass-card p-6 mb-8">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center">
                            <Shield className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-white">On-Chain Rules</h2>
                            <p className="text-sm text-gray-400">Immutable spending limits enforced by contract</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-[#1e1e2e] rounded-xl p-4">
                            <p className="text-sm text-gray-400 mb-1">Max per Task</p>
                            <p className="text-xl font-bold text-white">{treasuryRules.maxSpendPerTask} MON</p>
                        </div>
                        <div className="bg-[#1e1e2e] rounded-xl p-4">
                            <p className="text-sm text-gray-400 mb-1">Max per Day</p>
                            <p className="text-xl font-bold text-white">{treasuryRules.maxSpendPerDay} MON</p>
                        </div>
                        <div className="bg-[#1e1e2e] rounded-xl p-4">
                            <p className="text-sm text-gray-400 mb-1">Min Task Value</p>
                            <p className="text-xl font-bold text-white">{treasuryRules.minTaskValue} MON</p>
                        </div>
                        <div className="bg-[#1e1e2e] rounded-xl p-4">
                            <p className="text-sm text-gray-400 mb-1">Cooldown</p>
                            <p className="text-xl font-bold text-white">{treasuryRules.cooldownPeriod}s</p>
                        </div>
                    </div>
                </div>

                {/* Recent Transactions */}
                <div className="glass-card p-6">
                    <h2 className="text-lg font-semibold text-white mb-6">Recent Transactions</h2>

                    {transactions.length > 0 ? (
                        <div className="space-y-4">
                            {transactions.slice(0, 10).map((tx, index) => (
                                <div
                                    key={index}
                                    className="flex items-center justify-between p-4 bg-[#1e1e2e] rounded-xl"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type === 'payment'
                                            ? 'bg-red-500/20'
                                            : tx.type === 'deposit'
                                                ? 'bg-green-500/20'
                                                : 'bg-yellow-500/20'
                                            }`}>
                                            {tx.type === 'payment' ? (
                                                <ArrowUpRight className="w-5 h-5 text-red-400" />
                                            ) : tx.type === 'deposit' ? (
                                                <ArrowDownRight className="w-5 h-5 text-green-400" />
                                            ) : (
                                                <Clock className="w-5 h-5 text-yellow-400" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-white font-medium capitalize">{tx.type}</p>
                                            <p className="text-sm text-gray-400">
                                                {tx.taskId ? `Task #${tx.taskId}` : ''}
                                                {tx.worker && ` • ${formatAddress(tx.worker)}`}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={`font-mono font-bold ${tx.type === 'deposit' ? 'text-green-400' :
                                            tx.type === 'payment' ? 'text-red-400' : 'text-yellow-400'
                                            }`}>
                                            {tx.type === 'deposit' ? '+' : tx.type === 'payment' ? '-' : '⏸'}
                                            {tx.amount.toFixed(4)} MON
                                        </p>
                                        <p className="text-xs text-gray-500 font-mono">
                                            {tx.txHash.slice(0, 10)}...
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <Wallet className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                            <p className="text-gray-400">No transactions yet</p>
                            <p className="text-sm text-gray-500 mt-2">
                                Transactions will appear here when tasks are created and completed
                            </p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
