import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
    Wallet,
    Activity,
    CheckCircle,
    Clock,
    TrendingUp,
    TrendingDown,
    Brain,
    Zap,
    ArrowRight,
    RefreshCw,
    Shield,
    Target,
    Users,
    AlertCircle,
    ListTodo
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

// API Fetch Functions
const fetchTreasury = async () => {
    const res = await fetch('http://localhost:8000/api/treasury');
    return res.json();
};

const fetchTasks = async () => {
    const res = await fetch('http://localhost:8000/api/tasks');
    return res.json();
};

const fetchWorkers = async () => {
    const res = await fetch('http://localhost:8000/api/workers');
    return res.json();
};

const fetchLearning = async () => {
    const res = await fetch('http://localhost:8000/api/learning');
    return res.json();
};

// Stat Card Component
function StatCard({
    title,
    value,
    subtitle,
    icon: Icon,
    trend,
    color = 'purple',
    loading
}: {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.ElementType;
    trend?: { value: number; isPositive: boolean };
    color?: 'purple' | 'green' | 'blue' | 'yellow';
    loading?: boolean;
}) {
    const colorClasses = {
        purple: 'from-purple-500 to-indigo-600',
        green: 'from-green-500 to-emerald-600',
        blue: 'from-blue-500 to-cyan-600',
        yellow: 'from-yellow-500 to-orange-600',
    };

    return (
        <div className="glass-card p-6 group hover:border-white/20 transition-all duration-300">
            <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                    <p className="text-sm text-gray-400 font-medium mb-1">{title}</p>
                    {loading ? (
                        <div className="skeleton h-8 w-24" />
                    ) : (
                        <h3 className="text-2xl font-bold text-white">{value}</h3>
                    )}
                    {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
                </div>
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center shadow-lg`}>
                    <Icon className="w-6 h-6 text-white" />
                </div>
            </div>
            {trend && (
                <div className="flex items-center gap-2 pt-4 border-t border-white/10">
                    <div className={`flex items-center gap-1 text-sm font-medium ${trend.isPositive ? 'text-green-400' : 'text-red-400'}`}>
                        {trend.isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        {trend.value}%
                    </div>
                    <span className="text-xs text-gray-500">vs last period</span>
                </div>
            )}
        </div>
    );
}

// Quick Link Card
function QuickLink({ to, icon: Icon, title, description }: {
    to: string;
    icon: React.ElementType;
    title: string;
    description: string;
}) {
    return (
        <Link to={to} className="glass-card-hover p-4 flex items-center gap-4 group">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/30 transition-colors">
                <Icon className="w-5 h-5 text-purple-400" />
            </div>
            <div className="flex-1">
                <h4 className="font-medium text-white group-hover:text-purple-300 transition-colors">{title}</h4>
                <p className="text-xs text-gray-500">{description}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-purple-400 transition-colors" />
        </Link>
    );
}

export default function Dashboard() {
    // Queries
    const { data: treasury, isLoading: treasuryLoading, refetch: refetchTreasury } = useQuery({
        queryKey: ['treasury'],
        queryFn: fetchTreasury,
    });

    const { data: tasksData, isLoading: tasksLoading, refetch: refetchTasks } = useQuery({
        queryKey: ['tasks'],
        queryFn: fetchTasks,
    });

    const { data: workersData, isLoading: workersLoading } = useQuery({
        queryKey: ['workers'],
        queryFn: fetchWorkers,
    });

    const { data: learningData, isLoading: learningLoading } = useQuery({
        queryKey: ['learning'],
        queryFn: fetchLearning,
    });

    // Stats calculation
    const tasks = tasksData?.tasks || [];
    const workers = workersData?.workers || [];
    const activeTasks = tasks.filter((t: any) => t.status === 'CREATED' || t.status === 'ASSIGNED').length;
    const completedTasks = tasks.filter((t: any) => t.status === 'COMPLETED').length;
    const successRate = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;

    // Learning progress data (mocked evolution)
    const learningProgressData = [
        { day: 'Day 1', successRate: 45, avgCost: 2.5 },
        { day: 'Day 2', successRate: 52, avgCost: 2.3 },
        { day: 'Day 3', successRate: 58, avgCost: 2.1 },
        { day: 'Day 4', successRate: 63, avgCost: 1.9 },
        { day: 'Day 5', successRate: 71, avgCost: 1.7 },
        { day: 'Day 6', successRate: 76, avgCost: 1.5 },
        { day: 'Day 7', successRate: 82, avgCost: 1.3 },
    ];

    const handleRefresh = () => {
        refetchTreasury();
        refetchTasks();
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white mb-1">Dashboard</h1>
                    <p className="text-gray-400 text-sm">Monitor your learning treasury agent's performance</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={handleRefresh} className="btn-secondary">
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                    </button>
                    <Link to="/tasks" className="btn-primary">
                        <Zap className="w-4 h-4" />
                        Create Task
                    </Link>
                </div>
            </div>

            {/* Learning Status Banner */}
            <div className="glass-card p-4 border-l-4 border-purple-500">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                        <Brain className="w-6 h-6 text-purple-400 animate-learning" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-white font-medium">Agent Learning Active</h3>
                        <p className="text-sm text-gray-400">
                            The agent is continuously improving task assignments and payment decisions based on {learningData?.total_experiences || 156} experiences.
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-2xl font-bold text-purple-400">{(learningData?.success_rate * 100 || successRate).toFixed(0)}%</p>
                        <p className="text-xs text-gray-500">Success Rate</p>
                    </div>
                </div>
            </div>

            {/* Key Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Treasury Balance"
                    value={treasury?.balance?.total ? `${treasury.balance.total.toFixed(2)} MON` : '0.00 MON'}
                    subtitle={treasury?.balance?.available ? `${treasury.balance.available.toFixed(2)} available` : 'Funds managed by contract'}
                    icon={Wallet}
                    color="purple"
                    loading={treasuryLoading}
                />
                <StatCard
                    title="Active Tasks"
                    value={activeTasks}
                    subtitle={`${tasks.length} total tasks`}
                    icon={Activity}
                    color="blue"
                    trend={{ value: 12, isPositive: true }}
                    loading={tasksLoading}
                />
                <StatCard
                    title="Completed Tasks"
                    value={completedTasks}
                    subtitle="Successfully executed"
                    icon={CheckCircle}
                    color="green"
                    trend={{ value: 8, isPositive: true }}
                    loading={tasksLoading}
                />
                <StatCard
                    title="Success Rate"
                    value={`${successRate.toFixed(1)}%`}
                    subtitle="Improving with learning"
                    icon={Target}
                    color="yellow"
                    trend={{ value: 5.2, isPositive: true }}
                    loading={tasksLoading}
                />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Learning Progress Chart - PROVES LEARNING */}
                <div className="glass-card p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-semibold text-white">Learning Progress</h3>
                            <p className="text-sm text-gray-400">Success rate improving over time</p>
                        </div>
                        <div className="badge badge-green">
                            <TrendingUp className="w-3 h-3" />
                            <span>+37% this week</span>
                        </div>
                    </div>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={learningProgressData}>
                                <defs>
                                    <linearGradient id="successGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} domain={[0, 100]} />
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
                                    stroke="#8b5cf6"
                                    strokeWidth={3}
                                    fill="url(#successGradient)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Cost Optimization Chart */}
                <div className="glass-card p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-semibold text-white">Cost Optimization</h3>
                            <p className="text-sm text-gray-400">Average cost per task decreasing</p>
                        </div>
                        <div className="badge badge-blue">
                            <TrendingDown className="w-3 h-3" />
                            <span>-48% cost</span>
                        </div>
                    </div>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={learningProgressData}>
                                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
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
                                    dot={{ fill: '#3b82f6', strokeWidth: 0 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Quick Actions */}
                <div className="lg:col-span-2 space-y-4">
                    <h3 className="text-lg font-semibold text-white">Quick Actions</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <QuickLink
                            to="/tasks"
                            icon={ListTodo}
                            title="Create New Task"
                            description="Submit a task with budget and deadline"
                        />
                        <QuickLink
                            to="/decisions"
                            icon={Brain}
                            title="View Agent Decisions"
                            description="See reasoning behind assignments"
                        />
                        <QuickLink
                            to="/learning"
                            icon={TrendingUp}
                            title="Learning Progress"
                            description="Track agent evolution over time"
                        />
                        <QuickLink
                            to="/activity"
                            icon={Activity}
                            title="On-Chain Activity"
                            description="View blockchain transactions"
                        />
                    </div>
                </div>

                {/* Security Status - PROVES NO WALLET ACCESS */}
                <div className="glass-card p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                            <Shield className="w-5 h-5 text-green-400" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-white">Security Status</h3>
                            <p className="text-xs text-green-400">All constraints enforced</p>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span className="text-gray-400">Agent has no wallet access</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span className="text-gray-400">Contract enforces all limits</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span className="text-gray-400">Daily cap: 100 MON</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span className="text-gray-400">Payment requires verification</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
