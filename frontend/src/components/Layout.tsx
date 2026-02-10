import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Wallet,
    ListTodo,
    Users,
    Brain,
    Activity,
    Settings,
    Zap,
    ChevronLeft,
    ChevronRight,
    ExternalLink,
    Bell,
    TrendingUp
} from 'lucide-react';
import { WalletButton, NetworkIndicator } from './WalletButton';

const navItems = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard, description: 'Overview & Stats' },
    { href: '/tasks', label: 'Tasks', icon: ListTodo, description: 'Task Management' },
    { href: '/decisions', label: 'Agent Decisions', icon: Brain, description: 'AI Reasoning' },
    { href: '/learning', label: 'Learning Progress', icon: TrendingUp, description: 'Evolution View' },
    { href: '/treasury', label: 'Treasury', icon: Wallet, description: 'Fund Management' },
    { href: '/activity', label: 'On-Chain Activity', icon: Activity, description: 'Blockchain Logs' },
    { href: '/workers', label: 'Workers', icon: Users, description: 'Agent Registry' },
];

export default function Layout() {
    const location = useLocation();
    const [isCollapsed, setIsCollapsed] = useState(false);

    return (
        <div className="flex min-h-screen bg-[#0a0a0f]">
            {/* Background Gradient Effects */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px]" />
                <div className="absolute top-1/3 -right-40 w-80 h-80 bg-blue-600/15 rounded-full blur-[100px]" />
                <div className="absolute bottom-0 left-1/3 w-72 h-72 bg-purple-500/10 rounded-full blur-[80px]" />
            </div>

            {/* Sidebar */}
            <aside
                className={`fixed left-0 top-0 h-screen z-50 flex flex-col bg-[#0d0d14]/95 backdrop-blur-xl border-r border-white/10 transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'
                    }`}
            >
                {/* Logo */}
                <div className="p-4 border-b border-white/10">
                    <Link to="/" className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg glow-purple">
                            <Zap className="w-5 h-5 text-white" />
                        </div>
                        {!isCollapsed && (
                            <div>
                                <h1 className="font-bold text-lg text-white">Aegis</h1>
                                <p className="text-xs text-gray-500">Treasury Agent</p>
                            </div>
                        )}
                    </Link>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-3 space-y-1 overflow-y-auto custom-scrollbar">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.href;
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.href}
                                to={item.href}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${isActive
                                        ? 'bg-purple-600/20 text-white border border-purple-500/30'
                                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                                    } ${isCollapsed ? 'justify-center' : ''}`}
                                title={isCollapsed ? item.label : undefined}
                            >
                                <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-purple-400' : ''}`} />
                                {!isCollapsed && (
                                    <div className="flex-1 min-w-0">
                                        <span className="text-sm font-medium block">{item.label}</span>
                                        {isActive && (
                                            <span className="text-xs text-gray-500 truncate block">{item.description}</span>
                                        )}
                                    </div>
                                )}
                                {isActive && !isCollapsed && (
                                    <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Status Footer */}
                <div className="p-3 border-t border-white/10">
                    {!isCollapsed && (
                        <div className="glass-card p-3 mb-3">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-gray-500 uppercase tracking-wider font-medium">Agent Status</span>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                    <span className="text-xs text-green-400 font-medium">Learning</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                                <Brain className="w-3.5 h-3.5 text-purple-400 animate-learning" />
                                <span>Improving decisions...</span>
                            </div>
                        </div>
                    )}

                    <a
                        href="https://testnet.monad.xyz"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center gap-2 text-xs text-gray-500 hover:text-purple-400 transition-colors p-2 rounded-lg hover:bg-white/5 ${isCollapsed ? 'justify-center' : ''
                            }`}
                    >
                        <div className="w-2 h-2 bg-purple-500 rounded-full" />
                        {!isCollapsed && <span>Monad Testnet</span>}
                        {!isCollapsed && <ExternalLink className="w-3 h-3 ml-auto" />}
                    </a>
                </div>

                {/* Collapse Toggle */}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="absolute -right-3 top-20 w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center hover:bg-purple-500 transition-colors shadow-lg"
                >
                    {isCollapsed ? (
                        <ChevronRight className="w-4 h-4 text-white" />
                    ) : (
                        <ChevronLeft className="w-4 h-4 text-white" />
                    )}
                </button>
            </aside>

            {/* Main Content */}
            <main className={`flex-1 min-h-screen transition-all duration-300 ${isCollapsed ? 'ml-20' : 'ml-64'}`}>
                {/* Header */}
                <header className="sticky top-0 z-40 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/10">
                    <div className="flex items-center justify-between px-6 py-4">
                        <div className="flex items-center gap-2">
                            <span className="text-gray-500 text-sm">Learning Agent</span>
                            <span className="text-gray-600">/</span>
                            <span className="text-white font-medium text-sm">
                                {navItems.find(item => item.href === location.pathname)?.label || 'Dashboard'}
                            </span>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* Network Indicator */}
                            <NetworkIndicator />

                            {/* Wallet Connection */}
                            <WalletButton />

                            {/* Notifications */}
                            <button className="btn-icon relative">
                                <Bell className="w-5 h-5" />
                                <span className="absolute -top-1 -right-1 w-4 h-4 bg-purple-500 rounded-full text-[10px] font-bold flex items-center justify-center text-white">2</span>
                            </button>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <div className="p-6 animate-fade-in">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
