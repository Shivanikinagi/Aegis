'use client';

import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    Legend
} from 'recharts';

interface ChartCardProps {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
}

export function ChartCard({ title, subtitle, children }: ChartCardProps) {
    return (
        <div className="glass-card p-6">
            <div className="mb-4">
                <h3 className="text-lg font-semibold text-white">{title}</h3>
                {subtitle && <p className="text-sm text-gray-400">{subtitle}</p>}
            </div>
            {children}
        </div>
    );
}

interface SpendingChartProps {
    data: Array<{ name: string; spent: number; success: number }>;
}

const CHART_COLORS = {
    purple: '#8b5cf6',
    purpleLight: 'rgba(139, 92, 246, 0.1)',
    green: '#22c55e',
    greenLight: 'rgba(34, 197, 94, 0.1)',
    blue: '#3b82f6',
    yellow: '#f59e0b',
    red: '#ef4444',
};

export function SpendingChart({ data }: SpendingChartProps) {
    return (
        <ChartCard title="Spending Over Time" subtitle="Daily treasury spending">
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id="spentGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={CHART_COLORS.purple} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={CHART_COLORS.purple} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                        <XAxis
                            dataKey="name"
                            stroke="#6b7280"
                            tick={{ fill: '#9ca3af', fontSize: 12 }}
                        />
                        <YAxis
                            stroke="#6b7280"
                            tick={{ fill: '#9ca3af', fontSize: 12 }}
                            tickFormatter={(value) => `${value} MON`}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#1e1e2e',
                                border: '1px solid #27272a',
                                borderRadius: '8px',
                                color: '#fff'
                            }}
                        />
                        <Area
                            type="monotone"
                            dataKey="spent"
                            stroke={CHART_COLORS.purple}
                            fillOpacity={1}
                            fill="url(#spentGradient)"
                            strokeWidth={2}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </ChartCard>
    );
}

interface SuccessRateChartProps {
    successful: number;
    failed: number;
}

export function SuccessRateChart({ successful, failed }: SuccessRateChartProps) {
    const data = [
        { name: 'Successful', value: successful },
        { name: 'Failed', value: failed },
    ];

    const COLORS = [CHART_COLORS.green, CHART_COLORS.red];

    return (
        <ChartCard title="Task Success Rate" subtitle="Completed vs Failed">
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {data.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Legend
                            formatter={(value) => <span style={{ color: '#9ca3af' }}>{value}</span>}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#1e1e2e',
                                border: '1px solid #27272a',
                                borderRadius: '8px',
                                color: '#fff'
                            }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </ChartCard>
    );
}

interface LearningProgressChartProps {
    data: Array<{ cycle: number; successRate: number; explorationRate: number }>;
}

export function LearningProgressChart({ data }: LearningProgressChartProps) {
    return (
        <ChartCard title="Learning Progress" subtitle="Success rate over time">
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id="successGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={CHART_COLORS.green} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={CHART_COLORS.green} stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="exploreGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={CHART_COLORS.blue} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={CHART_COLORS.blue} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                        <XAxis
                            dataKey="cycle"
                            stroke="#6b7280"
                            tick={{ fill: '#9ca3af', fontSize: 12 }}
                        />
                        <YAxis
                            stroke="#6b7280"
                            tick={{ fill: '#9ca3af', fontSize: 12 }}
                            tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#1e1e2e',
                                border: '1px solid #27272a',
                                borderRadius: '8px',
                                color: '#fff'
                            }}
                            formatter={(value: number) => `${(value * 100).toFixed(1)}%`}
                        />
                        <Area
                            type="monotone"
                            dataKey="successRate"
                            name="Success Rate"
                            stroke={CHART_COLORS.green}
                            fillOpacity={1}
                            fill="url(#successGradient)"
                            strokeWidth={2}
                        />
                        <Area
                            type="monotone"
                            dataKey="explorationRate"
                            name="Exploration"
                            stroke={CHART_COLORS.blue}
                            fillOpacity={1}
                            fill="url(#exploreGradient)"
                            strokeWidth={2}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </ChartCard>
    );
}

interface WorkerPerformanceChartProps {
    data: Array<{ worker: string; tasks: number; success: number; reliability: number }>;
}

export function WorkerPerformanceChart({ data }: WorkerPerformanceChartProps) {
    return (
        <ChartCard title="Worker Performance" subtitle="Tasks and reliability by worker">
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                        <XAxis
                            type="number"
                            stroke="#6b7280"
                            tick={{ fill: '#9ca3af', fontSize: 12 }}
                        />
                        <YAxis
                            type="category"
                            dataKey="worker"
                            stroke="#6b7280"
                            tick={{ fill: '#9ca3af', fontSize: 12 }}
                            width={80}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#1e1e2e',
                                border: '1px solid #27272a',
                                borderRadius: '8px',
                                color: '#fff'
                            }}
                        />
                        <Bar dataKey="tasks" name="Total Tasks" fill={CHART_COLORS.purple} radius={[0, 4, 4, 0]} />
                        <Bar dataKey="success" name="Successful" fill={CHART_COLORS.green} radius={[0, 4, 4, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </ChartCard>
    );
}
