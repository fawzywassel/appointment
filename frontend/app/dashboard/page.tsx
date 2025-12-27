'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import apiClient from '@/lib/api-client';
import { format } from 'date-fns';
import {
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Plus,
  PieChart,
  Video,
  MapPin,
  User
} from 'lucide-react';

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
    <div className="min-h-screen bg-gray-50/50">
      {/* Vibrant Header Section */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-500 pb-20 pt-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}, {user?.name}!
              </h1>
              <p className="text-emerald-50 text-lg opacity-90">
                Here's what's happening smoothly with your schedule today.
              </p>
            </div>
            <button
              onClick={() => router.push('/meetings/new')}
              className="bg-white text-emerald-600 hover:bg-emerald-50 font-semibold py-3 px-6 rounded-lg shadow-lg transition-all transform hover:-translate-y-0.5 flex items-center space-x-2"
            >
              <Plus className="w-5 h-5" />
              <span>Book Meeting</span>
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 pb-12">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          {stats && (
            <>
              {/* Total Stats */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center space-x-4">
                <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600">
                  <PieChart className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Total</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
              </div>

              {/* Upcoming */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center space-x-4">
                <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Upcoming</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.upcoming}</p>
                </div>
              </div>

              {/* Pending */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center space-x-4">
                <div className="p-3 bg-amber-50 rounded-lg text-amber-600">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Pending</p>
                  <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
                </div>
              </div>

              {/* Confirmed */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center space-x-4">
                <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Confirmed</p>
                  <p className="text-2xl font-bold text-emerald-600">{stats.confirmed}</p>
                </div>
              </div>

              {/* Cancelled */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center space-x-4">
                <div className="p-3 bg-red-50 rounded-lg text-red-600">
                  <XCircle className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Cancelled</p>
                  <p className="text-2xl font-bold text-red-600">{stats.cancelled}</p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Upcoming Meetings List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
            <h3 className="text-lg font-bold text-gray-900 flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-emerald-600" />
              Upcoming Meetings
            </h3>
            {meetings.length > 0 && (
              <button
                onClick={() => router.push('/meetings')}
                className="text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
              >
                View Calendar →
              </button>
            )}
          </div>
          <div className="divide-y divide-gray-100">
            {loadingData ? (
              <div className="p-12 text-center text-gray-500 flex flex-col items-center">
                <div className="inline-block h-6 w-6 animate-spin rounded-full border-b-2 border-emerald-600 mb-2"></div>
                Loading content...
              </div>
            ) : meetings.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                  <Calendar className="w-8 h-8" />
                </div>
                <p className="text-gray-500 font-medium">No upcoming meetings scheduled</p>
                <button
                  onClick={() => router.push('/meetings/new')}
                  className="mt-4 text-emerald-600 font-medium hover:underline"
                >
                  Schedule your first meeting
                </button>
              </div>
            ) : (
              meetings.map((meeting) => (
                <div key={meeting.id} className="p-6 hover:bg-emerald-50/30 transition-colors group cursor-pointer" onClick={() => router.push(`/meetings/${meeting.id}`)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-5">
                      {/* Date Box */}
                      <div className="flex-shrink-0 w-16 text-center border border-gray-200 rounded-lg p-2 bg-white group-hover:border-emerald-200 transition-colors">
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          {format(new Date(meeting.startTime), 'MMM')}
                        </div>
                        <div className="text-xl font-bold text-gray-900">
                          {format(new Date(meeting.startTime), 'd')}
                        </div>
                      </div>

                      {/* Info */}
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors">
                          {meeting.title || 'Untitled Meeting'}
                        </h4>
                        <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-1.5 opacity-70" />
                            {format(new Date(meeting.startTime), 'h:mm a')} - {format(new Date(meeting.endTime), 'h:mm a')}
                          </div>
                          <div className="flex items-center">
                            {meeting.type === 'VIRTUAL' ? (
                              <>
                                <Video className="w-4 h-4 mr-1.5 opacity-70" />
                                Virtual
                              </>
                            ) : (
                              <>
                                <MapPin className="w-4 h-4 mr-1.5 opacity-70" />
                                In-Person
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-6">
                      <div className="text-right hidden sm:block">
                        {meeting.attendee && (
                          <div className="text-sm">
                            <p className="font-medium text-gray-900">{meeting.attendee.name}</p>
                            <div className="flex items-center justify-end text-xs text-gray-500">
                              <User className="w-3 h-3 mr-1" />
                              Attendee
                            </div>
                          </div>
                        )}
                      </div>

                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium border ${meeting.status === 'CONFIRMED'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                          : meeting.status === 'PENDING'
                            ? 'bg-amber-50 text-amber-700 border-amber-100'
                            : 'bg-gray-50 text-gray-700 border-gray-100'
                          }`}
                      >
                        {meeting.status}
                      </span>

                      {meeting.meetingUrl && (
                        <a
                          href={meeting.meetingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 transition-all"
                          title="Join Meeting"
                        >
                          <Video className="w-5 h-5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
