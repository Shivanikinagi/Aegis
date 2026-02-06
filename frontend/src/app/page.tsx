'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import StatCard, { ProgressBar, Badge } from '@/components/StatCard';
import { TaskList } from '@/components/TaskCard';
import { WorkerLeaderboard } from '@/components/WorkerCard';
import { SpendingChart, LearningProgressChart } from '@/components/Charts';
import {
  Wallet,
  Activity,
  Users,
  Brain,
  Zap,
  RefreshCw,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { formatMON, formatPercent } from '@/lib/hooks';
import { getTreasuryData, getTasks, getWorkers, checkConnection } from '@/lib/blockchain';

// Learning data (from agent API when running)
const learningData = {
  successRate: 0.78,
  explorationRate: 0.15,
  decisionsMade: 0,
  successfulDecisions: 0
};

const learningProgress = [
  { cycle: 0, successRate: 0.5, explorationRate: 0.3 },
  { cycle: 20, successRate: 0.55, explorationRate: 0.28 },
  { cycle: 40, successRate: 0.62, explorationRate: 0.25 },
  { cycle: 60, successRate: 0.68, explorationRate: 0.22 },
  { cycle: 80, successRate: 0.72, explorationRate: 0.20 },
  { cycle: 100, successRate: 0.75, explorationRate: 0.18 },
];

const spendingData = [
  { name: 'Mon', spent: 0, success: 0 },
  { name: 'Tue', spent: 0, success: 0 },
  { name: 'Wed', spent: 0, success: 0 },
  { name: 'Thu', spent: 0, success: 0 },
  { name: 'Fri', spent: 0, success: 0 },
  { name: 'Sat', spent: 0, success: 0 },
  { name: 'Sun', spent: 0, success: 0 },
];

interface TreasuryData {
  balance: { total: number; available: number; reserved: number };
  daily: { spent: number; remaining: number };
  address: string | undefined;
}

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

interface Worker {
  address: string;
  isActive: boolean;
  registeredAt: number;
  totalTasks: number;
  successfulTasks: number;
  totalEarnings: number;
  reliabilityScore: number;
  allowedTaskTypes: number[];
}

export default function Dashboard() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [connected, setConnected] = useState<boolean | null>(null);
  const [blockNumber, setBlockNumber] = useState<number>(0);
  const [mounted, setMounted] = useState(false);

  // Real blockchain data
  const [treasury, setTreasury] = useState<TreasuryData | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [taskCount, setTaskCount] = useState(0);
  const [openTaskCount, setOpenTaskCount] = useState(0);

  const fetchData = async () => {
    setIsRefreshing(true);
    try {
      // Check connection
      const connStatus = await checkConnection();
      setConnected(connStatus.connected);
      if (connStatus.connected && connStatus.blockNumber) {
        setBlockNumber(connStatus.blockNumber);
      }

      // Fetch real data from blockchain
      const [treasuryData, tasksData, workersData] = await Promise.all([
        getTreasuryData(),
        getTasks(),
        getWorkers(),
      ]);

      if (treasuryData) setTreasury(treasuryData);
      if (tasksData) {
        setTasks(tasksData.tasks);
        setTaskCount(tasksData.total);
        setOpenTaskCount(tasksData.openCount);
      }
      if (workersData) setWorkers(workersData.workers);

      setLastUpdate(new Date().toLocaleTimeString());
    } catch (error) {
      console.error('Error fetching data:', error);
      setConnected(false);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Initial fetch and auto-refresh - only on client
  useEffect(() => {
    setMounted(true);
    fetchData();
    const interval = setInterval(fetchData, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const activeWorkers = workers.filter(w => w.isActive).length;
  const completedTasks = tasks.filter(t => t.status === 'COMPLETED').length;
  const successRate = taskCount > 0 ? completedTasks / taskCount : 0;

  return (
    <div className="flex min-h-screen bg-[#0a0a0f]">
      <Sidebar />

      <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-x-hidden min-w-0">
        <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 md:mb-8 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Dashboard</h1>
            <p className="text-sm md:text-base text-gray-400">
              Real-time data from deployed smart contracts
            </p>
          </div>
          <div className="flex items-center gap-3 md:gap-4">
            <div className="text-right">
              <p className="text-xs text-gray-500">Block #{blockNumber}</p>
              <p className="text-sm text-gray-400">{mounted ? lastUpdate : '—'}</p>
            </div>
            <button
              onClick={fetchData}
              className={`btn-secondary flex items-center gap-2 text-sm md:text-base ${isRefreshing ? 'opacity-50' : ''}`}
              disabled={isRefreshing}
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Connection Status Banner */}
        <div className={`glass-card p-4 mb-6 md:mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4 ${connected
          ? 'bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/30'
          : connected === false
            ? 'bg-gradient-to-r from-red-500/10 to-rose-500/10 border-red-500/30'
            : 'bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/30'
          }`}>
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${connected
              ? 'bg-gradient-to-br from-green-500 to-emerald-600'
              : 'bg-gradient-to-br from-red-500 to-rose-600'
              }`}>
              {connected ? (
                <CheckCircle className="w-6 h-6 text-white" />
              ) : (
                <AlertCircle className="w-6 h-6 text-white" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base md:text-lg font-semibold text-white">
                  {connected ? 'Connected to Blockchain' : connected === false ? 'Connection Failed' : 'Connecting...'}
                </h2>
                <Badge variant={connected ? 'success' : connected === false ? 'error' : 'warning'}>
                  {connected ? 'Live' : connected === false ? 'Offline' : 'Checking'}
                </Badge>
              </div>
              <p className="text-sm text-gray-400">
                {connected
                  ? `Local Hardhat Network • Chain ID: 31337 • Block: ${blockNumber}`
                  : 'Make sure Hardhat node is running: npx hardhat node'
                }
              </p>
            </div>
          </div>
          {connected && (
            <div className="flex items-center gap-4 md:gap-6">
              <div className="text-center">
                <p className="text-xl md:text-2xl font-bold text-green-400">{taskCount}</p>
                <p className="text-xs text-gray-500">Total Tasks</p>
              </div>
              <div className="text-center">
                <p className="text-xl md:text-2xl font-bold text-blue-400">{activeWorkers}</p>
                <p className="text-xs text-gray-500">Workers</p>
              </div>
            </div>
          )}
        </div>

        {/* Main Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
          <StatCard
            title="Treasury Balance"
            value={treasury ? formatMON(treasury.balance.total, 2) : '—'}
            subtitle={treasury ? `${formatMON(treasury.balance.available, 2)} available` : 'Loading...'}
            icon={Wallet}
            accentColor="purple"
          >
            {treasury && (
              <div className="mt-4">
                <ProgressBar
                  value={treasury.balance.reserved}
                  max={treasury.balance.total || 1}
                  label="Reserved"
                  color="purple"
                />
              </div>
            )}
          </StatCard>

          <StatCard
            title="Daily Spending"
            value={treasury ? formatMON(treasury.daily.spent, 2) : '—'}
            subtitle="of 100 MON limit"
            icon={Activity}
            accentColor="blue"
          >
            {treasury && (
              <div className="mt-4">
                <ProgressBar
                  value={treasury.daily.spent}
                  max={100}
                  label="Budget used"
                  color="blue"
                />
              </div>
            )}
          </StatCard>

          <StatCard
            title="Active Workers"
            value={activeWorkers}
            subtitle={`${workers.length} total registered`}
            icon={Users}
            accentColor="green"
          />

          <StatCard
            title="Tasks"
            value={taskCount}
            subtitle={`${openTaskCount} open, ${completedTasks} completed`}
            icon={Brain}
            accentColor="yellow"
          >
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Success rate</span>
                <span className="text-green-400">{formatPercent(successRate)}</span>
              </div>
            </div>
          </StatCard>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
          <SpendingChart data={spendingData} />
          <LearningProgressChart data={learningProgress} />
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6">
          {/* Recent Tasks */}
          <div className="xl:col-span-2">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <h2 className="text-lg md:text-xl font-semibold text-white">Recent Tasks</h2>
              <a href="/tasks" className="text-sm text-purple-400 hover:text-purple-300">
                View all →
              </a>
            </div>
            {tasks.length > 0 ? (
              <TaskList tasks={tasks.slice(0, 6) as any} />
            ) : (
              <div className="glass-card p-8 text-center">
                <Zap className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400">No tasks yet</p>
                <p className="text-sm text-gray-500 mt-2">Create a task to get started</p>
              </div>
            )}
          </div>

          {/* Top Workers */}
          <div>
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <h2 className="text-lg md:text-xl font-semibold text-white">Workers</h2>
              <a href="/workers" className="text-sm text-purple-400 hover:text-purple-300">
                View all →
              </a>
            </div>
            <div className="glass-card p-4">
              {workers.length > 0 ? (
                <WorkerLeaderboard workers={workers as any} />
              ) : (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400">No workers registered</p>
                  <p className="text-sm text-gray-500 mt-2">Run setup script to add workers</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Security Model */}
        <div className="mt-6 md:mt-8 glass-card p-4 md:p-6">
          <h2 className="text-lg md:text-xl font-semibold text-white mb-4">Security Model</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {[
              { risk: 'Agent steals money', protection: 'Impossible (no wallet access)', icon: '🔒' },
              { risk: 'Agent overspends', protection: 'Contract limits enforced', icon: '⚖️' },
              { risk: 'Bad worker', protection: 'Verification + slashing', icon: '🛡️' },
              { risk: 'Hidden actions', protection: 'Full on-chain logs', icon: '📝' },
            ].map((item, index) => (
              <div key={index} className="bg-[#1e1e2e] rounded-xl p-4">
                <div className="text-2xl mb-2">{item.icon}</div>
                <p className="text-sm text-gray-400 mb-1">{item.risk}</p>
                <p className="text-sm text-green-400 font-medium">{item.protection}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Quote */}
        <div className="mt-6 md:mt-8 text-center">
          <p className="text-base md:text-lg text-gray-500 italic">
            "The agent decides. The contract enforces."
          </p>
        </div>
        </div>
      </main>
    </div>
  );
}
