import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Bell, 
  CheckCheck, 
  TrendingDown, 
  TrendingUp, 
  Sparkles, 
  CreditCard, 
  Clock, 
  Plus, 
  Filter, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  ArrowRight,
  Shield,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { createPriceAlert, FALLBACK_AIRPORTS } from '../services/api';
import { formatCurrencyINR } from '../utils/formatters';

const FILTER_TABS = [
  { id: 'ALL', label: 'All Notifications' },
  { id: 'fare_drop', label: 'Fare Drops', icon: TrendingDown },
  { id: 'surge_alert', label: 'Surge Spikes', icon: TrendingUp },
  { id: 'best_window', label: 'Booking Windows', icon: Clock },
  { id: 'card_offer', label: 'Card Offers', icon: CreditCard }
];

export default function NotificationsPage() {
  const { notifications, unreadCount, markAllNotificationsRead, refreshNotifications } = useAuth();
  
  const [activeTab, setActiveTab] = useState('ALL');
  const [showCreateAlertModal, setShowCreateAlertModal] = useState(false);
  
  // Create Alert State
  const [alertOrigin, setAlertOrigin] = useState('DEL');
  const [alertDest, setAlertDest] = useState('BOM');
  const [targetPrice, setTargetPrice] = useState(4500);
  const [alertType, setAlertType] = useState('FARE_DROP');
  const [creatingAlert, setCreatingAlert] = useState(false);
  const [alertSuccess, setAlertSuccess] = useState('');
  const [alertError, setAlertError] = useState('');

  const filteredNotifications = notifications.filter(n => {
    if (activeTab === 'ALL') return true;
    return n.type === activeTab;
  });

  const handleCreateAlert = async (e) => {
    e.preventDefault();
    if (alertOrigin === alertDest) {
      setAlertError('Origin and destination cannot be identical.');
      return;
    }
    setCreatingAlert(true);
    setAlertError('');
    try {
      await createPriceAlert({
        origin: alertOrigin,
        destination: alertDest,
        target_price: Number(targetPrice),
        alert_type: alertType
      });
      setAlertSuccess('New price telemetry alert created successfully!');
      await refreshNotifications();
      setTimeout(() => {
        setShowCreateAlertModal(false);
        setAlertSuccess('');
      }, 1500);
    } catch (err) {
      setAlertError('Failed to create alert.');
    } finally {
      setCreatingAlert(false);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'fare_drop':
        return <TrendingDown className="w-5 h-5 text-emerald-500" />;
      case 'surge_alert':
        return <TrendingUp className="w-5 h-5 text-rose-500" />;
      case 'best_window':
        return <Clock className="w-5 h-5 text-sky-500" />;
      case 'card_offer':
        return <CreditCard className="w-5 h-5 text-indigo-500" />;
      default:
        return <Sparkles className="w-5 h-5 text-amber-500" />;
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 transition-colors duration-200">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <Bell className="w-6 h-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Smart Notification Center
            </h1>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500 text-white">
                {unreadCount} new
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time algorithmic alerts for tariff dips, festive spikes, and credit card discount drops.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {unreadCount > 0 && (
            <button
              onClick={markAllNotificationsRead}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <CheckCheck className="w-4 h-4 text-sky-500" />
              <span>Mark All Read</span>
            </button>
          )}

          <button
            onClick={() => setShowCreateAlertModal(true)}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Create Price Alert</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 border-b border-slate-200 dark:border-slate-800">
        {FILTER_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-sky-400'
              }`}
            >
              {Icon && <Icon className="w-3.5 h-3.5" />}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map((notif) => (
            <div
              key={notif.id}
              className={`p-4 rounded-2xl border transition-all flex items-start gap-4 ${
                notif.is_read
                  ? 'bg-white dark:bg-[#0b1329] border-slate-200 dark:border-slate-800/80 opacity-90'
                  : 'bg-sky-50/60 dark:bg-sky-950/20 border-sky-300 dark:border-sky-800 shadow-sm'
              }`}
            >
              <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shrink-0">
                {getNotificationIcon(notif.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {notif.title}
                  </h3>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 whitespace-nowrap">
                    {notif.created_at ? new Date(notif.created_at).toLocaleDateString() : 'Just now'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-2">
                  {notif.message}
                </p>

                <div className="flex items-center gap-3">
                  <Link
                    to="/booking"
                    className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
                  >
                    <span>Check Booking Window</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                  {!notif.is_read && (
                    <span className="w-2 h-2 rounded-full bg-sky-500" />
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-12 text-center bg-white dark:bg-[#0b1329] rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
            <Bell className="w-8 h-8 mx-auto mb-3 opacity-40" />
            <p className="text-sm font-semibold">No notifications in this category</p>
            <p className="text-xs mt-1">Telemetry monitors 253 routes for fare movements 24/7</p>
          </div>
        )}
      </div>

      {/* Create Price Alert Modal */}
      {showCreateAlertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#0b1329] rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl relative">
            <button
              onClick={() => setShowCreateAlertModal(false)}
              className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
              Create Smart Price Alert
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Get notified immediately when airline algorithms drop fares below your target.
            </p>

            {alertError && (
              <div className="mb-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{alertError}</span>
              </div>
            )}
            {alertSuccess && (
              <div className="mb-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{alertSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreateAlert} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Origin
                  </label>
                  <select
                    value={alertOrigin}
                    onChange={(e) => setAlertOrigin(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    {FALLBACK_AIRPORTS.map(a => (
                      <option key={a.iata} value={a.iata}>{a.iata} - {a.city}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Destination
                  </label>
                  <select
                    value={alertDest}
                    onChange={(e) => setAlertDest(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    {FALLBACK_AIRPORTS.map(a => (
                      <option key={a.iata} value={a.iata}>{a.iata} - {a.city}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Target Price Threshold (INR)
                </label>
                <input
                  type="number"
                  step="100"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Alert Strategy
                </label>
                <select
                  value={alertType}
                  onChange={(e) => setAlertType(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="FARE_DROP">Notify when fare drops below target</option>
                  <option value="BEST_WINDOW">Notify when optimal booking window opens</option>
                  <option value="FESTIVAL_SURGE">Notify before upcoming festive surge spike</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={creatingAlert}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 transition-colors shadow-md flex items-center justify-center gap-2"
              >
                {creatingAlert ? <span>Registering Alert...</span> : <span>Activate Alert Telemetry</span>}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
