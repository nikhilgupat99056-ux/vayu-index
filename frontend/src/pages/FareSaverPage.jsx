import React, { useState, useEffect, useMemo } from 'react';
import { 
  CreditCard, 
  ArrowRight, 
  Percent, 
  Tag, 
  Sparkles, 
  Calendar, 
  Plane, 
  Search, 
  RotateCcw, 
  ArrowUpDown, 
  TrendingDown, 
  TrendingUp, 
  Award, 
  Building2, 
  CheckCircle2, 
  ShieldCheck, 
  SlidersHorizontal,
  ChevronRight,
  Info
} from 'lucide-react';
import { 
  fetchCreditCards, 
  calculateFareSaver, 
  fetchSavingsSummary, 
  fetchAirports 
} from '../services/api';
import { formatCurrencyINR, formatPercentage } from '../utils/formatters';

const SUPPORTED_CARDS_LIST = [
  'All Cards (Best Deal)',
  'SBI Cashback',
  'HDFC Regalia Gold',
  'Axis Atlas',
  'ICICI Coral',
  'ICICI Sapphiro',
  'HDFC Millennia',
  'Axis Ace',
  'Standard (No Card)'
];

const AIRLINES_LIST = [
  { code: 'ALL', name: 'All Airlines' },
  { code: '6E', name: 'IndiGo (6E)' },
  { code: 'AI', name: 'Air India (AI)' },
  { code: 'QP', name: 'Akasa Air (QP)' },
  { code: 'SG', name: 'SpiceJet (SG)' },
  { code: 'I5', name: 'AIX Connect (I5)' }
];

const BOOKING_WINDOWS = [
  { days: 3, label: '0–3 Days (Urgent)' },
  { days: 7, label: '4–7 Days' },
  { days: 14, label: '8–14 Days' },
  { days: 30, label: '15–30 Days (Sweet Spot)' },
  { days: 60, label: '31–60 Days (Advance)' }
];

export default function FareSaverPage() {
  // State
  const [airports, setAirports] = useState([]);
  const [cards, setCards] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [routesData, setRoutesData] = useState([]);
  const [summary, setSummary] = useState(null);

  // Filters
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [airline, setAirline] = useState('ALL');
  const [bookingWindow, setBookingWindow] = useState(30);
  const [selectedCard, setSelectedCard] = useState('All Cards (Best Deal)');
  const [isFestival, setIsFestival] = useState(false);
  const [sortBy, setSortBy] = useState('savings_desc');
  const [tableSearch, setTableSearch] = useState('');

  // Selected route for Output Card simulation
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [previewCard, setPreviewCard] = useState(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Active Analytics Tab
  const [activeAnalyticsTab, setActiveAnalyticsTab] = useState('top_routes');

  // Load initial reference data (airports, cards, analytics)
  useEffect(() => {
    Promise.all([
      fetchAirports(),
      fetchCreditCards(),
      fetchSavingsSummary()
    ]).then(([airportsRes, cardsRes, analyticsRes]) => {
      setAirports(airportsRes || []);
      setCards(cardsRes || []);
      setAnalytics(analyticsRes || null);
    }).catch(err => {
      console.warn('Error loading initial reference data:', err);
    });
  }, []);

  // Fetch / Recalculate Fare Saver results whenever filters change
  useEffect(() => {
    setLoading(true);
    const cardParam = selectedCard === 'All Cards (Best Deal)' ? 'ALL' : selectedCard;

    calculateFareSaver({
      origin: origin || undefined,
      destination: destination || undefined,
      airline: airline !== 'ALL' ? airline : undefined,
      booking_window_days: bookingWindow,
      card_name: cardParam,
      is_festival: isFestival,
      sort_by: sortBy,
      limit: 350,
      offset: 0
    }).then(res => {
      const list = res?.routes || [];
      setRoutesData(list);
      setSummary(res?.summary || null);

      // Default the output card to the first route or preserve existing selection
      if (list.length > 0) {
        if (!selectedRoute) {
          setSelectedRoute(list[0]);
        } else {
          const match = list.find(r => r.route_id === selectedRoute.route_id || r.route_key === selectedRoute.route_key);
          setSelectedRoute(match || list[0]);
        }
      } else {
        setSelectedRoute(null);
      }
      setLoading(false);
    }).catch(err => {
      console.error('Error calculating fare saver:', err);
      setLoading(false);
    });
  }, [origin, destination, airline, bookingWindow, selectedCard, isFestival, sortBy]);

  // Client-side quick filter on the table
  const filteredTableRoutes = useMemo(() => {
    const q = tableSearch.toLowerCase().trim();
    if (!q) return routesData;
    return routesData.filter(r => 
      r.origin.toLowerCase().includes(q) ||
      r.destination.toLowerCase().includes(q) ||
      r.origin_city.toLowerCase().includes(q) ||
      r.destination_city.toLowerCase().includes(q) ||
      r.best_card.toLowerCase().includes(q) ||
      r.airline.toLowerCase().includes(q) ||
      r.route_key.toLowerCase().includes(q)
    );
  }, [routesData, tableSearch]);

  const totalPages = Math.ceil(filteredTableRoutes.length / pageSize) || 1;
  const paginatedRoutes = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTableRoutes.slice(start, start + pageSize);
  }, [filteredTableRoutes, currentPage]);

  const handleResetFilters = () => {
    setOrigin('');
    setDestination('');
    setAirline('ALL');
    setBookingWindow(30);
    setSelectedCard('All Cards (Best Deal)');
    setIsFestival(false);
    setSortBy('savings_desc');
    setTableSearch('');
    setCurrentPage(1);
  };

  // Compute active output card data based on selected route and preview card
  const activeOutputData = useMemo(() => {
    if (!selectedRoute) {
      // Default fallback demo values matching prompt example:
      // Original Fare: ₹8,420, Card Discount: 10%, Instant Discount: −₹842, Convenience Fee: ₹299, Final: ₹7,877, Savings: ₹543
      return {
        route_key: 'DEL → BOM',
        origin_city: 'New Delhi',
        destination_city: 'Mumbai',
        airline: 'IndiGo (6E)',
        original_fare: 8420,
        card_name: 'SBI Cashback',
        bank: 'SBI',
        discount_pct: 10.0,
        instant_discount: 842,
        convenience_fee: 299,
        final_price: 7877,
        savings: 543,
        promo_code: 'SBIAIR10',
        offer_title: 'SBI Instant Flight Saver 10%'
      };
    }

    if (previewCard && selectedRoute.all_card_options) {
      const matchOpt = selectedRoute.all_card_options.find(c => c.card_name === previewCard);
      if (matchOpt) {
        return {
          route_key: selectedRoute.route_key,
          origin_city: selectedRoute.origin_city,
          destination_city: selectedRoute.destination_city,
          airline: selectedRoute.airline,
          original_fare: selectedRoute.base_fare,
          card_name: matchOpt.card_name,
          bank: matchOpt.bank,
          discount_pct: matchOpt.discount_pct,
          instant_discount: matchOpt.instant_discount,
          convenience_fee: matchOpt.convenience_fee,
          final_price: matchOpt.final_price,
          savings: matchOpt.savings,
          promo_code: matchOpt.promo_code,
          offer_title: matchOpt.offer_title
        };
      }
    }

    return {
      route_key: selectedRoute.route_key,
      origin_city: selectedRoute.origin_city,
      destination_city: selectedRoute.destination_city,
      airline: selectedRoute.airline,
      original_fare: selectedRoute.base_fare,
      card_name: selectedRoute.best_card,
      bank: selectedRoute.bank,
      discount_pct: selectedRoute.discount_pct,
      instant_discount: selectedRoute.instant_discount,
      convenience_fee: selectedRoute.convenience_fee,
      final_price: selectedRoute.final_price,
      savings: selectedRoute.savings,
      promo_code: selectedRoute.promo_code,
      offer_title: selectedRoute.offer_title
    };
  }, [selectedRoute, previewCard]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-sans">
      
      {/* 1. Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6 transition-colors">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/30">
              SMART FARE SAVER
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1">
              <CreditCard className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
              Credit Card Discount Intelligence Engine
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            Cheapest Payable Airfare Optimization
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-3xl">
            Calculates lowest final airfares across all 253+ domestic routes after deducting qualifying credit card instant discounts, festive surge bonuses, and standard convenience fees.
          </p>
        </div>

        {/* Network KPI Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
          <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
            <span className="text-slate-500 text-[10px] block">Routes Tracked</span>
            <span className="text-slate-900 dark:text-slate-100 font-bold text-sm">253+ Sectors</span>
          </div>
          <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
            <span className="text-slate-500 text-[10px] block">Max Discount</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">₹2,500 Off</span>
          </div>
          <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
            <span className="text-slate-500 text-[10px] block">Avg Savings</span>
            <span className="text-sky-600 dark:text-sky-400 font-bold text-sm">{formatCurrencyINR(summary?.average_savings || 840)}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
            <span className="text-slate-500 text-[10px] block">Active Cards</span>
            <span className="text-amber-600 dark:text-amber-400 font-bold text-sm">8 Supported</span>
          </div>
        </div>
      </div>

      {/* 2. Interactive Filter Bar */}
      <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5 font-mono">
            <SlidersHorizontal className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
            Airfare & Card Filters
          </span>
          <button
            onClick={handleResetFilters}
            className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset All</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs">
          
          {/* Origin */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400">Origin Airport</label>
            <select
              value={origin}
              onChange={(e) => { setOrigin(e.target.value); setCurrentPage(1); }}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-sky-500 text-xs font-mono transition-colors"
            >
              <option value="">All Origins (Pan-India)</option>
              {airports.map(a => (
                <option key={`orig-${a.iata}`} value={a.iata}>
                  {a.iata} — {a.city}
                </option>
              ))}
            </select>
          </div>

          {/* Destination */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400">Destination Airport</label>
            <select
              value={destination}
              onChange={(e) => { setDestination(e.target.value); setCurrentPage(1); }}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-sky-500 text-xs font-mono transition-colors"
            >
              <option value="">All Destinations</option>
              {airports.map(a => (
                <option key={`dest-${a.iata}`} value={a.iata}>
                  {a.iata} — {a.city}
                </option>
              ))}
            </select>
          </div>

          {/* Airline */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400">Airline Carrier</label>
            <select
              value={airline}
              onChange={(e) => { setAirline(e.target.value); setCurrentPage(1); }}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-sky-500 text-xs font-mono transition-colors"
            >
              {AIRLINES_LIST.map(al => (
                <option key={al.code} value={al.code}>
                  {al.name}
                </option>
              ))}
            </select>
          </div>

          {/* Booking Window */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400">Booking Lead Window</label>
            <select
              value={bookingWindow}
              onChange={(e) => { setBookingWindow(Number(e.target.value)); setCurrentPage(1); }}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-sky-500 text-xs font-mono transition-colors"
            >
              {BOOKING_WINDOWS.map(bw => (
                <option key={bw.days} value={bw.days}>
                  {bw.label}
                </option>
              ))}
            </select>
          </div>

          {/* Credit Card */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400">Credit Card Offer</label>
            <select
              value={selectedCard}
              onChange={(e) => { 
                setSelectedCard(e.target.value); 
                setPreviewCard(e.target.value === 'All Cards (Best Deal)' ? null : e.target.value);
                setCurrentPage(1); 
              }}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-sky-500 text-xs font-mono font-medium transition-colors"
            >
              {SUPPORTED_CARDS_LIST.map(cardName => (
                <option key={cardName} value={cardName}>
                  {cardName}
                </option>
              ))}
            </select>
          </div>

          {/* Festival Toggle */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400">Festival Surge Mode</label>
            <button
              type="button"
              onClick={() => setIsFestival(!isFestival)}
              className={`w-full py-1.5 px-3 rounded-lg border text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 ${
                isFestival
                  ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/50'
                  : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isFestival ? 'Festival Mode ON' : 'Normal Travel'}</span>
            </button>
          </div>

        </div>
      </div>

      {/* 3. Output Card Section (Prominent Customer Payable Breakdown) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Output Card */}
        <div className="lg:col-span-2 p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5 transition-colors">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-extrabold text-slate-900 dark:text-slate-100 font-mono tracking-tight">
                  {activeOutputData.route_key}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  ({activeOutputData.origin_city} ➔ {activeOutputData.destination_city})
                </span>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                <Plane className="w-3 h-3 text-sky-500 dark:text-sky-400" />
                Carriers: {activeOutputData.airline}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30 text-xs font-mono font-bold">
                {activeOutputData.card_name}
              </span>
              {activeOutputData.promo_code && activeOutputData.promo_code !== 'STANDARD' && (
                <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-amber-600 dark:text-amber-400 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold">
                  Code: {activeOutputData.promo_code}
                </span>
              )}
            </div>
          </div>

          {/* Explicit Output Card Breakdown Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono">
            
            {/* Original Fare */}
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase block">Original Fare</span>
              <span className="text-base font-bold text-slate-800 dark:text-slate-200">
                {formatCurrencyINR(activeOutputData.original_fare)}
              </span>
            </div>

            {/* Card Discount */}
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase block">Card Discount</span>
              <span className="text-base font-bold text-sky-600 dark:text-sky-400">
                {activeOutputData.discount_pct}%
              </span>
            </div>

            {/* Instant Discount */}
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase block">Instant Discount</span>
              <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                −{formatCurrencyINR(activeOutputData.instant_discount)}
              </span>
            </div>

            {/* Convenience Fee */}
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase block">Convenience Fee</span>
              <span className="text-base font-bold text-slate-600 dark:text-slate-400">
                +{formatCurrencyINR(activeOutputData.convenience_fee)}
              </span>
            </div>

            {/* Final Payable Price */}
            <div className="p-3 rounded-lg bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-500/40">
              <span className="text-[10px] text-sky-700 dark:text-sky-300 uppercase block font-bold">Final Price</span>
              <span className="text-lg font-extrabold text-sky-600 dark:text-sky-400">
                {formatCurrencyINR(activeOutputData.final_price)}
              </span>
            </div>

            {/* Savings */}
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/40">
              <span className="text-[10px] text-emerald-700 dark:text-emerald-300 uppercase block font-bold">Total Savings</span>
              <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
                {formatCurrencyINR(activeOutputData.savings)}
              </span>
            </div>

          </div>

          {/* Quick Card Simulator Strip for Selected Route */}
          {selectedRoute?.all_card_options && selectedRoute.all_card_options.length > 0 && (
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
              <span className="text-xs text-slate-600 dark:text-slate-400 font-mono block">
                Compare other credit cards for this corridor:
              </span>
              <div className="flex flex-wrap gap-2">
                {selectedRoute.all_card_options.map(opt => {
                  const isCurrent = (activeOutputData.card_name === opt.card_name);
                  return (
                    <button
                      key={opt.card_name}
                      onClick={() => setPreviewCard(opt.card_name)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all flex items-center gap-1.5 border ${
                        isCurrent
                          ? 'bg-slate-100 dark:bg-slate-800 text-sky-700 dark:text-sky-300 border-sky-400 dark:border-sky-500/60 font-bold shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: opt.color || '#0284c7' }}></span>
                      <span>{opt.card_name}</span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                        ({formatCurrencyINR(opt.final_price)})
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* Calculation Formula & Strategy Card */}
        <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider font-mono flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
            Formula & Optimization Rule
          </h3>
          
          <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-700 dark:text-slate-300 space-y-1">
            <span className="text-slate-500 text-[10px] block">PAYABLE AIRFARE EQUATION:</span>
            <p className="text-sky-600 dark:text-sky-300 font-bold">
              Final Price = Base Fare − Discount + Fee
            </p>
            <p className="text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
              Savings = Instant Discount − Fee
            </p>
          </div>

          <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
            <p>
              When multiple credit cards qualify for a sector, VAYU-Index automatically selects the card yielding the maximum net savings.
            </p>
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-500 dark:text-slate-400 space-y-1">
              <div className="flex justify-between">
                <span>Axis Atlas:</span>
                <span className="text-slate-800 dark:text-slate-200 font-bold">15% up to ₹2,500</span>
              </div>
              <div className="flex justify-between">
                <span>HDFC Regalia Gold:</span>
                <span className="text-slate-800 dark:text-slate-200 font-bold">12%–15% up to ₹2,500</span>
              </div>
              <div className="flex justify-between">
                <span>SBI Cashback:</span>
                <span className="text-slate-800 dark:text-slate-200 font-bold">10%–12% up to ₹1,800</span>
              </div>
              <div className="flex justify-between">
                <span>ICICI Sapphiro:</span>
                <span className="text-slate-800 dark:text-slate-200 font-bold">14% up to ₹2,200</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* 4. Complete Route Table (All 253 Domestic Routes) */}
      <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
        
        {/* Table Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider font-mono flex items-center gap-2">
              <Tag className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
              Domestic Route Discount Matrix ({filteredTableRoutes.length} Corridors)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Click on any row to inspect complete price breakdown and simulated card options.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Quick search input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search city, IATA or card..."
                value={tableSearch}
                onChange={(e) => { setTableSearch(e.target.value); setCurrentPage(1); }}
                className="pl-8 pr-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono w-48 sm:w-56 transition-colors"
              />
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 text-xs font-mono">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => { setSortBy(e.target.value); setCurrentPage(1); }}
                className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-sky-500 text-xs font-mono transition-colors"
              >
                <option value="savings_desc">Sort: Highest Savings</option>
                <option value="final_price_asc">Sort: Final Price (Low to High)</option>
                <option value="final_price_desc">Sort: Final Price (High to Low)</option>
                <option value="discount_desc">Sort: Discount %</option>
              </select>
            </div>
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-mono text-[11px] uppercase bg-slate-50 dark:bg-slate-950/60">
                <th className="py-2.5 px-3">Origin</th>
                <th className="py-2.5 px-3">Destination</th>
                <th className="py-2.5 px-3">Airline</th>
                <th className="py-2.5 px-3 text-right">Base Fare</th>
                <th className="py-2.5 px-3">Best Card</th>
                <th className="py-2.5 px-3 text-right">Discount %</th>
                <th className="py-2.5 px-3 text-right font-bold text-sky-600 dark:text-sky-400">Final Price</th>
                <th className="py-2.5 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">Savings</th>
                <th className="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500 dark:text-slate-400 font-mono">
                    <div className="w-5 h-5 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span>Calculating lowest payable airfares...</span>
                  </td>
                </tr>
              ) : paginatedRoutes.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500 dark:text-slate-400 font-mono">
                    No matching corridors found for the selected filter combination.
                  </td>
                </tr>
              ) : (
                paginatedRoutes.map((r) => {
                  const isSelected = selectedRoute?.route_id === r.route_id;
                  return (
                    <tr 
                      key={`row-${r.route_id}`}
                      onClick={() => { setSelectedRoute(r); setPreviewCard(null); }}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors ${
                        isSelected ? 'bg-sky-50 dark:bg-sky-500/10' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3">
                        <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{r.origin}</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate max-w-[110px]">{r.origin_city}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{r.destination}</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate max-w-[110px]">{r.destination_city}</span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-700 dark:text-slate-300">
                        {r.airline}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-right text-slate-700 dark:text-slate-300">
                        {formatCurrencyINR(r.base_fare)}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-sky-700 dark:text-sky-300 border border-slate-200 dark:border-slate-700 whitespace-nowrap">
                          {r.best_card}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-right text-sky-600 dark:text-sky-400 font-bold">
                        {r.discount_pct}%
                      </td>
                      <td className="py-2.5 px-3 font-mono text-right text-sky-600 dark:text-sky-400 font-bold">
                        {formatCurrencyINR(r.final_price)}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-right text-emerald-600 dark:text-emerald-400 font-bold">
                        {formatCurrencyINR(r.savings)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRoute(r);
                            setPreviewCard(null);
                          }}
                          className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-sky-600 dark:text-sky-400 text-[10px] font-mono font-bold transition-colors border border-slate-200 dark:border-slate-700"
                        >
                          Select
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-3 border-t border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-500 dark:text-slate-400">
          <div>
            Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredTableRoutes.length)} of {filteredTableRoutes.length} corridors
          </div>
          <div className="flex items-center gap-1.5">
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              Previous
            </button>
            <span className="px-2">Page {currentPage} of {totalPages}</span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              Next
            </button>
          </div>
        </div>

      </div>

      {/* 5. Comprehensive Smart Analytics Section */}
      <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 transition-colors">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider font-mono flex items-center gap-2">
              <Award className="w-4 h-4 text-sky-500 dark:text-sky-400" />
              Fare Saver Discount Analytics & Intelligence
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Deep-dive metrics across top savings sectors, bank benchmarks, airline compatibility, and festival deltas.
            </p>
          </div>

          {/* Analytics Tabs */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 overflow-x-auto">
            {[
              { id: 'top_routes', label: 'Top 10 Routes' },
              { id: 'bank_avg', label: 'Bank Averages' },
              { id: 'airline_compat', label: 'Airlines vs Cards' },
              { id: 'lead_time', label: 'Lead-Time Histogram' },
              { id: 'festival_compare', label: 'Festival Comparison' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveAnalyticsTab(tab.id)}
                className={`px-3 py-1 rounded text-xs font-mono font-medium transition-colors whitespace-nowrap ${
                  activeAnalyticsTab === tab.id
                    ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 border border-slate-200 dark:border-slate-700 font-bold shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab 1: Top 10 Routes with Highest Savings */}
        {activeAnalyticsTab === 'top_routes' && (
          <div className="space-y-3">
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400 block">
              Long-haul and premium sectors delivering the greatest rupee discount:
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(analytics?.top_10_routes || []).map((r, idx) => (
                <div 
                  key={`top-r-${r.route_id || idx}`}
                  onClick={() => {
                    const match = routesData.find(item => item.route_id === r.route_id);
                    if (match) setSelectedRoute(match);
                  }}
                  className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-sky-500/40 cursor-pointer transition-all flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-xs font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5 font-mono font-bold text-xs text-sky-600 dark:text-sky-400">
                        <span>{r.origin}</span>
                        <span>➔</span>
                        <span>{r.destination}</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">({r.origin_city} to {r.destination_city})</span>
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-mono">
                        Base: {formatCurrencyINR(r.base_fare)} &bull; {r.best_card}
                      </span>
                    </div>
                  </div>

                  <div className="text-right font-mono">
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 block">
                      Save {formatCurrencyINR(r.savings)}
                    </span>
                    <span className="text-[10px] text-sky-600 dark:text-sky-300 font-medium">
                      Final {formatCurrencyINR(r.final_price)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Average Savings by Bank */}
        {activeAnalyticsTab === 'bank_avg' && (
          <div className="space-y-4">
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400 block">
              Average rupee savings and active card inventory across premier Indian banking networks:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {(analytics?.bank_savings_avg || []).map(b => (
                <div key={b.bank} className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: b.color }}></span>
                      <span className="font-bold text-sm text-slate-900 dark:text-slate-100 font-mono">{b.bank}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                      {b.supported_cards} Cards
                    </span>
                  </div>

                  <div className="space-y-1 font-mono">
                    <span className="text-[10px] text-slate-500 block">Average Savings / Sector</span>
                    <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                      {formatCurrencyINR(b.average_savings)}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 text-[11px] font-mono text-slate-500 dark:text-slate-400 flex justify-between">
                    <span>Peak Corridor Cap:</span>
                    <span className="text-slate-800 dark:text-slate-200 font-bold">{formatCurrencyINR(b.max_savings)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Airline vs Card Compatibility Chart */}
        {activeAnalyticsTab === 'airline_compat' && (
          <div className="space-y-3">
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400 block">
              Optimal credit card synergy across India's 5 domestic airlines:
            </span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(analytics?.airline_card_compatibility || []).map(al => (
                <div key={al.code} className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                    <span className="font-bold text-sm text-sky-600 dark:text-sky-400 font-mono">
                      {al.name} ({al.code})
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 font-mono font-bold border border-slate-200 dark:border-slate-700">
                      Up to {al.top_discount_pct}% Off
                    </span>
                  </div>

                  <div className="space-y-1 text-xs font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Best Card:</span>
                      <span className="text-slate-800 dark:text-slate-200 font-bold">{al.best_card}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Avg Sector Savings:</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">{formatCurrencyINR(al.avg_savings)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Top Promo Code:</span>
                      <span className="text-amber-600 dark:text-amber-400 font-bold">{al.best_promo}</span>
                    </div>
                    <div className="flex justify-between pt-1 text-[10px] text-slate-400 dark:text-slate-500">
                      <span>Coverage:</span>
                      <span className="text-slate-700 dark:text-slate-300">{al.compatibility}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: Booking Lead-Time Histogram */}
        {activeAnalyticsTab === 'lead_time' && (
          <div className="space-y-4">
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400 block">
              How advance booking windows alter the effective card discount yield:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 font-mono">
              {(analytics?.monthly_savings_histogram || []).map((w, idx) => (
                <div 
                  key={w.window} 
                  className={`p-3.5 rounded-lg border space-y-2 ${
                    w.sweet_spot 
                      ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-500/40 ring-1 ring-emerald-400/20' 
                      : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block truncate">
                    {w.window}
                  </span>
                  
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 block">Avg Base Fare</span>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{formatCurrencyINR(w.avg_fare)}</span>
                  </div>

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 space-y-0.5">
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block">Avg Net Savings</span>
                    <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">{formatCurrencyINR(w.avg_savings)}</span>
                  </div>

                  {w.sweet_spot && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold block text-center border border-emerald-500/30">
                      Sweet Spot
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 5: Festival Offer Comparison */}
        {activeAnalyticsTab === 'festival_compare' && (
          <div className="space-y-4 font-sans">
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400 block">
              Evaluating credit card discount impact during peak festive surges vs standard commercial periods:
            </span>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
              
              {/* Regular Period */}
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2.5">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-300 uppercase block tracking-wider border-b border-slate-200 dark:border-slate-800 pb-2">
                  Regular Commercial Travel
                </span>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Average Base Fare:</span>
                  <span className="text-slate-800 dark:text-slate-200 font-bold">{formatCurrencyINR(analytics?.festival_comparison?.normal_travel?.avg_base_fare || 5250)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Average Discount:</span>
                  <span className="text-sky-600 dark:text-sky-400 font-bold">{analytics?.festival_comparison?.normal_travel?.avg_discount_pct || 12.5}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Average Net Savings:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">{formatCurrencyINR(analytics?.festival_comparison?.normal_travel?.avg_savings || 780)}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-800 text-[11px]">
                  <span className="text-slate-500">Effective Payable:</span>
                  <span className="text-slate-800 dark:text-slate-200 font-bold">{formatCurrencyINR(analytics?.festival_comparison?.normal_travel?.effective_payable || 4769)}</span>
                </div>
              </div>

              {/* Festival Surge Period */}
              <div className="p-4 rounded-lg bg-amber-500/10 dark:bg-amber-950/20 border border-amber-500/30 dark:border-amber-500/40 space-y-2.5">
                <span className="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase block tracking-wider border-b border-amber-500/30 pb-2">
                  Festival Surge Travel (Diwali, Chhath, Durga Puja)
                </span>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Average Base Fare:</span>
                  <span className="text-slate-800 dark:text-slate-200 font-bold">{formatCurrencyINR(analytics?.festival_comparison?.festival_surge?.avg_base_fare || 7650)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Average Discount (w/ Festive Bonus):</span>
                  <span className="text-amber-600 dark:text-amber-400 font-bold">{analytics?.festival_comparison?.festival_surge?.avg_discount_pct || 15.5}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Average Net Savings:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">{formatCurrencyINR(analytics?.festival_comparison?.festival_surge?.avg_savings || 1240)}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-amber-500/30 text-[11px]">
                  <span className="text-amber-700 dark:text-amber-300">Effective Payable:</span>
                  <span className="text-slate-800 dark:text-slate-200 font-bold">{formatCurrencyINR(analytics?.festival_comparison?.festival_surge?.effective_payable || 6709)}</span>
                </div>
              </div>

            </div>

            {/* Delta summary note */}
            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 flex items-center justify-between font-mono">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                Extra Festival Net Savings: +{formatCurrencyINR(analytics?.festival_comparison?.festival_delta?.extra_savings || 460)} (+59% Increase)
              </span>
              <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                {analytics?.festival_comparison?.festival_delta?.advice}
              </span>
            </div>

          </div>
        )}

      </div>

    </div>
  );
}
