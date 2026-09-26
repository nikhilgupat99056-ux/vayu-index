import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Compass, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  CheckCircle, 
  AlertCircle, 
  MapPin, 
  ArrowRight, 
  Plane, 
  CreditCard, 
  ShieldCheck, 
  Clock, 
  Tag, 
  Percent, 
  HelpCircle,
  Sliders,
  DollarSign
} from 'lucide-react';
import { fetchAIRecommendation, FALLBACK_AIRPORTS } from '../services/api';
import { formatCurrencyINR, formatAPIx } from '../utils/formatters';

const POPULAR_RECOMMENDATION_CORRIDORS = [
  { origin: 'CCU', destination: 'GOI', label: 'Kolkata ➔ Goa (Tourist Favorite)' },
  { origin: 'DEL', destination: 'BOM', label: 'Delhi ➔ Mumbai (Metro High Density)' },
  { origin: 'BLR', destination: 'SXR', label: 'Bengaluru ➔ Srinagar (Leisure/Pilgrim)' },
  { origin: 'DEL', destination: 'PAT', label: 'Delhi ➔ Patna (Festive Surge Corridor)' }
];

export default function AIAdvisorPage() {
  const [origin, setOrigin] = useState('CCU');
  const [destination, setDestination] = useState('GOI');
  const [travelDate, setTravelDate] = useState(() => {
    // Default to ~32 days from now
    const d = new Date();
    d.setDate(d.getDate() + 32);
    return d.toISOString().split('T')[0];
  });
  const [flexibleDates, setFlexibleDates] = useState(true);
  const [budget, setBudget] = useState(8000);
  const [preferredAirline, setPreferredAirline] = useState('6E');

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  // Initial trigger to load Kolkata to Goa recommendation immediately
  useEffect(() => {
    handleGetAdvice();
  }, []);

  const handleGetAdvice = async (customOrigin, customDest) => {
    const o = customOrigin || origin;
    const d = customDest || destination;

    if (o === d) {
      setError('Origin and destination cannot be identical.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetchAIRecommendation({
        origin: o,
        destination: d,
        travel_date: travelDate,
        flexible_dates: flexibleDates,
        budget: Number(budget),
        preferred_airline: preferredAirline
      });
      setResult(res);
    } catch (err) {
      setError('Failed to compute econometric recommendation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 transition-colors duration-200">
      
      {/* Page Title & Intelligence Subhead */}
      <div className="mb-8">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="p-2 rounded-xl bg-sky-500/10 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/20">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              AI Travel Advisor
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Econometric price forecasting, optimal purchase windows, and alternate airport arbitrage across 253 routes.
            </p>
          </div>
        </div>

        {/* Quick Route Corridor Buttons */}
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-slate-200 dark:border-slate-800">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1">
            Example Corridors:
          </span>
          {POPULAR_RECOMMENDATION_CORRIDORS.map((c) => (
            <button
              key={`${c.origin}-${c.destination}`}
              type="button"
              onClick={() => {
                setOrigin(c.origin);
                setDestination(c.destination);
                handleGetAdvice(c.origin, c.destination);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                origin === c.origin && destination === c.destination
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-sky-400'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Parameters Form (Left) & AI Output Cards (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Form Inputs (5 Cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-[#0b1329] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm h-fit space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-sky-500" />
              <span>Trip Parameters</span>
            </h2>
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded">
              Rule-Based Engine Active
            </span>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Origin & Destination */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                Origin Airport
              </label>
              <select
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                className="w-full px-3 py-2 text-xs font-medium rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500"
              >
                {FALLBACK_AIRPORTS.map((a) => (
                  <option key={a.iata} value={a.iata}>
                    {a.iata} - {a.city}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                Destination Airport
              </label>
              <select
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full px-3 py-2 text-xs font-medium rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500"
              >
                {FALLBACK_AIRPORTS.map((a) => (
                  <option key={a.iata} value={a.iata}>
                    {a.iata} - {a.city}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Travel Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
              Intended Travel Date
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="date"
                value={travelDate}
                onChange={(e) => setTravelDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          {/* Flexible Dates Toggle */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                Flexible Dates (±3 Days)
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Unlocks cheaper mid-week off-peak departures
              </span>
            </div>
            <input
              type="checkbox"
              checked={flexibleDates}
              onChange={(e) => setFlexibleDates(e.target.checked)}
              className="w-4 h-4 text-sky-600 rounded focus:ring-sky-500 cursor-pointer"
            />
          </div>

          {/* Target Budget */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Budget Cap (Per Passenger)
              </label>
              <span className="text-xs font-mono font-bold text-sky-600 dark:text-sky-400">
                {formatCurrencyINR(budget)}
              </span>
            </div>
            <input
              type="range"
              min={2500}
              max={25000}
              step={500}
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              className="w-full accent-sky-600 cursor-pointer"
            />
          </div>

          {/* Preferred Airline */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
              Preferred Carrier
            </label>
            <select
              value={preferredAirline}
              onChange={(e) => setPreferredAirline(e.target.value)}
              className="w-full px-3 py-2 text-xs font-medium rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500"
            >
              <option value="ALL">Any / Lowest Overall Fare</option>
              <option value="6E">IndiGo (6E) — High Frequency</option>
              <option value="AI">Air India (AI) — Full Service</option>
              <option value="IX">Air India Express (IX) — Low Cost</option>
              <option value="QP">Akasa Air (QP) — Newer Fleet</option>
              <option value="SG">SpiceJet (SG) — Value Fares</option>
            </select>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={() => handleGetAdvice()}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 shadow-md transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <span>Simulating Predictive Models...</span>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate AI Travel Advice</span>
              </>
            )}
          </button>
        </div>

        {/* AI Output Results (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {result ? (
            <>
              {/* Primary Output Hero Card */}
              <div className="bg-gradient-to-br from-slate-900 via-sky-950 to-indigo-950 rounded-2xl p-6 text-white border border-sky-800/40 shadow-xl relative overflow-hidden">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-sky-800/60 pb-4 mb-5">
                  <div className="flex items-center gap-3">
                    <div className="px-3 py-1.5 rounded-lg bg-sky-500/20 text-sky-300 font-mono font-bold text-sm border border-sky-400/30">
                      {result.origin} ➔ {result.destination}
                    </div>
                    <div>
                      <h3 className="font-bold text-base tracking-tight">
                        {result.origin_city} to {result.destination_city}
                      </h3>
                      <p className="text-xs text-sky-200">
                        Target Date: {result.travel_date} ({result.days_out} days away)
                      </p>
                    </div>
                  </div>

                  {/* Confidence Score Pill */}
                  <div className="flex items-center gap-2 bg-emerald-500/20 border border-emerald-400/40 px-3.5 py-1.5 rounded-xl">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <div>
                      <span className="text-[10px] text-emerald-200 block uppercase font-bold leading-none">Confidence</span>
                      <span className="text-sm font-extrabold text-emerald-400 font-mono">{result.confidence_score}%</span>
                    </div>
                  </div>
                </div>

                {/* 3 Core Metric KPIs */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  {/* Metric 1: Best Booking Window */}
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
                    <span className="text-[11px] text-sky-300 uppercase tracking-wider font-semibold block mb-1">
                      Best Booking Window
                    </span>
                    <span className="text-xl font-extrabold text-white block">
                      {result.best_booking_window}
                    </span>
                    <span className="text-[11px] text-emerald-300 mt-1 block">
                      {result.window_status}
                    </span>
                  </div>

                  {/* Metric 2: Price Trend */}
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
                    <span className="text-[11px] text-sky-300 uppercase tracking-wider font-semibold block mb-1">
                      Price Trend
                    </span>
                    <div className="flex items-center gap-2">
                      {result.price_trend === 'Rising' ? (
                        <TrendingUp className="w-5 h-5 text-rose-400" />
                      ) : (
                        <TrendingDown className="w-5 h-5 text-emerald-400" />
                      )}
                      <span className="text-xl font-extrabold text-white">
                        {result.price_trend}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-300 mt-1 block">
                      {result.price_trend_badge}
                    </span>
                  </div>

                  {/* Metric 3: Estimated Fare */}
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
                    <span className="text-[11px] text-sky-300 uppercase tracking-wider font-semibold block mb-1">
                      Cheapest Est. Fare
                    </span>
                    <span className="text-xl font-extrabold text-white block font-mono">
                      {formatCurrencyINR(result.estimated_cheapest_fare)}
                    </span>
                    <span className="text-[11px] text-amber-300 mt-1 block">
                      Weekend: {formatCurrencyINR(result.weekend_fare)}
                    </span>
                  </div>
                </div>

                {/* Algorithmic Window Advice Summary */}
                <div className="p-3.5 rounded-xl bg-sky-900/40 border border-sky-700/50 text-xs text-sky-100 flex items-start gap-2.5">
                  <Clock className="w-4 h-4 text-sky-300 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">{result.window_advice}</p>
                </div>
              </div>

              {/* Tactical Recommendations Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Best Day to Fly */}
                <div className="bg-white dark:bg-[#0b1329] rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
                  <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 text-xs font-bold uppercase">
                    <Calendar className="w-4 h-4" />
                    <span>Best Day to Fly</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {result.best_day_to_fly}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Avoiding Friday and Sunday surge spikes yields immediate tariff savings.
                  </p>
                </div>

                {/* Festival Impact */}
                <div className="bg-white dark:bg-[#0b1329] rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs font-bold uppercase">
                    <Tag className="w-4 h-4" />
                    <span>Festival & Holiday Impact</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {result.festival_impact}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Cross-referenced with India Cultural & Public Holiday Calendar.
                  </p>
                </div>
              </div>

              {/* Alternative Nearby Airport (Arbitrage Module) */}
              {result.alternative_nearby_airport && (
                <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-sky-500/10 dark:from-emerald-950/30 dark:to-sky-950/30 rounded-2xl p-5 border border-emerald-500/30 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold text-xs uppercase">
                      <MapPin className="w-4 h-4 text-emerald-500" />
                      <span>Alternative Nearby Airport Arbitrage</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                      Save {formatCurrencyINR(result.alternative_nearby_airport.estimated_savings)}
                    </span>
                  </div>
                  <p className="text-sm text-slate-800 dark:text-slate-200 font-medium">
                    {result.alternative_nearby_airport.suggestion}
                  </p>
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400">
                      Alternate Hub: <strong className="text-slate-800 dark:text-slate-200">{result.alternative_nearby_airport.alt_name} ({result.alternative_nearby_airport.alt_destination})</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setDestination(result.alternative_nearby_airport.alt_destination);
                        handleGetAdvice(origin, result.alternative_nearby_airport.alt_destination);
                      }}
                      className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm transition-colors"
                    >
                      Compare {result.alternative_nearby_airport.alt_destination}
                    </button>
                  </div>
                </div>
              )}

              {/* AI Econometric Rationale Bullet Points */}
              <div className="bg-white dark:bg-[#0b1329] rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
                <h4 className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-3 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-sky-500" />
                  <span>Algorithmic Rationale & Market Indicators</span>
                </h4>
                <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                  {result.ai_rationale?.map((bullet, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-sky-500 font-bold">•</span>
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>

            </>
          ) : (
            <div className="h-full flex items-center justify-center p-12 bg-white dark:bg-[#0b1329] rounded-2xl border border-slate-200 dark:border-slate-800 text-center text-slate-500 dark:text-slate-400">
              <div>
                <Sparkles className="w-8 h-8 mx-auto mb-3 text-sky-500 opacity-60 animate-bounce" />
                <p className="text-sm font-semibold">Select parameters and click "Generate AI Travel Advice"</p>
                <p className="text-xs mt-1">Simulating historical pricing curves across 253 routes</p>
              </div>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
