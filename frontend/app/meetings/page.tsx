'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import apiClient from '@/lib/api-client';
import { format } from 'date-fns';
import {
  Calendar,
  Search,
  Filter,
  MapPin,
  Video,
  Clock,
  User,
  Plus,
  ArrowLeft
} from 'lucide-react';
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
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-3xl font-bold text-white">All Meetings</h1>
              </div>
              <p className="text-emerald-50 text-lg opacity-90 pl-9">
                Manage and track all your scheduled appointments.
              </p>
            </div>
            <button
              onClick={() => router.push('/meetings/new')}
              className="bg-white text-emerald-600 hover:bg-emerald-50 font-semibold py-3 px-6 rounded-lg shadow-lg transition-all transform hover:-translate-y-0.5 flex items-center space-x-2"
            >
              <Plus className="w-5 h-5" />
              <span>New Meeting</span>
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 pb-12">
        {/* Filters Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Search */}
            <div className="md:col-span-4 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search meetings, attendees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
              />
            </div>

            {/* Status Filter */}
            <div className="md:col-span-3">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Filter className="h-4 w-4 text-gray-400" />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full pl-10 pr-8 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none appearance-none bg-white"
                >
                  <option value="ALL">All Status</option>
                  <option value="PENDING">Pending</option>
                  <option value="CONFIRMED">Confirmed</option>
                  <option value="CANCELLED">Cancelled</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>
            </div>

            {/* Type Filter */}
            <div className="md:col-span-3">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none bg-white"
              >
                <option value="ALL">All Types</option>
                <option value="VIRTUAL">Virtual</option>
                <option value="IN_PERSON">In-Person</option>
              </select>
            </div>

            {/* Priority Filter */}
            <div className="md:col-span-2">
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none bg-white"
              >
                <option value="ALL">Priority</option>
                <option value="URGENT">Urgent</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results Info */}
        <div className="mb-4 flex justify-between items-center text-sm text-gray-500 px-1">
          <span>Showing {filteredMeetings.length} of {meetings.length} meetings</span>
        </div>

        {/* Meetings List */}
        <div className="space-y-4">
          {loading ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-emerald-600 mb-2"></div>
              <p className="text-gray-600">Loading meetings...</p>
            </div>
          ) : filteredMeetings.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                <Calendar className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No meetings found</h3>
              <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                {searchQuery || statusFilter !== 'ALL' || typeFilter !== 'ALL'
                  ? 'We couldn\'t find any meetings matching your current filters.'
                  : 'Get started by creating your first meeting schedule.'}
              </p>
              <button
                onClick={() => router.push('/meetings/new')}
                className="text-emerald-600 font-medium hover:underline"
              >
                {searchQuery || statusFilter !== 'ALL' ? 'Clear Filters' : 'Create New Meeting'}
              </button>
            </div>
          ) : (
            filteredMeetings.map((meeting) => (
              <div
                key={meeting.id}
                onClick={() => router.push(`/meetings/${meeting.id}`)}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md hover:border-emerald-200 transition-all cursor-pointer group"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

                  {/* Left Side: Date & Main Info */}
                  <div className="flex items-start space-x-5">
                    {/* Date Box */}
                    <div className="hidden md:block flex-shrink-0 w-16 text-center border border-gray-100 rounded-lg p-2 bg-gray-50 group-hover:bg-white group-hover:border-emerald-200 transition-colors">
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        {format(new Date(meeting.startTime), 'MMM')}
                      </div>
                      <div className="text-xl font-bold text-gray-900">
                        {format(new Date(meeting.startTime), 'd')}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center space-x-3 mb-1">
                        <h3 className="text-lg font-bold text-gray-900 group-hover:text-emerald-700 transition-colors line-clamp-1">
                          {meeting.title || 'Untitled Meeting'}
                        </h3>
                        <StatusBadge status={meeting.status} />
                        <PriorityBadge priority={meeting.priority} />
                      </div>

                      <div className="flex flex-wrap gap-y-2 gap-x-6 text-sm text-gray-500 mt-2">
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
                              In-Person {meeting.location && `• ${meeting.location}`}
                            </>
                          )}
                        </div>

                        {meeting.attendee && (
                          <div className="flex items-center">
                            <User className="w-4 h-4 mr-1.5 opacity-70" />
                            {meeting.attendee.name}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Side: Actions & Arrow */}
                  <div className="flex items-center justify-between md:justify-end border-t md:border-t-0 pt-4 md:pt-0 mt-2 md:mt-0">
                    <div className="md:hidden flex items-center text-sm font-medium text-gray-900">
                      {format(new Date(meeting.startTime), 'MMM d, yyyy')}
                    </div>

                    <div className="text-gray-300 group-hover:text-emerald-500 transition-colors transform group-hover:translate-x-1">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
