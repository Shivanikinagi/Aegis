'use client';

import { Task } from '@/lib/api';
import { formatAddress, formatMON, formatTimestamp, getStatusColor, getTaskTypeIcon } from '@/lib/hooks';
import { Clock, User, Wallet, ExternalLink } from 'lucide-react';

interface TaskCardProps {
    task: Task;
    onClick?: () => void;
}

export default function TaskCard({ task, onClick }: TaskCardProps) {
    const isExpired = task.deadline * 1000 < Date.now() && task.status === 'CREATED';

    return (
        <div
            className="glass-card p-5 cursor-pointer group hover:scale-[1.02] transition-all duration-300"
            onClick={onClick}
        >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="text-2xl">{getTaskTypeIcon(task.taskType)}</div>
                    <div>
                        <h3 className="font-semibold text-white">Task #{task.id}</h3>
                        <p className="text-sm text-gray-400">{task.taskType.replace('_', ' ')}</p>
                    </div>
                </div>
                <span className={`status-badge ${getStatusColor(task.status)}`}>
                    {task.status}
                </span>
            </div>

            {/* Details */}
            <div className="space-y-3">
                {/* Payment */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-gray-400">
                        <Wallet className="w-4 h-4" />
                        <span className="text-sm">Payment</span>
                    </div>
                    <div className="text-right">
                        <span className="text-white font-medium">
                            {task.actualPayment > 0
                                ? formatMON(task.actualPayment)
                                : `Max: ${formatMON(task.maxPayment)}`
                            }
                        </span>
                    </div>
                </div>

                {/* Worker */}
                {task.assignedWorker && (
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-gray-400">
                            <User className="w-4 h-4" />
                            <span className="text-sm">Worker</span>
                        </div>
                        <span className="text-purple-400 font-mono text-sm">
                            {formatAddress(task.assignedWorker)}
                        </span>
                    </div>
                )}

                {/* Deadline */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-gray-400">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm">Deadline</span>
                    </div>
                    <span className={`text-sm ${isExpired ? 'text-red-400' : 'text-gray-300'}`}>
                        {formatTimestamp(task.deadline)}
                    </span>
                </div>

                {/* Verification Rule */}
                {task.verificationRule && (
                    <div className="pt-3 border-t border-[#27272a]">
                        <p className="text-xs text-gray-500">
                            <span className="text-gray-400">Rule:</span> {task.verificationRule}
                        </p>
                    </div>
                )}
            </div>

            {/* Hover indicator */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                <ExternalLink className="w-5 h-5 text-purple-400" />
            </div>
        </div>
    );
}

interface TaskListProps {
    tasks: Task[];
    onTaskClick?: (task: Task) => void;
    emptyMessage?: string;
}

export function TaskList({ tasks, onTaskClick, emptyMessage = 'No tasks found' }: TaskListProps) {
    if (tasks.length === 0) {
        return (
            <div className="glass-card p-8 text-center">
                <p className="text-gray-400">{emptyMessage}</p>
            </div>
        );
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {tasks.map((task) => (
                <TaskCard
                    key={task.id}
                    task={task}
                    onClick={() => onTaskClick?.(task)}
                />
            ))}
        </div>
    );
}
