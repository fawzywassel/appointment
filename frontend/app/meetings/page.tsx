'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import apiClient from '@/lib/api-client';
import { format } from 'date-fns';
import StatusBadge from '@/components/StatusBadge';
import PriorityBadge from '@/components/PriorityBadge';

interface Meeting {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  type: string;
  status: string;
  priority: string;
  meetingUrl?: string;
  location?: string;
  vp: { name: string; email: string };
  attendee?: { name: string; email: string };
  bookedBy?: { name: string; email: string };
}

export default function MeetingsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [filteredMeetings, setFilteredMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    fetchMeetings();
  }, [user, router]);

  useEffect(() => {
    applyFilters();
  }, [meetings, statusFilter, typeFilter, priorityFilter, searchQuery]);

  const fetchMeetings = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/meetings');
      setMeetings(response.data);
    } catch (error) {
      console.error('Failed to fetch meetings:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...meetings];

    // Status filter
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(m => m.status === statusFilter);
    }

    // Type filter
    if (typeFilter !== 'ALL') {
      filtered = filtered.filter(m => m.type === typeFilter);
    }

    // Priority filter
    if (priorityFilter !== 'ALL') {
      filtered = filtered.filter(m => m.priority === priorityFilter);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(m =>
        m.title?.toLowerCase().includes(query) ||
        m.attendee?.name?.toLowerCase().includes(query) ||
        m.attendee?.email?.toLowerCase().includes(query)
      );
    }

    setFilteredMeetings(filtered);
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-primary hover:text-emerald-800"
            >
              ← Back to Dashboard
            </button>
            <h1 className="text-xl font-semibold text-gray-900">All Meetings</h1>
            <button
              onClick={() => router.push('/meetings/new')}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-emerald-700"
            >
              + New Meeting
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <input
                type="text"
                placeholder="Search meetings, attendees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
              >
                <option value="ALL">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>

            {/* Type Filter */}
            <div>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
              >
                <option value="ALL">All Types</option>
                <option value="VIRTUAL">Virtual</option>
                <option value="IN_PERSON">In-Person</option>
              </select>
            </div>

            {/* Priority Filter */}
            <div>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
              >
                <option value="ALL">All Priorities</option>
                <option value="URGENT">🔴 Urgent</option>
                <option value="HIGH">🟠 High</option>
                <option value="MEDIUM">🟡 Medium</option>
                <option value="LOW">🟢 Low</option>
              </select>
            </div>
          </div>

          {/* Results Count */}
          <div className="mt-4 text-sm text-gray-600">
            Showing {filteredMeetings.length} of {meetings.length} meetings
          </div>
        </div>

        {/* Meetings List */}
        <div className="bg-white rounded-lg shadow">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
              <p className="mt-4 text-gray-600">Loading meetings...</p>
            </div>
          ) : filteredMeetings.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-4xl mb-4">📅</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No meetings found</h3>
              <p className="text-gray-600 mb-6">
                {searchQuery || statusFilter !== 'ALL' || typeFilter !== 'ALL'
                  ? 'Try adjusting your filters'
                  : 'Get started by creating your first meeting'}
              </p>
              <button
                onClick={() => router.push('/meetings/new')}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-emerald-700"
              >
                Create Meeting
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredMeetings.map((meeting) => (
                <div
                  key={meeting.id}
                  onClick={() => router.push(`/meetings/${meeting.id}`)}
                  className="p-6 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2 flex-wrap">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {meeting.title || 'Untitled Meeting'}
                        </h3>
                        <StatusBadge status={meeting.status} />
                        <PriorityBadge priority={meeting.priority} />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
                        <div className="flex items-center space-x-2">
                          <span>📅</span>
                          <span>{format(new Date(meeting.startTime), 'PPp')}</span>
                        </div>

                        <div className="flex items-center space-x-2">
                          <span>{meeting.type === 'VIRTUAL' ? '💻' : '📍'}</span>
                          <span>
                            {meeting.type === 'VIRTUAL' ? 'Virtual' : 'In-Person'}
                            {meeting.location && ` - ${meeting.location}`}
                          </span>
                        </div>

                        {meeting.attendee && (
                          <div className="flex items-center space-x-2">
                            <span>👤</span>
                            <span>{meeting.attendee.name}</span>
                          </div>
                        )}

                        <div className="flex items-center space-x-2">
                          <span>👔</span>
                          <span>VP: {meeting.vp.name}</span>
                        </div>

                        {meeting.bookedBy && meeting.bookedBy.name !== meeting.vp.name && (
                          <div className="flex items-center space-x-2">
                            <span>✍️</span>
                            <span>Booked by: {meeting.bookedBy.name}</span>
                          </div>
                        )}
                      </div>

                      {meeting.meetingUrl && meeting.status === 'CONFIRMED' && (
                        <div className="mt-3">
                          <a
                            href={meeting.meetingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center text-primary hover:text-emerald-700 text-sm font-medium"
                          >
                            Join Meeting →
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="ml-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/meetings/${meeting.id}`);
                        }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination placeholder */}
        {filteredMeetings.length > 0 && (
          <div className="mt-6 flex justify-center">
            <div className="text-sm text-gray-600">
              {/* Pagination would go here */}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
