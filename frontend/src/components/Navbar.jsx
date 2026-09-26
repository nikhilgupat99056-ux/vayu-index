import React, { useState, useEffect } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { 
  Compass, 
  Map, 
  BarChart3, 
  Sparkles, 
  Plane, 
  Settings, 
  Radio, 
  Activity,
  Menu,
  X,
  Clock,
  CreditCard,
  Sun,
  Moon,
  Bell,
  User,
  CalendarCheck
} from 'lucide-react';
import VayuLogo from './VayuLogo';
import { fetchApixOverview } from '../services/api';
import { formatAPIx, formatTimeHHMMSS } from '../utils/formatters';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const [apixData, setApixData] = useState({ score: 114.8, trend: 'MODERATE_BULLISH' });
  const [currentTime, setCurrentTime] = useState(() => formatTimeHHMMSS());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, toggleTheme, isDark } = useTheme();
  const { user, unreadCount } = useAuth();

  useEffect(() => {
    fetchApixOverview().then(data => {
      if (data && data.national_apix) {
        setApixData({ score: data.national_apix, trend: data.trend_classification });
      }
    });

    // Real-time live clock ticking every second (1000ms) with cleanup on unmount
    const interval = setInterval(() => {
      setCurrentTime(formatTimeHHMMSS());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { path: '/', label: 'Dashboard', icon: Activity },
    { path: '/routes', label: 'Route Explorer', icon: Compass },
    { path: '/heatmap', label: 'Heatmap', icon: Map },
    { path: '/analytics', label: 'Analytics', icon: BarChart3 },
    { path: '/festivals', label: 'Festivals', icon: Sparkles },
    { path: '/fare-saver', label: 'Fare Saver', icon: CreditCard },
    { path: '/ai-advisor', label: 'AI Advisor', icon: Sparkles },
    { path: '/booking', label: 'Booking', icon: CalendarCheck },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#0a101f]/95 backdrop-blur-md transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Brand Identity */}
          <Link to="/" className="flex items-center gap-3 shrink-0">
            <VayuLogo size={36} showText={true} />
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden xl:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-sky-50 dark:bg-slate-800 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-slate-700 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                    }`
                  }
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Live National APIx, Real-time Clock, Notifications, Theme & Profile */}
          <div className="hidden sm:flex items-center gap-2">
            
            {/* National APIx Badge */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 transition-colors">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <div className="flex items-center gap-1 font-mono text-xs">
                <span className="text-slate-500 dark:text-slate-400 text-[10px]">APIx:</span>
                <span className="text-sky-600 dark:text-sky-400 font-bold text-xs">{formatAPIx(apixData.score)}</span>
              </div>
            </div>

            {/* Telemetry Clock */}
            <div className="hidden 2xl:flex items-center gap-1.5 text-xs font-mono text-slate-500 dark:text-slate-400 border-l border-slate-200 dark:border-slate-800 pl-2">
              <Clock className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
              <span className="text-slate-800 dark:text-slate-200 font-semibold tracking-wider">{currentTime}</span>
            </div>

            {/* Smart Notifications Bell Icon with Counter Badge */}
            <Link
              to="/notifications"
              aria-label="Smart Notifications"
              title="Smart Notifications"
              className="relative p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300 transition-all hover:scale-105"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>

            {/* Dark / Light Mode Toggle Button (Desktop) */}
            <button
              id="theme-toggle-btn"
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-200 transition-all hover:scale-105 shadow-sm"
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-600" />
              )}
            </button>

            {/* Profile Avatar / Login CTA */}
            {user ? (
              <Link
                to="/profile"
                className="flex items-center gap-2 pl-2 pr-3 py-1 rounded-xl bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/40 dark:hover:bg-sky-950/70 border border-sky-200 dark:border-sky-800 transition-all"
              >
                <div className="w-6 h-6 rounded-lg bg-sky-600 text-white flex items-center justify-center text-xs font-bold font-mono">
                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <span className="text-xs font-semibold text-sky-800 dark:text-sky-300 hidden md:inline truncate max-w-[90px]">
                  {user.name ? user.name.split(' ')[0] : 'Profile'}
                </span>
              </Link>
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-sm transition-all"
              >
                <User className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </Link>
            )}

          </div>

          {/* Mobile hamburger & Theme button */}
          <div className="xl:hidden flex items-center gap-2">
            <Link
              to="/notifications"
              className="relative p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </Link>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
            </button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="xl:hidden px-4 pt-2 pb-4 space-y-1 bg-white dark:bg-[#0a101f] border-b border-slate-200 dark:border-slate-800 transition-colors">
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 mb-2">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">National APIx:</span>
              <span className="text-sky-600 dark:text-sky-400 font-bold font-mono text-xs">{formatAPIx(apixData.score)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-mono text-slate-700 dark:text-slate-300">
              <Clock className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
              <span className="font-semibold text-slate-800 dark:text-slate-200 tracking-wider">{currentTime}</span>
            </div>
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-sky-50 dark:bg-slate-800 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-slate-700'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`
                }
              >
                <Icon className="w-4 h-4 text-sky-500 dark:text-sky-400" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}

          <NavLink
            to="/notifications"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60"
          >
            <div className="flex items-center gap-2.5">
              <Bell className="w-4 h-4 text-sky-500 dark:text-sky-400" />
              <span>Notifications</span>
            </div>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white">
                {unreadCount}
              </span>
            )}
          </NavLink>

          <NavLink
            to={user ? "/profile" : "/login"}
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60"
          >
            <User className="w-4 h-4 text-sky-500 dark:text-sky-400" />
            <span>{user ? `Profile (${user.name || 'Account'})` : 'Sign In / Register'}</span>
          </NavLink>

          <NavLink
            to="/settings"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60"
          >
            <Settings className="w-4 h-4 text-sky-500 dark:text-sky-400" />
            <span>Settings</span>
          </NavLink>
        </div>
      )}
    </header>
  );
}
