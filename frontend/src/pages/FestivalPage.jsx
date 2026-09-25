import React, { useState, useEffect, useMemo } from 'react';
import { 
  Sparkles, 
  Calendar, 
  TrendingUp, 
  Flame, 
  AlertTriangle, 
  ArrowRight, 
  Clock, 
  Search, 
  Zap, 
  Info, 
  ShieldCheck, 
  MapPin, 
  Compass, 
  CheckCircle2, 
  Plane 
} from 'lucide-react';
import IndiaRouteMap from '../components/IndiaRouteMap';
import { fetchFestivalInsights, fetchAirports, fetchRoutes } from '../services/api';
import { formatAPIx, formatCurrencyINR, formatPercentage } from '../utils/formatters';
import { 
  AIRPORT_STATE_MAP, 
  AIRPORT_CITY_MAP, 
  parseRouteKey, 
  isValidFestivalRoute 
} from '../utils/festivalValidator';
import FESTIVAL_ROUTES_DATA from '../data/festival_routes.json';

export default function FestivalPage() {
  const [data, setData] = useState(null);
  const [airports, setAirports] = useState([]);
  const [allRoutes, setAllRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFestival, setSelectedFestival] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [focusedAirport, setFocusedAirport] = useState(null);

  // Load festival insights, airports, and routes concurrently
  useEffect(() => {
    Promise.all([
      fetchFestivalInsights(),
      fetchAirports(),
      fetchRoutes()
    ]).then(([festRes, airportsRes, routesRes]) => {
      setData(festRes);
      setAirports(airportsRes || []);
      setAllRoutes(routesRes || []);

      const festivalList = festRes?.festivals || [];
      if (festivalList.length > 0) {
        // Default to a high-demand festival such as Chhath Puja, Diwali, or Pongal
        const defaultFest = festivalList.find(f => 
          f.slug === 'chhath-puja' || 
          f.slug === 'diwali' || 
          f.slug === 'pongal'
        ) || festivalList[0];
        
        setSelectedFestival(defaultFest);
        if (defaultFest?.destination_airports?.length > 0) {
          setFocusedAirport(defaultFest.destination_airports[0]);
        }
      }
      setLoading(false);
    }).catch((err) => {
      console.warn('Error loading festival data, falling back to local dataset', err);
      setLoading(false);
    });
  }, []);

  // Airport metadata lookup by IATA
  const airportLookup = useMemo(() => {
    const map = {};
    airports.forEach(a => {
      map[a.iata] = a;
    });
    return map;
  }, [airports]);

  // Merge backend festivals with local festival_routes.json authoritative specifications
  const festivals = useMemo(() => {
    const rawFestivals = data?.festivals || [];
    if (rawFestivals.length === 0) {
      return FESTIVAL_ROUTES_DATA.map((fr, idx) => ({
        id: idx + 1,
        name: fr.festival_name,
        festival_name: fr.festival_name,
        slug: fr.slug,
        primary_states: fr.primary_states,
        destination_airports: fr.destination_airports,
        source_airports: fr.source_airports,
        recommended_routes: fr.recommended_routes,
        surge_multiplier: fr.surge_multiplier,
        surge_factor: fr.surge_multiplier,
        booking_window: fr.booking_window,
        travel_reason: fr.travel_reason,
        description: fr.travel_reason,
        start_date: '2026-10-15',
        end_date: '2026-10-20',
        region_focus: fr.primary_states.join(', '),
      }));
    }

    return rawFestivals.map(fest => {
      const authSpec = FESTIVAL_ROUTES_DATA.find(f => 
        f.slug === fest.slug || 
        f.festival_name.toLowerCase() === (fest.name || fest.festival_name || '').toLowerCase()
      );

      return {
        ...fest,
        primary_states: authSpec?.primary_states || fest.primary_states || [],
        destination_airports: authSpec?.destination_airports || fest.destination_airports || [],
        source_airports: authSpec?.source_airports || fest.source_airports || [],
        recommended_routes: authSpec?.recommended_routes || fest.recommended_routes || [],
        surge_multiplier: authSpec?.surge_multiplier || fest.surge_multiplier || fest.surge_factor || 1.6,
        booking_window: authSpec?.booking_window || fest.booking_window || '30-45 days',
        travel_reason: authSpec?.travel_reason || fest.travel_reason || fest.description || 'Peak homecoming demand surges airfares.',
      };
    });
  }, [data]);

  // Filtered festivals for search input
  const filteredFestivals = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return festivals;
    return festivals.filter(f => 
      (f.festival_name && f.festival_name.toLowerCase().includes(q)) ||
      (f.name && f.name.toLowerCase().includes(q)) ||
      (f.primary_states && f.primary_states.some(s => s.toLowerCase().includes(q))) ||
      (f.destination_airports && f.destination_airports.some(a => a.toLowerCase().includes(q))) ||
      (f.region_focus && f.region_focus.toLowerCase().includes(q))
    );
  }, [festivals, searchTerm]);

  // Active selected festival
  const currentFestival = useMemo(() => {
    if (!selectedFestival && festivals.length > 0) return festivals[0];
    if (!selectedFestival) return null;
    return festivals.find(f => f.slug === selectedFestival.slug || f.name === selectedFestival.name) || selectedFestival;
  }, [selectedFestival, festivals]);

  // Verify and construct authoritative festival corridors
  const verifiedFestivalRoutes = useMemo(() => {
    if (!currentFestival) return [];

    const destAirports = currentFestival.destination_airports || [];
    const srcAirports = currentFestival.source_airports || [];
    const targetStates = currentFestival.primary_states || [];
    const recCorridors = currentFestival.recommended_routes || [];
    const surgeMult = currentFestival.surge_multiplier || currentFestival.surge_factor || 1.6;
    const surgePct = Math.round((surgeMult - 1) * 100);

    const verified = [];
    const addedKeys = new Set();

    // 1. Process recommended_routes from authoritative specs
    recCorridors.forEach((recKey) => {
      const parsed = parseRouteKey(recKey);
      if (!parsed) return;
      const { origin, destination } = parsed;

      if (!isValidFestivalRoute(origin, destination, destAirports, targetStates)) return;

      const normKey = `${origin}-${destination}`;
      if (addedKeys.has(normKey)) return;
      addedKeys.add(normKey);

      const dbMatch = allRoutes.find(r => 
        (r.origin_iata === origin && r.destination_iata === destination) ||
        r.route_key === normKey
      );

      const origAirport = airportLookup[origin] || {};
      const destAirport = airportLookup[destination] || {};
      const origCity = origAirport.city || AIRPORT_CITY_MAP[origin] || origin;
      const destCity = destAirport.city || AIRPORT_CITY_MAP[destination] || destination;

      const baseFare = dbMatch?.current_avg_fare || dbMatch?.avg_fare || 5400;
      const festiveFare = Math.round(baseFare * (1 + (surgePct / 100) * 0.45));
      const apixScore = Math.round(100 * surgeMult);

      verified.push({
        id: `rec-${normKey}`,
        origin,
        destination,
        origin_iata: origin,
        destination_iata: destination,
        origin_city: origCity,
        destination_city: destCity,
        origin_airport: origAirport.name || `${origin} Airport`,
        destination_airport: destAirport.name || `${destCity} Airport`,
        destination_state: destAirport.state || AIRPORT_STATE_MAP[destination] || '',
        surge: surgePct,
        apix: apixScore,
        avg_fare: festiveFare,
        base_fare: baseFare,
        historical_fare_spike: Math.round(festiveFare * 1.35),
        booking_window: currentFestival.booking_window || '30-45 days',
        recommended_booking_window: currentFestival.booking_window || '30-45 days',
        airline: dbMatch?.airline_availability ? (Array.isArray(dbMatch.airline_availability) ? dbMatch.airline_availability.join(', ') : dbMatch.airline_availability) : 'IndiGo, Air India',
        airlines: dbMatch?.airline_availability ? (Array.isArray(dbMatch.airline_availability) ? dbMatch.airline_availability.join(', ') : dbMatch.airline_availability) : 'IndiGo, Air India',
        distance_km: dbMatch?.distance_km || 1100,
        flight_time_mins: dbMatch?.flight_time_mins || 120,
        category: dbMatch?.category || 'Pilgrimage',
        verified: true,
      });
    });

    // 2. Cross-reference real database routes
    allRoutes.forEach(r => {
      const orig = r.origin_iata;
      const dest = r.destination_iata;
      const normKey = `${orig}-${dest}`;

      if (addedKeys.has(normKey)) return;
      if (!isValidFestivalRoute(orig, dest, destAirports, targetStates)) return;

      if (srcAirports.length > 0 && !srcAirports.includes(orig)) return;

      addedKeys.add(normKey);
      const origAirport = airportLookup[orig] || {};
      const destAirport = airportLookup[dest] || {};
      const origCity = origAirport.city || AIRPORT_CITY_MAP[orig] || orig;
      const destCity = destAirport.city || AIRPORT_CITY_MAP[dest] || dest;

      const baseFare = r.current_avg_fare || r.avg_fare || 5200;
      const festiveFare = Math.round(baseFare * (1 + (surgePct / 100) * 0.45));
      const apixScore = Math.round(100 * surgeMult);

      verified.push({
        id: `db-${normKey}`,
        origin: orig,
        destination: dest,
        origin_iata: orig,
        destination_iata: dest,
        origin_city: origCity,
        destination_city: destCity,
        origin_airport: origAirport.name || `${orig} Airport`,
        destination_airport: destAirport.name || `${destCity} Airport`,
        destination_state: destAirport.state || AIRPORT_STATE_MAP[dest] || '',
        surge: surgePct,
        apix: apixScore,
        avg_fare: festiveFare,
        base_fare: baseFare,
        historical_fare_spike: Math.round(festiveFare * 1.35),
        booking_window: currentFestival.booking_window || '30-45 days',
        recommended_booking_window: currentFestival.booking_window || '30-45 days',
        airline: Array.isArray(r.airline_availability) ? r.airline_availability.join(', ') : (r.airline_availability || 'IndiGo, Air India'),
        airlines: Array.isArray(r.airline_availability) ? r.airline_availability.join(', ') : (r.airline_availability || 'IndiGo, Air India'),
        distance_km: r.distance_km || 1050,
        flight_time_mins: r.flight_time_mins || 115,
        category: r.category || 'Pilgrimage',
        verified: true,
      });
    });

    return verified.sort((a, b) => b.avg_fare - a.avg_fare);
  }, [currentFestival, allRoutes, airportLookup]);

  // Construct map corridors for IndiaRouteMap
  const mapCorridors = useMemo(() => {
    return verifiedFestivalRoutes.map(vr => {
      const origAirport = airportLookup[vr.origin_iata] || {};
      const destAirport = airportLookup[vr.destination_iata] || {};

      return {
        id: vr.id,
        route_key: `${vr.origin_iata}-${vr.destination_iata}`,
        origin_iata: vr.origin_iata,
        destination_iata: vr.destination_iata,
        origin_city: vr.origin_city,
        destination_city: vr.destination_city,
        category: vr.category || 'Pilgrimage',
        current_apix: vr.apix,
        apix: vr.apix,
        current_avg_fare: vr.avg_fare,
        avg_fare: vr.avg_fare,
        distance_km: vr.distance_km,
        flight_time_mins: vr.flight_time_mins,
        airline_availability: vr.airline ? vr.airline.split(', ') : ['6E', 'AI'],
        is_festival_corridor: true,
      };
    });
  }, [verifiedFestivalRoutes, currentFestival, airportLookup, allRoutes]);

  // Dynamic KPI values for selected festival
  const festivalApix = currentFestival?.apix || (100 * (currentFestival?.surge_multiplier || currentFestival?.surge_factor || 1.6));
  const festivalSurgePct = currentFestival?.surge_percentage || Math.round(((currentFestival?.surge_multiplier || currentFestival?.surge_factor || 1.6) - 1) * 100);
  const festivalBookingWindow = currentFestival?.booking_window || '30-45 days';
  const festivalTravelReason = currentFestival?.travel_reason || currentFestival?.description;
  const destinationAirports = currentFestival?.destination_airports || [];

  const handleSelectFestival = (fest) => {
    setSelectedFestival(fest);
    if (fest.destination_airports && fest.destination_airports.length > 0) {
      setFocusedAirport(fest.destination_airports[0]);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800/80 pb-6 transition-colors">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
              CULTURAL SURGE INTELLIGENCE
            </span>
            <span className="text-xs text-red-600 dark:text-red-400 font-mono flex items-center gap-1">
              <Flame className="w-3.5 h-3.5" />
              Geographically Verified Festival Corridors
            </span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            Indian Festival Airfare Surge Radar
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Predictive modeling across national festivals with state-level corridor validation: Pongal, Durga Puja, Chhath Puja, Holi, Makar Sankranti, Onam, Christmas, and Ram Navami.
          </p>
        </div>

        {/* Aggregate KPI */}
        <div className="flex items-center gap-4 p-3 rounded-2xl glass-panel text-xs font-mono">
          <div>
            <span className="text-slate-500 dark:text-slate-400 block text-[10px]">National Festival Surge:</span>
            <span className="text-xl font-bold text-amber-600 dark:text-amber-400 font-mono">
              {data?.overall_surge_factor || 1.68}x
            </span>
          </div>
          <div className="border-l border-slate-200 dark:border-slate-800 pl-3">
            <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Tracked Corridors:</span>
            <span className="text-xl font-bold text-red-600 dark:text-red-400 font-mono">50+</span>
          </div>
        </div>
      </div>

      {/* Dynamic Top Festival Warning & Strategic Advice Banner */}
      {currentFestival && (
        <div className="p-6 rounded-3xl bg-gradient-to-r from-amber-500/10 via-slate-100 to-red-500/10 dark:from-amber-950/40 dark:via-slate-900 dark:to-red-950/40 border border-amber-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-glass transition-colors">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0 border border-amber-500/40">
              <Flame className="w-6 h-6 animate-bounce" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-500/20 text-red-600 dark:text-red-300 border border-red-500/30 font-mono">
                  ACTIVE SURGE RADAR
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {currentFestival.festival_name || currentFestival.name} Airfare Corridor Analysis
                </h3>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed max-w-3xl">
                {festivalTravelReason}
              </p>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-mono font-bold shadow-sm">
            <Clock className="w-4 h-4" />
            <span>Optimal Booking: {festivalBookingWindow}</span>
          </div>
        </div>
      )}

      {/* Main Grid: Interactive Festival Calendar & Surging Routes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Festival Calendar Selector */}
        <div className="lg:col-span-1 p-5 rounded-3xl glass-panel border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-sky-500 dark:text-sky-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{festivals.length} National Festivals</h3>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">2026-2027</span>
          </div>

          {/* Quick Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search festival, state, or airport..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
            />
          </div>

          {/* Scrollable Festival List */}
          <div className="space-y-2 max-h-[620px] overflow-y-auto pr-1">
            {filteredFestivals.map((fest) => {
              const isSelected = currentFestival?.slug === fest.slug;
              const surgeVal = fest.surge_multiplier || fest.surge_factor || 1.5;
              const isExtreme = surgeVal >= 1.8;

              return (
                <button
                  key={fest.slug}
                  onClick={() => handleSelectFestival(fest)}
                  className={`w-full p-3.5 rounded-2xl text-left transition-all border flex flex-col justify-between ${
                    isSelected
                      ? 'bg-sky-50 dark:bg-sky-500/15 border-sky-400 dark:border-sky-500/50 shadow-md ring-1 ring-sky-400/40'
                      : 'bg-slate-50/70 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span className={`text-xs font-bold leading-tight ${isSelected ? 'text-sky-700 dark:text-sky-300' : 'text-slate-800 dark:text-slate-200'}`}>
                      {fest.festival_name || fest.name}
                    </span>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full shrink-0 ${
                      isExtreme ? 'bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30' : 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                    }`}>
                      {surgeVal}x Surge
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    <span>{fest.start_date?.slice(5) || '10-15'} to {fest.end_date?.slice(5) || '10-20'}</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate max-w-[130px]">
                      {fest.primary_states ? fest.primary_states.join(', ') : fest.region_focus}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Selected Festival Deep-Dive, Heatmap & Surging Routes */}
        <div className="lg:col-span-2 space-y-6">
          
          {currentFestival && (
            <div className="p-6 rounded-3xl glass-panel-elevated border border-slate-200 dark:border-slate-800 space-y-5">
              
              {/* Title & Region */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                      {currentFestival.festival_name || currentFestival.name}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                      {currentFestival.surge_multiplier || currentFestival.surge_factor || 1.6}x Multiplier
                    </span>
                  </div>
                  <span className="text-xs text-sky-600 dark:text-sky-400 font-mono flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400 shrink-0" />
                    Target States: {currentFestival.primary_states ? currentFestival.primary_states.join(', ') : currentFestival.region_focus}
                  </span>
                </div>

                <div className="text-left sm:text-right font-mono text-xs text-slate-500 dark:text-slate-400">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 block">Peak Festive Window:</span>
                  <span className="text-slate-800 dark:text-slate-200 font-bold">{currentFestival.start_date} → {currentFestival.end_date}</span>
                </div>
              </div>

              {/* Dynamic KPI Strip for Selected Festival */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-mono">Dynamic APIx:</span>
                  <span className="text-xl font-extrabold font-mono text-amber-600 dark:text-amber-400">
                    {formatAPIx(festivalApix)}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-mono">Surge Percentage:</span>
                  <span className="text-xl font-extrabold font-mono text-red-600 dark:text-red-400">
                    +{formatPercentage(festivalSurgePct)}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-mono">Booking Window:</span>
                  <span className="text-sm font-bold font-mono text-sky-700 dark:text-sky-300 mt-1 block">
                    {festivalBookingWindow}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-mono">Verified Corridors:</span>
                  <span className="text-xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                    {verifiedFestivalRoutes.length}
                  </span>
                </div>
              </div>

              {/* Travel Reason Section */}
              <div className="p-4 rounded-2xl bg-sky-500/10 dark:bg-sky-950/20 border border-sky-500/30 dark:border-sky-800/40 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-sky-600 dark:text-sky-400 font-mono uppercase tracking-wider">
                  <Info className="w-3.5 h-3.5" />
                  <span>Travel Reason & Homecoming Dynamics</span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed font-sans">
                  {festivalTravelReason}
                </p>
              </div>

              {/* Destination Airports Highlight Bar */}
              {destinationAirports.length > 0 && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                    Destination Hubs:
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {destinationAirports.map((iata) => {
                      const cityName = AIRPORT_CITY_MAP[iata] || airportLookup[iata]?.city || iata;
                      const isFocused = focusedAirport === iata;
                      return (
                        <button
                          key={iata}
                          onClick={() => setFocusedAirport(iata)}
                          className={`px-3 py-1 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 border ${
                            isFocused
                              ? 'bg-amber-500/25 text-amber-700 dark:text-amber-300 border-amber-500/60 shadow-sm'
                              : 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-amber-500/40 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
                          <span>{cityName} ({iata})</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          )}

          {/* Destination Heatmap Section with Highlighted Destination Airports */}
          <div className="p-6 rounded-3xl glass-panel border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Compass className="w-4 h-4 text-sky-500 dark:text-sky-400" />
                  Festival Route Heatmap & Corridor Projection
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Highlighting arrival hubs in <strong className="text-amber-600 dark:text-amber-400">{currentFestival?.primary_states?.join(', ')}</strong> with real-time flight paths
                </p>
              </div>

              {destinationAirports.length > 0 && (
                <div className="flex items-center gap-1.5 font-mono text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 px-3 py-1 rounded-xl border border-amber-500/30">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                  <span>{destinationAirports.join(', ')} Highlighted</span>
                </div>
              )}
            </div>

            {/* Interactive Leaflet Map with Highlighted Destination Airfields */}
            <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
              <IndiaRouteMap 
                airports={airports}
                routes={mapCorridors.length > 0 ? mapCorridors : allRoutes}
                height="420px"
                interactive={true}
                highlightedDestinations={destinationAirports}
                focusedAirport={focusedAirport}
              />
            </div>
          </div>

          {/* Surging Corridors for this festival */}
          <div className="p-6 rounded-3xl glass-panel border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Flame className="w-4 h-4 text-red-500 dark:text-red-400" />
                  Geographically Verified Festival Corridors
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Exclusively inbound routes into destination state ({currentFestival?.primary_states?.join(', ')})
                </p>
              </div>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-mono font-bold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Validated Data
              </span>
            </div>

            {verifiedFestivalRoutes.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">Synchronizing verified flight corridors...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {verifiedFestivalRoutes.map((fr, idx) => {
                  const origIata = fr.origin || fr.origin_iata;
                  const destIata = fr.destination || fr.destination_iata;
                  const origCity = fr.origin_city || origIata;
                  const destCity = fr.destination_city || destIata;
                  const surgeVal = fr.surge !== undefined ? fr.surge : (fr.avg_surge_pct || 50);
                  const apixVal = fr.apix !== undefined ? fr.apix : (fr.current_apix || Math.round(100 * (1 + surgeVal / 100)));
                  const avgFareVal = fr.avg_fare || fr.current_avg_fare || 5200;
                  const bookingWindow = fr.booking_window || fr.recommended_booking_window || currentFestival.booking_window || '25-40 days';
                  const airlineStr = fr.airline || fr.airlines || 'IndiGo, Air India';
                  const destState = fr.destination_state || AIRPORT_STATE_MAP[destIata] || destCity;

                  return (
                    <div 
                      key={fr.id || idx}
                      className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 hover:border-amber-500/50 transition-all space-y-3 shadow-sm hover:shadow-md backdrop-blur-sm"
                    >
                      {/* Dynamic Corridor Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-base font-extrabold font-mono text-sky-600 dark:text-sky-400 tracking-tight">
                            {origIata} ➔ {destIata}
                          </span>
                          <span className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                            ({origCity} to {destCity})
                          </span>
                        </div>
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30">
                          +{formatPercentage(surgeVal)} Surge
                        </span>
                      </div>

                      {/* Key Metrics: Average Fare, APIx Surge, Historical Peak */}
                      <div className="grid grid-cols-3 gap-2 text-xs font-mono pt-1">
                        <div className="bg-slate-50 dark:bg-slate-950/70 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
                          <span className="text-slate-500 dark:text-slate-400 text-[10px] block">Average Fare</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                            {formatCurrencyINR(avgFareVal)}
                          </span>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-950/70 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
                          <span className="text-slate-500 dark:text-slate-400 text-[10px] block">APIx Surge</span>
                          <span className="text-amber-600 dark:text-amber-400 font-bold text-sm">
                            {formatAPIx(apixVal)}
                          </span>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-950/70 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
                          <span className="text-slate-500 dark:text-slate-400 text-[10px] block">Peak Spike</span>
                          <span className="text-slate-700 dark:text-slate-300 font-bold text-sm">
                            {formatCurrencyINR(fr.historical_fare_spike || Math.round(avgFareVal * (1 + surgeVal / 100)))}
                          </span>
                        </div>
                      </div>

                      {/* Cheapest Window & Operating Airlines */}
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 space-y-1.5 text-[11px] text-slate-600 dark:text-slate-300 font-mono">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-sky-700 dark:text-sky-300">
                            <Clock className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
                            <span>Cheapest Window: <strong className="text-slate-900 dark:text-slate-100">{bookingWindow}</strong></span>
                          </span>
                          <span className="px-2 py-0.5 rounded text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {destState}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 text-[10.5px]">
                          <Plane className="w-3.5 h-3.5 shrink-0" />
                          <span className="text-slate-500 dark:text-slate-400">Airlines: <strong className="text-slate-800 dark:text-slate-200">{airlineStr}</strong></span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
