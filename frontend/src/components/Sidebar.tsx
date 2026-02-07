import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    Wallet,
    Activity,
    Users,
    ListTodo,
    Brain,
    BarChart3,
    Settings,
    Zap,
    ChevronRight,
    ChevronLeft,
    ExternalLink
} from 'lucide-react';

const navItems = [
    { href: '/', label: 'Dashboard', icon: Activity },
    { href: '/treasury', label: 'Treasury', icon: Wallet },
    { href: '/tasks', label: 'Tasks', icon: ListTodo },
    { href: '/workers', label: 'Workers', icon: Users },
    { href: '/learning', label: 'Learning', icon: Brain },
    { href: '/metrics', label: 'Metrics', icon: BarChart3 },
    { href: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
    const location = useLocation();
    const pathname = location.pathname;
    const [isCollapsed, setIsCollapsed] = useState(false);

    return (
        <>
            {/* Spacer to prevent content from going behind fixed sidebar */}
            <div className={`flex-shrink-0 transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`} />
            <aside className={`fixed left-0 top-0 h-screen bg-gradient-to-b from-[#12121a] to-[#0a0a0f] border-r border-[#27272a] flex flex-col z-40 overflow-y-auto transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}>
                {/* Toggle Button */}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="absolute -right-3 top-8 w-6 h-6 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center hover:scale-110 transition-transform z-50 shadow-lg"
                    title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    {isCollapsed ? (
                        <ChevronRight className="w-4 h-4 text-white" />
                    ) : (
                        <ChevronLeft className="w-4 h-4 text-white" />
                    )}
                </button>

                {/* Logo */}
                <div className="p-6 border-b border-[#27272a]">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center animate-pulse-glow">
                            <Zap className="w-6 h-6 text-white" />
                        </div>
                        {!isCollapsed && (
                            <div>
                                <h1 className="font-bold text-lg gradient-text">Treasury Agent</h1>
                                <p className="text-xs text-gray-500">Autonomous • Learning</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.href}
                                to={item.href}
                                className={`
                                flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300
                                ${isActive
                                        ? 'bg-gradient-to-r from-purple-500/20 to-indigo-500/20 text-white border border-purple-500/30'
                                        : 'text-gray-400 hover:text-white hover:bg-[#1e1e2e]'
                                    }
                                ${isCollapsed ? 'justify-center' : ''}
                            `}
                                title={isCollapsed ? item.label : ''}
                            >
                                <Icon className={`w-5 h-5 ${isActive ? 'text-purple-400' : ''} flex-shrink-0`} />
                                {!isCollapsed && (
                                    <>
                                        <span className="font-medium">{item.label}</span>
                                        {isActive && <ChevronRight className="w-4 h-4 ml-auto text-purple-400" />}
                                    </>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer */}
                <div className="p-4 border-t border-[#27272a]">
                    {!isCollapsed && (
                        <>
                            {/* Agent Status */}
                            <div className="glass-card p-4 mb-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs text-gray-500 uppercase tracking-wider">Agent Status</span>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                        <span className="text-xs text-green-400">Active</span>
                                    </div>
                                </div>
                                <p className="text-xs text-gray-400">Learning in progress...</p>
                            </div>

                            {/* Network */}
                            <a
                                href="https://testnet.monadvision.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-xs text-gray-500 hover:text-purple-400 transition-colors"
                            >
                                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                <span>Monad Testnet</span>
                                <ExternalLink className="w-3 h-3 ml-auto" />
                            </a>
                        </>
                    )}
                    {isCollapsed && (
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="Agent Active"></div>
                            <div className="w-2 h-2 bg-purple-500 rounded-full" title="Monad Testnet"></div>
                        </div>
                    )}
                </div>
            </aside>
        </>
    );
}
