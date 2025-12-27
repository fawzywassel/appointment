'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import apiClient from '@/lib/api-client';
import UserListTable from '@/components/UserListTable';
import UserFormModal from '@/components/UserFormModal';
import { toast } from 'sonner';

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
}

export default function UsersPage() {
    const { user, loading, isAuthenticated } = useAuth();
    const router = useRouter();
    const [users, setUsers] = useState<User[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    useEffect(() => {
        if (!loading && !isAuthenticated) {
            router.push('/login');
        }
    }, [loading, isAuthenticated, router]);

    useEffect(() => {
        if (isAuthenticated && user?.role === 'ADMIN') {
            fetchUsers();
        } else if (isAuthenticated && user?.role !== 'ADMIN') {
            toast.error('Unauthorized access');
            router.push('/dashboard');
        }
    }, [isAuthenticated, user, router]);

    const fetchUsers = async () => {
        try {
            const response = await apiClient.get('/users');
            setUsers(response.data);
        } catch (error) {
            toast.error('Failed to fetch users');
            console.error(error);
        } finally {
            setIsLoadingData(false);
        }
    };

    const handleCreate = () => {
        setEditingUser(null);
        setIsModalOpen(true);
    };

    const handleEdit = (user: any) => {
        setEditingUser(user);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this user?')) return;

        try {
            await apiClient.delete(`/users/${id}`);
            toast.success('User deleted successfully');
            fetchUsers();
        } catch (error) {
            toast.error('Failed to delete user');
            console.error(error);
        }
    };

    const handleSubmit = async (data: any) => {
        try {
            if (editingUser) {
                await apiClient.patch(`/users/${editingUser.id}`, data);
                toast.success('User updated successfully');
            } else {
                await apiClient.post('/users', data);
                toast.success('User created successfully');
            }
            fetchUsers();
        } catch (error) {
            toast.error(editingUser ? 'Failed to update user' : 'Failed to create user');
            throw error;
        }
    };

    if (loading || isLoadingData) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-gray-600">Loading...</div>
            </div>
        );
    }

    if (!user || user.role !== 'ADMIN') return null;

    return (
        <div className="min-h-screen bg-gray-50/50">
            {/* Vibrant Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-500 pb-20 pt-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
                        <div>
                            <div className="flex items-center space-x-3 mb-2">
                                <button
                                    onClick={() => router.push('/dashboard')}
                                    className="text-emerald-100 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                    </svg>
                                </button>
                                <h1 className="text-3xl font-bold text-white">User Management</h1>
                            </div>
                            <p className="text-emerald-50 text-lg opacity-90 pl-9">
                                Manage system users, roles, and permissions.
                            </p>
                        </div>
                        <button
                            onClick={handleCreate}
                            className="bg-white text-emerald-600 hover:bg-emerald-50 font-semibold py-3 px-6 rounded-lg shadow-lg transition-all transform hover:-translate-y-0.5 flex items-center space-x-2"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            <span>Create User</span>
                        </button>
                    </div>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 pb-12">
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <h2 className="text-lg font-semibold text-gray-900">All System Users</h2>
                        <span className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-200">
                            Total: {users.length}
                        </span>
                    </div>
                    <UserListTable
                        users={users}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                    />
                </div>

                <UserFormModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSubmit={handleSubmit}
                    user={editingUser}
                />
            </main>
        </div>
    );
}
