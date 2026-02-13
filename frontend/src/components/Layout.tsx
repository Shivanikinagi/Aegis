import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    Wallet,
    ListTodo,
    Users,
    Brain,
    Activity,
    Settings,
    Zap,
    ExternalLink,
    Bell,
    TrendingUp,
    Home,
    ChevronLeft
} from 'lucide-react';
import { WalletButton, NetworkIndicator } from './WalletButton';

const navItems = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/tasks', label: 'Tasks', icon: ListTodo },
    { href: '/treasury', label: 'Treasury', icon: Wallet },
    { href: '/workers', label: 'Workers', icon: Users },
    { href: '/decisions', label: 'Decisions', icon: Brain },
    { href: '/learning', label: 'Learning', icon: TrendingUp },
    { href: '/activity', label: 'Activity', icon: Activity },
];

export default function Layout() {
    const location = useLocation();
    const navigate = useNavigate();
    const isDashboard = location.pathname === '/';

    return (
        <div className="flex flex-col min-h-screen bg-[#0a0a0f]">
            {/* Background Gradient Effects */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px]" />
                <div className="absolute top-1/3 -right-40 w-80 h-80 bg-blue-600/15 rounded-full blur-[100px]" />
                <div className="absolute bottom-0 left-1/3 w-72 h-72 bg-purple-500/10 rounded-full blur-[80px]" />
            </div>

            {/* Top Navigation Bar */}
            <header className="sticky top-0 z-50 bg-[#0d0d14]/95 backdrop-blur-xl border-b border-white/10">
                <div className="px-6 py-3">
                    <div className="flex items-center justify-between gap-6">
                        {/* Logo & Brand */}
                        <Link to="/" className="flex items-center gap-3 flex-shrink-0">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg glow-purple">
                                <Zap className="w-5 h-5 text-white" />
                            </div>
                            <div className="hidden md:block">
                                <h1 className="font-bold text-lg text-white">Aegis Treasury</h1>
                                <p className="text-xs text-gray-500">Autonomous Agent</p>
                            </div>
                        </Link>

                        {/* Navigation Items */}
                        <nav className="flex-1 flex items-center justify-center gap-1 overflow-x-auto custom-scrollbar">
                            {navItems.map((item) => {
                                const isActive = location.pathname === item.href;
                                const Icon = item.icon;

                                return (
                                    <Link
                                        key={item.href}
                                        to={item.href}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 whitespace-nowrap ${
                                            isActive
                                                ? 'bg-purple-600/20 text-white border border-purple-500/30'
                                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                                        }`}
                                        title={item.label}
                                    >
                                        <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-purple-400' : ''}`} />
                                        <span className="text-sm font-medium hidden lg:inline">{item.label}</span>
                                        {isActive && (
                                            <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse ml-1 hidden lg:block" />
                                        )}
                                    </Link>
                                );
                            })}
                        </nav>

                        {/* Right Side Actions */}
                        <div className="flex items-center gap-3 flex-shrink-0">
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

                    {/* Back to Dashboard Button (shown when not on dashboard) */}
                    {!isDashboard && (
                        <div className="mt-3 pt-3 border-t border-white/10">
                            <button
                                onClick={() => navigate('/')}
                                className="flex items-center gap-2 text-sm text-gray-400 hover:text-purple-400 transition-colors"
                            >
                                <Home className="w-4 h-4" />
                                <span>Back to Dashboard</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* Agent Status Bar */}
                <div className="px-6 py-2 bg-black/20 border-t border-white/5">
                    <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                <span className="text-green-400 font-medium">Agent Active</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-400">
                                <Brain className="w-3.5 h-3.5 text-purple-400 animate-learning" />
                                <span>Learning & optimizing...</span>
                            </div>
                        </div>
                        <a
                            href="https://testnet.monad.xyz"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-gray-500 hover:text-purple-400 transition-colors"
                        >
                            <div className="w-2 h-2 bg-purple-500 rounded-full" />
                            <span>Monad Testnet</span>
                            <ExternalLink className="w-3 h-3" />
                        </a>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1">
                <div className="p-6 animate-fade-in">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
