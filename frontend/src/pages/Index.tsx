import { useState, useEffect } from 'react';
import { Wallet, CheckCircle, Clock, TrendingUp, Brain, Shield, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  getTreasuryData,
  getTasks,
  getWorkers,
  checkConnection,
  formatMON,
  formatAddress,
  formatPercent
} from '@/lib/blockchainUtils';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  trend?: { value: number; isPositive: boolean };
  variant?: 'primary' | 'success' | 'warning';
}

function StatCard({ label, value, icon: Icon, trend, variant = 'primary' }: StatCardProps) {
  const colors = {
    primary: 'from-primary/20 to-primary/5 border-primary/20',
    success: 'from-green-500/20 to-green-500/5 border-green-500/20',
    warning: 'from-yellow-500/20 to-yellow-500/5 border-yellow-500/20'
  };

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-xl">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardDescription className="text-muted-foreground text-sm font-medium">
            {label}
          </CardDescription>
          <div className={`relative p-2 rounded-lg bg-gradient-to-br ${colors[variant]} border`}>
            <Icon className="w-4 h-4 text-primary" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <div className="text-2xl font-bold">{value}</div>
          {trend && (
            <div className={`text-xs flex items-center ${trend.isPositive ? 'text-green-500' : 'text-red-500'}`}>
              <TrendingUp className={`w-3 h-3 mr-1 ${!trend.isPositive ? 'rotate-180' : ''}`} />
              {trend.value}%
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

const Index = () => {
  const [treasuryBalance, setTreasuryBalance] = useState<number>(0);
  const [dailySpent, setDailySpent] = useState<number>(0);
  const [activeTasks, setActiveTasks] = useState<number>(0);
  const [completedTasks, setCompletedTasks] = useState<number>(0);
  const [avgSuccessRate, setAvgSuccessRate] = useState<number>(0);
  const [connected, setConnected] = useState<boolean>(false);
  const [blockNumber, setBlockNumber] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = async () => {
    setIsRefreshing(true);
    try {
      const connStatus = await checkConnection();
      setConnected(connStatus.connected);
      setBlockNumber(connStatus.blockNumber || 0);

      const [treasuryData, tasksData, workersData] = await Promise.all([
        getTreasuryData(),
        getTasks(),
        getWorkers(),
      ]);

      if (treasuryData) {
        setTreasuryBalance(treasuryData.balance.total);
        setDailySpent(treasuryData.daily.spent);
      }

      if (tasksData) {
        setActiveTasks(tasksData.openCount);
        setCompletedTasks(tasksData.tasks.filter(t => t.status === 'COMPLETED').length);
      }

      if (workersData && workersData.workers.length > 0) {
        const avgRate = workersData.workers.reduce((acc, w) => acc + (w.successRate || 0), 0) / workersData.workers.length;
        setAvgSuccessRate(avgRate);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Background glow effect */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
              <div className="relative p-2 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
                <Brain className="w-6 h-6 text-primary" />
              </div>
            </div>
            <div>
              <h1 className="font-bold text-lg">Autonomous Treasury Agent</h1>
              <p className="text-xs text-muted-foreground">Policy-Constrained AI</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary/50 border border-border/50">
              <Shield className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Block #{blockNumber}</span>
            </div>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${connected ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
              <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
              <span className="text-sm font-medium">{connected ? 'Connected' : 'Disconnected'}</span>
            </div>
            <button
              onClick={fetchData}
              disabled={isRefreshing}
              className="p-2 rounded-lg bg-primary/20 hover:bg-primary/30 transition-colors border border-primary/20"
            >
              <RefreshCw className={`w-4 h-4 text-primary ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 relative">
        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Treasury Balance"
            value={formatMON(treasuryBalance, 2)}
            icon={Wallet}
            variant="primary"
          />
          <StatCard
            label="Active Tasks"
            value={activeTasks}
            icon={Clock}
            variant="warning"
          />
          <StatCard
            label="Completed Tasks"
            value={completedTasks}
            icon={CheckCircle}
            trend={{ value: 12, isPositive: true }}
            variant="success"
          />
          <StatCard
            label="Avg Success Rate"
            value={formatPercent(avgSuccessRate)}
            icon={TrendingUp}
            trend={{ value: 5.2, isPositive: true }}
          />
        </div>

        {/* Main Content */}
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="bg-secondary/50 border border-border/50 p-1">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="treasury">Treasury</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="agents">Agents</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Welcome to Autonomous Treasury Agent</CardTitle>
                <CardDescription>
                  AI-powered treasury management with on-chain security constraints
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    This system demonstrates how an AI agent can autonomously manage treasury funds while being constrained by smart contract rules. The agent learns from its decisions and improves over time, but can never exceed spending limits or steal funds.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                    <div className="p-4 rounded-lg border border-border/50 bg-card/50">
                      <h3 className="font-semibold mb-2 flex items-center gap-2">
                        <Shield className="w-4 h-4 text-green-500" />
                        Security Model
                      </h3>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• No wallet access - agent can't steal</li>
                        <li>• Contract-enforced spending limits</li>
                        <li>• 100 MON daily spending cap</li>
                        <li>• 10 MON maximum per task</li>
                      </ul>
                    </div>
                    <div className="p-4 rounded-lg border border-border/50 bg-card/50">
                      <h3 className="font-semibold mb-2 flex items-center gap-2">
                        <Brain className="w-4 h-4 text-purple-500" />
                        AI Learning
                      </h3>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Q-learning reinforcement algorithm</li>
                        <li>• Learns from task outcomes</li>
                        <li>• Improves worker selection</li>
                        <li>• Optimizes spending efficiency</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Daily Spending</CardTitle>
                <CardDescription>{formatMON(dailySpent, 2)} of 100 MON used today</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Budget Used</span>
                    <span className="font-medium">{formatPercent(dailySpent / 100)}</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${Math.min((dailySpent / 100) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="treasury">
            <Card>
              <CardHeader>
                <CardTitle>Treasury Management</CardTitle>
                <CardDescription>Contract-controlled fund management</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Treasury details coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tasks">
            <Card>
              <CardHeader>
                <CardTitle>Task Management</CardTitle>
                <CardDescription>AI-assigned tasks and worker performance</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Task list coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="agents">
            <Card>
              <CardHeader>
                <CardTitle>Agent Workers</CardTitle>
                <CardDescription>Registered workers and their performance metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Agent list coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
