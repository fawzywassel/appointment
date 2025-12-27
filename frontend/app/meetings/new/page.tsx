'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import apiClient from '@/lib/api-client';
import { format, addDays, addMinutes } from 'date-fns';
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  User,
  AlignLeft,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  Loader2
} from 'lucide-react';

interface AvailableSlot {
  start: string;
  end: string;
}

export default function NewMeetingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [checkingConflict, setCheckingConflict] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [conflictMessage, setConflictMessage] = useState('');

  // Form state
  const [delegatedVPs, setDelegatedVPs] = useState<any[]>([]);
  const [selectedVPId, setSelectedVPId] = useState<string>('');

  const [formData, setFormData] = useState({
    title: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '09:00',
    durationMinutes: 30,
    type: 'VIRTUAL',
    priority: 'MEDIUM',
    attendeeEmail: '',
    attendeeName: '',
    agenda: '',
    notes: '',
    location: '',
  });

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    // If user is EA, fetch delegated VPs
    if (user.role === 'EA') {
      fetchDelegatedVPs();
    }
  }, [user, router]);

  const fetchDelegatedVPs = async () => {
    try {
      const response = await apiClient.get('/delegation/my-vps');
      setDelegatedVPs(response.data);
      // Auto-select first VP if available
      if (response.data.length > 0) {
        setSelectedVPId(response.data[0].vp.id);
      }
    } catch (error) {
      console.error('Failed to fetch delegated VPs:', error);
    }
  };

  useEffect(() => {
    if (formData.date) {
      fetchAvailableSlots();
    }
  }, [formData.date]);

  const fetchAvailableSlots = async () => {
    try {
      const response = await apiClient.get('/availability/slots', {
        params: {
          date: formData.date,
          durationMinutes: formData.durationMinutes,
        },
      });
      setAvailableSlots(response.data.slots || []);
    } catch (error) {
      console.error('Failed to fetch available slots:', error);
    }
  };

  const checkConflict = async () => {
    if (!formData.date || !formData.startTime) return;

    setCheckingConflict(true);
    setConflictMessage('');

    try {
      const startDateTime = new Date(`${formData.date}T${formData.startTime}`);
      const endDateTime = addMinutes(startDateTime, formData.durationMinutes);

      const response = await apiClient.get('/calendar/busy-times', {
        params: {
          startDate: startDateTime.toISOString(),
          endDate: endDateTime.toISOString(),
        },
      });

      if (response.data.busyTimes && response.data.busyTimes.length > 0) {
        setConflictMessage('CONFLICT');
      } else {
        setConflictMessage('SAFE');
      }
    } catch (error) {
      console.error('Failed to check conflicts:', error);
    } finally {
      setCheckingConflict(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.date && formData.startTime) {
        checkConflict();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.date, formData.startTime, formData.durationMinutes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please log in to continue');
      return;
    }
    setLoading(true);

    try {
      const startDateTime = new Date(`${formData.date}T${formData.startTime}`);
      const endDateTime = addMinutes(startDateTime, formData.durationMinutes);

      const payload = {
        title: formData.title,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        type: formData.type,
        priority: formData.priority,
        attendeeEmail: formData.attendeeEmail,
        attendeeName: formData.attendeeName,
        agenda: formData.agenda || undefined,
        notes: formData.notes || undefined,
        location: formData.type === 'IN_PERSON' ? formData.location : undefined,
        vpId: user.id, // Add current user ID as VP ID
      };

      // If EA is booking for VP, use book-as endpoint
      if (user?.role === 'EA' && selectedVPId) {
        await apiClient.post(`/meetings/book-as/${selectedVPId}`, payload);
      } else {
        await apiClient.post('/meetings', payload);
      }

      toast.success('Meeting created successfully!');
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Failed to create meeting:', error);
      toast.error(error.response?.data?.message || 'Failed to create meeting');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Vibrant Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-500 pb-20 pt-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col space-y-4">
            <div className="flex items-center space-x-3 mb-2">
              <button
                onClick={() => router.push('/dashboard')}
                className="text-emerald-100 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-3xl font-bold text-white">Book New Meeting</h1>
            </div>
            <p className="text-emerald-50 text-lg opacity-90 pl-9">
              Schedule a new appointment quickly and easily.
            </p>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Main Booking Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8 space-y-6">

              {/* VP Selector (for EAs) */}
              {user?.role === 'EA' && delegatedVPs.length > 0 && (
                <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-4">
                  <label className="block text-sm font-medium text-blue-900 mb-2">
                    📋 Booking on behalf of
                  </label>
                  <select
                    value={selectedVPId}
                    onChange={(e) => setSelectedVPId(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-white"
                  >
                    {delegatedVPs.map((delegation) => (
                      <option key={delegation.vp.id} value={delegation.vp.id}>
                        {delegation.vp.name} ({delegation.vp.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Meeting Details Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="bg-emerald-100 text-emerald-600 p-1.5 rounded-lg mr-2">
                    <AlignLeft className="w-4 h-4" />
                  </span>
                  Meeting Details
                </h3>

                <div className="space-y-4">
                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Title *
                    </label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all placeholder:text-gray-400"
                      placeholder="e.g., Q4 Strategy Review"
                    />
                  </div>

                  {/* Type & Priority Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Meeting Type *
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, type: 'VIRTUAL' })}
                          className={`px-3 py-2.5 border rounded-lg text-sm font-medium transition-all flex items-center justify-center space-x-2 ${formData.type === 'VIRTUAL'
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                        >
                          <Video className="w-4 h-4" />
                          <span>Virtual</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, type: 'IN_PERSON' })}
                          className={`px-3 py-2.5 border rounded-lg text-sm font-medium transition-all flex items-center justify-center space-x-2 ${formData.type === 'IN_PERSON'
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                        >
                          <MapPin className="w-4 h-4" />
                          <span>In-Person</span>
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Priority *
                      </label>
                      <select
                        name="priority"
                        value={formData.priority}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none bg-white"
                      >
                        <option value="LOW">Low Priority</option>
                        <option value="MEDIUM">Medium Priority</option>
                        <option value="HIGH">High Priority</option>
                        <option value="URGENT">Urgent Priority</option>
                      </select>
                    </div>
                  </div>

                  {/* Location (Conditional) */}
                  {formData.type === 'IN_PERSON' && (
                    <div className="animate-in fade-in slide-in-from-top-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Location Description *
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <MapPin className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="text"
                          name="location"
                          value={formData.location}
                          onChange={handleChange}
                          required
                          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                          placeholder="e.g., Conference Room A, Building 2"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* Date & Time Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="bg-emerald-100 text-emerald-600 p-1.5 rounded-lg mr-2">
                    <Calendar className="w-4 h-4" />
                  </span>
                  Schedule
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Date *
                    </label>
                    <input
                      type="date"
                      name="date"
                      value={formData.date}
                      onChange={handleChange}
                      required
                      min={format(new Date(), 'yyyy-MM-dd')}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Start Time *
                      </label>
                      <input
                        type="time"
                        name="startTime"
                        value={formData.startTime}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Duration *
                      </label>
                      <select
                        name="durationMinutes"
                        value={formData.durationMinutes}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none bg-white"
                      >
                        <option value={15}>15m</option>
                        <option value={30}>30m</option>
                        <option value={45}>45m</option>
                        <option value={60}>1h</option>
                        <option value={90}>1.5h</option>
                        <option value={120}>2h</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Conflict Status */}
                {conflictMessage && (
                  <div className={`mt-3 p-3 rounded-lg text-sm font-medium flex items-center ${conflictMessage === 'SAFE'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                    : 'bg-amber-50 text-amber-700 border border-amber-100'
                    }`}>
                    {conflictMessage === 'SAFE' ? (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Slot is available
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4 mr-2" />
                        Warning: Potential time conflict detected
                      </>
                    )}
                  </div>
                )}
              </div>

              <hr className="border-gray-100" />

              {/* Attendee Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="bg-emerald-100 text-emerald-600 p-1.5 rounded-lg mr-2">
                    <User className="w-4 h-4" />
                  </span>
                  Attendee Info
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Name *
                    </label>
                    <input
                      type="text"
                      name="attendeeName"
                      value={formData.attendeeName}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Email *
                    </label>
                    <input
                      type="email"
                      name="attendeeEmail"
                      value={formData.attendeeEmail}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                      placeholder="john@example.com"
                    />
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => router.push('/dashboard')}
                  className="px-6 py-2.5 border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 focus:ring-4 focus:ring-emerald-500/20 disabled:bg-emerald-400 disabled:cursor-not-allowed transition-all flex items-center shadow-lg shadow-emerald-500/20"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Scheduling...
                    </>
                  ) : (
                    'Confirm Booking'
                  )}
                </button>
              </div>

            </form>
          </div>

          {/* Sidebar: Available Slots */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sticky top-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <span className="bg-blue-100 text-blue-600 p-1.5 rounded-lg mr-2">
                  <Clock className="w-4 h-4" />
                </span>
                Quick Slots
              </h3>

              {availableSlots.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm text-gray-500 mb-3">
                    Available times for {format(new Date(formData.date), 'MMMM d')}:
                  </p>
                  {availableSlots.slice(0, 6).map((slot, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => {
                        const startTime = format(new Date(slot.start), 'HH:mm');
                        setFormData({ ...formData, startTime });
                      }}
                      className="w-full text-left px-4 py-3 bg-white border border-gray-200 rounded-lg hover:border-emerald-500 hover:ring-1 hover:ring-emerald-500 hover:bg-emerald-50/50 transition-all text-sm group"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-gray-700 group-hover:text-emerald-700">
                          {format(new Date(slot.start), 'h:mm a')}
                        </span>
                        <span className="text-xs text-gray-400 group-hover:text-emerald-500">
                          Select
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>Select a date to view available time slots.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
