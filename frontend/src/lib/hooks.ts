'use client';

import { useState, useEffect, useCallback } from 'react';

interface UseFetchResult<T> {
    data: T | null;
    loading: boolean;
    error: Error | null;
    refetch: () => void;
}

export function useFetch<T>(
    fetchFn: () => Promise<T>,
    deps: React.DependencyList = [],
    interval?: number
): UseFetchResult<T> {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const result = await fetchFn();
            setData(result);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Unknown error'));
        } finally {
            setLoading(false);
        }
    }, [fetchFn]);

    useEffect(() => {
        fetchData();

        if (interval) {
            const id = setInterval(fetchData, interval);
            return () => clearInterval(id);
        }
    }, [...deps, interval, fetchData]);

    return { data, loading, error, refetch: fetchData };
}

export function usePolling<T>(
    fetchFn: () => Promise<T>,
    intervalMs: number = 5000
): UseFetchResult<T> {
    return useFetch(fetchFn, [], intervalMs);
}

export function formatAddress(address: string, chars: number = 6): string {
    if (!address) return '';
    return `${address.slice(0, chars)}...${address.slice(-4)}`;
}

export function formatMON(value: number, decimals: number = 4): string {
    return `${value.toFixed(decimals)} MON`;
}

export function formatPercent(value: number): string {
    return `${(value * 100).toFixed(1)}%`;
}

export function formatTimestamp(timestamp: number): string {
    if (!timestamp) return 'N/A';
    return new Date(timestamp * 1000).toLocaleString();
}

export function formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

export function getStatusColor(status: string): string {
    const colors: Record<string, string> = {
        CREATED: 'status-created',
        ASSIGNED: 'status-assigned',
        SUBMITTED: 'status-submitted',
        VERIFIED: 'status-verified',
        COMPLETED: 'status-completed',
        FAILED: 'status-failed',
        CANCELLED: 'status-failed',
    };
    return colors[status] || 'status-created';
}

export function getTaskTypeIcon(type: string): string {
    const icons: Record<string, string> = {
        DATA_ANALYSIS: '📊',
        TEXT_GENERATION: '📝',
        CODE_REVIEW: '💻',
        RESEARCH: '🔬',
        COMPUTATION: '🧮',
        OTHER: '📦',
    };
    return icons[type] || '📦';
}
