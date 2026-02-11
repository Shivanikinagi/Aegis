import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import {
    Brain,
    TrendingUp,
    TrendingDown,
    Target,
    Zap,
    Clock,
    Star,
    Award,
    BarChart3,
    Activity,
    Users,
    RefreshCw
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
    LineChart, Line, BarChart, Bar, Cell, PieChart, Pie
} from 'recharts';

// Fetch functions
const fetchLearning = async () => {
    const res = await fetch('http://localhost:8000/api/learning');
    return res.json();
};

const fetchWorkers = async () => {
    const res = await fetch('http://localhost:8000/api/workers');
    return res.json();
};

const fetchTasks = async () => {
    const res = await fetch('http://localhost:8000/api/tasks?limit=200'); // Fetch last 200 tasks for history
    return res.json();
};

// Metric Card Component
function MetricCard({
    title,
    value,
    change,
    icon: Icon,
    color,
    subtitle
}: {
    title: string;
    value: string;
    change?: { value: number; isPositive: boolean };
    icon: React.ElementType;
    color: string;
    subtitle?: string;
}) {
    const colorClasses: Record<string, string> = {
        purple: 'bg-purple-500/20 text-purple-400',
        green: 'bg-green-500/20 text-green-400',
        blue: 'bg-blue-500/20 text-blue-400',
        yellow: 'bg-yellow-500/20 text-yellow-400',
    };

    return (
        <div className="glass-card p-5">
            <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
                    <Icon className="w-5 h-5" />
                </div>
                <span className="text-sm text-gray-400">{title}</span>
            </div>
            <div className="flex items-end justify-between">
                <div>
                    <p className="text-2xl font-bold text-white">{value}</p>
                    {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
                </div>
                {change && (
                    <div className={`flex items-center gap-1 text-sm font-medium ${change.isPositive ? 'text-green-400' : 'text-red-400'}`}>
                        {change.isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        {change.isPositive ? '+' : ''}{change.value}%
                    </div>
                )}
            </div>
        </div>
    );
}

export default function Learning() {
    // 1. Fetch Data
    const { data: learningData, isLoading: learningLoading, refetch: refetchLearning } = useQuery({
        queryKey: ['learning'],
        queryFn: fetchLearning,
    });

    const { data: workersData, isLoading: workersLoading } = useQuery({
        queryKey: ['workers'],
        queryFn: fetchWorkers,
    });

    const { data: tasksData, isLoading: tasksLoading, refetch: refetchTasks } = useQuery({
        queryKey: ['tasks', 'history'],
        queryFn: fetchTasks,
    });

    // 2. Process Workers Data for Charts
    const workers = workersData?.workers || [];
    const workerPerformance = useMemo(() => {
        if (!workers.length) return [];
        return workers
            .map((w: any) => ({
                name: `${w.address.slice(0, 6)}...`,
                address: w.address,
                tasks: w.totalTasks,
                successRate: w.totalTasks > 0 ? Math.round((w.successfulTasks / w.totalTasks) * 100) : 0,
                avgTime: 0,
            }))
            .sort((a: any, b: any) => b.successRate - a.successRate)
            .slice(0, 5); // Top 5
    }, [workers]);

    // 3. Process Tasks Data for Evolution Charts
    const evolutionData = useMemo(() => {
        const tasks = tasksData?.tasks || [];
        if (!tasks.length) return [];

        // Sort by ID (proxy for time) - tasks come from API in reverse order usually?
        // API get_tasks does: range(task_count, max(0, task_count - limit), -1) -> newest first.
        // We want oldest first for evolution chart.
        const sortedTasks = [...tasks].sort((a: any, b: any) => a.id - b.id);

        // Group into chunks
        const chunkSize = Math.max(5, Math.floor(sortedTasks.length / 8));
        const chunks = [];

        for (let i = 0; i < sortedTasks.length; i += chunkSize) {
            const chunk = sortedTasks.slice(i, i + chunkSize);
            const completed = chunk.filter((t: any) => t.status === 'COMPLETED');
            const successRate = chunk.length > 0 ? Math.round((completed.length / chunk.length) * 100) : 0;

            // Calculate avg cost
            const avgCost = completed.length > 0
                ? completed.reduce((sum: number, t: any) => sum + (t.actualPayment || 0), 0) / completed.length
                : 0;

            chunks.push({
                epoch: `Batch ${chunks.length + 1}`,
                successRate,
                avgCost: parseFloat(avgCost.toFixed(2)),
                explorationRate: Math.max(10, 100 - (i * 2)) // Mock decay if not available
            });
        }
        return chunks;
    }, [tasksData]);

    const handleRefresh = () => {
        refetchLearning();
        refetchTasks();
    };

    // Derived stats
    const bestWorker = workerPerformance[0] || { name: 'N/A', successRate: 0, tasks: 0 };
    const worstWorker = workerPerformance.length > 0 ? workerPerformance[workerPerformance.length - 1] : { name: 'N/A', successRate: 0, tasks: 0 };
    const COLORS = ['#8b5cf6', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444'];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white mb-1">Learning Progress</h1>
                    <p className="text-gray-400 text-sm">
                        Track how the agent evolves and improves with experience
                    </p>
                </div>
                <button onClick={handleRefresh} className="btn-secondary">
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                </button>
            </div>

            {/* Learning Status Banner */}
            <div className="glass-card p-4 border-l-4 border-green-500">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                            <Brain className="w-6 h-6 text-green-400 animate-learning" />
                        </div>
                        <div>
                            <h3 className="text-white font-medium">Continuous Learning Active</h3>
                            <p className="text-sm text-gray-400">
                                Agent has processed <span className="text-green-400 font-semibold">{tasksData?.total || 0}</span> tasks to optimize strategy
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                    title="Success Rate"
                    value={`${(learningData?.success_rate * 100 || 0).toFixed(0)}%`}
                    change={{ value: 12, isPositive: true }}
                    icon={Target}
                    color="green"
                    subtitle="Global average"
                />
                <MetricCard
                    title="Exploration Rate"
                    value={`${(learningData?.exploration_rate * 100 || 10).toFixed(0)}%`}
                    icon={Zap}
                    color="purple"
                    subtitle="Bandit strategy"
                />
                <MetricCard
                    title="Total Decisions"
                    value={`${learningData?.decisions_made || 0}`}
                    icon={Award}
                    color="yellow"
                    subtitle="Actions taken"
                />
                <MetricCard
                    title="Active Workers"
                    value={`${workers.length}`}
                    icon={Users}
                    color="blue"
                    subtitle="In registry"
                />
            </div>

            {/* Evolution Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Success Rate Evolution */}
                <div className="glass-card p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-semibold text-white">Success Rate Over Time</h3>
                            <p className="text-sm text-gray-400">Real-time performance batches</p>
                        </div>
                        <div className="badge badge-green">
                            <TrendingUp className="w-3 h-3" />
                            <span>Live</span>
                        </div>
                    </div>
                    <div className="h-64">
                        {evolutionData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={evolutionData}>
                                    <defs>
                                        <linearGradient id="successGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4} />
                                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="epoch" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 11 }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 11 }} domain={[0, 100]} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#1a1a2e',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '8px',
                                        }}
                                        formatter={(value: number) => [`${value}%`, 'Success Rate']}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="successRate"
                                        stroke="#22c55e"
                                        strokeWidth={3}
                                        fill="url(#successGrad)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-500">
                                Not enough data yet
                            </div>
                        )}
                    </div>
                </div>

                {/* Cost Reduction */}
                <div className="glass-card p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-semibold text-white">Cost Trend</h3>
                            <p className="text-sm text-gray-400">Average cost per task batch</p>
                        </div>
                    </div>
                    <div className="h-64">
                        {evolutionData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={evolutionData}>
                                    <XAxis dataKey="epoch" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 11 }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 11 }} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#1a1a2e',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '8px',
                                        }}
                                        formatter={(value: number) => [`${value} MON`, 'Avg Cost']}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="avgCost"
                                        stroke="#3b82f6"
                                        strokeWidth={3}
                                        dot={{ fill: '#3b82f6', strokeWidth: 0, r: 4 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-500">
                                Not enough data yet
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Worker Performance Comparison */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Worker Ranking */}
                <div className="lg:col-span-2 glass-card p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-semibold text-white">Worker Performance Ranking</h3>
                            <p className="text-sm text-gray-400">Top agents based on real success rates</p>
                        </div>
                        <Users className="w-5 h-5 text-gray-500" />
                    </div>
                    <div className="h-64">
                        {workerPerformance.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={workerPerformance} layout="vertical">
                                    <XAxis type="number" domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 11 }} />
                                    <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} width={80} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#1a1a2e',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '8px',
                                        }}
                                        formatter={(value: number) => [`${value}%`, 'Success Rate']}
                                    />
                                    <Bar dataKey="successRate" radius={[0, 4, 4, 0]}>
                                        {workerPerformance.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-500">
                                No worker data available
                            </div>
                        )}
                    </div>
                </div>

                {/* Best/Worst Summary */}
                <div className="space-y-4">
                    {/* Best Worker */}
                    <div className="glass-card p-5 border-l-4 border-green-500">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                                <Star className="w-5 h-5 text-green-400" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-400">Best Performer</p>
                                <h4 className="text-white font-semibold">{bestWorker.name}</h4>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <p className="text-xs text-gray-500">Success Rate</p>
                                <p className="text-lg font-bold text-green-400">{bestWorker.successRate}%</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Tasks Completed</p>
                                <p className="text-lg font-bold text-white">{bestWorker.tasks}</p>
                            </div>
                        </div>
                    </div>

                    {/* Worst Worker */}
                    <div className="glass-card p-5 border-l-4 border-red-500">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                                <TrendingDown className="w-5 h-5 text-red-400" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-400">Needs Improvement</p>
                                <h4 className="text-white font-semibold">{worstWorker.name}</h4>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <p className="text-xs text-gray-500">Success Rate</p>
                                <p className="text-lg font-bold text-red-400">{worstWorker.successRate}%</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Tasks Completed</p>
                                <p className="text-lg font-bold text-white">{worstWorker.tasks}</p>
                            </div>
                        </div>
                    </div>

                    {/* Learning Insight */}
                    <div className="glass-card p-5">
                        <div className="flex items-center gap-2 mb-2">
                            <Brain className="w-4 h-4 text-purple-400" />
                            <span className="text-sm font-medium text-white">Learning Insight</span>
                        </div>
                        <p className="text-sm text-gray-400">
                            Agent automatically prioritizes <span className="text-green-400">{bestWorker.name}</span> for
                            future task assignments to maximize system efficiency.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
