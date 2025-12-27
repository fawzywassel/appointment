'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Calendar, Settings, Users, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';

export default function Sidebar() {
    const pathname = usePathname();
    const { user, logout } = useAuth();
    const [isOpen, setIsOpen] = useState(false);

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
        <>
            {/* Mobile Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="md:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md border border-gray-200 text-gray-700 active:bg-gray-50"
            >
                {isOpen ? <LogOut className="w-6 h-6 rotate-180" /> : <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>}
            </button>

            {/* Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sidebar Container */}
            <div className={`
                fixed inset-y-0 left-0 z-50 w-64 bg-sidebar-background border-r border-sidebar-active 
                transform transition-transform duration-300 ease-in-out flex flex-col h-full
                ${isOpen ? 'translate-x-0' : '-translate-x-full'}
                md:relative md:translate-x-0 md:sticky md:top-0 md:h-screen
            `}>
                <div className="p-6 border-b border-sidebar-active flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-primary">Appointment</h1>
                        <p className="text-xs text-sidebar-foreground mt-1 opacity-70">VP Scheduling</p>
                    </div>
                    {/* Close button for mobile inside sidebar (optional, reusing toggle logic outside primarily) */}
                    <button
                        onClick={() => setIsOpen(false)}
                        className="md:hidden text-gray-500 hover:text-gray-700"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
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
                                        onClick={() => setIsOpen(false)} // Close on navigate
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
        </>
    );
}
