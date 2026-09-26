import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Plane, 
  Heart, 
  Bell, 
  CreditCard, 
  Clock, 
  Check, 
  Edit3, 
  Save, 
  LogOut, 
  AlertCircle, 
  CheckCircle2, 
  Ticket, 
  Trash2, 
  TrendingDown, 
  Sparkles,
  ExternalLink,
  Shield
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatCurrencyINR, formatAPIx } from '../utils/formatters';

const AIRLINE_OPTIONS = [
  { code: '6E', name: 'IndiGo' },
  { code: 'AI', name: 'Air India' },
  { code: 'IX', name: 'Air India Express' },
  { code: 'QP', name: 'Akasa Air' },
  { code: 'SG', name: 'SpiceJet' }
];

const CARD_OPTIONS = [
  'SBI Cashback',
  'HDFC Regalia Gold',
  'Axis Atlas',
  'ICICI Coral',
  'ICICI Sapphiro',
  'HDFC Millennia',
  'Axis Ace'
];

export default function ProfilePage() {
  const { user, profileData, logout, updateProfile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Form states
  const [name, setName] = useState(user?.name || user?.full_name || 'Arjun Verma');
  const [mobile, setMobile] = useState(user?.mobile || '+91 98765 43210');
  const [homeAirport, setHomeAirport] = useState(user?.home_airport || 'DEL');
  const [cabinClass, setCabinClass] = useState(user?.preferences?.cabin_class || 'Economy');
  
  const [preferredAirlines, setPreferredAirlines] = useState(
    user?.preferences?.preferred_airlines || ['6E', 'AI']
  );
  const [selectedCards, setSelectedCards] = useState(
    user?.preferences?.card_preferences || ['SBI Cashback', 'Axis Atlas']
  );
  const [notificationPrefs, setNotificationPrefs] = useState(
    user?.preferences?.notification_preferences || { push: true, email: true, in_app: true }
  );

  useEffect(() => {
    if (user) {
      setName(user.name || user.full_name || '');
      setMobile(user.mobile || '');
      setHomeAirport(user.home_airport || 'DEL');
      if (user.preferences) {
        if (user.preferences.preferred_airlines) setPreferredAirlines(user.preferences.preferred_airlines);
        if (user.preferences.cabin_class) setCabinClass(user.preferences.cabin_class);
        if (user.preferences.card_preferences) setSelectedCards(user.preferences.card_preferences);
        if (user.preferences.notification_preferences) setNotificationPrefs(user.preferences.notification_preferences);
      }
    }
  }, [user]);

  const toggleAirline = (code) => {
    if (preferredAirlines.includes(code)) {
      setPreferredAirlines(preferredAirlines.filter(c => c !== code));
    } else {
      setPreferredAirlines([...preferredAirlines, code]);
    }
  };

  const toggleCard = (card) => {
    if (selectedCards.includes(card)) {
      setSelectedCards(selectedCards.filter(c => c !== card));
    } else {
      setSelectedCards([...selectedCards, card]);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    const payload = {
      name,
      mobile,
      home_airport: homeAirport,
      preferred_airlines: preferredAirlines,
      card_preferences: selectedCards,
      notification_preferences: notificationPrefs
    };

    const res = await updateProfile(payload);
    setSaving(false);
    if (res.success) {
      setSuccessMsg('Profile and travel preferences saved successfully!');
      setIsEditing(false);
      setTimeout(() => setSuccessMsg(''), 4000);
    } else {
      setErrorMsg(res.error || 'Failed to update profile');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const savedRoutes = profileData?.saved_routes || [
    { id: 1, origin_iata: 'DEL', destination_iata: 'BOM', origin_city: 'New Delhi', destination_city: 'Mumbai', target_budget: 4500 },
    { id: 2, origin_iata: 'CCU', destination_iata: 'GOI', origin_city: 'Kolkata', destination_city: 'Goa', target_budget: 5200 },
    { id: 3, origin_iata: 'BLR', destination_iata: 'DEL', origin_city: 'Bengaluru', destination_city: 'New Delhi', target_budget: 6000 }
  ];

  const priceAlerts = profileData?.price_alerts || [
    { id: 1, route_key: 'DEL-BOM', target_price: 4200, alert_type: 'FARE_DROP', is_active: true },
    { id: 2, route_key: 'CCU-GOI', target_price: 5400, alert_type: 'BEST_WINDOW', is_active: true }
  ];

  const tripHistory = profileData?.trip_history || [
    {
      id: 1,
      pnr_ref: 'VY-90218',
      origin_iata: 'DEL',
      destination_iata: 'BOM',
      airline: 'IndiGo',
      flight_number: '6E-204',
      fare_paid: 4190,
      departure_date: '2026-10-15',
      status: 'CONFIRMED'
    },
    {
      id: 2,
      pnr_ref: 'VY-81402',
      origin_iata: 'CCU',
      destination_iata: 'GOI',
      airline: 'Air India',
      flight_number: 'AI-772',
      fare_paid: 5480,
      departure_date: '2026-11-04',
      status: 'CONFIRMED'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 transition-colors duration-200">
      
      {/* Top Banner / Account Overview */}
      <div className="bg-gradient-to-r from-sky-600 via-indigo-600 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl mb-8 relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10 pointer-events-none translate-x-12 -translate-y-6">
          <Plane className="w-96 h-96" />
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 text-2xl font-bold shadow-inner">
              {name ? name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{name || 'VAYU Member'}</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-400/20 text-amber-200 border border-amber-400/30">
                  Elite Flyer
                </span>
              </div>
              <p className="text-sky-100 text-sm flex items-center gap-2 mt-1">
                <Mail className="w-3.5 h-3.5 text-sky-200" />
                <span>{user?.email || 'demo@vayu.aero'}</span>
                <span className="text-sky-300">•</span>
                <MapPin className="w-3.5 h-3.5 text-sky-200" />
                <span>Base: {homeAirport}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white transition-all flex items-center gap-2 shadow-sm"
            >
              {isEditing ? <Check className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
              <span>{isEditing ? 'Cancel Edit' : 'Edit Profile'}</span>
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/30 text-rose-100 transition-all flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Success / Error Alerts */}
      {successMsg && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Grid: Details + Preferences */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        
        {/* Left Column: Personal Profile & Base Details */}
        <div className="lg:col-span-1 bg-white dark:bg-[#0b1329] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <User className="w-4 h-4 text-sky-500" />
              <span>Personal Details</span>
            </h2>
            {isEditing && (
              <span className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/50 px-2 py-0.5 rounded">
                Editing Mode
              </span>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Full Name
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              ) : (
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{name}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Email Address
              </label>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <span>{user?.email || 'demo@vayu.aero'}</span>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">
                  Verified
                </span>
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Mobile Number
              </label>
              {isEditing ? (
                <input
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              ) : (
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{mobile}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Home Base Airport
              </label>
              {isEditing ? (
                <select
                  value={homeAirport}
                  onChange={(e) => setHomeAirport(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                >
                  <option value="DEL">DEL — New Delhi</option>
                  <option value="BOM">BOM — Mumbai</option>
                  <option value="BLR">BLR — Bengaluru</option>
                  <option value="CCU">CCU — Kolkata</option>
                  <option value="HYD">HYD — Hyderabad</option>
                  <option value="MAA">MAA — Chennai</option>
                  <option value="AMD">AMD — Ahmedabad</option>
                  <option value="GOI">GOI — Goa</option>
                </select>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 font-semibold text-xs border border-sky-200 dark:border-sky-800">
                  <Plane className="w-3.5 h-3.5 text-sky-500" />
                  <span>{homeAirport}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Preferred Cabin Class
              </label>
              {isEditing ? (
                <select
                  value={cabinClass}
                  onChange={(e) => setCabinClass(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="Economy">Economy</option>
                  <option value="Premium Economy">Premium Economy</option>
                  <option value="Business">Business Class</option>
                </select>
              ) : (
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{cabinClass}</p>
              )}
            </div>
          </div>

          {isEditing && (
            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 flex items-center justify-center gap-2 shadow-md transition-all"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving Changes...' : 'Save Profile Changes'}</span>
            </button>
          )}
        </div>

        {/* Right Columns: Airline & Card Preferences + Notification Settings */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Preferred Airlines & Cards */}
          <div className="bg-white dark:bg-[#0b1329] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
              <Plane className="w-4 h-4 text-sky-500" />
              <span>Carrier & Payment Intelligence</span>
            </h2>

            {/* Airlines */}
            <div className="mb-6">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
                Preferred Airlines (Filter default routes & booking windows)
              </label>
              <div className="flex flex-wrap gap-2">
                {AIRLINE_OPTIONS.map((airline) => {
                  const isSelected = preferredAirlines.includes(airline.code);
                  return (
                    <button
                      key={airline.code}
                      type="button"
                      disabled={!isEditing}
                      onClick={() => toggleAirline(airline.code)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-400 dark:border-sky-700 text-sky-700 dark:text-sky-300 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 opacity-70'
                      }`}
                    >
                      <span className="font-mono font-bold text-[11px]">{airline.code}</span>
                      <span>{airline.name}</span>
                      {isSelected && <Check className="w-3 h-3 text-sky-600 dark:text-sky-400" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Credit Cards for Fare Saver */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
                Saved Credit Cards (Auto-applied in Smart Fare Saver & Booking)
              </label>
              <div className="flex flex-wrap gap-2">
                {CARD_OPTIONS.map((card) => {
                  const isSelected = selectedCards.includes(card);
                  return (
                    <button
                      key={card}
                      type="button"
                      disabled={!isEditing}
                      onClick={() => toggleCard(card)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-400 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 opacity-70'
                      }`}
                    >
                      <CreditCard className="w-3 h-3" />
                      <span>{card}</span>
                      {isSelected && <Check className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Notification Channels */}
          <div className="bg-white dark:bg-[#0b1329] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
              <Bell className="w-4 h-4 text-sky-500" />
              <span>Smart Notification Channels</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Push Notifications */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Push Alerts</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">Browser & Mobile</span>
                </div>
                <input
                  type="checkbox"
                  disabled={!isEditing}
                  checked={notificationPrefs.push}
                  onChange={(e) => setNotificationPrefs({ ...notificationPrefs, push: e.target.checked })}
                  className="w-4 h-4 text-sky-600 rounded focus:ring-sky-500 cursor-pointer"
                />
              </div>

              {/* Email Alerts */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Email Digests</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">Weekly surge reports</span>
                </div>
                <input
                  type="checkbox"
                  disabled={!isEditing}
                  checked={notificationPrefs.email}
                  onChange={(e) => setNotificationPrefs({ ...notificationPrefs, email: e.target.checked })}
                  className="w-4 h-4 text-sky-600 rounded focus:ring-sky-500 cursor-pointer"
                />
              </div>

              {/* In-App Notifications */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">In-App Bell</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">Real-time alerts</span>
                </div>
                <input
                  type="checkbox"
                  disabled={!isEditing}
                  checked={notificationPrefs.in_app}
                  onChange={(e) => setNotificationPrefs({ ...notificationPrefs, in_app: e.target.checked })}
                  className="w-4 h-4 text-sky-600 rounded focus:ring-sky-500 cursor-pointer"
                />
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Second Row: Favourite Routes & Active Price Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        
        {/* Favourite Routes */}
        <div className="bg-white dark:bg-[#0b1329] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Heart className="w-4 h-4 text-rose-500" />
              <span>Favourite Routes</span>
            </h2>
            <Link
              to="/routes"
              className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
            >
              <span>Explore More</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-3">
            {savedRoutes.map((rt) => (
              <div
                key={rt.id}
                className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between hover:border-sky-300 dark:hover:border-sky-800 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-sky-100 dark:bg-sky-950/80 text-sky-600 dark:text-sky-400 font-mono font-bold text-xs">
                    {rt.origin_iata} ➔ {rt.destination_iata}
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                      {rt.origin_city || rt.origin_iata} to {rt.destination_city || rt.destination_iata}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Budget Target: {formatCurrencyINR(rt.target_budget)}
                    </span>
                  </div>
                </div>

                <Link
                  to={`/booking?origin=${rt.origin_iata}&destination=${rt.destination_iata}`}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800 hover:bg-sky-100 transition-colors"
                >
                  Book Window
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Active Price Alerts */}
        <div className="bg-white dark:bg-[#0b1329] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-emerald-500" />
              <span>Active Price Alerts</span>
            </h2>
            <Link
              to="/notifications"
              className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
            >
              <span>Manage Alerts</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-3">
            {priceAlerts.map((alert) => (
              <div
                key={alert.id}
                className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 font-mono">
                      {alert.route_key}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                      Threshold: Under {formatCurrencyINR(alert.target_price)} • {alert.alert_type}
                    </span>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  MONITORING
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Third Row: Trip History & Reservation Records */}
      <div className="bg-white dark:bg-[#0b1329] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Ticket className="w-4 h-4 text-sky-500" />
              <span>Trip History & Booking Slips</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Verified reservations and smart window historical bookings
            </p>
          </div>
          <Link
            to="/booking"
            className="px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            New Reservation
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                <th className="pb-3 font-semibold">PNR Reference</th>
                <th className="pb-3 font-semibold">Route</th>
                <th className="pb-3 font-semibold">Flight / Airline</th>
                <th className="pb-3 font-semibold">Departure Date</th>
                <th className="pb-3 font-semibold">Fare Paid</th>
                <th className="pb-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {tripHistory.map((trip) => (
                <tr key={trip.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                  <td className="py-3 font-mono font-bold text-sky-600 dark:text-sky-400">
                    {trip.pnr_ref}
                  </td>
                  <td className="py-3 font-semibold text-slate-800 dark:text-slate-200">
                    {trip.origin_iata} ➔ {trip.destination_iata}
                  </td>
                  <td className="py-3 text-slate-600 dark:text-slate-400">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{trip.flight_number}</span> ({trip.airline})
                  </td>
                  <td className="py-3 text-slate-600 dark:text-slate-400">
                    {trip.departure_date}
                  </td>
                  <td className="py-3 font-mono font-bold text-slate-900 dark:text-white">
                    {formatCurrencyINR(trip.fare_paid)}
                  </td>
                  <td className="py-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                      {trip.status || 'CONFIRMED'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
