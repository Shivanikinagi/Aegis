'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import StatCard, { ProgressBar, Badge } from '@/components/StatCard';
import { SpendingChart, SuccessRateChart, WorkerPerformanceChart } from '@/components/Charts';
import { formatMON, formatPercent } from '@/lib/hooks';
import {
    BarChart3,
    TrendingUp,
    DollarSign,
    Target,
    Users,
    Zap,
    Clock,
    Award
} from 'lucide-react';

// Demo metrics data
const metricsData = {
    overview: {
        totalTasks: 247,
        completedTasks: 198,
        totalSpent: 456.78,
        totalValueDelivered: 892.34,
        roi: 95.3,
        avgCostPerSuccess: 2.31,
        avgCompletionTime: 1847, // seconds
    },
    tasksByType: [
        { type: 'DATA_ANALYSIS', count: 78, success: 65, spent: 145.2 },
        { type: 'TEXT_GENERATION', count: 52, success: 48, spent: 98.5 },
        { type: 'CODE_REVIEW', count: 45, success: 38, spent: 112.3 },
        { type: 'RESEARCH', count: 38, success: 28, spent: 62.8 },
        { type: 'COMPUTATION', count: 22, success: 12, spent: 28.4 },
        { type: 'OTHER', count: 12, success: 7, spent: 9.6 },
    ],
    workerPerformance: [
        { worker: '0xabcd...1234', tasks: 67, success: 58, reliability: 92 },
        { worker: '0x5678...efgh', tasks: 45, success: 38, reliability: 84 },
        { worker: '0x9999...1111', tasks: 32, success: 25, reliability: 72 },
        { worker: '0xaaaa...bbbb', tasks: 18, success: 12, reliability: 58 },
    ],
    dailyStats: [
        { name: 'Mon', spent: 42, success: 35, tasks: 28 },
        { name: 'Tue', spent: 58, success: 45, tasks: 32 },
        { name: 'Wed', spent: 52, success: 42, tasks: 30 },
        { name: 'Thu', spent: 68, success: 52, tasks: 38 },
        { name: 'Fri', spent: 72, success: 58, tasks: 42 },
        { name: 'Sat', spent: 48, success: 38, tasks: 28 },
        { name: 'Sun', spent: 62, success: 48, tasks: 35 },
    ],
    hourlyDistribution: [
        { hour: '00', tasks: 12 },
        { hour: '04', tasks: 8 },
        { hour: '08', tasks: 28 },
        { hour: '12', tasks: 42 },
        { hour: '16', tasks: 38 },
        { hour: '20', tasks: 25 },
    ],
};

export default function MetricsPage() {
    const completionRate = metricsData.overview.completedTasks / metricsData.overview.totalTasks;

    return (
        <div className="flex min-h-screen bg-[#0a0a0f]">
            <Sidebar />

            <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Metrics</h1>
                    <p className="text-gray-400">
                        Comprehensive analytics and performance insights
                    </p>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <StatCard
                        title="Total Tasks"
                        value={metricsData.overview.totalTasks}
                        subtitle={`${metricsData.overview.completedTasks} completed`}
                        icon={Zap}
                        accentColor="purple"
                    >
                        <div className="mt-4">
                            <ProgressBar
                                value={metricsData.overview.completedTasks}
                                max={metricsData.overview.totalTasks}
                                label="Completion rate"
                                color="purple"
                            />
                        </div>
                    </StatCard>

                    <StatCard
                        title="Total Spent"
                        value={formatMON(metricsData.overview.totalSpent, 2)}
                        icon={DollarSign}
                        accentColor="blue"
                        trend="up"
                        trendValue="+18% this week"
                    />

                    <StatCard
                        title="ROI"
                        value={`${metricsData.overview.roi.toFixed(1)}%`}
                        subtitle="Return on investment"
                        icon={TrendingUp}
                        accentColor="green"
                        trend="up"
                        trendValue="Value/Cost ratio"
                    />

                    <StatCard
                        title="Avg Cost/Success"
                        value={formatMON(metricsData.overview.avgCostPerSuccess, 2)}
                        subtitle="Per successful task"
                        icon={Target}
                        accentColor="yellow"
                    />
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    <SpendingChart data={metricsData.dailyStats} />
                    <SuccessRateChart
                        successful={metricsData.overview.completedTasks}
                        failed={metricsData.overview.totalTasks - metricsData.overview.completedTasks}
                    />
                </div>

                {/* Task Types Breakdown */}
                <div className="glass-card p-6 mb-8">
                    <h2 className="text-lg font-semibold text-white mb-6">Performance by Task Type</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-[#27272a]">
                                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Task Type</th>
                                    <th className="text-center py-3 px-4 text-gray-400 font-medium">Total</th>
                                    <th className="text-center py-3 px-4 text-gray-400 font-medium">Success</th>
                                    <th className="text-center py-3 px-4 text-gray-400 font-medium">Rate</th>
                                    <th className="text-right py-3 px-4 text-gray-400 font-medium">Spent</th>
                                    <th className="text-left py-3 px-4 text-gray-400 font-medium w-48">Distribution</th>
                                </tr>
                            </thead>
                            <tbody>
                                {metricsData.tasksByType.map((type) => {
                                    const successRate = type.count > 0 ? (type.success / type.count) * 100 : 0;
                                    const proportion = (type.count / metricsData.overview.totalTasks) * 100;
                                    return (
                                        <tr key={type.type} className="border-b border-[#27272a] hover:bg-[#1e1e2e] transition-colors">
                                            <td className="py-4 px-4">
                                                <span className="text-white font-medium">{type.type.replace('_', ' ')}</span>
                                            </td>
                                            <td className="py-4 px-4 text-center text-gray-300">{type.count}</td>
                                            <td className="py-4 px-4 text-center text-green-400">{type.success}</td>
                                            <td className="py-4 px-4 text-center">
                                                <Badge variant={successRate >= 80 ? 'success' : successRate >= 60 ? 'warning' : 'error'}>
                                                    {successRate.toFixed(0)}%
                                                </Badge>
                                            </td>
                                            <td className="py-4 px-4 text-right text-gray-300 font-mono">{type.spent.toFixed(2)} MON</td>
                                            <td className="py-4 px-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1">
                                                        <ProgressBar
                                                            value={proportion}
                                                            max={100}
                                                            showPercentage={false}
                                                            color="purple"
                                                        />
                                                    </div>
                                                    <span className="text-xs text-gray-500 w-10">{proportion.toFixed(0)}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Bottom Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Worker Performance */}
                    <WorkerPerformanceChart data={metricsData.workerPerformance} />

                    {/* Summary Stats */}
                    <div className="glass-card p-6">
                        <h2 className="text-lg font-semibold text-white mb-6">Performance Summary</h2>

                        <div className="space-y-6">
                            <div className="flex items-center justify-between p-4 bg-[#1e1e2e] rounded-xl">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                                        <Award className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-white font-medium">Value Delivered</p>
                                        <p className="text-sm text-gray-400">Total value from completed tasks</p>
                                    </div>
                                </div>
                                <p className="text-2xl font-bold text-green-400">{formatMON(metricsData.overview.totalValueDelivered, 2)}</p>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-[#1e1e2e] rounded-xl">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
                                        <Clock className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-white font-medium">Avg Completion Time</p>
                                        <p className="text-sm text-gray-400">From assignment to completion</p>
                                    </div>
                                </div>
                                <p className="text-2xl font-bold text-blue-400">
                                    {Math.floor(metricsData.overview.avgCompletionTime / 60)}m {metricsData.overview.avgCompletionTime % 60}s
                                </p>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-[#1e1e2e] rounded-xl">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center">
                                        <Users className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-white font-medium">Active Workers</p>
                                        <p className="text-sm text-gray-400">In the last 24 hours</p>
                                    </div>
                                </div>
                                <p className="text-2xl font-bold text-yellow-400">{metricsData.workerPerformance.length}</p>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-[#1e1e2e] rounded-xl">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                                        <TrendingUp className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-white font-medium">Net Efficiency</p>
                                        <p className="text-sm text-gray-400">Value / Cost ratio</p>
                                    </div>
                                </div>
                                <p className="text-2xl font-bold text-purple-400">
                                    {(metricsData.overview.totalValueDelivered / metricsData.overview.totalSpent).toFixed(2)}x
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
