'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import TaskCard from '@/components/TaskCard';
import { Badge } from '@/components/StatCard';
import CreateTaskModal, { TaskFormData } from '@/components/CreateTaskModal';
import { getTasks } from '@/lib/blockchain';
import {
    ListTodo,
    Filter,
    Search,
    Plus,
    RefreshCw
} from 'lucide-react';

interface Task {
    id: number;
    taskType: string;
    status: string;
    creator: string;
    assignedWorker: string | null;
    maxPayment: number;
    actualPayment: number;
    deadline: number;
    createdAt: number;
    completedAt: number;
    verificationRule: string;
}

const statusFilters = ['ALL', 'CREATED', 'ASSIGNED', 'SUBMITTED', 'COMPLETED', 'FAILED'];

export default function TasksPage() {
    const [filter, setFilter] = useState('ALL');
    const [search, setSearch] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const fetchTasks = async () => {
        setIsRefreshing(true);
        try {
            const data = await getTasks();
            if (data) {
                setTasks(data.tasks);
            }
        } catch (error) {
            console.error('Error fetching tasks:', error);
        } finally {
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchTasks();
        const interval = setInterval(fetchTasks, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleCreateTask = (task: TaskFormData) => {
        console.log('Task created:', task);
        // In production, this would call the contract
        fetchTasks(); // Refresh after creation
    };

    const filteredTasks = tasks.filter(task => {
        if (filter !== 'ALL' && task.status !== filter) return false;
        if (search && !task.taskType.includes(search.toUpperCase())) return false;
        return true;
    });

    const taskStats = {
        total: tasks.length,
        open: tasks.filter(t => t.status === 'CREATED').length,
        inProgress: tasks.filter(t => ['ASSIGNED', 'SUBMITTED'].includes(t.status)).length,
        completed: tasks.filter(t => t.status === 'COMPLETED').length,
        failed: tasks.filter(t => t.status === 'FAILED').length,
    };

    return (
        <div className="flex min-h-screen bg-[#0a0a0f]">
            <Sidebar />

            <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">Tasks</h1>
                        <p className="text-gray-400">
                            Real-time task data from TaskRegistry contract
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={fetchTasks}
                            className={`btn-secondary flex items-center gap-2 ${isRefreshing ? 'opacity-50' : ''}`}
                            disabled={isRefreshing}
                        >
                            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="btn-primary flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Create Task
                        </button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-5 gap-4 mb-8">
                    <div className="glass-card p-4 text-center">
                        <p className="text-2xl font-bold text-white">{taskStats.total}</p>
                        <p className="text-xs text-gray-400">Total Tasks</p>
                    </div>
                    <div className="glass-card p-4 text-center border-l-4 border-l-indigo-500">
                        <p className="text-2xl font-bold text-indigo-400">{taskStats.open}</p>
                        <p className="text-xs text-gray-400">Open</p>
                    </div>
                    <div className="glass-card p-4 text-center border-l-4 border-l-yellow-500">
                        <p className="text-2xl font-bold text-yellow-400">{taskStats.inProgress}</p>
                        <p className="text-xs text-gray-400">In Progress</p>
                    </div>
                    <div className="glass-card p-4 text-center border-l-4 border-l-green-500">
                        <p className="text-2xl font-bold text-green-400">{taskStats.completed}</p>
                        <p className="text-xs text-gray-400">Completed</p>
                    </div>
                    <div className="glass-card p-4 text-center border-l-4 border-l-red-500">
                        <p className="text-2xl font-bold text-red-400">{taskStats.failed}</p>
                        <p className="text-xs text-gray-400">Failed</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-4 mb-6">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Search by task type..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-[#1e1e2e] border border-[#27272a] rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter className="w-5 h-5 text-gray-400" />
                        {statusFilters.map((status) => (
                            <button
                                key={status}
                                onClick={() => setFilter(status)}
                                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${filter === status
                                    ? 'bg-purple-500 text-white'
                                    : 'bg-[#1e1e2e] text-gray-400 hover:text-white'
                                    }`}
                            >
                                {status}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Task List */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredTasks.map((task) => (
                        <TaskCard key={task.id} task={task as any} />
                    ))}
                </div>

                {filteredTasks.length === 0 && (
                    <div className="glass-card p-12 text-center">
                        <ListTodo className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                        <p className="text-gray-400">
                            {tasks.length === 0
                                ? 'No tasks created yet'
                                : 'No tasks found matching your criteria'
                            }
                        </p>
                        {tasks.length === 0 && (
                            <p className="text-sm text-gray-500 mt-2">
                                Click "Create Task" to add your first task
                            </p>
                        )}
                    </div>
                )}
            </main>

            {/* Create Task Modal */}
            <CreateTaskModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSubmit={handleCreateTask}
            />
        </div>
    );
}
