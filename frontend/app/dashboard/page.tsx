'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import apiClient from '@/lib/api-client';
import { format } from 'date-fns';

interface Meeting {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  type: string;
  status: string;
  meetingUrl?: string;
  location?: string;
  vp: { name: string; email: string };
  attendee?: { name: string; email: string };
}

interface Stats {
  total: number;
  pending: number;
  confirmed: number;
  cancelled: number;
  upcoming: number;
}

export default function DashboardPage() {
  const { user, loading, logout, isAuthenticated } = useAuth();
  const router = useRouter();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [loading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchDashboardData();
    }
  }, [isAuthenticated]);

  const fetchDashboardData = async () => {
    try {
      const [meetingsRes, statsRes] = await Promise.all([
        apiClient.get('/meetings'),
        apiClient.get('/meetings/stats'),
      ]);
      setMeetings(meetingsRes.data.slice(0, 5)); // Show first 5
      setStats(statsRes.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-semibold text-gray-900">
              VP Scheduling Dashboard
            </h1>
            <div className="flex items-center space-x-4">
              <div className="text-sm">
                <p className="font-medium text-gray-900">{user.name}</p>
                <p className="text-gray-500">{user.role}</p>
              </div>
              <button
                onClick={logout}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome back, {user.name}!
          </h2>
          <p className="text-gray-600">Here's what's happening with your schedule</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          {stats && (
            <>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-sm text-gray-600 mb-1">Total Meetings</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-sm text-gray-600 mb-1">Upcoming</p>
                <p className="text-3xl font-bold text-blue-600">{stats.upcoming}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-sm text-gray-600 mb-1">Pending</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-sm text-gray-600 mb-1">Confirmed</p>
                <p className="text-3xl font-bold text-green-600">{stats.confirmed}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-sm text-gray-600 mb-1">Cancelled</p>
                <p className="text-3xl font-bold text-red-600">{stats.cancelled}</p>
              </div>
            </>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <button
            onClick={() => router.push('/meetings/new')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            Book New Meeting
          </button>
          <button
            onClick={() => router.push('/meetings')}
            className="bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 font-medium py-3 px-4 rounded-lg transition-colors"
          >
            View Calendar
          </button>
          <button
            onClick={() => router.push('/settings')}
            className="bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 font-medium py-3 px-4 rounded-lg transition-colors"
          >
            Settings
          </button>
        </div>

        {/* Upcoming Meetings */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Upcoming Meetings</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {loadingData ? (
              <div className="p-6 text-center text-gray-500">Loading meetings...</div>
            ) : meetings.length === 0 ? (
              <div className="p-6 text-center text-gray-500">No upcoming meetings</div>
            ) : (
              meetings.map((meeting) => (
                <div key={meeting.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="text-base font-semibold text-gray-900 mb-1">
                        {meeting.title || 'Meeting'}
                      </h4>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>📅 {format(new Date(meeting.startTime), 'PPp')}</span>
                        <span>
                          {meeting.type === 'VIRTUAL' ? '💻 Virtual' : '📍 In-Person'}
                        </span>
                        {meeting.attendee && <span>👤 {meeting.attendee.name}</span>}
                      </div>
                      {meeting.meetingUrl && (
                        <a
                          href={meeting.meetingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-700 text-sm mt-2 inline-block"
                        >
                          Join Meeting →
                        </a>
                      )}
                    </div>
                    <div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${meeting.status === 'CONFIRMED'
                            ? 'bg-green-100 text-green-800'
                            : meeting.status === 'PENDING'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                      >
                        {meeting.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          {meetings.length > 0 && (
            <div className="px-6 py-4 bg-gray-50 text-center">
              <button className="text-blue-600 hover:text-blue-700 font-medium text-sm">
                View All Meetings →
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
