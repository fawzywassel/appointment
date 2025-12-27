'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import apiClient from '@/lib/api-client';
import { format, addDays, addMinutes } from 'date-fns';

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
        setConflictMessage('⚠️ This time slot conflicts with existing meetings');
      } else {
        setConflictMessage('✅ No conflicts detected');
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
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-primary hover:text-emerald-800"
            >
              ← Back to Dashboard
            </button>
            <h1 className="text-xl font-semibold text-gray-900">Book New Meeting</h1>
            <div className="w-32"></div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
          {/* VP Selector (for EAs) */}
          {user?.role === 'EA' && delegatedVPs.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <label className="block text-sm font-medium text-gray-900 mb-2">
                📋 Booking for VP *
              </label>
              <select
                value={selectedVPId}
                onChange={(e) => setSelectedVPId(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
              >
                {delegatedVPs.map((delegation) => (
                  <option key={delegation.vp.id} value={delegation.vp.id}>
                    {delegation.vp.name} ({delegation.vp.email})
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-600 mt-1">
                You are booking this meeting on behalf of the selected VP
              </p>
            </div>
          )}

          {/* Meeting Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Meeting Title *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
              placeholder="e.g., Strategy Review"
            />
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Priority *
            </label>
            <select
              name="priority"
              value={formData.priority}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
            >
              <option value="LOW">🟢 Low Priority</option>
              <option value="MEDIUM">🟡 Medium Priority</option>
              <option value="HIGH">🟠 High Priority</option>
              <option value="URGENT">🔴 Urgent</option>
            </select>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date *
              </label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                required
                min={format(new Date(), 'yyyy-MM-dd')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Time *
              </label>
              <input
                type="time"
                name="startTime"
                value={formData.startTime}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Duration (minutes) *
              </label>
              <select
                name="durationMinutes"
                value={formData.durationMinutes}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>1 hour</option>
                <option value={90}>1.5 hours</option>
                <option value={120}>2 hours</option>
              </select>
            </div>
          </div>

          {/* Conflict Detection */}
          {conflictMessage && (
            <div className={`p-3 rounded-lg text-sm ${conflictMessage.includes('✅')
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-yellow-50 text-yellow-800 border border-yellow-200'
              }`}>
              {conflictMessage}
            </div>
          )}

          {/* Meeting Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Meeting Type *
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'VIRTUAL' })}
                className={`p-4 border-2 rounded-lg transition-all ${formData.type === 'VIRTUAL'
                  ? 'border-primary bg-emerald-50'
                  : 'border-gray-300 hover:border-gray-400'
                  }`}
              >
                <div className="text-2xl mb-2">💻</div>
                <div className="font-medium">Virtual</div>
                <div className="text-xs text-gray-500">Teams/Zoom link</div>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'IN_PERSON' })}
                className={`p-4 border-2 rounded-lg transition-all ${formData.type === 'IN_PERSON'
                  ? 'border-primary bg-emerald-50'
                  : 'border-gray-300 hover:border-gray-400'
                  }`}
              >
                <div className="text-2xl mb-2">📍</div>
                <div className="font-medium">In-Person</div>
                <div className="text-xs text-gray-500">Office location</div>
              </button>
            </div>
          </div>

          {/* Location (for in-person) */}
          {formData.type === 'IN_PERSON' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location *
              </label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                placeholder="e.g., Conference Room A, Building 2"
              />
            </div>
          )}

          {/* Attendee Information */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Attendee Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Attendee Name *
                </label>
                <input
                  type="text"
                  name="attendeeName"
                  value={formData.attendeeName}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Attendee Email *
                </label>
                <input
                  type="email"
                  name="attendeeEmail"
                  value={formData.attendeeEmail}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                  placeholder="john@example.com"
                />
              </div>
            </div>
          </div>

          {/* Agenda */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Agenda
            </label>
            <textarea
              name="agenda"
              value={formData.agenda}
              onChange={handleChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
              placeholder="Meeting agenda and topics to discuss..."
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
              placeholder="Any additional information..."
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-4 pt-6 border-t">
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || checkingConflict}
              className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-emerald-700 disabled:bg-gray-400"
            >
              {loading ? 'Creating...' : 'Create Meeting'}
            </button>
          </div>
        </form>

        {/* Available Slots Sidebar */}
        {availableSlots.length > 0 && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-emerald-900 mb-3">💡 Available Slots Today</h3>
            <div className="space-y-2">
              {availableSlots.slice(0, 5).map((slot, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => {
                    const startTime = format(new Date(slot.start), 'HH:mm');
                    setFormData({ ...formData, startTime });
                  }}
                  className="w-full text-left px-3 py-2 bg-white rounded border border-emerald-300 hover:bg-emerald-100 text-sm"
                >
                  {format(new Date(slot.start), 'h:mm a')} - {format(new Date(slot.end), 'h:mm a')}
                </button>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
