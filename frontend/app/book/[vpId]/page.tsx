'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { format, addMinutes } from 'date-fns';

interface VP {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AvailableSlot {
  start: string;
  end: string;
}

export default function PublicBookingPage() {
  const params = useParams();
  const router = useRouter();
  const [vp, setVp] = useState<VP | null>(null);
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    durationMinutes: 30,
    type: 'VIRTUAL',
    attendeeName: '',
    attendeeEmail: '',
    agenda: '',
    location: '',
  });

  useEffect(() => {
    if (params.vpId) {
      fetchVPInfo();
    }
  }, [params.vpId]);

  useEffect(() => {
    if (vp && formData.date) {
      fetchAvailableSlots();
    }
  }, [vp, formData.date, formData.durationMinutes]);

  const fetchVPInfo = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(`/users/${params.vpId}`);
      setVp(response.data);
    } catch (error) {
      console.error('Failed to fetch VP info:', error);
      alert('Failed to load VP information');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableSlots = async () => {
    try {
      const response = await apiClient.get(`/availability/${params.vpId}/slots`, {
        params: {
          date: formData.date,
          durationMinutes: formData.durationMinutes,
        },
      });
      setAvailableSlots(response.data.slots || []);
      setSelectedSlot(null);
    } catch (error) {
      console.error('Failed to fetch available slots:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedSlot) {
      alert('Please select a time slot');
      return;
    }

    setSubmitting(true);

    try {
      await apiClient.post(`/meetings/book/${params.vpId}`, {
        startTime: selectedSlot.start,
        endTime: selectedSlot.end,
        type: formData.type,
        attendeeName: formData.attendeeName,
        attendeeEmail: formData.attendeeEmail,
        agenda: formData.agenda || undefined,
        location: formData.type === 'IN_PERSON' ? formData.location : undefined,
      });

      setShowSuccess(true);
    } catch (error: any) {
      console.error('Failed to book meeting:', error);
      alert(error.response?.data?.message || 'Failed to book meeting');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

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

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Meeting Requested!</h2>
          <p className="text-gray-600 mb-6">
            Your meeting request with {vp?.name} has been submitted successfully. 
            You will receive a confirmation email once the meeting is confirmed.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Book Another Meeting
          </button>
        </div>
      </div>
    );
  }

  if (!vp) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">VP not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl font-bold text-blue-600">
                {vp.name.split(' ').map(n => n[0]).join('')}
              </span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Book a Meeting with {vp.name}
            </h1>
            <p className="text-gray-600">{vp.role}</p>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Date Selection */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Select Date & Duration</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duration *
                </label>
                <select
                  name="durationMinutes"
                  value={formData.durationMinutes}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>1 hour</option>
                </select>
              </div>
            </div>
          </div>

          {/* Available Slots */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Available Time Slots</h2>
            
            {availableSlots.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No available slots for the selected date. Please try another date.
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {availableSlots.map((slot, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setSelectedSlot(slot)}
                    className={`p-3 border-2 rounded-lg text-sm transition-all ${
                      selectedSlot?.start === slot.start
                        ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                        : 'border-gray-300 hover:border-blue-300 hover:bg-blue-50'
                    }`}
                  >
                    {format(new Date(slot.start), 'h:mm a')}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Meeting Type */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Meeting Type *</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'VIRTUAL' })}
                className={`p-4 border-2 rounded-lg transition-all ${
                  formData.type === 'VIRTUAL'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="text-3xl mb-2">💻</div>
                <div className="font-medium">Virtual</div>
                <div className="text-xs text-gray-500">Online meeting</div>
              </button>
              
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'IN_PERSON' })}
                className={`p-4 border-2 rounded-lg transition-all ${
                  formData.type === 'IN_PERSON'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="text-3xl mb-2">📍</div>
                <div className="font-medium">In-Person</div>
                <div className="text-xs text-gray-500">Office meeting</div>
              </button>
            </div>

            {formData.type === 'IN_PERSON' && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Location
                </label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Your office, Conference Room"
                />
              </div>
            )}
          </div>

          {/* Your Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Information</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Name *
                </label>
                <input
                  type="text"
                  name="attendeeName"
                  value={formData.attendeeName}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="John Doe"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Email *
                </label>
                <input
                  type="email"
                  name="attendeeEmail"
                  value={formData.attendeeEmail}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="john@example.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Meeting Agenda / Purpose
                </label>
                <textarea
                  name="agenda"
                  value={formData.agenda}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Please describe the purpose of this meeting..."
                />
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="bg-white rounded-lg shadow p-6">
            <button
              type="submit"
              disabled={submitting || !selectedSlot}
              className="w-full px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium text-lg"
            >
              {submitting ? 'Submitting...' : 'Request Meeting'}
            </button>
            
            {!selectedSlot && (
              <p className="mt-2 text-sm text-gray-500 text-center">
                Please select a time slot to continue
              </p>
            )}
          </div>
        </form>
      </main>
    </div>
  );
}
