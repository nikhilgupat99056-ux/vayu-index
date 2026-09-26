import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  Calendar, 
  Users, 
  Plane, 
  Clock, 
  ArrowRight, 
  CreditCard, 
  ShieldCheck, 
  CheckCircle2, 
  Filter, 
  Sparkles, 
  TrendingDown, 
  SlidersHorizontal,
  ChevronRight,
  AlertCircle,
  Tag,
  Check,
  X
} from 'lucide-react';
import { 
  fetchBookingWindow, 
  bookFlightTrip, 
  FALLBACK_AIRPORTS 
} from '../services/api';
import { formatCurrencyINR, formatAPIx } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';

const CABIN_CLASSES = ['Economy', 'Premium Economy', 'Business'];

const TIME_FILTERS = [
  { id: 'ALL', label: 'All Times' },
  { id: 'MORNING', label: 'Morning (06:00 – 12:00)' },
  { id: 'AFTERNOON', label: 'Afternoon (12:00 – 18:00)' },
  { id: 'EVENING', label: 'Evening (18:00 – 24:00)' }
];

export default function BookingWindowPage() {
  const [searchParams] = useSearchParams();
  const initialOrigin = searchParams.get('origin') || 'DEL';
  const initialDest = searchParams.get('destination') || 'BOM';

  // Search parameters
  const [tripType, setTripType] = useState('ONE_WAY'); // 'ONE_WAY' | 'ROUND_TRIP'
  const [origin, setOrigin] = useState(initialOrigin);
  const [destination, setDestination] = useState(initialDest);
  const [departureDate, setDepartureDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 24);
    return d.toISOString().split('T')[0];
  });
  const [returnDate, setReturnDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 28);
    return d.toISOString().split('T')[0];
  });
  const [passengers, setPassengers] = useState(1);
  const [cabinClass, setCabinClass] = useState('Economy');
  const [selectedAirline, setSelectedAirline] = useState('ALL');
  const [stopsFilter, setStopsFilter] = useState('ALL'); // 'ALL' | 'NONSTOP' | 'ONE_STOP'
  const [timeFilter, setTimeFilter] = useState('ALL');
  const [selectedCard, setSelectedCard] = useState('SBI Cashback');

  // Search & Booking State
  const [loading, setLoading] = useState(false);
  const [bookingData, setBookingData] = useState(null);
  const [error, setError] = useState('');
  
  // Interactive "Book Now" Modal State
  const [selectedFlightForBooking, setSelectedFlightForBooking] = useState(null);
  const [passengerName, setPassengerName] = useState('Arjun Verma');
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingSuccessResult, setBookingSuccessResult] = useState(null);

  const { refreshProfile, refreshNotifications } = useAuth();

  // Load default route on load
  useEffect(() => {
    handleSearch();
  }, []);

  const handleSearch = async () => {
    if (origin === destination) {
      setError('Origin and destination cannot be the same airport.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await fetchBookingWindow({
        origin,
        destination,
        departure_date: departureDate,
        return_date: tripType === 'ROUND_TRIP' ? returnDate : null,
        passengers: Number(passengers),
        cabin_class: cabinClass,
        selected_card: selectedCard
      });
      setBookingData(res);
    } catch (err) {
      setError('Failed to compute smart booking window metrics.');
    } finally {
      setLoading(false);
    }
  };

  const handleBookFlight = async () => {
    if (!selectedFlightForBooking || !bookingData) return;
    setBookingSubmitting(true);
    try {
      const payload = {
        origin,
        destination,
        airline: selectedFlightForBooking.airline_name,
        flight_number: selectedFlightForBooking.flight_number,
        departure_date: departureDate,
        passenger_name: passengerName,
        fare_paid: selectedFlightForBooking.final_price || selectedFlightForBooking.base_fare
      };
      const res = await bookFlightTrip(payload);
      setBookingSuccessResult(res);
      await refreshProfile();
      await refreshNotifications();
    } catch (err) {
      setError('Booking transaction failed.');
    } finally {
      setBookingSubmitting(false);
    }
  };

  // Filter flights based on airline, stops, and time
  const filteredFlights = (bookingData?.available_flights || []).filter(fl => {
    if (selectedAirline !== 'ALL' && fl.airline_code !== selectedAirline) return false;
    if (stopsFilter === 'NONSTOP' && fl.stops !== 'Non-stop') return false;
    if (stopsFilter === 'ONE_STOP' && fl.stops === 'Non-stop') return false;
    
    if (timeFilter === 'MORNING') {
      const hour = parseInt(fl.departure_time.split(':')[0], 10);
      if (hour < 6 || hour >= 12) return false;
    } else if (timeFilter === 'AFTERNOON') {
      const hour = parseInt(fl.departure_time.split(':')[0], 10);
      if (hour < 12 || hour >= 18) return false;
    } else if (timeFilter === 'EVENING') {
      const hour = parseInt(fl.departure_time.split(':')[0], 10);
      if (hour < 18 || hour >= 24) return false;
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 transition-colors duration-200">
      
      {/* Search Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
          <Plane className="w-7 h-7 text-sky-500" />
          <span>Smart Booking Window</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Modern booking engine powered by predictive econometric pricing, APIx indicators, and card discount stacking.
        </p>
      </div>

      {/* Main Modern Booking Search Panel */}
      <div className="bg-white dark:bg-[#0b1329] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-md mb-8 space-y-5">
        
        {/* Row 1: Trip Type & Class Toggles */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          {/* One-way vs Round-trip */}
          <div className="flex rounded-xl bg-slate-100 dark:bg-slate-900 p-1 border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setTripType('ONE_WAY')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                tripType === 'ONE_WAY'
                  ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              One-way
            </button>
            <button
              type="button"
              onClick={() => setTripType('ROUND_TRIP')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                tripType === 'ROUND_TRIP'
                  ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Round-trip
            </button>
          </div>

          {/* Cabin Class & Passengers */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Class:</span>
              <select
                value={cabinClass}
                onChange={(e) => setCabinClass(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-sky-500"
              >
                {CABIN_CLASSES.map(cls => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Pax:</span>
              <select
                value={passengers}
                onChange={(e) => setPassengers(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-sky-500"
              >
                <option value="1">1 Adult</option>
                <option value="2">2 Adults</option>
                <option value="3">3 Adults</option>
                <option value="4">4 Adults</option>
              </select>
            </div>
          </div>
        </div>

        {/* Row 2: Origin, Destination, Departure Date, Return Date */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              From (Origin)
            </label>
            <select
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              className="w-full px-3 py-2.5 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500"
            >
              {FALLBACK_AIRPORTS.map((a) => (
                <option key={a.iata} value={a.iata}>
                  {a.iata} — {a.city} ({a.name.slice(0, 20)}...)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              To (Destination)
            </label>
            <select
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="w-full px-3 py-2.5 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500"
            >
              {FALLBACK_AIRPORTS.map((a) => (
                <option key={a.iata} value={a.iata}>
                  {a.iata} — {a.city} ({a.name.slice(0, 20)}...)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Departure Calendar
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="date"
                value={departureDate}
                onChange={(e) => setDepartureDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              {tripType === 'ROUND_TRIP' ? 'Return Calendar' : 'Return (Optional)'}
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="date"
                disabled={tripType !== 'ROUND_TRIP'}
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                className={`w-full pl-9 pr-3 py-2 text-xs rounded-xl border ${
                  tripType === 'ROUND_TRIP'
                    ? 'bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500'
                    : 'bg-slate-100 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-slate-400 cursor-not-allowed'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Row 3: Credit Card Smart Fare Saver Filter + Search Action */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <CreditCard className="w-4 h-4 text-indigo-500 shrink-0" />
            <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Card Offer:</span>
            <select
              value={selectedCard}
              onChange={(e) => setSelectedCard(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
            >
              <option value="SBI Cashback">SBI Cashback (10% instant max ₹500)</option>
              <option value="HDFC Regalia Gold">HDFC Regalia Gold (12% instant max ₹800)</option>
              <option value="Axis Atlas">Axis Atlas (15% instant max ₹1,200)</option>
              <option value="ICICI Coral">ICICI Coral (5% instant max ₹400)</option>
              <option value="Standard">Standard / No Card</option>
            </select>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={handleSearch}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 shadow-md transition-all flex items-center justify-center gap-2"
          >
            {loading ? <span>Scanning Flights...</span> : <span>Find Smart Booking Window</span>}
          </button>
        </div>

      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Booking Intelligence Metrics Banner (As specified in prompt) */}
      {bookingData && (
        <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 rounded-2xl p-6 text-white border border-sky-800/40 shadow-xl mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-4 mb-4">
            <div>
              <span className="text-[11px] font-bold text-sky-400 uppercase tracking-wider">
                Econometric Route Telemetry
              </span>
              <h2 className="text-xl font-bold tracking-tight">
                {bookingData.origin_city} ({bookingData.origin}) ➔ {bookingData.destination_city} ({bookingData.destination})
              </h2>
            </div>

            {/* Final Payable Price Highlight */}
            <div className="text-right">
              <span className="text-[11px] text-emerald-400 font-bold uppercase tracking-wider block">
                Final Payable Price
              </span>
              <span className="text-2xl font-black text-white font-mono">
                {formatCurrencyINR(bookingData.final_payable_price)}
              </span>
              <span className="text-[11px] text-emerald-300 block">
                Saved {formatCurrencyINR(bookingData.total_savings)} with {bookingData.card_applied}
              </span>
            </div>
          </div>

          {/* 7 Required Metrics from Prompt */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-center">
            
            {/* 1. Original Fare */}
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <span className="text-[10px] text-slate-300 uppercase block mb-1">Original Fare</span>
              <span className="text-sm font-bold text-slate-200 line-through font-mono">
                {formatCurrencyINR(bookingData.original_fare)}
              </span>
            </div>

            {/* 2. Predicted Fare */}
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <span className="text-[10px] text-sky-300 uppercase block mb-1">Predicted Fare</span>
              <span className="text-sm font-bold text-white font-mono">
                {formatCurrencyINR(bookingData.predicted_fare)}
              </span>
            </div>

            {/* 3. APIx */}
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <span className="text-[10px] text-sky-300 uppercase block mb-1">APIx Score</span>
              <span className="text-sm font-bold text-sky-400 font-mono">
                {formatAPIx(bookingData.apix)}
              </span>
            </div>

            {/* 4. Booking Score */}
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <span className="text-[10px] text-emerald-300 uppercase block mb-1">Booking Score</span>
              <span className="text-sm font-bold text-emerald-400 font-mono">
                {bookingData.booking_score}/100
              </span>
            </div>

            {/* 5. Best Window */}
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <span className="text-[10px] text-amber-300 uppercase block mb-1">Best Window</span>
              <span className="text-xs font-bold text-amber-200 block truncate">
                {bookingData.best_window}
              </span>
            </div>

            {/* 6. Cheapest Date */}
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <span className="text-[10px] text-emerald-300 uppercase block mb-1">Cheapest Date</span>
              <span className="text-xs font-bold text-emerald-300 block truncate font-mono">
                {bookingData.cheapest_date}
              </span>
            </div>

            {/* 7. Final Payable Price */}
            <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-400/40">
              <span className="text-[10px] text-emerald-200 uppercase block mb-1 font-bold">Final Payable</span>
              <span className="text-sm font-black text-emerald-300 font-mono">
                {formatCurrencyINR(bookingData.final_payable_price)}
              </span>
            </div>

          </div>
        </div>
      )}

      {/* Flight Filters Strip & Available Flight Cards */}
      <div className="space-y-4">
        
        {/* Flight Filters Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-white dark:bg-[#0b1329] border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-sky-500" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Filter Flights:</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Airline filter */}
            <select
              value={selectedAirline}
              onChange={(e) => setSelectedAirline(e.target.value)}
              className="px-2.5 py-1 text-xs rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
            >
              <option value="ALL">All Airlines</option>
              <option value="6E">IndiGo</option>
              <option value="AI">Air India</option>
              <option value="IX">Air India Express</option>
              <option value="QP">Akasa Air</option>
              <option value="SG">SpiceJet</option>
            </select>

            {/* Stops filter */}
            <select
              value={stopsFilter}
              onChange={(e) => setStopsFilter(e.target.value)}
              className="px-2.5 py-1 text-xs rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
            >
              <option value="ALL">Stops: Any</option>
              <option value="NONSTOP">Non-stop Only</option>
              <option value="ONE_STOP">1 Stop</option>
            </select>

            {/* Time filter */}
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              className="px-2.5 py-1 text-xs rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
            >
              {TIME_FILTERS.map(t => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Flight Cards List */}
        {filteredFlights.length > 0 ? (
          filteredFlights.map((flight) => (
            <div
              key={flight.id}
              className="p-5 rounded-2xl bg-white dark:bg-[#0b1329] border border-slate-200 dark:border-slate-800 shadow-sm hover:border-sky-300 dark:hover:border-sky-800 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
            >
              {/* Left Column: Airline Logo + Flight Number + Times */}
              <div className="flex items-center gap-4 flex-1">
                <div className="w-12 h-12 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 flex items-center justify-center font-mono font-bold text-sky-700 dark:text-sky-300 text-sm shrink-0">
                  {flight.airline_code}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      {flight.airline_name}
                    </span>
                    <span className="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400">
                      {flight.flight_number}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500">
                    Provider: {flight.provider}
                  </span>
                </div>
              </div>

              {/* Middle Column: Departure, Duration, Arrival */}
              <div className="flex items-center gap-6 sm:gap-10 text-center flex-1 justify-center">
                <div>
                  <span className="text-base font-extrabold text-slate-900 dark:text-white block font-mono">
                    {flight.departure_time}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                    {origin}
                  </span>
                </div>

                <div className="flex flex-col items-center">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                    {flight.duration}
                  </span>
                  <div className="w-20 sm:w-28 h-0.5 bg-slate-300 dark:bg-slate-700 relative my-1">
                    <Plane className="w-3 h-3 text-sky-500 absolute left-1/2 -top-1.5 -translate-x-1/2 rotate-90" />
                  </div>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                    {flight.stops}
                  </span>
                </div>

                <div>
                  <span className="text-base font-extrabold text-slate-900 dark:text-white block font-mono">
                    {flight.arrival_time}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                    {destination}
                  </span>
                </div>
              </div>

              {/* Right Column: Pricing & Book Now Placeholder Button */}
              <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto">
                <div className="text-right">
                  <span className="text-xs text-slate-400 line-through font-mono block">
                    {formatCurrencyINR(flight.base_fare)}
                  </span>
                  <span className="text-lg font-black text-slate-900 dark:text-white font-mono">
                    {formatCurrencyINR(flight.final_price)}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block">
                    −{formatCurrencyINR(flight.card_discount)} ({selectedCard})
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedFlightForBooking(flight);
                    setBookingSuccessResult(null);
                  }}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 shadow-md transition-all flex items-center gap-1.5 shrink-0"
                >
                  <span>Book Now</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center bg-white dark:bg-[#0b1329] rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500">
            No flights matching the selected filters.
          </div>
        )}

      </div>

      {/* Interactive Booking Confirmation Modal (UI Placeholder Provider Interface) */}
      {selectedFlightForBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#0b1329] rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl relative">
            
            <button
              onClick={() => setSelectedFlightForBooking(null)}
              className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            {!bookingSuccessResult ? (
              <div className="space-y-5">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400">
                    <Plane className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      Confirm Flight Reservation
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      OTA Provider Interface • NDC Direct Mock Sandbox
                    </p>
                  </div>
                </div>

                {/* Selected Flight Summary */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Flight:</span>
                    <strong className="text-slate-800 dark:text-slate-200">
                      {selectedFlightForBooking.airline_name} ({selectedFlightForBooking.flight_number})
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Route:</span>
                    <strong className="text-slate-800 dark:text-slate-200">
                      {origin} ➔ {destination}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Departure:</span>
                    <strong className="text-slate-800 dark:text-slate-200">
                      {departureDate} at {selectedFlightForBooking.departure_time}
                    </strong>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 dark:border-slate-800 pt-2">
                    <span className="text-slate-500">Payable Fare:</span>
                    <strong className="text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                      {formatCurrencyINR(selectedFlightForBooking.final_price)}
                    </strong>
                  </div>
                </div>

                {/* Passenger Name Input */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Primary Passenger Full Name
                  </label>
                  <input
                    type="text"
                    value={passengerName}
                    onChange={(e) => setPassengerName(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-2">
                  <Tag className="w-4 h-4 shrink-0" />
                  <span>
                    Sandbox Mode: No actual financial charge will occur. Reservation ticket will be generated and saved to Trip History.
                  </span>
                </div>

                <button
                  type="button"
                  disabled={bookingSubmitting}
                  onClick={handleBookFlight}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 shadow-md transition-all flex items-center justify-center gap-2"
                >
                  {bookingSubmitting ? (
                    <span>Issuing Reservation PNR...</span>
                  ) : (
                    <span>Confirm & Generate PNR Slip</span>
                  )}
                </button>
              </div>
            ) : (
              <div className="text-center py-4 space-y-4">
                <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-500 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Reservation Confirmed!
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Your flight reservation was confirmed by the smart booking provider.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-left space-y-1.5 font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">PNR Number:</span>
                    <strong className="text-sky-600 dark:text-sky-400">{bookingSuccessResult.pnr}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">Passenger:</span>
                    <span className="text-slate-800 dark:text-slate-200">{bookingSuccessResult.passenger}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">Amount Paid:</span>
                    <span className="text-emerald-500 font-bold">{formatCurrencyINR(bookingSuccessResult.fare_paid)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">Status:</span>
                    <span className="text-emerald-500 font-bold">{bookingSuccessResult.status}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Link
                    to="/profile"
                    onClick={() => setSelectedFlightForBooking(null)}
                    className="flex-1 py-2 text-xs font-semibold rounded-xl bg-sky-600 text-white hover:bg-sky-700 transition-colors"
                  >
                    View in Profile
                  </Link>
                  <button
                    onClick={() => setSelectedFlightForBooking(null)}
                    className="flex-1 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
