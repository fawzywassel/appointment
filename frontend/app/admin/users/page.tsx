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
        <div className="min-h-screen bg-gray-50">
            <nav className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <h1 className="text-xl font-semibold text-gray-900">
                            User Management
                        </h1>
                        <button
                            onClick={() => router.push('/dashboard')}
                            className="text-gray-600 hover:text-gray-900"
                        >
                            Back to Dashboard
                        </button>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-medium text-gray-900">All Users</h2>
                    <button
                        onClick={handleCreate}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
                    >
                        Create User
                    </button>
                </div>

                <UserListTable
                    users={users}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                />

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
