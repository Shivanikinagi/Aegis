import { useQuery } from '@tanstack/react-query';
import {
    Brain,
    User,
    Wallet,
    TrendingUp,
    Star,
    Clock,
    CheckCircle,
    AlertCircle,
    Zap,
    Target,
    MessageSquare,
    ArrowRight,
    RefreshCw
} from 'lucide-react';

// Fetch functions
const fetchTasks = async () => {
    const res = await fetch('http://localhost:8000/api/tasks');
    return res.json();
};

const fetchWorkers = async () => {
    const res = await fetch('http://localhost:8000/api/workers');
    return res.json();
};

// Mock reasoning data for demonstration
const generateReasoning = (task: any, workerStats: any) => {
    const reasons = [];

    if (workerStats?.successRate > 0.8) {
        reasons.push({
            icon: Star,
            text: `High success rate (${(workerStats.successRate * 100).toFixed(0)}%)`,
            weight: 'High',
            color: 'green'
        });
    } else if (workerStats?.successRate > 0.5) {
        reasons.push({
            icon: TrendingUp,
            text: `Improving performance (${(workerStats.successRate * 100).toFixed(0)}%)`,
            weight: 'Medium',
            color: 'yellow'
        });
    }

    if (workerStats?.avgCompletionTime < 60) {
        reasons.push({
            icon: Clock,
            text: 'Fast task completion history',
            weight: 'Medium',
            color: 'blue'
        });
    }

    if (workerStats?.totalTasks > 10) {
        reasons.push({
            icon: Target,
            text: `Experienced worker (${workerStats.totalTasks} tasks)`,
            weight: 'High',
            color: 'purple'
        });
    }

    reasons.push({
        icon: Wallet,
        text: `Optimal payment within budget (${task.maxPayment?.toFixed(2) || '1.00'} MON max)`,
        weight: 'High',
        color: 'green'
    });

    return reasons;
};

// Decision Card Component
function DecisionCard({ task, workers }: { task: any; workers: any[] }) {
    const assignedWorker = workers.find(w => w.address === task.assignedWorker);
    const workerStats = {
        successRate: assignedWorker?.reputation ? assignedWorker.reputation / 100 : 0.75,
        avgCompletionTime: 45,
        totalTasks: assignedWorker?.completedTasks || 12
    };

    const reasons = generateReasoning(task, workerStats);

    const statusColors: Record<string, string> = {
        COMPLETED: 'badge-green',
        FAILED: 'badge-red',
        ASSIGNED: 'badge-blue',
        CREATED: 'badge-yellow',
    };

    return (
        <div className="glass-card overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-white/10 bg-white/5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                            <Zap className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-white">Task #{task.id}</h3>
                            <p className="text-xs text-gray-400">{task.taskType?.replace('_', ' ') || 'General Task'}</p>
                        </div>
                    </div>
                    <span className={`badge ${statusColors[task.status] || 'badge-purple'}`}>
                        {task.status}
                    </span>
                </div>
            </div>

            {/* Decision Details */}
            <div className="p-4 space-y-4">
                {/* Worker Assignment */}
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center gap-3">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-400">Assigned Worker</span>
                    </div>
                    <span className="text-sm text-purple-400 font-mono">
                        {task.assignedWorker
                            ? `${task.assignedWorker.slice(0, 6)}...${task.assignedWorker.slice(-4)}`
                            : 'Pending Assignment'
                        }
                    </span>
                </div>

                {/* Payment Proposal */}
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center gap-3">
                        <Wallet className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-400">Proposed Payment</span>
                    </div>
                    <span className="text-sm text-green-400 font-semibold">
                        {task.actualPayment > 0
                            ? `${task.actualPayment.toFixed(4)} MON`
                            : `Max: ${task.maxPayment?.toFixed(4) || '1.0000'} MON`
                        }
                    </span>
                </div>

                {/* AI Reasoning Section - MOST IMPORTANT */}
                <div className="mt-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Brain className="w-4 h-4 text-purple-400" />
                        <span className="text-sm font-medium text-white">Agent Reasoning</span>
                    </div>
                    <div className="space-y-2">
                        {reasons.map((reason, idx) => {
                            const Icon = reason.icon;
                            const colorClasses: Record<string, string> = {
                                green: 'text-green-400 bg-green-500/10',
                                blue: 'text-blue-400 bg-blue-500/10',
                                yellow: 'text-yellow-400 bg-yellow-500/10',
                                purple: 'text-purple-400 bg-purple-500/10',
                            };

                            return (
                                <div key={idx} className="flex items-center gap-3 p-2.5 bg-white/5 rounded-lg">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorClasses[reason.color]}`}>
                                        <Icon className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm text-gray-300">{reason.text}</p>
                                    </div>
                                    <span className={`text-xs px-2 py-0.5 rounded ${reason.weight === 'High' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                                        }`}>
                                        {reason.weight}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function Decisions() {
    const { data: tasksData, isLoading: tasksLoading, refetch } = useQuery({
        queryKey: ['tasks'],
        queryFn: fetchTasks,
    });

    const { data: workersData, isLoading: workersLoading } = useQuery({
        queryKey: ['workers'],
        queryFn: fetchWorkers,
    });

    const tasks = tasksData?.tasks || [];
    const workers = workersData?.workers || [];

    // Show tasks with decisions (assigned or completed)
    const tasksWithDecisions = tasks.filter((t: any) =>
        t.status === 'ASSIGNED' || t.status === 'COMPLETED' || t.status === 'FAILED'
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white mb-1">Agent Decisions</h1>
                    <p className="text-gray-400 text-sm">
                        Understand the reasoning behind each task assignment and payment decision
                    </p>
                </div>
                <button onClick={() => refetch()} className="btn-secondary">
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                </button>
            </div>

            {/* Explanation Banner */}
            <div className="glass-card p-4 border-l-4 border-purple-500">
                <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                        <MessageSquare className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                        <h3 className="text-white font-medium mb-1">Transparent Decision Making</h3>
                        <p className="text-sm text-gray-400">
                            For each task, the AI agent evaluates worker performance, historical success rates,
                            and cost efficiency to make optimal assignments. All decisions are logged and explainable.
                        </p>
                    </div>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="glass-card p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                            <Brain className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-white">{tasksWithDecisions.length}</p>
                            <p className="text-xs text-gray-400">Total Decisions</p>
                        </div>
                    </div>
                </div>
                <div className="glass-card p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                            <CheckCircle className="w-5 h-5 text-green-400" />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-white">
                                {tasks.filter((t: any) => t.status === 'COMPLETED').length}
                            </p>
                            <p className="text-xs text-gray-400">Successful</p>
                        </div>
                    </div>
                </div>
                <div className="glass-card p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-white">78%</p>
                            <p className="text-xs text-gray-400">Accuracy</p>
                        </div>
                    </div>
                </div>
                <div className="glass-card p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                            <Wallet className="w-5 h-5 text-yellow-400" />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-white">1.4 MON</p>
                            <p className="text-xs text-gray-400">Avg Payment</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Decision Cards Grid */}
            {tasksLoading ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="glass-card p-6">
                            <div className="skeleton h-6 w-32 mb-4" />
                            <div className="skeleton h-4 w-full mb-2" />
                            <div className="skeleton h-4 w-3/4 mb-4" />
                            <div className="skeleton h-20 w-full" />
                        </div>
                    ))}
                </div>
            ) : tasksWithDecisions.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {tasksWithDecisions.map((task: any) => (
                        <DecisionCard key={task.id} task={task} workers={workers} />
                    ))}
                </div>
            ) : (
                <div className="glass-card p-12 text-center">
                    <Brain className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">No Decisions Yet</h3>
                    <p className="text-gray-400 max-w-md mx-auto">
                        Create tasks to see how the AI agent makes intelligent decisions about
                        worker assignments and payment proposals.
                    </p>
                </div>
            )}
        </div>
    );
}
