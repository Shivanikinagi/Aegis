'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { ProgressBar, Badge } from '@/components/StatCard';
import { formatMON, formatAddress } from '@/lib/hooks';
import { getWorkers } from '@/lib/blockchain';
import {
    Users,
    Award,
    TrendingUp,
    RefreshCw,
    CheckCircle,
    XCircle
} from 'lucide-react';

interface Worker {
    address: string;
    isActive: boolean;
    registeredAt: number;
    totalTasks: number;
    successfulTasks: number;
    totalEarnings: number;
    reliabilityScore: number;
    allowedTaskTypes: number[];
}

const taskTypeNames = ['Data Analysis', 'Text Generation', 'Code Review', 'Research', 'Computation', 'Other'];

export default function WorkersPage() {
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const fetchWorkers = async () => {
        setIsRefreshing(true);
        try {
            const data = await getWorkers();
            if (data) {
                setWorkers(data.workers);
            }
        } catch (error) {
            console.error('Error fetching workers:', error);
        } finally {
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchWorkers();
        const interval = setInterval(fetchWorkers, 10000);
        return () => clearInterval(interval);
    }, []);

    const activeWorkers = workers.filter(w => w.isActive);
    const totalEarnings = workers.reduce((sum, w) => sum + w.totalEarnings, 0);
    const avgReliability = workers.length > 0
        ? workers.reduce((sum, w) => sum + w.reliabilityScore, 0) / workers.length
        : 0;

    return (
        <div className="flex min-h-screen bg-[#0a0a0f]">
            <Sidebar />

            <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">Workers</h1>
                        <p className="text-gray-400">
                            Real-time worker data from WorkerRegistry contract
                        </p>
                    </div>
                    <button
                        onClick={fetchWorkers}
                        className={`btn-secondary flex items-center gap-2 ${isRefreshing ? 'opacity-50' : ''}`}
                        disabled={isRefreshing}
                    >
                        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-6 mb-8">
                    <div className="glass-card p-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                                <Users className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-white">{workers.length}</p>
                                <p className="text-sm text-gray-400">Total Workers</p>
                            </div>
                        </div>
                    </div>

                    <div className="glass-card p-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                                <CheckCircle className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-white">{activeWorkers.length}</p>
                                <p className="text-sm text-gray-400">Active</p>
                            </div>
                        </div>
                    </div>

                    <div className="glass-card p-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center">
                                <Award className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-white">{formatMON(totalEarnings, 2)}</p>
                                <p className="text-sm text-gray-400">Total Paid</p>
                            </div>
                        </div>
                    </div>

                    <div className="glass-card p-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
                                <TrendingUp className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-white">{avgReliability.toFixed(0)}%</p>
                                <p className="text-sm text-gray-400">Avg Reliability</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Worker List */}
                {workers.length > 0 ? (
                    <div className="space-y-4">
                        {workers.map((worker, index) => {
                            const successRate = worker.totalTasks > 0
                                ? worker.successfulTasks / worker.totalTasks
                                : 0;

                            return (
                                <div key={worker.address} className="glass-card p-6">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-4">
                                            {/* Rank */}
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-white' :
                                                index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-white' :
                                                    index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-white' :
                                                        'bg-[#27272a] text-gray-400'
                                                }`}>
                                                {index + 1}
                                            </div>

                                            <div>
                                                <div className="flex items-center gap-3">
                                                    <p className="text-white font-mono text-lg">{formatAddress(worker.address)}</p>
                                                    <Badge variant={worker.isActive ? 'success' : 'error'}>
                                                        {worker.isActive ? 'Active' : 'Inactive'}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-4 mt-2">
                                                    <span className="text-sm text-gray-400">
                                                        {worker.totalTasks} tasks • {worker.successfulTasks} successful
                                                    </span>
                                                    <span className="text-sm text-green-400">
                                                        {formatMON(worker.totalEarnings, 4)} earned
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            <p className="text-2xl font-bold text-white">
                                                {worker.reliabilityScore.toFixed(0)}%
                                            </p>
                                            <p className="text-sm text-gray-400">Reliability</p>
                                        </div>
                                    </div>

                                    <div className="mt-4 grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm text-gray-400 mb-2">Success Rate</p>
                                            <ProgressBar
                                                value={successRate * 100}
                                                max={100}
                                                color="green"
                                            />
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-400 mb-2">Task Types</p>
                                            <div className="flex flex-wrap gap-2">
                                                {worker.allowedTaskTypes.map((type) => (
                                                    <span
                                                        key={type}
                                                        className="px-2 py-1 bg-[#27272a] rounded text-xs text-gray-300"
                                                    >
                                                        {taskTypeNames[type] || `Type ${type}`}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="glass-card p-12 text-center">
                        <Users className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                        <p className="text-gray-400">No workers registered yet</p>
                        <p className="text-sm text-gray-500 mt-2">
                            Run the setup script to register demo workers
                        </p>
                        <code className="block mt-4 text-sm text-purple-400 bg-[#1e1e2e] px-4 py-2 rounded-lg">
                            npx hardhat run scripts/setup_demo.js --network localhost
                        </code>
                    </div>
                )
                }
            </main >
        </div >
    );
}
