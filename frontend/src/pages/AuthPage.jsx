import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { 
  Lock, 
  Mail, 
  User, 
  Phone, 
  MapPin, 
  ArrowRight, 
  ShieldCheck, 
  CheckCircle, 
  AlertCircle,
  KeyRound,
  Plane
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import VayuLogo from '../components/VayuLogo';

export default function AuthPage() {
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get('mode') === 'register' ? 'register' : 'login';
  const [mode, setMode] = useState(initialMode); // 'login' | 'register' | 'forgot'
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [homeAirport, setHomeAirport] = useState('DEL');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleQuickDemoLogin = async () => {
    setEmail('demo@vayu.aero');
    setPassword('vayu123');
    setLoading(true);
    setError('');
    const res = await login('demo@vayu.aero', 'vayu123');
    setLoading(false);
    if (res.success) {
      navigate('/profile');
    } else {
      setError(res.error || 'Failed to authenticate');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    if (mode === 'login') {
      const res = await login(email, password);
      setLoading(false);
      if (res.success) {
        navigate('/profile');
      } else {
        setError(res.error || 'Invalid email or password');
      }
    } else if (mode === 'register') {
      if (!fullName.trim()) {
        setError('Please enter your full name');
        setLoading(false);
        return;
      }
      const res = await register({
        name: fullName,
        email,
        password,
        mobile,
        home_airport: homeAirport
      });
      setLoading(false);
      if (res.success) {
        setSuccessMsg('Account registered successfully! Redirecting...');
        setTimeout(() => navigate('/profile'), 1000);
      } else {
        setError(res.error || 'Registration failed. Email may already exist.');
      }
    } else if (mode === 'forgot') {
      // Mock forgot password flow with verification link
      setTimeout(() => {
        setLoading(false);
        setSuccessMsg(`A password reset link and 6-digit OTP has been sent to ${email}. Check your inbox.`);
      }, 700);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-[#020817] transition-colors duration-200">
      <div className="max-w-md w-full space-y-8">
        
        {/* Header Branding */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <VayuLogo size={48} showText={false} />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            {mode === 'login' && 'Sign in to VAYU-Index'}
            {mode === 'register' && 'Create your VAYU Account'}
            {mode === 'forgot' && 'Reset your password'}
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            {mode === 'login' && 'Unlock predictive airfare intelligence & saved routes'}
            {mode === 'register' && 'Join 50,000+ flyers booking with algorithmic precision'}
            {mode === 'forgot' && 'Enter your email to receive recovery instructions'}
          </p>
        </div>

        {/* Auth Mode Tabs */}
        <div className="flex rounded-xl bg-slate-200/80 dark:bg-slate-800/80 p-1 border border-slate-300 dark:border-slate-700">
          <button
            type="button"
            onClick={() => { setMode('login'); setError(''); setSuccessMsg(''); }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              mode === 'login'
                ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setError(''); setSuccessMsg(''); }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              mode === 'register'
                ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Register
          </button>
          <button
            type="button"
            onClick={() => { setMode('forgot'); setError(''); setSuccessMsg(''); }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              mode === 'forgot'
                ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Recovery
          </button>
        </div>

        {/* Demo Account Quick Access Card */}
        {mode === 'login' && (
          <div className="p-3.5 rounded-xl bg-sky-50/80 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/60 flex items-center justify-between">
            <div className="text-xs">
              <span className="font-semibold text-sky-800 dark:text-sky-300 block">Fast Demo Login</span>
              <span className="text-slate-600 dark:text-slate-400 font-mono text-[11px]">demo@vayu.aero • vayu123</span>
            </div>
            <button
              type="button"
              onClick={handleQuickDemoLogin}
              disabled={loading}
              className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
            >
              Fill & Login
            </button>
          </div>
        )}

        {/* Alerts / Error / Success Messages */}
        {error && (
          <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-500" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form Container */}
        <div className="bg-white dark:bg-[#0b1329] p-6 sm:p-8 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 transition-colors">
          <form className="space-y-4" onSubmit={handleSubmit}>
            
            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Arjun Verma"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Mobile Number
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Home Base Airport
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <select
                      value={homeAirport}
                      onChange={(e) => setHomeAirport(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    >
                      <option value="DEL">New Delhi (DEL) - Indira Gandhi Int'l</option>
                      <option value="BOM">Mumbai (BOM) - Chhatrapati Shivaji Maharaj</option>
                      <option value="BLR">Bengaluru (BLR) - Kempegowda Int'l</option>
                      <option value="CCU">Kolkata (CCU) - Netaji Subhash Chandra Bose</option>
                      <option value="HYD">Hyderabad (HYD) - Rajiv Gandhi Int'l</option>
                      <option value="MAA">Chennai (MAA) - Chennai Int'l</option>
                      <option value="AMD">Ahmedabad (AMD) - Sardar Vallabhbhai Patel</option>
                      <option value="GOI">Goa (GOI/GOX) - Dabolim & Mopa</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="you@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Password
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => setMode('forgot')}
                      className="text-xs text-sky-600 dark:text-sky-400 hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 shadow-md transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <span>Processing...</span>
              ) : (
                <>
                  <span>
                    {mode === 'login' && 'Sign In'}
                    {mode === 'register' && 'Complete Registration'}
                    {mode === 'forgot' && 'Send Reset Link'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Privacy & Security Note */}
          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 text-center text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>256-bit JWT encrypted authentication session</span>
          </div>
        </div>

      </div>
    </div>
  );
}
