'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import apiClient from '@/lib/api-client';
import { format } from 'date-fns';
import StatusBadge from '@/components/StatusBadge';
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  User,
  FileText,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Trash2,
  Edit,
  Copy,
  Mail,
  Loader2,
  MoreVertical
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
      toast.error('Failed to load meeting details');
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
      toast.success(`Meeting status updated to ${newStatus}`);
      fetchMeeting();
    } catch (error) {
      console.error('Failed to update meeting:', error);
      toast.error('Failed to update status');
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
          <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading meeting details...</p>
        </div>
      </div>
    );
  }

  if (!meeting) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Vibrant Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-500 pb-24 pt-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col space-y-4">
            <div className="flex items-center space-x-3 mb-2">
              <button
                onClick={() => router.push('/meetings')}
                className="text-emerald-100 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center space-x-3">
                <span className="text-sm font-medium text-emerald-100 bg-white/10 px-3 py-1 rounded-full border border-white/10 backdrop-blur-sm">
                  {meeting.type === 'VIRTUAL' ? 'Virtual Meeting' : 'In-Person Meeting'}
                </span>
                <span className={`text-sm font-medium px-3 py-1 rounded-full border backdrop-blur-sm ${meeting.status === 'CONFIRMED' ? 'bg-emerald-400/20 text-emerald-50 border-emerald-400/30' :
                    meeting.status === 'PENDING' ? 'bg-amber-400/20 text-amber-50 border-amber-400/30' :
                      meeting.status === 'CANCELLED' ? 'bg-red-400/20 text-red-50 border-red-400/30' :
                        'bg-blue-400/20 text-blue-50 border-blue-400/30'
                  }`}>
                  {meeting.status}
                </span>
              </div>
            </div>
            <div className="pl-9">
              <h1 className="text-3xl font-bold text-white mb-2">{meeting.title || 'Untitled Meeting'}</h1>
              <div className="flex items-center text-emerald-50 text-base space-x-6">
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2 opacity-80" />
                  {format(new Date(meeting.startTime), 'EEEE, MMMM d, yyyy')}
                </div>
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-2 opacity-80" />
                  {format(new Date(meeting.startTime), 'h:mm a')} - {format(new Date(meeting.endTime), 'h:mm a')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left Column: Details */}
          <div className="lg:col-span-2 space-y-6">

            {/* Join Link - Prominent */}
            {meeting.meetingUrl && meeting.status !== 'CANCELLED' && (
              <div className="bg-white rounded-xl shadow-sm border border-emerald-100 overflow-hidden">
                <div className="bg-emerald-50/50 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-emerald-100 text-emerald-600 rounded-lg">
                      <Video className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Join Meeting</h3>
                      <p className="text-sm text-gray-600">Video conference link available</p>
                    </div>
                  </div>
                  <a
                    href={meeting.meetingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-500/20 text-center"
                  >
                    Launch Meeting
                  </a>
                </div>
              </div>
            )}
            {meeting.location && meeting.type === 'IN_PERSON' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 flex items-start space-x-4">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">In-Person Location</h3>
                    <p className="text-gray-600 text-lg">{meeting.location}</p>
                  </div>
                </div>
              </div>
            )}


            {/* Agenda & Notes */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-4">
                <h3 className="font-semibold text-gray-900 flex items-center">
                  <FileText className="w-4 h-4 mr-2 text-gray-400" />
                  Meeting Content
                </h3>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Agenda</h4>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-100 text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {meeting.agenda || meeting.forms?.[0]?.agenda || 'No agenda provided for this meeting.'}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Additional Notes</h4>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-100 text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {meeting.notes || meeting.forms?.[0]?.notes || 'No additional notes.'}
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: People & Actions */}
          <div className="space-y-6">

            {/* Participants */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                <User className="w-4 h-4 mr-2 text-gray-400" />
                Participants
              </h3>
              <div className="space-y-4">
                {/* VP */}
                <div className="flex items-center p-3 rounded-lg bg-gray-50 border border-gray-100">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm mr-3">
                    {meeting.vp.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{meeting.vp.name}</p>
                    <p className="text-xs text-gray-500 truncate">VP (Organizer)</p>
                  </div>
                </div>

                {/* Attendee */}
                {meeting.attendee && (
                  <div className="flex items-center p-3 rounded-lg bg-gray-50 border border-gray-100">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm mr-3">
                      {meeting.attendee.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{meeting.attendee.name}</p>
                      <p className="text-xs text-gray-500 truncate">{meeting.attendee.email}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                <MoreVertical className="w-4 h-4 mr-2 text-gray-400" />
                Actions
              </h3>
              <div className="space-y-3">
                {meeting.status === 'PENDING' && (
                  <>
                    <button
                      onClick={() => handleUpdateStatus('CONFIRMED')}
                      disabled={actionLoading}
                      className="w-full flex items-center justify-center px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-emerald-400 transition-colors text-sm font-medium"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Confirm Meeting
                    </button>
                    <button
                      onClick={() => handleUpdateStatus('CANCELLED')}
                      disabled={actionLoading}
                      className="w-full flex items-center justify-center px-4 py-2.5 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:bg-gray-50 transition-colors text-sm font-medium"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Cancel Request
                    </button>
                  </>
                )}

                {meeting.status === 'CONFIRMED' && (
                  <>
                    <button
                      onClick={() => handleUpdateStatus('COMPLETED')}
                      disabled={actionLoading}
                      className="w-full flex items-center justify-center px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors text-sm font-medium"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Mark as Completed
                    </button>
                    <button
                      onClick={() => handleUpdateStatus('CANCELLED')}
                      disabled={actionLoading}
                      className="w-full flex items-center justify-center px-4 py-2.5 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:bg-gray-50 transition-colors text-sm font-medium"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Cancel Meeting
                    </button>
                  </>
                )}

                <div className="pt-3 border-t border-gray-100 grid grid-cols-2 gap-3">
                  {/* Copy Link */}
                  {meeting.meetingUrl && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(meeting.meetingUrl!);
                        toast.success('Link copied!');
                      }}
                      className="flex flex-col items-center justify-center p-3 rounded-lg border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all text-gray-600"
                    >
                      <Copy className="w-5 h-5 mb-1 text-gray-400" />
                      <span className="text-xs font-medium">Copy Link</span>
                    </button>
                  )}
                  <button
                    onClick={() => toast('Edit unavailable', { description: 'This feature is currently under development.' })}
                    className="flex flex-col items-center justify-center p-3 rounded-lg border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all text-gray-600"
                  >
                    <Edit className="w-5 h-5 mb-1 text-gray-400" />
                    <span className="text-xs font-medium">Edit</span>
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={actionLoading}
                    className="col-span-2 flex flex-col items-center justify-center p-3 rounded-lg border border-red-100 bg-red-50/50 hover:bg-red-50 hover:border-red-200 transition-all text-red-600"
                  >
                    <Trash2 className="w-5 h-5 mb-1 text-red-400" />
                    <span className="text-xs font-medium">Delete Meeting</span>
                  </button>
                </div>
              </div>
            </div>

          </div>

        </div>
      </main>
    </div>
  );
}
