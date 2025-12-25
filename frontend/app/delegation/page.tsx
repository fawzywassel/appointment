'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import apiClient from '@/lib/api-client';

interface Delegation {
  id: string;
  vp: { id: string; name: string; email: string };
  delegate: { id: string; name: string; email: string };
  canBook: boolean;
  canCancel: boolean;
  canView: boolean;
  canUpdate: boolean;
  createdAt: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function DelegationPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [delegations, setDelegations] = useState<Delegation[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);

  // New delegation form
  const [newDelegation, setNewDelegation] = useState({
    delegateId: '',
    canBook: true,
    canCancel: true,
    canView: true,
    canUpdate: true,
  });

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    fetchData();
  }, [user, router]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (user?.role === 'VP') {
        // Fetch my delegates
        const response = await apiClient.get('/delegation/my-delegates');
        setDelegations(response.data);
        
        // Fetch potential delegates (EAs and Admins)
        const usersResponse = await apiClient.get('/users');
        setUsers(usersResponse.data.filter((u: User) => 
          (u.role === 'EA' || u.role === 'ADMIN') && u.id !== user.id
        ));
      } else if (user?.role === 'EA') {
        // Fetch VPs I can manage
        const response = await apiClient.get('/delegation/my-vps');
        setDelegations(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch delegations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDelegation = async () => {
    try {
      await apiClient.post('/delegation', newDelegation);
      alert('Delegation added successfully!');
      setShowAddModal(false);
      setNewDelegation({
        delegateId: '',
        canBook: true,
        canCancel: true,
        canView: true,
        canUpdate: true,
      });
      fetchData();
    } catch (error: any) {
      console.error('Failed to add delegation:', error);
      alert(error.response?.data?.message || 'Failed to add delegation');
    }
  };

  const handleRemoveDelegation = async (delegationId: string) => {
    if (!confirm('Are you sure you want to remove this delegation?')) {
      return;
    }

    try {
      await apiClient.delete(`/delegation/${delegationId}`);
      alert('Delegation removed successfully');
      fetchData();
    } catch (error) {
      console.error('Failed to remove delegation:', error);
      alert('Failed to remove delegation');
    }
  };

  const handleUpdatePermissions = async (delegationId: string, permissions: any) => {
    try {
      await apiClient.patch(`/delegation/${delegationId}`, permissions);
      alert('Permissions updated successfully');
      fetchData();
    } catch (error) {
      console.error('Failed to update permissions:', error);
      alert('Failed to update permissions');
    }
  };

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-blue-600 hover:text-blue-800"
            >
              ← Back to Dashboard
            </button>
            <h1 className="text-xl font-semibold text-gray-900">
              {user.role === 'VP' ? 'Manage Delegates' : 'My VPs'}
            </h1>
            {user.role === 'VP' && (
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                + Add Delegate
              </button>
            )}
            {user.role !== 'VP' && <div className="w-32"></div>}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* VP View */}
        {user.role === 'VP' && (
          <>
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">About Delegation</h2>
              <p className="text-gray-600">
                Grant your Executive Assistants permission to manage your calendar and meetings. 
                You can customize what each delegate can do.
              </p>
            </div>

            {delegations.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <div className="text-4xl mb-4">👥</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No delegates yet</h3>
                <p className="text-gray-600 mb-6">
                  Add an Executive Assistant to help manage your schedule
                </p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Add First Delegate
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {delegations.map((delegation) => (
                  <div key={delegation.id} className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {delegation.delegate.name}
                        </h3>
                        <p className="text-sm text-gray-600">{delegation.delegate.email}</p>
                      </div>
                      <button
                        onClick={() => handleRemoveDelegation(delegation.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={delegation.canBook}
                          onChange={(e) =>
                            handleUpdatePermissions(delegation.id, {
                              canBook: e.target.checked,
                            })
                          }
                          className="rounded text-blue-600"
                        />
                        <span className="text-sm text-gray-700">Can Book</span>
                      </label>

                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={delegation.canCancel}
                          onChange={(e) =>
                            handleUpdatePermissions(delegation.id, {
                              canCancel: e.target.checked,
                            })
                          }
                          className="rounded text-blue-600"
                        />
                        <span className="text-sm text-gray-700">Can Cancel</span>
                      </label>

                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={delegation.canView}
                          onChange={(e) =>
                            handleUpdatePermissions(delegation.id, {
                              canView: e.target.checked,
                            })
                          }
                          className="rounded text-blue-600"
                        />
                        <span className="text-sm text-gray-700">Can View</span>
                      </label>

                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={delegation.canUpdate}
                          onChange={(e) =>
                            handleUpdatePermissions(delegation.id, {
                              canUpdate: e.target.checked,
                            })
                          }
                          className="rounded text-blue-600"
                        />
                        <span className="text-sm text-gray-700">Can Update</span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* EA View */}
        {user.role === 'EA' && (
          <>
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Your VPs</h2>
              <p className="text-gray-600">
                You have been granted access to manage the following VP schedules.
              </p>
            </div>

            {delegations.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <div className="text-4xl mb-4">📋</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No VPs assigned</h3>
                <p className="text-gray-600">
                  You haven't been assigned to any VPs yet. Contact your administrator.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {delegations.map((delegation) => (
                  <div key={delegation.id} className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center mb-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                        <span className="text-lg font-bold text-blue-600">
                          {delegation.vp.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {delegation.vp.name}
                        </h3>
                        <p className="text-sm text-gray-600">{delegation.vp.email}</p>
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Your Permissions:</h4>
                      <div className="flex flex-wrap gap-2">
                        {delegation.canBook && (
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                            ✓ Book
                          </span>
                        )}
                        {delegation.canCancel && (
                          <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                            ✓ Cancel
                          </span>
                        )}
                        {delegation.canView && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                            ✓ View
                          </span>
                        )}
                        {delegation.canUpdate && (
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                            ✓ Update
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 flex space-x-2">
                      <button
                        onClick={() => router.push('/meetings/new')}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                      >
                        Book Meeting
                      </button>
                      <button
                        onClick={() => router.push('/meetings')}
                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
                      >
                        View Calendar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* Add Delegation Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Add Delegate</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Executive Assistant *
                </label>
                <select
                  value={newDelegation.delegateId}
                  onChange={(e) =>
                    setNewDelegation({ ...newDelegation, delegateId: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Choose a delegate...</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Permissions</h3>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={newDelegation.canBook}
                      onChange={(e) =>
                        setNewDelegation({ ...newDelegation, canBook: e.target.checked })
                      }
                      className="rounded text-blue-600"
                    />
                    <span className="text-sm text-gray-700">Can book meetings</span>
                  </label>

                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={newDelegation.canCancel}
                      onChange={(e) =>
                        setNewDelegation({ ...newDelegation, canCancel: e.target.checked })
                      }
                      className="rounded text-blue-600"
                    />
                    <span className="text-sm text-gray-700">Can cancel meetings</span>
                  </label>

                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={newDelegation.canView}
                      onChange={(e) =>
                        setNewDelegation({ ...newDelegation, canView: e.target.checked })
                      }
                      className="rounded text-blue-600"
                    />
                    <span className="text-sm text-gray-700">Can view meetings</span>
                  </label>

                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={newDelegation.canUpdate}
                      onChange={(e) =>
                        setNewDelegation({ ...newDelegation, canUpdate: e.target.checked })
                      }
                      className="rounded text-blue-600"
                    />
                    <span className="text-sm text-gray-700">Can update meetings</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-6 flex space-x-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddDelegation}
                disabled={!newDelegation.delegateId}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
              >
                Add Delegate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
