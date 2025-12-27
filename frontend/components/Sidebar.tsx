'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Calendar, Settings, Users, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function Sidebar() {
    const pathname = usePathname();
    const { user, logout } = useAuth();

    // Don't show sidebar on login or public pages
    if (pathname === '/login' || pathname === '/') return null;

    const links = [
        { href: '/dashboard', label: 'Dashboard', icon: Home },
        { href: '/meetings', label: 'Appointments', icon: Calendar },
    ];

    if (user?.role === 'ADMIN') {
        links.push({ href: '/admin/users', label: 'Users', icon: Users });
    }

    // Add settings link last
    links.push({ href: '/settings', label: 'Settings', icon: Settings });

    return (
        <div className="flex bg-sidebar-background border-r border-sidebar-active h-screen sticky top-0 flex-col w-64 transition-all duration-300">
            <div className="p-6 border-b border-sidebar-active">
                <h1 className="text-2xl font-bold text-primary">Appointment</h1>
                <p className="text-xs text-sidebar-foreground mt-1 opacity-70">VP Scheduling</p>
            </div>

            <nav className="flex-1 overflow-y-auto py-4">
                <ul className="space-y-1 px-3">
                    {links.map((link) => {
                        const Icon = link.icon;
                        const isActive = pathname.startsWith(link.href);
                        return (
                            <li key={link.href}>
                                <Link
                                    href={link.href}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium
                    ${isActive
                                            ? 'bg-sidebar-active text-primary'
                                            : 'text-sidebar-foreground hover:bg-sidebar-active hover:text-primary'
                                        }`}
                                >
                                    <Icon className="w-5 h-5" />
                                    <span>{link.label}</span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            <div className="p-4 border-t border-sidebar-active">
                <div className="flex items-center gap-3 px-4 py-3 mb-2">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                        {user?.name?.[0] || 'U'}
                    </div>
                    <div className="overflow-hidden">
                        <p className="text-sm font-medium text-sidebar-foreground truncate">{user?.name}</p>
                        <p className="text-xs text-gray-500 truncate">{user?.role}</p>
                    </div>
                </div>
                <button
                    onClick={logout}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                </button>
            </div>
        </div>
    );
}
