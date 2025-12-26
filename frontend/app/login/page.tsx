'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('admin@rubt.com');
  const [password, setPassword] = useState('P@$$w0rd');
  const [loginMethod, setLoginMethod] = useState<'sso' | 'local'>('local');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { login, localLogin } = useAuth();

  const handleSsoLogin = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // In production, this would redirect to Azure AD/OKTA
      // For now, we'll create a mock SSO token
      const mockSsoToken = Buffer.from(
        JSON.stringify({
          email,
          name: email.split('@')[0],
          provider: 'azure',
          role: 'ATTENDEE',
        })
      ).toString('base64');

      await login(email, mockSsoToken);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLocalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await localLogin(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            VP Scheduling
          </h1>
          <p className="text-gray-600">
            Sign in to access your dashboard
          </p>
        </div>

        {/* Login Method Tabs */}
        <div className="flex mb-6 border-b border-gray-200">
          <button
            className={`flex-1 py-2 text-center font-medium transition-colors duration-200 ${loginMethod === 'local'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
              }`}
            onClick={() => setLoginMethod('local')}
          >
            Standard Login
          </button>
          <button
            className={`flex-1 py-2 text-center font-medium transition-colors duration-200 ${loginMethod === 'sso'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
              }`}
            onClick={() => setLoginMethod('sso')}
          >
            SSO
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="your.email@company.com"
              disabled={loading}
            />
          </div>

          {loginMethod === 'local' && (
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="Enter your password"
                disabled={loading}
              />
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          {loginMethod === 'local' ? (
            <button
              onClick={handleLocalLogin}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          ) : (
            <>
              <button
                onClick={handleSsoLogin}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200"
              >
                {loading ? 'Signing in...' : 'Sign in with SSO'}
              </button>
              <div className="mt-4 text-center text-sm text-gray-500">
                <p>
                  This application uses Single Sign-On (SSO) authentication.
                </p>
                <p className="mt-1">
                  Contact your IT administrator for access.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
