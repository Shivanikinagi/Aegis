'use client';

import { Worker } from '@/lib/api';
import { formatAddress, formatMON, formatPercent } from '@/lib/hooks';
import { ProgressBar } from './StatCard';
import { User, Award, Zap, TrendingUp } from 'lucide-react';

interface WorkerCardProps {
    worker: Worker;
    onClick?: () => void;
    rank?: number;
}

export default function WorkerCard({ worker, onClick, rank }: WorkerCardProps) {
    const successRate = worker.totalTasks > 0
        ? worker.successfulTasks / worker.totalTasks
        : 0;

    const getRankBadge = (rank: number) => {
        if (rank === 1) return '🥇';
        if (rank === 2) return '🥈';
        if (rank === 3) return '🥉';
        return `#${rank}`;
    };

    return (
        <div
            className="glass-card p-5 cursor-pointer group hover:scale-[1.02] transition-all duration-300"
            onClick={onClick}
        >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                        <User className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h3 className="font-mono text-white font-medium">
                            {formatAddress(worker.address)}
                        </h3>
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${worker.isActive ? 'bg-green-500' : 'bg-gray-500'}`} />
                            <span className="text-xs text-gray-400">
                                {worker.isActive ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                    </div>
                </div>
                {rank && (
                    <div className="text-2xl">
                        {getRankBadge(rank)}
                    </div>
                )}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-[#1e1e2e] rounded-lg p-3">
                    <div className="flex items-center gap-2 text-gray-400 mb-1">
                        <Zap className="w-3 h-3" />
                        <span className="text-xs">Tasks</span>
                    </div>
                    <p className="text-lg font-bold text-white">{worker.totalTasks}</p>
                </div>
                <div className="bg-[#1e1e2e] rounded-lg p-3">
                    <div className="flex items-center gap-2 text-gray-400 mb-1">
                        <Award className="w-3 h-3" />
                        <span className="text-xs">Earnings</span>
                    </div>
                    <p className="text-lg font-bold text-green-400">{formatMON(worker.totalEarnings, 2)}</p>
                </div>
            </div>

            {/* Reliability Score */}
            <div className="mb-3">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">Reliability</span>
                    <span className="text-sm font-medium text-purple-400">{worker.reliabilityScore.toFixed(1)}%</span>
                </div>
                <ProgressBar
                    value={worker.reliabilityScore}
                    max={100}
                    showPercentage={false}
                    color={worker.reliabilityScore >= 70 ? 'green' : worker.reliabilityScore >= 40 ? 'yellow' : 'red'}
                />
            </div>

            {/* Success Rate */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">Success Rate</span>
                    <span className="text-sm font-medium text-blue-400">{formatPercent(successRate)}</span>
                </div>
                <ProgressBar
                    value={successRate * 100}
                    max={100}
                    showPercentage={false}
                    color="blue"
                />
            </div>

            {/* Task Types */}
            {worker.allowedTaskTypes && worker.allowedTaskTypes.length > 0 && (
                <div className="mt-4 pt-4 border-t border-[#27272a]">
                    <p className="text-xs text-gray-500 mb-2">Allowed Task Types</p>
                    <div className="flex flex-wrap gap-2">
                        {worker.allowedTaskTypes.map((type) => (
                            <span
                                key={type}
                                className="px-2 py-1 bg-purple-500/10 text-purple-400 text-xs rounded-md"
                            >
                                Type {type}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

interface WorkerLeaderboardProps {
    workers: Worker[];
    limit?: number;
}

export function WorkerLeaderboard({ workers, limit = 5 }: WorkerLeaderboardProps) {
    const sortedWorkers = [...workers]
        .sort((a, b) => b.reliabilityScore - a.reliabilityScore)
        .slice(0, limit);

    return (
        <div className="space-y-3">
            {sortedWorkers.map((worker, index) => (
                <div
                    key={worker.address}
                    className="flex items-center gap-4 p-3 bg-[#1e1e2e] rounded-lg hover:bg-[#27272a] transition-colors"
                >
                    <div className="w-8 h-8 flex items-center justify-center">
                        {index === 0 && '🥇'}
                        {index === 1 && '🥈'}
                        {index === 2 && '🥉'}
                        {index > 2 && (
                            <span className="text-gray-500 font-medium">#{index + 1}</span>
                        )}
                    </div>
                    <div className="flex-1">
                        <p className="font-mono text-sm text-white">{formatAddress(worker.address)}</p>
                        <p className="text-xs text-gray-500">{worker.totalTasks} tasks</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-medium text-purple-400">{worker.reliabilityScore.toFixed(1)}%</p>
                        <p className="text-xs text-green-400">{formatMON(worker.totalEarnings, 2)}</p>
                    </div>
                </div>
            ))}
        </div>
    );
}
