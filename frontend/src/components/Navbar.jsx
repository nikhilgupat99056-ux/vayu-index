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
  Moon
} from 'lucide-react';
import VayuLogo from './VayuLogo';
import { fetchApixOverview } from '../services/api';
import { formatAPIx, formatTimeHHMMSS } from '../utils/formatters';
import { useTheme } from '../context/ThemeContext';

export default function Navbar() {
  const [apixData, setApixData] = useState({ score: 114.8, trend: 'MODERATE_BULLISH' });
  const [currentTime, setCurrentTime] = useState(() => formatTimeHHMMSS());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, toggleTheme, isDark } = useTheme();

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
    { path: '/heatmap', label: 'India Heatmap', icon: Map },
    { path: '/analytics', label: 'Analytics', icon: BarChart3 },
    { path: '/festivals', label: 'Festival Insights', icon: Sparkles },
    { path: '/fare-saver', label: 'Fare Saver', icon: CreditCard },
    { path: '/airlines', label: 'Airlines', icon: Plane },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#0a101f]/95 backdrop-blur-md transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Brand Identity */}
          <Link to="/" className="flex items-center gap-3">
            <VayuLogo size={38} showText={true} />
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
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

          {/* Live National APIx, Real-time Clock & Theme Toggle */}
          <div className="hidden sm:flex items-center gap-2.5">
            {/* National APIx Badge */}
            <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 transition-colors">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <div className="flex items-center gap-1.5 font-mono text-xs">
                <span className="text-slate-500 dark:text-slate-400 text-[11px]">APIx:</span>
                <span className="text-sky-600 dark:text-sky-400 font-bold text-xs tracking-tight">{formatAPIx(apixData.score)}</span>
              </div>
              <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${
                apixData.trend.includes('BULLISH') 
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25' 
                  : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25'
              }`}>
                {apixData.trend.replace('_', ' ')}
              </span>
            </div>

            {/* Telemetry Clock */}
            <div className="hidden xl:flex items-center gap-1.5 text-xs font-mono text-slate-500 dark:text-slate-400 border-l border-slate-200 dark:border-slate-800 pl-2.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <Clock className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
              <span className="text-slate-800 dark:text-slate-200 font-semibold tracking-wider">{currentTime}</span>
            </div>

            {/* Dark / Light Mode Toggle Button (Desktop) */}
            <button
              id="theme-toggle-btn"
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
              title={isDark ? "Switch to Light Mode (☀️)" : "Switch to Dark Mode (🌙)"}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-200 transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm"
            >
              {isDark ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400 animate-[spin_20s_linear_infinite]" />
                  <span className="text-xs font-semibold text-slate-200 hidden md:inline">Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-semibold text-slate-700 hidden md:inline">Dark</span>
                </>
              )}
            </button>
          </div>

          {/* Mobile hamburger & Theme button */}
          <div className="lg:hidden flex items-center gap-2">
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
        <div className="lg:hidden px-4 pt-2 pb-4 space-y-1 bg-white dark:bg-[#0a101f] border-b border-slate-200 dark:border-slate-800 transition-colors">
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

          {/* Theme switcher pill in mobile dropdown */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between px-2 text-xs">
            <span className="text-slate-600 dark:text-slate-400 font-medium">Appearance</span>
            <button
              type="button"
              onClick={toggleTheme}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-medium"
            >
              {isDark ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>Light Mode</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Dark Mode</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
