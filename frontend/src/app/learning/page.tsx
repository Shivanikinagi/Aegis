'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import StatCard, { ProgressBar, Badge } from '@/components/StatCard';
import { LearningProgressChart, SuccessRateChart } from '@/components/Charts';
import { formatPercent } from '@/lib/hooks';
import {
    Brain,
    TrendingUp,
    Target,
    Cpu,
    Lightbulb,
    BarChart3
} from 'lucide-react';

// Demo learning data
const learningData = {
    stats: {
        decisionsMade: 247,
        successfulDecisions: 193,
        successRate: 0.78,
        explorationRate: 0.15,
        banditPulls: 312,
        paymentModels: 5
    },
    progress: [
        { cycle: 0, successRate: 0.5, explorationRate: 0.3 },
        { cycle: 25, successRate: 0.52, explorationRate: 0.28 },
        { cycle: 50, successRate: 0.58, explorationRate: 0.26 },
        { cycle: 75, successRate: 0.63, explorationRate: 0.24 },
        { cycle: 100, successRate: 0.68, explorationRate: 0.22 },
        { cycle: 125, successRate: 0.71, explorationRate: 0.20 },
        { cycle: 150, successRate: 0.74, explorationRate: 0.18 },
        { cycle: 175, successRate: 0.76, explorationRate: 0.17 },
        { cycle: 200, successRate: 0.77, explorationRate: 0.16 },
        { cycle: 225, successRate: 0.78, explorationRate: 0.15 },
    ],
    workerScores: [
        { worker: '0xabcd...1234', score: 0.92, pulls: 45, avgReward: 0.85 },
        { worker: '0x5678...efgh', score: 0.78, pulls: 32, avgReward: 0.72 },
        { worker: '0x9999...1111', score: 0.65, pulls: 28, avgReward: 0.58 },
        { worker: '0xaaaa...bbbb', score: 0.55, pulls: 12, avgReward: 0.45 },
    ],
    recentDecisions: [
        { taskId: 47, worker: '0xabcd...1234', payment: 1.5, confidence: 0.92, outcome: 'success' },
        { taskId: 46, worker: '0x5678...efgh', payment: 2.2, confidence: 0.78, outcome: 'success' },
        { taskId: 45, worker: '0x9999...1111', payment: 1.8, confidence: 0.65, outcome: 'failed' },
        { taskId: 44, worker: '0xabcd...1234', payment: 2.0, confidence: 0.88, outcome: 'success' },
        { taskId: 43, worker: '0x5678...efgh', payment: 1.3, confidence: 0.72, outcome: 'success' },
    ]
};

export default function LearningPage() {
    return (
        <div className="flex min-h-screen bg-[#0a0a0f]">
            <Sidebar />

            <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Learning System</h1>
                    <p className="text-gray-400">
                        Monitor agent learning progress and decision-making optimization
                    </p>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <StatCard
                        title="Success Rate"
                        value={formatPercent(learningData.stats.successRate)}
                        icon={Target}
                        accentColor="green"
                        trend="up"
                        trendValue="+28% since start"
                    />
                    <StatCard
                        title="Exploration Rate"
                        value={formatPercent(learningData.stats.explorationRate)}
                        subtitle="Decreasing over time"
                        icon={Lightbulb}
                        accentColor="blue"
                    />
                    <StatCard
                        title="Decisions Made"
                        value={learningData.stats.decisionsMade}
                        subtitle={`${learningData.stats.successfulDecisions} successful`}
                        icon={Brain}
                        accentColor="purple"
                    />
                    <StatCard
                        title="Bandit Pulls"
                        value={learningData.stats.banditPulls}
                        subtitle={`${learningData.stats.paymentModels} payment models`}
                        icon={Cpu}
                        accentColor="yellow"
                    />
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    <LearningProgressChart data={learningData.progress} />
                    <SuccessRateChart
                        successful={learningData.stats.successfulDecisions}
                        failed={learningData.stats.decisionsMade - learningData.stats.successfulDecisions}
                    />
                </div>

                {/* Algorithm Details */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* UCB1 Worker Scores */}
                    <div className="glass-card p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                                <BarChart3 className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-white">UCB1 Worker Scores</h2>
                                <p className="text-sm text-gray-400">Multi-Armed Bandit algorithm</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {learningData.workerScores.map((worker, index) => (
                                <div key={index} className="p-4 bg-[#1e1e2e] rounded-xl">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-mono text-sm text-gray-300">{worker.worker}</span>
                                        <span className="text-purple-400 font-semibold">{(worker.score * 100).toFixed(1)}</span>
                                    </div>
                                    <ProgressBar
                                        value={worker.score * 100}
                                        max={100}
                                        showPercentage={false}
                                        color={worker.score >= 0.8 ? 'green' : worker.score >= 0.6 ? 'yellow' : 'red'}
                                    />
                                    <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                                        <span>{worker.pulls} pulls</span>
                                        <span>Avg reward: {worker.avgReward.toFixed(2)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-6 p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl">
                            <p className="text-sm text-gray-400">
                                <span className="text-purple-400 font-medium">UCB1 Formula:</span> score = average_reward + c × √(ln(n) / n_i)
                            </p>
                            <p className="text-xs text-gray-500 mt-2">
                                Balances exploitation (known good workers) with exploration (trying uncertain workers)
                            </p>
                        </div>
                    </div>

                    {/* Recent Decisions */}
                    <div className="glass-card p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-semibold text-white">Recent Decisions</h2>
                            <Badge variant="info">Live</Badge>
                        </div>

                        <div className="space-y-4">
                            {learningData.recentDecisions.map((decision, index) => (
                                <div key={index} className="flex items-center justify-between p-4 bg-[#1e1e2e] rounded-xl">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${decision.outcome === 'success'
                                            ? 'bg-green-500/20 text-green-400'
                                            : 'bg-red-500/20 text-red-400'
                                            }`}>
                                            {decision.outcome === 'success' ? '✓' : '✗'}
                                        </div>
                                        <div>
                                            <p className="text-white font-medium">Task #{decision.taskId}</p>
                                            <p className="text-xs text-gray-500">Worker: {decision.worker}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-white font-mono">{decision.payment} MON</p>
                                        <p className="text-xs text-gray-500">
                                            Confidence: {formatPercent(decision.confidence)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Learning Explanation */}
                <div className="mt-8 glass-card p-6">
                    <h2 className="text-lg font-semibold text-white mb-4">How the Agent Learns</h2>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        {[
                            { step: '1', title: 'Observe', description: 'Read task type, budget, and historical outcomes', icon: '👁️' },
                            { step: '2', title: 'Decide', description: 'Select worker using UCB1 bandit algorithm', icon: '🧠' },
                            { step: '3', title: 'Propose', description: 'Submit payment proposal to contract', icon: '📝' },
                            { step: '4', title: 'Outcome', description: 'Contract approves/rejects, worker succeeds/fails', icon: '⚖️' },
                            { step: '5', title: 'Learn', description: 'Update scores based on reward signal', icon: '📈' },
                        ].map((item) => (
                            <div key={item.step} className="text-center p-4">
                                <div className="text-3xl mb-3">{item.icon}</div>
                                <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
                                    {item.step}
                                </div>
                                <h3 className="font-semibold text-white mb-1">{item.title}</h3>
                                <p className="text-xs text-gray-400">{item.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}
