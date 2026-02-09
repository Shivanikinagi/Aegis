import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
    Users,
    Plus,
    Search,
    Star,
    CheckCircle,
    XCircle,
    Clock,
    TrendingUp,
    RefreshCw,
    User,
    Wallet,
    Target,
    Award,
    AlertCircle,
    X
} from 'lucide-react';

// API Functions
const fetchWorkers = async () => {
    const res = await fetch('http://localhost:8000/api/workers');
    return res.json();
};

const registerWorker = async (workerData: any) => {
    const res = await fetch('http://localhost:8000/api/workers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workerData),
    });
    return res.json();
};

// Register Worker Modal
function RegisterWorkerModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const queryClient = useQueryClient();
    const [address, setAddress] = useState('');

    const mutation = useMutation({
        mutationFn: registerWorker,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workers'] });
            toast.success('Worker registered successfully!');
            onClose();
            setAddress('');
        },
        onError: () => {
            toast.error('Failed to register worker');
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        mutation.mutate({ address });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="glass-card w-full max-w-md animate-fade-in">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                            <Plus className="w-5 h-5 text-purple-400" />
                        </div>
                        <h2 className="text-lg font-semibold text-white">Register Worker</h2>
                    </div>
                    <button onClick={onClose} className="btn-icon">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    <div className="input-group">
                        <label className="input-label">Worker Address</label>
                        <input
                            type="text"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            className="input font-mono text-sm"
                            placeholder="0x..."
                            required
                        />
                        <p className="text-xs text-gray-500 mt-1">Enter the Ethereum address of the worker</p>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="btn-secondary flex-1">
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn-primary flex-1"
                            disabled={mutation.isPending}
                        >
                            {mutation.isPending ? 'Registering...' : 'Register'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// Worker Card Component
function WorkerCard({ worker }: { worker: any }) {
    const formatAddress = (addr: string) => `${addr.slice(0, 10)}...${addr.slice(-8)}`;
    const reputation = worker.reputation || 75;
    const isActive = worker.isActive !== false;

    return (
        <div className="glass-card-hover p-5">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isActive ? 'bg-purple-500/20' : 'bg-gray-500/20'
                        }`}>
                        <User className={`w-6 h-6 ${isActive ? 'text-purple-400' : 'text-gray-400'}`} />
                    </div>
                    <div>
                        <p className="font-mono text-sm text-white">{formatAddress(worker.address)}</p>
                        <span className={`badge text-xs mt-1 ${isActive ? 'badge-green' : 'badge-red'}`}>
                            {isActive ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                </div>
                {reputation >= 80 && (
                    <div className="flex items-center gap-1 text-yellow-400">
                        <Star className="w-4 h-4 fill-current" />
                        <span className="text-xs font-medium">Top Performer</span>
                    </div>
                )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center gap-2 text-gray-400 mb-1">
                        <Target className="w-3.5 h-3.5" />
                        <span className="text-xs">Reputation</span>
                    </div>
                    <p className="text-lg font-bold text-white">{reputation}%</p>
                </div>
                <div className="p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center gap-2 text-gray-400 mb-1">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span className="text-xs">Completed</span>
                    </div>
                    <p className="text-lg font-bold text-white">{worker.completedTasks || 0}</p>
                </div>
                <div className="p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center gap-2 text-gray-400 mb-1">
                        <Wallet className="w-3.5 h-3.5" />
                        <span className="text-xs">Earned</span>
                    </div>
                    <p className="text-lg font-bold text-green-400">
                        {(worker.totalEarned || 0).toFixed(2)} MON
                    </p>
                </div>
                <div className="p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center gap-2 text-gray-400 mb-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span className="text-xs">Avg Time</span>
                    </div>
                    <p className="text-lg font-bold text-white">
                        {worker.avgCompletionTime || 15}m
                    </p>
                </div>
            </div>

            {/* Reputation Bar */}
            <div className="mt-4">
                <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-400">Trust Score</span>
                    <span className={reputation >= 70 ? 'text-green-400' : 'text-yellow-400'}>
                        {reputation}%
                    </span>
                </div>
                <div className="progress-bar">
                    <div
                        className={`progress-fill ${reputation >= 70 ? 'bg-green-500' : 'bg-yellow-500'}`}
                        style={{ width: `${reputation}%` }}
                    />
                </div>
            </div>
        </div>
    );
}

export default function Workers() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const { data: workersData, isLoading, refetch } = useQuery({
        queryKey: ['workers'],
        queryFn: fetchWorkers,
    });

    const workers = workersData?.workers || [];

    // Filter workers
    const filteredWorkers = workers.filter((worker: any) =>
        worker.address?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Stats
    const activeWorkers = workers.filter((w: any) => w.isActive !== false).length;
    const topPerformers = workers.filter((w: any) => (w.reputation || 75) >= 80).length;
    const avgReputation = workers.length > 0
        ? workers.reduce((sum: number, w: any) => sum + (w.reputation || 75), 0) / workers.length
        : 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white mb-1">Workers</h1>
                    <p className="text-gray-400 text-sm">Manage worker agents in the registry</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => refetch()} className="btn-secondary">
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                    </button>
                    <button onClick={() => setIsModalOpen(true)} className="btn-primary">
                        <Plus className="w-4 h-4" />
                        Register Worker
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="glass-card p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                            <Users className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-white">{workers.length}</p>
                            <p className="text-xs text-gray-400">Total Workers</p>
                        </div>
                    </div>
                </div>
                <div className="glass-card p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                            <CheckCircle className="w-5 h-5 text-green-400" />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-white">{activeWorkers}</p>
                            <p className="text-xs text-gray-400">Active</p>
                        </div>
                    </div>
                </div>
                <div className="glass-card p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                            <Star className="w-5 h-5 text-yellow-400" />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-white">{topPerformers}</p>
                            <p className="text-xs text-gray-400">Top Performers</p>
                        </div>
                    </div>
                </div>
                <div className="glass-card p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-white">{avgReputation.toFixed(0)}%</p>
                            <p className="text-xs text-gray-400">Avg Reputation</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="glass-card p-4">
                <div className="relative max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Search by address..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="input pl-11"
                    />
                </div>
            </div>

            {/* Workers Grid */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="glass-card p-5">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="skeleton w-12 h-12 rounded-xl" />
                                <div className="flex-1">
                                    <div className="skeleton h-4 w-32 mb-2" />
                                    <div className="skeleton h-3 w-16" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="skeleton h-16 rounded-lg" />
                                <div className="skeleton h-16 rounded-lg" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : filteredWorkers.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredWorkers.map((worker: any, idx: number) => (
                        <WorkerCard key={worker.address || idx} worker={worker} />
                    ))}
                </div>
            ) : (
                <div className="glass-card p-12 text-center">
                    <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">No Workers Found</h3>
                    <p className="text-gray-400 mb-6 max-w-md mx-auto">
                        {searchQuery
                            ? 'No workers match your search.'
                            : 'Register workers to enable task assignments.'}
                    </p>
                    <button onClick={() => setIsModalOpen(true)} className="btn-primary">
                        <Plus className="w-4 h-4" />
                        Register Worker
                    </button>
                </div>
            )}

            {/* Register Modal */}
            <RegisterWorkerModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        </div>
    );
}
