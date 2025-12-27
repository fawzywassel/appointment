'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

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
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/bg.png"
          alt="Background"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      </div>

      <div className="relative z-10 bg-white/95 backdrop-blur-md p-8 md:p-10 rounded-2xl shadow-2xl w-full max-w-md border border-white/20 mx-4">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <div className="relative w-48 h-16">
              <Image
                src="/logo.png"
                alt="VP Scheduling Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome Back
          </h1>
          <p className="text-gray-500 text-sm">
            Sign in to access your scheduling dashboard
          </p>
        </div>

        {/* Login Method Tabs */}
        <div className="flex mb-8 bg-gray-100/80 p-1 rounded-lg">
          <button
            className={`flex-1 py-2 text-center text-sm font-medium rounded-md transition-all duration-200 ${loginMethod === 'local'
              ? 'bg-white text-emerald-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
              }`}
            onClick={() => setLoginMethod('local')}
          >
            Standard Login
          </button>
          <button
            className={`flex-1 py-2 text-center text-sm font-medium rounded-md transition-all duration-200 ${loginMethod === 'sso'
              ? 'bg-white text-emerald-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
              }`}
            onClick={() => setLoginMethod('sso')}
          >
            SSO Access
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
              placeholder="name@company.com"
              disabled={loading}
              autoComplete="email"
            />
          </div>

          {loginMethod === 'local' && (
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                placeholder="••••••••"
                disabled={loading}
                autoComplete="current-password"
              />
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center animate-in fade-in slide-in-from-top-1">
              <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {error}
            </div>
          )}

          {loginMethod === 'local' ? (
            <button
              onClick={handleLocalLogin}
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 disabled:cursor-not-allowed text-white font-semibold py-2.5 px-4 rounded-lg shadow-lg shadow-emerald-600/20 transition-all duration-200 flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          ) : (
            <div className="space-y-4">
              <button
                onClick={handleSsoLogin}
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 disabled:cursor-not-allowed text-white font-semibold py-2.5 px-4 rounded-lg shadow-lg shadow-emerald-600/20 transition-all duration-200 flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <span>Continue with SSO</span>
                )}
              </button>
              <div className="text-center">
                <p className="text-xs text-gray-400">
                  Restricted access. Contact IT for permissions.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer / Copyright */}
      <div className="absolute bottom-6 left-0 right-0 text-center z-10">
        <p className="text-white/40 text-xs text-shadow-sm">
          &copy; {new Date().getFullYear()} VP Scheduling System. All rights reserved.
        </p>
      </div>
    </div>
  );
}
