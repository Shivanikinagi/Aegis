'use client';

import { ReactNode } from 'react';
import {
    TrendingUp,
    TrendingDown,
    Minus,
    LucideIcon
} from 'lucide-react';

interface StatCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon?: LucideIcon;
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: string;
    accentColor?: 'purple' | 'green' | 'yellow' | 'red' | 'blue';
    children?: ReactNode;
}

const accentColors = {
    purple: 'from-purple-500 to-indigo-600',
    green: 'from-green-500 to-emerald-600',
    yellow: 'from-yellow-500 to-orange-600',
    red: 'from-red-500 to-rose-600',
    blue: 'from-blue-500 to-cyan-600',
};

const accentBorders = {
    purple: 'border-purple-500/20 hover:border-purple-500/40',
    green: 'border-green-500/20 hover:border-green-500/40',
    yellow: 'border-yellow-500/20 hover:border-yellow-500/40',
    red: 'border-red-500/20 hover:border-red-500/40',
    blue: 'border-blue-500/20 hover:border-blue-500/40',
};

export default function StatCard({
    title,
    value,
    subtitle,
    icon: Icon,
    trend,
    trendValue,
    accentColor = 'purple',
    children,
}: StatCardProps) {
    const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
    const trendColor = trend === 'up' ? 'text-green-400' : trend === 'down' ? 'text-red-400' : 'text-gray-400';

    return (
        <div className={`glass-card p-6 border ${accentBorders[accentColor]} transition-all duration-300 group`}>
            <div className="flex items-start justify-between mb-4">
                <div>
                    <p className="text-sm text-gray-400 uppercase tracking-wider mb-1">{title}</p>
                    <h3 className="text-2xl font-bold text-white">
                        {value}
                    </h3>
                    {subtitle && (
                        <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
                    )}
                </div>
                {Icon && (
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${accentColors[accentColor]} flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className="w-6 h-6 text-white" />
                    </div>
                )}
            </div>

            {(trend || trendValue) && (
                <div className="flex items-center gap-2 pt-4 border-t border-[#27272a]">
                    {trend && <TrendIcon className={`w-4 h-4 ${trendColor}`} />}
                    {trendValue && <span className={`text-sm ${trendColor}`}>{trendValue}</span>}
                </div>
            )}

            {children}
        </div>
    );
}

interface ProgressBarProps {
    value: number;
    max: number;
    label?: string;
    showPercentage?: boolean;
    color?: 'purple' | 'green' | 'yellow' | 'red' | 'blue';
}

const barColors = {
    purple: 'from-purple-500 to-indigo-600',
    green: 'from-green-500 to-emerald-600',
    yellow: 'from-yellow-500 to-orange-600',
    red: 'from-red-500 to-rose-600',
    blue: 'from-blue-500 to-cyan-600',
};

export function ProgressBar({ value, max, label, showPercentage = true, color = 'purple' }: ProgressBarProps) {
    const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;

    return (
        <div>
            {(label || showPercentage) && (
                <div className="flex justify-between mb-2">
                    {label && <span className="text-sm text-gray-400">{label}</span>}
                    {showPercentage && <span className="text-sm text-gray-400">{percentage.toFixed(1)}%</span>}
                </div>
            )}
            <div className="h-2 bg-[#27272a] rounded-full overflow-hidden">
                <div
                    className={`h-full bg-gradient-to-r ${barColors[color]} rounded-full transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
}

interface BadgeProps {
    children: ReactNode;
    variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
}

export function Badge({ children, variant = 'default' }: BadgeProps) {
    const variants = {
        default: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
        success: 'bg-green-500/20 text-green-400 border-green-500/30',
        warning: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
        error: 'bg-red-500/20 text-red-400 border-red-500/30',
        info: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    };

    return (
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${variants[variant]}`}>
            {children}
        </span>
    );
}
