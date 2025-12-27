'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import apiClient from '@/lib/api-client';
import {
  Calendar,
  Clock,
  User,
  Settings,
  ArrowLeft,
  Save,
  Trash2,
  Plus,
  Loader2,
  Check,
  Mail,
  Globe,
  Briefcase
} from 'lucide-react';

type TabType = 'calendar' | 'availability' | 'profile';

interface CalendarConnection {
  id: string;
  provider: 'MICROSOFT' | 'GOOGLE';
  email: string;
  connected: boolean;
  lastSyncedAt?: string;
}

interface AvailabilityRule {
  id?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  bufferMinutes: number;
}

interface UserProfile {
  email: string;
  name: string;
  role: string;
  timezone: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('calendar');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Calendar state
  const [connections, setConnections] = useState<CalendarConnection[]>([]);

  // Availability state
  const [availabilityRules, setAvailabilityRules] = useState<AvailabilityRule[]>([]);
  const [defaultBufferMinutes, setDefaultBufferMinutes] = useState(15);

  // Profile state
  const [profile, setProfile] = useState<UserProfile>({
    email: '',
    name: '',
    role: '',
    timezone: 'America/New_York',
  });

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    fetchSettings();
  }, [user, router]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      // Fetch calendar connections and rules in parallel
      const [connectionsRes, rulesRes] = await Promise.all([
        apiClient.get('/calendar/connections').catch(() => ({ data: [] })),
        apiClient.get('/availability/rules').catch(() => ({ data: {} })),
      ]);

      setConnections(connectionsRes.data);


      if (rulesRes.data) {
        if (rulesRes.data.bufferMinutes !== undefined) {
          setDefaultBufferMinutes(rulesRes.data.bufferMinutes);
        }

        const workingHours = rulesRes.data.workingHours || {};
        const rules: AvailabilityRule[] = [];
        const dayMap: { [key: string]: number } = {
          sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6
        };

        Object.entries(workingHours).forEach(([day, slots]: [string, any]) => {
          if (Array.isArray(slots)) {
            slots.forEach((slot: any) => {
              rules.push({
                dayOfWeek: dayMap[day.toLowerCase()] ?? 1,
                startTime: slot.start,
                endTime: slot.end,
                bufferMinutes: rulesRes.data.bufferMinutes || 15, // buffer is global per user in this model
              });
            });
          }
        });
        setAvailabilityRules(rules);
      }

      // Set profile from user
      if (user) {
        setProfile({
          email: user.email,
          name: user.name || '',
          role: user.role,
          timezone: user.timezone || 'America/New_York',
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectCalendar = (provider: 'microsoft' | 'google') => {
    // Direct navigation to backend auth endpoint
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    window.location.href = `${baseUrl}/api/calendar/connect/${provider}`;
  };

  const handleDisconnectCalendar = async (provider: 'microsoft' | 'google') => {
    try {
      await apiClient.delete(`/calendar/disconnect/${provider}`);
      toast.success(`Disconnected ${provider} calendar`);
      await fetchSettings();
    } catch (error) {
      console.error('Error disconnecting calendar:', error);
      toast.error('Failed to disconnect calendar');
    }
  };

  const handleSaveAvailability = async () => {
    setSaving(true);
    try {
      // Transform rules back to workingHours format
      const workingHours: { [key: string]: { start: string; end: string }[] } = {
        sunday: [], monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: []
      };

      const dayNamesLower = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

      availabilityRules.forEach(rule => {
        const dayName = dayNamesLower[rule.dayOfWeek];
        if (dayName) {
          workingHours[dayName].push({
            start: rule.startTime,
            end: rule.endTime
          });
        }
      });

      await apiClient.put('/availability/rules', {
        workingHours,
        bufferMinutes: defaultBufferMinutes,
      });
      toast.success('Availability settings saved successfully!');
    } catch (error) {
      console.error('Error saving availability:', error);
      toast.error('Failed to save availability settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await apiClient.put('/users/me', {
        name: profile.name,
        timezone: profile.timezone,
      });
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const addAvailabilityRule = () => {
    setAvailabilityRules([
      ...availabilityRules,
      {
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '17:00',
        bufferMinutes: defaultBufferMinutes,
      },
    ]);
  };

  const updateAvailabilityRule = (index: number, field: keyof AvailabilityRule, value: any) => {
    const updated = [...availabilityRules];
    updated[index] = { ...updated[index], [field]: value };
    setAvailabilityRules(updated);
  };

  const removeAvailabilityRule = (index: number) => {
    setAvailabilityRules(availabilityRules.filter((_, i) => i !== index));
  };

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Vibrant Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-500 pb-24 pt-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col space-y-4">
            <div className="flex items-center space-x-3 mb-2">
              <button
                onClick={() => router.push('/dashboard')}
                className="text-emerald-100 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-3xl font-bold text-white">Settings</h1>
            </div>
            <p className="text-emerald-50 text-lg opacity-90 pl-9">
              Manage your preferences, calendar connections, and profile.
            </p>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 pb-12">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">

          {/* Tabs Navigation */}
          <div className="border-b border-gray-200 bg-gray-50/50">
            <nav className="flex -mb-px px-6">
              <button
                onClick={() => setActiveTab('calendar')}
                className={`flex items-center space-x-2 py-4 px-4 border-b-2 font-medium text-sm transition-colors ${activeTab === 'calendar'
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                <Calendar className="w-4 h-4" />
                <span>Calendars</span>
              </button>
              <button
                onClick={() => setActiveTab('availability')}
                className={`flex items-center space-x-2 py-4 px-4 border-b-2 font-medium text-sm transition-colors ${activeTab === 'availability'
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                <Clock className="w-4 h-4" />
                <span>Availability</span>
              </button>
              <button
                onClick={() => setActiveTab('profile')}
                className={`flex items-center space-x-2 py-4 px-4 border-b-2 font-medium text-sm transition-colors ${activeTab === 'profile'
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                <User className="w-4 h-4" />
                <span>Profile</span>
              </button>
            </nav>
          </div>

          <div className="p-6 md:p-8">
            {/* Calendar Tab */}
            {activeTab === 'calendar' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-top-2">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">Calendar Integrations</h2>
                  <p className="text-gray-600">
                    Connect your calendars to sync availability and prevent double-booking.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Microsoft Outlook */}
                  <div className={`border rounded-xl p-6 transition-all ${connections.find(c => c.provider === 'MICROSOFT')?.connected
                    ? 'bg-emerald-50/30 border-emerald-100'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}>
                    <div className="flex flex-col h-full justify-between space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                            <Globe className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">Microsoft Outlook</h3>
                            <p className="text-sm text-gray-500">Sync with Office 365</p>
                          </div>
                        </div>
                        {connections.find(c => c.provider === 'MICROSOFT')?.connected && (
                          <span className="bg-emerald-100 text-emerald-700 text-xs font-medium px-2 py-1 rounded-full flex items-center">
                            <Check className="w-3 h-3 mr-1" />
                            Active
                          </span>
                        )}
                      </div>

                      {connections.find(c => c.provider === 'MICROSOFT')?.connected ? (
                        <div>
                          <p className="text-sm text-gray-700 bg-white border border-gray-100 rounded-lg p-2 mb-4 truncate">
                            {connections.find(c => c.provider === 'MICROSOFT')?.email}
                          </p>
                          <button
                            onClick={() => handleDisconnectCalendar('microsoft')}
                            className="w-full py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 hover:border-red-300 transition-colors text-sm font-medium"
                          >
                            Disconnect
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleConnectCalendar('microsoft')}
                          className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-lg shadow-blue-500/20"
                        >
                          Connect Outlook
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Google Calendar */}
                  <div className={`border rounded-xl p-6 transition-all ${connections.find(c => c.provider === 'GOOGLE')?.connected
                    ? 'bg-emerald-50/30 border-emerald-100'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}>
                    <div className="flex flex-col h-full justify-between space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center text-red-600">
                            <Globe className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">Google Calendar</h3>
                            <p className="text-sm text-gray-500">Sync with Google</p>
                          </div>
                        </div>
                        {connections.find(c => c.provider === 'GOOGLE')?.connected && (
                          <span className="bg-emerald-100 text-emerald-700 text-xs font-medium px-2 py-1 rounded-full flex items-center">
                            <Check className="w-3 h-3 mr-1" />
                            Active
                          </span>
                        )}
                      </div>

                      {connections.find(c => c.provider === 'GOOGLE')?.connected ? (
                        <div>
                          <p className="text-sm text-gray-700 bg-white border border-gray-100 rounded-lg p-2 mb-4 truncate">
                            {connections.find(c => c.provider === 'GOOGLE')?.email}
                          </p>
                          <button
                            onClick={() => handleDisconnectCalendar('google')}
                            className="w-full py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 hover:border-red-300 transition-colors text-sm font-medium"
                          >
                            Disconnect
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleConnectCalendar('google')}
                          className="w-full py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                        >
                          Connect Google
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Availability Tab */}
            {activeTab === 'availability' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-top-2">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">Working Hours</h2>
                  <p className="text-gray-600">
                    Set your available hours for meetings. These will be used for public booking.
                  </p>
                </div>

                {/* Default Buffer Time */}
                <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-sm font-medium text-blue-900 mb-1">
                        Default Buffer Time
                      </label>
                      <p className="text-sm text-blue-700">
                        Gap between meetings (minutes)
                      </p>
                    </div>
                    <input
                      type="number"
                      min="0"
                      max="60"
                      step="5"
                      value={defaultBufferMinutes}
                      onChange={(e) => setDefaultBufferMinutes(parseInt(e.target.value))}
                      className="w-24 px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white text-center font-medium"
                    />
                  </div>
                </div>

                {/* Availability Rules */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                    <h3 className="text-lg font-medium text-gray-900">Weekly Schedule</h3>
                    <button
                      onClick={addAvailabilityRule}
                      className="text-sm font-medium text-emerald-600 hover:text-emerald-700 flex items-center"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Slot
                    </button>
                  </div>

                  {availabilityRules.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                      <Clock className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600 mb-3">No availability rules set</p>
                      <button
                        onClick={addAvailabilityRule}
                        className="text-emerald-600 font-medium hover:text-emerald-700"
                      >
                        Add your first time slot
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {availabilityRules.map((rule, index) => (
                        <div key={index} className="border border-gray-200 rounded-xl p-4 bg-white hover:border-emerald-200 transition-colors shadow-sm">
                          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                            <div className="md:col-span-1">
                              <label className="block text-xs font-medium text-gray-500 mb-1">
                                Day
                              </label>
                              <select
                                value={rule.dayOfWeek}
                                onChange={(e) => updateAvailabilityRule(index, 'dayOfWeek', parseInt(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm"
                              >
                                {dayNames.map((day, i) => (
                                  <option key={i} value={i}>
                                    {day}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">
                                Start
                              </label>
                              <input
                                type="time"
                                value={rule.startTime}
                                onChange={(e) => updateAvailabilityRule(index, 'startTime', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">
                                End
                              </label>
                              <input
                                type="time"
                                value={rule.endTime}
                                onChange={(e) => updateAvailabilityRule(index, 'endTime', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">
                                Buffer (min)
                              </label>
                              <input
                                type="number"
                                min="0"
                                max="60"
                                step="5"
                                value={rule.bufferMinutes}
                                onChange={(e) => updateAvailabilityRule(index, 'bufferMinutes', parseInt(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm"
                              />
                            </div>
                            <div>
                              <button
                                onClick={() => removeAvailabilityRule(index)}
                                className="w-full px-3 py-2 border border-red-100 text-red-600 bg-red-50/50 rounded-lg hover:bg-red-50 hover:border-red-200 text-sm font-medium flex items-center justify-center transition-colors"
                              >
                                <Trash2 className="w-4 h-4 mr-1.5" />
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-100">
                  <button
                    onClick={handleSaveAvailability}
                    disabled={saving}
                    className="px-6 py-2.5 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 disabled:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 flex items-center"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Availability
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-top-2">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">Profile Settings</h2>
                  <p className="text-gray-600">
                    Manage your personal information and system preferences.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        value={profile.name}
                        onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="email"
                        value={profile.email}
                        disabled
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Role
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Briefcase className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        value={profile.role}
                        disabled
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Time Zone
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Globe className="h-5 w-5 text-gray-400" />
                      </div>
                      <select
                        value={profile.timezone}
                        onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none bg-white"
                      >
                        <option value="America/New_York">Eastern Time (ET)</option>
                        <option value="America/Chicago">Central Time (CT)</option>
                        <option value="America/Denver">Mountain Time (MT)</option>
                        <option value="America/Los_Angeles">Pacific Time (PT)</option>
                        <option value="Europe/London">London (GMT)</option>
                        <option value="Europe/Paris">Paris (CET)</option>
                        <option value="Asia/Tokyo">Tokyo (JST)</option>
                        <option value="Asia/Shanghai">Shanghai (CST)</option>
                        <option value="Australia/Sydney">Sydney (AEST)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-100">
                  <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="px-6 py-2.5 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 disabled:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 flex items-center"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Profile
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}


// Availability state
const [availabilityRules, setAvailabilityRules] = useState<AvailabilityRule[]>([]);
const [defaultBufferMinutes, setDefaultBufferMinutes] = useState(15);

// Profile state
const [profile, setProfile] = useState<UserProfile>({
  email: '',
  name: '',
  role: '',
  timezone: 'America/New_York',
});

useEffect(() => {
  if (!user) {
    router.push('/login');
    return;
  }
  fetchSettings();
}, [user, router]);

const fetchSettings = async () => {
  setLoading(true);
  try {
    // Fetch calendar connections and rules in parallel
    const [connectionsRes, rulesRes] = await Promise.all([
      apiClient.get('/calendar/connections').catch(() => ({ data: [] })),
      apiClient.get('/availability/rules').catch(() => ({ data: {} })),
    ]);

    setConnections(connectionsRes.data);


    if (rulesRes.data) {
      if (rulesRes.data.bufferMinutes !== undefined) {
        setDefaultBufferMinutes(rulesRes.data.bufferMinutes);
      }

      const workingHours = rulesRes.data.workingHours || {};
      const rules: AvailabilityRule[] = [];
      const dayMap: { [key: string]: number } = {
        sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6
      };

      Object.entries(workingHours).forEach(([day, slots]: [string, any]) => {
        if (Array.isArray(slots)) {
          slots.forEach((slot: any) => {
            rules.push({
              dayOfWeek: dayMap[day.toLowerCase()] ?? 1,
              startTime: slot.start,
              endTime: slot.end,
              bufferMinutes: rulesRes.data.bufferMinutes || 15, // buffer is global per user in this model
            });
          });
        }
      });
      setAvailabilityRules(rules);
    }

    // Set profile from user
    if (user) {
      setProfile({
        email: user.email,
        name: user.name || '',
        role: user.role,
        timezone: user.timezone || 'America/New_York',
      });
    }
  } catch (error) {
    console.error('Error fetching settings:', error);
  } finally {
    setLoading(false);
  }
};

const handleConnectCalendar = (provider: 'microsoft' | 'google') => {
  // Direct navigation to backend auth endpoint
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  window.location.href = `${baseUrl}/api/calendar/connect/${provider}`;
};

const handleDisconnectCalendar = async (provider: 'microsoft' | 'google') => {
  try {
    await apiClient.delete(`/calendar/disconnect/${provider}`);
    await fetchSettings();
  } catch (error) {
    console.error('Error disconnecting calendar:', error);
  }
};

const handleSaveAvailability = async () => {
  setSaving(true);
  try {
    // Transform rules back to workingHours format
    const workingHours: { [key: string]: { start: string; end: string }[] } = {
      sunday: [], monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: []
    };

    const dayNamesLower = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

    availabilityRules.forEach(rule => {
      const dayName = dayNamesLower[rule.dayOfWeek];
      if (dayName) {
        workingHours[dayName].push({
          start: rule.startTime,
          end: rule.endTime
        });
      }
    });

    await apiClient.put('/availability/rules', {
      workingHours,
      bufferMinutes: defaultBufferMinutes,
    });
    toast.success('Availability settings saved successfully!');
  } catch (error) {
    console.error('Error saving availability:', error);
    toast.error('Failed to save availability settings');
  } finally {
    setSaving(false);
  }
};

const handleSaveProfile = async () => {
  setSaving(true);
  try {
    await apiClient.put('/users/me', {
      name: profile.name,
      timezone: profile.timezone,
    });
    toast.success('Profile updated successfully!');
  } catch (error) {
    console.error('Error updating profile:', error);
    toast.error('Failed to update profile');
  } finally {
    setSaving(false);
  }
};

const addAvailabilityRule = () => {
  setAvailabilityRules([
    ...availabilityRules,
    {
      dayOfWeek: 1,
      startTime: '09:00',
      endTime: '17:00',
      bufferMinutes: defaultBufferMinutes,
    },
  ]);
};

const updateAvailabilityRule = (index: number, field: keyof AvailabilityRule, value: any) => {
  const updated = [...availabilityRules];
  updated[index] = { ...updated[index], [field]: value };
  setAvailabilityRules(updated);
};

const removeAvailabilityRule = (index: number) => {
  setAvailabilityRules(availabilityRules.filter((_, i) => i !== index));
};

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

if (loading) {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    </div>
  );
}

return (
  <div className="min-h-screen bg-gray-50 p-8">
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Settings</h1>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('calendar')}
              className={`px-6 py-4 text-sm font-medium border-b-2 ${activeTab === 'calendar'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              Calendar Connections
            </button>
            <button
              onClick={() => setActiveTab('availability')}
              className={`px-6 py-4 text-sm font-medium border-b-2 ${activeTab === 'availability'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              Availability
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`px-6 py-4 text-sm font-medium border-b-2 ${activeTab === 'profile'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              Profile
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Calendar Tab */}
          {activeTab === 'calendar' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Calendar Integrations</h2>
                <p className="text-gray-600 mb-6">
                  Connect your calendars to sync availability and prevent double-booking.
                </p>
              </div>

              {/* Microsoft Outlook */}
              <div className="border rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-primary" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">Microsoft Outlook</h3>
                      {connections.find(c => c.provider === 'MICROSOFT')?.connected ? (
                        <>
                          <p className="text-sm text-green-600">
                            Connected: {connections.find(c => c.provider === 'MICROSOFT')?.email}
                          </p>
                          {connections.find(c => c.provider === 'MICROSOFT')?.lastSyncedAt && (
                            <p className="text-xs text-gray-500">
                              Last synced: {new Date(connections.find(c => c.provider === 'MICROSOFT')!.lastSyncedAt!).toLocaleString()}
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-gray-500">Not connected</p>
                      )}
                    </div>
                  </div>
                  {connections.find(c => c.provider === 'MICROSOFT')?.connected ? (
                    <button
                      onClick={() => handleDisconnectCalendar('microsoft')}
                      className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50"
                    >
                      Disconnect
                    </button>
                  ) : (
                    <button
                      onClick={() => handleConnectCalendar('microsoft')}
                      className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-emerald-700"
                    >
                      Connect
                    </button>
                  )}
                </div>
              </div>

              {/* Google Calendar */}
              <div className="border rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">Google Calendar</h3>
                      {connections.find(c => c.provider === 'GOOGLE')?.connected ? (
                        <>
                          <p className="text-sm text-green-600">
                            Connected: {connections.find(c => c.provider === 'GOOGLE')?.email}
                          </p>
                          {connections.find(c => c.provider === 'GOOGLE')?.lastSyncedAt && (
                            <p className="text-xs text-gray-500">
                              Last synced: {new Date(connections.find(c => c.provider === 'GOOGLE')!.lastSyncedAt!).toLocaleString()}
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-gray-500">Not connected</p>
                      )}
                    </div>
                  </div>
                  {connections.find(c => c.provider === 'GOOGLE')?.connected ? (
                    <button
                      onClick={() => handleDisconnectCalendar('google')}
                      className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50"
                    >
                      Disconnect
                    </button>
                  ) : (
                    <button
                      onClick={() => handleConnectCalendar('google')}
                      className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-emerald-700"
                    >
                      Connect
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Availability Tab */}
          {activeTab === 'availability' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Working Hours</h2>
                <p className="text-gray-600 mb-6">
                  Set your available hours for meetings. These will be used for public booking.
                </p>
              </div>

              {/* Default Buffer Time */}
              <div className="border rounded-lg p-6 bg-sidebar-background">
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Default Buffer Time (minutes)
                </label>
                <p className="text-sm text-gray-600 mb-4">
                  Automatic padding between meetings to maintain agility in your day
                </p>
                <input
                  type="number"
                  min="0"
                  max="60"
                  step="5"
                  value={defaultBufferMinutes}
                  onChange={(e) => setDefaultBufferMinutes(parseInt(e.target.value))}
                  className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Availability Rules */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Weekly Schedule</h3>
                  <button
                    onClick={addAvailabilityRule}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-emerald-700"
                  >
                    + Add Time Slot
                  </button>
                </div>

                {availabilityRules.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <p className="text-gray-600">No availability rules set</p>
                    <button
                      onClick={addAvailabilityRule}
                      className="mt-4 text-primary hover:text-emerald-700"
                    >
                      Add your first time slot
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {availabilityRules.map((rule, index) => (
                      <div key={index} className="border rounded-lg p-4 bg-white">
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Day
                            </label>
                            <select
                              value={rule.dayOfWeek}
                              onChange={(e) => updateAvailabilityRule(index, 'dayOfWeek', parseInt(e.target.value))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                            >
                              {dayNames.map((day, i) => (
                                <option key={i} value={i}>
                                  {day}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Start Time
                            </label>
                            <input
                              type="time"
                              value={rule.startTime}
                              onChange={(e) => updateAvailabilityRule(index, 'startTime', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              End Time
                            </label>
                            <input
                              type="time"
                              value={rule.endTime}
                              onChange={(e) => updateAvailabilityRule(index, 'endTime', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Buffer (min)
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="60"
                              step="5"
                              value={rule.bufferMinutes}
                              onChange={(e) => updateAvailabilityRule(index, 'bufferMinutes', parseInt(e.target.value))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                            />
                          </div>
                          <div>
                            <button
                              onClick={() => removeAvailabilityRule(index)}
                              className="w-full px-3 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleSaveAvailability}
                  disabled={saving}
                  className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-emerald-700 disabled:bg-gray-400"
                >
                  {saving ? 'Saving...' : 'Save Availability'}
                </button>
              </div>
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Profile Settings</h2>
                <p className="text-gray-600 mb-6">
                  Manage your personal information and preferences.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={profile.email}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                />
                <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <input
                  type="text"
                  value={profile.role}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                />
                <p className="text-xs text-gray-500 mt-1">Role is managed by administrators</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Time Zone
                </label>
                <select
                  value={profile.timezone}
                  onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                >
                  <option value="America/New_York">Eastern Time (ET)</option>
                  <option value="America/Chicago">Central Time (CT)</option>
                  <option value="America/Denver">Mountain Time (MT)</option>
                  <option value="America/Los_Angeles">Pacific Time (PT)</option>
                  <option value="Europe/London">London (GMT)</option>
                  <option value="Europe/Paris">Paris (CET)</option>
                  <option value="Asia/Tokyo">Tokyo (JST)</option>
                  <option value="Asia/Shanghai">Shanghai (CST)</option>
                  <option value="Australia/Sydney">Sydney (AEST)</option>
                </select>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-emerald-700 disabled:bg-gray-400"
                >
                  {saving ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
);
}
