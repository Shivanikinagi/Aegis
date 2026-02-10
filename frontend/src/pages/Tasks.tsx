import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
    ListTodo,
    Plus,
    Search,
    Filter,
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle,
    User,
    Wallet,
    RefreshCw,
    Zap,
    FileText,
    Code,
    Database,
    Globe,
    X,
    Calendar,
    Target
} from 'lucide-react';

// API Functions
const fetchTasks = async () => {
    const res = await fetch('http://localhost:8000/api/tasks');
    return res.json();
};

const createTask = async (taskData: any) => {
    const res = await fetch('http://localhost:8000/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData),
    });
    return res.json();
};

// Task type icons
const getTaskTypeIcon = (type: string) => {
    switch (type?.toUpperCase()) {
        case 'COMPUTE':
        case 'COMPUTATION':
            return <Code className="w-5 h-5" />;
        case 'DATA':
        case 'DATA_PROCESSING':
            return <Database className="w-5 h-5" />;
        case 'API':
        case 'API_CALL':
            return <Globe className="w-5 h-5" />;
        case 'ANALYSIS':
            return <FileText className="w-5 h-5" />;
        default:
            return <Zap className="w-5 h-5" />;
    }
};

// Status badge classes
const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
        case 'COMPLETED':
            return 'badge-green';
        case 'FAILED':
        case 'CANCELLED':
            return 'badge-red';
        case 'ASSIGNED':
        case 'IN_PROGRESS':
            return 'badge-blue';
        case 'CREATED':
        case 'PENDING':
            return 'badge-yellow';
        default:
            return 'badge-purple';
    }
};

// Create Task Modal Component
function CreateTaskModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({
        taskType: 'COMPUTE',
        maxPayment: '1.0',
        deadline: '',
        description: '',
    });

    const mutation = useMutation({
        mutationFn: createTask,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            toast.success('Task created successfully!');
            onClose();
            setFormData({ taskType: 'COMPUTE', maxPayment: '1.0', deadline: '', description: '' });
        },
        onError: () => {
            toast.error('Failed to create task');
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        mutation.mutate({
            taskType: formData.taskType,
            maxPayment: parseFloat(formData.maxPayment),
            deadline: formData.deadline ? new Date(formData.deadline).getTime() / 1000 : null,
            description: formData.description,
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="glass-card w-full max-w-lg animate-fade-in">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                            <Plus className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-white">Create New Task</h2>
                            <p className="text-xs text-gray-400">Submit a task with budget and deadline</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="btn-icon">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-5 space-y-5">
                    {/* Task Type */}
                    <div className="input-group">
                        <label className="input-label">Task Type</label>
                        <select
                            value={formData.taskType}
                            onChange={(e) => setFormData({ ...formData, taskType: e.target.value })}
                            className="input"
                        >
                            <option value="COMPUTE">Compute</option>
                            <option value="DATA_PROCESSING">Data Processing</option>
                            <option value="API_CALL">API Call</option>
                            <option value="ANALYSIS">Analysis</option>
                            <option value="CODE_REVIEW">Code Review</option>
                        </select>
                    </div>

                    {/* Max Budget */}
                    <div className="input-group">
                        <label className="input-label">Max Budget (MON)</label>
                        <div className="relative">
                            <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                max="100"
                                value={formData.maxPayment}
                                onChange={(e) => setFormData({ ...formData, maxPayment: e.target.value })}
                                className="input pr-14"
                                placeholder="1.0"
                                required
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-500">MON</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Maximum: 100 MON (daily limit enforced by contract)</p>
                    </div>

                    {/* Deadline */}
                    <div className="input-group">
                        <label className="input-label">Deadline</label>
                        <input
                            type="datetime-local"
                            value={formData.deadline}
                            onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                            className="input"
                        />
                    </div>

                    {/* Description */}
                    <div className="input-group">
                        <label className="input-label">Description (Optional)</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="input min-h-[80px] resize-none"
                            placeholder="Describe the task requirements..."
                        />
                    </div>

                    {/* Submit */}
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="btn-secondary flex-1">
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn-primary flex-1"
                            disabled={mutation.isPending}
                        >
                            {mutation.isPending ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <Zap className="w-4 h-4" />
                                    Create Task
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// Task Card Component
function TaskCard({ task, onClick }: { task: any; onClick: () => void }) {
    const formatMON = (value: number) => value?.toFixed(4) || '0';
    const formatAddress = (addr: string) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : 'Pending';

    return (
        <div
            onClick={onClick}
            className="glass-card-hover p-5 cursor-pointer"
            role="button"
            tabIndex={0}
        >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400">
                        {getTaskTypeIcon(task.taskType)}
                    </div>
                    <div>
                        <h3 className="font-semibold text-white">Task #{task.id}</h3>
                        <p className="text-xs text-gray-400">{task.taskType?.replace('_', ' ') || 'General'}</p>
                    </div>
                </div>
                <span className={`badge ${getStatusBadge(task.status)}`}>
                    {task.status}
                </span>
            </div>

            {/* Details */}
            <div className="space-y-2.5">
                <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-gray-400">
                        <Wallet className="w-4 h-4" />
                        <span>Budget</span>
                    </div>
                    <span className="text-white font-medium">
                        {formatMON(task.maxPayment)} MON
                    </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-gray-400">
                        <User className="w-4 h-4" />
                        <span>Worker</span>
                    </div>
                    <span className="text-purple-400 font-mono text-xs">
                        {formatAddress(task.assignedWorker)}
                    </span>
                </div>
                {task.actualPayment > 0 && (
                    <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-gray-400">
                            <CheckCircle className="w-4 h-4" />
                            <span>Paid</span>
                        </div>
                        <span className="text-green-400 font-medium">
                            {formatMON(task.actualPayment)} MON
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function Tasks() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    const { data: tasksData, isLoading, refetch } = useQuery({
        queryKey: ['tasks'],
        queryFn: fetchTasks,
    });

    const tasks = tasksData?.tasks || [];

    // Filter tasks
    const filteredTasks = tasks.filter((task: any) => {
        const matchesSearch = task.taskType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            task.id?.toString().includes(searchQuery);
        const matchesStatus = statusFilter === 'all' || task.status?.toUpperCase() === statusFilter.toUpperCase();
        return matchesSearch && matchesStatus;
    });

    // Stats
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t: any) => t.status === 'COMPLETED').length;
    const activeTasks = tasks.filter((t: any) => t.status === 'CREATED' || t.status === 'ASSIGNED').length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white mb-1">Tasks</h1>
                    <p className="text-gray-400 text-sm">Create and manage treasury tasks</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => refetch()} className="btn-secondary">
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                    </button>
                    <button onClick={() => setIsModalOpen(true)} className="btn-primary">
                        <Plus className="w-4 h-4" />
                        Create Task
                    </button>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-4">
                <div className="glass-card p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                            <ListTodo className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-white">{totalTasks}</p>
                            <p className="text-xs text-gray-400">Total Tasks</p>
                        </div>
                    </div>
                </div>
                <div className="glass-card p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                            <Clock className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-white">{activeTasks}</p>
                            <p className="text-xs text-gray-400">Active</p>
                        </div>
                    </div>
                </div>
                <div className="glass-card p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                            <CheckCircle className="w-5 h-5 text-green-400" />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-white">{completedTasks}</p>
                            <p className="text-xs text-gray-400">Completed</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="glass-card p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Search by task ID or type..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="input pl-11"
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        <Filter className="w-4 h-4 text-gray-500" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="input w-40"
                        >
                            <option value="all">All Status</option>
                            <option value="CREATED">Created</option>
                            <option value="OPEN">Open</option>
                            <option value="ASSIGNED">Assigned</option>
                            <option value="COMPLETED">Completed</option>
                            <option value="FAILED">Failed</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Tasks Grid */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="glass-card p-5">
                            <div className="skeleton h-6 w-24 mb-4" />
                            <div className="skeleton h-4 w-full mb-2" />
                            <div className="skeleton h-4 w-2/3" />
                        </div>
                    ))}
                </div>
            ) : filteredTasks.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredTasks.map((task: any) => (
                        <TaskCard
                            key={task.id}
                            task={task}
                            onClick={() => { }}
                        />
                    ))}
                </div>
            ) : (
                <div className="glass-card p-12 text-center">
                    <ListTodo className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">No Tasks Found</h3>
                    <p className="text-gray-400 mb-6 max-w-md mx-auto">
                        {searchQuery || statusFilter !== 'all'
                            ? 'No tasks match your search criteria.'
                            : 'Create your first task to get started.'}
                    </p>
                    <button onClick={() => setIsModalOpen(true)} className="btn-primary">
                        <Plus className="w-4 h-4" />
                        Create Task
                    </button>
                </div>
            )}

            {/* Create Task Modal */}
            <CreateTaskModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        </div>
    );
}
