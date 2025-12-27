'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import apiClient from '@/lib/api-client';
import { format } from 'date-fns';
import StatusBadge from '@/components/StatusBadge';

interface Meeting {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  type: string;
  status: string;
  meetingUrl?: string;
  location?: string;
  agenda?: string;
  notes?: string;
  vp: { name: string; email: string };
  attendee?: { name: string; email: string };
  forms?: Array<{ agenda?: string; notes?: string }>;
}

export default function MeetingDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (params.id) {
      fetchMeeting();
    }
  }, [user, router, params.id]);

  const fetchMeeting = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(`/meetings/${params.id}`);
      setMeeting(response.data);
    } catch (error) {
      console.error('Failed to fetch meeting:', error);
      alert('Failed to load meeting');
      router.push('/meetings');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!meeting) return;

    const confirmMessage =
      newStatus === 'CANCELLED'
        ? 'Are you sure you want to cancel this meeting?'
        : `Update status to ${newStatus}?`;

    if (!confirm(confirmMessage)) return;

    setActionLoading(true);
    try {
      await apiClient.patch(`/meetings/${meeting.id}`, { status: newStatus });
      alert('Meeting updated successfully!');
      fetchMeeting();
    } catch (error) {
      console.error('Failed to update meeting:', error);
      alert('Failed to update meeting');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!meeting) return;

    if (!confirm('Are you sure you want to delete this meeting? This action cannot be undone.')) {
      return;
    }

    setActionLoading(true);
    try {
      await apiClient.delete(`/meetings/${meeting.id}`);
      toast.success('Meeting deleted successfully');
      router.push('/meetings');
    } catch (error) {
      console.error('Failed to delete meeting:', error);
      toast.error('Failed to delete meeting');
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
          <p className="mt-4 text-gray-600">Loading meeting...</p>
        </div>
      </div>
    );
  }

  if (!meeting) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button
              onClick={() => router.push('/meetings')}
              className="text-primary hover:text-emerald-800"
            >
              ← Back to Meetings
            </button>
            <h1 className="text-xl font-semibold text-gray-900">Meeting Details</h1>
            <div className="w-32"></div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Card */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {meeting.title || 'Untitled Meeting'}
              </h2>
              <StatusBadge status={meeting.status} />
            </div>
          </div>

          {/* Join Link - Prominent */}
          {meeting.meetingUrl && meeting.status === 'CONFIRMED' && (
            <div className="bg-emerald-50 border-2 border-emerald-200 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-emerald-900 mb-1">Virtual Meeting Link</p>
                  <p className="text-xs text-emerald-700">Click to join the meeting</p>
                </div>
                <a
                  href={meeting.meetingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-emerald-700 font-medium"
                >
                  Join Meeting →
                </a>
              </div>
            </div>
          )}

          {/* Meeting Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Date & Time</label>
              <p className="text-gray-900">
                {format(new Date(meeting.startTime), 'PPPP')}
              </p>
              <p className="text-gray-900">
                {format(new Date(meeting.startTime), 'p')} - {format(new Date(meeting.endTime), 'p')}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Meeting Type</label>
              <p className="text-gray-900">
                {meeting.type === 'VIRTUAL' ? '💻 Virtual Meeting' : '📍 In-Person Meeting'}
              </p>
              {meeting.location && (
                <p className="text-gray-600 text-sm mt-1">{meeting.location}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">VP</label>
              <p className="text-gray-900">{meeting.vp.name}</p>
              <p className="text-gray-600 text-sm">{meeting.vp.email}</p>
            </div>

            {meeting.attendee && (
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Attendee</label>
                <p className="text-gray-900">{meeting.attendee.name}</p>
                <p className="text-gray-600 text-sm">{meeting.attendee.email}</p>
              </div>
            )}
          </div>
        </div>

        {/* Agenda Card */}
        {(meeting.agenda || meeting.forms?.[0]?.agenda) && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Agenda</h3>
            <p className="text-gray-700 whitespace-pre-wrap">
              {meeting.agenda || meeting.forms?.[0]?.agenda}
            </p>
          </div>
        )}

        {/* Notes Card */}
        {(meeting.notes || meeting.forms?.[0]?.notes) && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Additional Notes</h3>
            <p className="text-gray-700 whitespace-pre-wrap">
              {meeting.notes || meeting.forms?.[0]?.notes}
            </p>
          </div>
        )}

        {/* Actions Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Status Actions */}
            {meeting.status === 'PENDING' && (
              <>
                <button
                  onClick={() => handleUpdateStatus('CONFIRMED')}
                  disabled={actionLoading}
                  className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
                >
                  ✓ Confirm Meeting
                </button>
                <button
                  onClick={() => handleUpdateStatus('CANCELLED')}
                  disabled={actionLoading}
                  className="px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400"
                >
                  ✕ Cancel Meeting
                </button>
              </>
            )}

            {meeting.status === 'CONFIRMED' && (
              <>
                <button
                  onClick={() => handleUpdateStatus('COMPLETED')}
                  disabled={actionLoading}
                  className="px-4 py-3 bg-primary text-white rounded-lg hover:bg-emerald-700 disabled:bg-gray-400"
                >
                  Mark as Completed
                </button>
                <button
                  onClick={() => handleUpdateStatus('CANCELLED')}
                  disabled={actionLoading}
                  className="px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400"
                >
                  ✕ Cancel Meeting
                </button>
              </>
            )}

            {/* Edit (placeholder) */}
            <button
              onClick={() => toast('Edit functionality coming soon', { icon: '🚧' })}
              className="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Edit Meeting
            </button>

            {/* Delete */}
            <button
              onClick={handleDelete}
              disabled={actionLoading}
              className="px-4 py-3 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 disabled:bg-gray-100"
            >
              🗑 Delete Meeting
            </button>

            {/* Copy Meeting URL */}
            {meeting.meetingUrl && (
              <button
                onClick={() => {
                  navigator.clipboard.writeText(meeting.meetingUrl!);
                  toast.success('Meeting link copied to clipboard!');
                }}
                className="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                📋 Copy Meeting Link
              </button>
            )}

            {/* Send Reminder (placeholder) */}
            <button
              onClick={() => toast('Reminder functionality coming soon', { icon: '🚧' })}
              className="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              📧 Send Reminder
            </button>
          </div>
        </div>

        {/* Meeting ID (for reference) */}
        <div className="mt-6 text-center text-xs text-gray-500">
          Meeting ID: {meeting.id}
        </div>
      </main>
    </div>
  );
}
