const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) 
  || (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL) 
  || 'http://localhost:8000';

export interface TreasuryData {
    balance: {
        total: number;
        reserved: number;
        available: number;
    };
    daily: {
        spent: number;
        remaining: number;
    };
    rules: {
        maxSpendPerTask: number;
        maxSpendPerDay: number;
        minTaskValue: number;
        cooldownPeriod: number;
    };
    address: string;
}

export interface Task {
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

export interface Worker {
    address: string;
    isActive: boolean;
    registeredAt: number;
    totalTasks: number;
    successfulTasks: number;
    totalEarnings: number;
    reliabilityScore: number;
    allowedTaskTypes: number[];
    memoryReliability: number;
    memorySuccessRate: number;
}

export interface Metrics {
    total_workers: number;
    total_tasks: number;
    strategy: {
        total_decisions: number;
        successful_allocations: number;
        failed_allocations: number;
        total_spent: number;
        total_value_delivered: number;
        average_cost_per_success: number;
        roi: number;
    };
    top_workers: Array<{
        address: string;
        reliability: number;
        success_rate: number;
        total_tasks: number;
    }>;
    treasury?: {
        total: number;
        reserved: number;
        available: number;
        utilizationRate: number;
    };
}

export interface LearningStats {
    running: boolean;
    decisions_made: number;
    successful_decisions: number;
    success_rate: number;
    exploration_rate: number;
    total_bandit_pulls: number;
    payment_models: number;
    cycleCount?: number;
}

export interface SystemStatus {
    running: boolean;
    cycle_count: number;
    proposals_made: number;
    verifications_done: number;
    treasury: {
        total: number;
        reserved: number;
        available: number;
        daily_spent: number;
        daily_remaining: number;
    };
    learning: LearningStats;
    metrics: Metrics;
}

async function fetchAPI<T>(endpoint: string): Promise<T> {
    const res = await fetch(`${API_BASE}${endpoint}`, {
        cache: 'no-store',
    });

    if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
    }

    return res.json();
}

export async function getSystemStatus(): Promise<SystemStatus> {
    return fetchAPI<SystemStatus>('/api/status');
}

export async function getTreasury(): Promise<TreasuryData> {
    return fetchAPI<TreasuryData>('/api/treasury');
}

export async function getTasks(status?: string): Promise<{ tasks: Task[]; total: number; openCount: number }> {
    const query = status ? `?status=${status}` : '';
    return fetchAPI(`/api/tasks${query}`);
}

export async function getTask(taskId: number): Promise<Task> {
    return fetchAPI<Task>(`/api/tasks/${taskId}`);
}

export async function getWorkers(): Promise<{ workers: Worker[]; totalActive: number }> {
    return fetchAPI('/api/workers');
}

export async function getWorker(address: string): Promise<Worker> {
    return fetchAPI<Worker>(`/api/workers/${address}`);
}

export async function getMetrics(): Promise<Metrics> {
    return fetchAPI<Metrics>('/api/metrics');
}

export async function getLearningStats(): Promise<LearningStats> {
    return fetchAPI<LearningStats>('/api/learning');
}

export async function healthCheck(): Promise<{ status: string; blockchain_connected: boolean; agent_running: boolean }> {
    return fetchAPI('/api/health');
}
