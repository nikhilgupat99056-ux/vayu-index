import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  ArrowRight, 
  LayoutGrid,
  List,
  Clock,
  Compass,
  Calendar
} from 'lucide-react';
import { fetchRoutes, fetchAirports, fetchAirlines, filterRoutes } from '../services/api';
import { formatAPIx, formatCurrencyINR } from '../utils/formatters';

export default function RouteExplorer() {
  const [routes, setRoutes] = useState([]);
  const [airports, setAirports] = useState([]);
  const [airlines, setAirlines] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [selectedAirline, setSelectedAirline] = useState('');
  const [maxFare, setMaxFare] = useState(25000);
  const [sortBy, setSortBy] = useState('fare_asc');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  useEffect(() => {
    Promise.all([fetchRoutes(), fetchAirports(), fetchAirlines()]).then(
      ([routesData, airportsData, airlinesData]) => {
        setRoutes(routesData);
        setAirports(airportsData);
        setAirlines(airlinesData);
        setLoading(false);
      }
    );
  }, []);

  const airportMap = useMemo(() => {
    const map = {};
    airports.forEach(a => {
      map[a.iata] = a;
    });
    return map;
  }, [airports]);

  const processedRoutes = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();

    return routes.filter(r => {
      // 1. Support searching by Airport Name, City, IATA Code
      const origAirport = airportMap[r.origin_iata] || {};
      const destAirport = airportMap[r.destination_iata] || {};

      const matchSearch = !q ||
        r.origin_iata.toLowerCase().includes(q) ||
        r.destination_iata.toLowerCase().includes(q) ||
        (r.origin_city && r.origin_city.toLowerCase().includes(q)) ||
        (r.destination_city && r.destination_city.toLowerCase().includes(q)) ||
        (r.origin_name && r.origin_name.toLowerCase().includes(q)) ||
        (r.destination_name && r.destination_name.toLowerCase().includes(q)) ||
        (origAirport.name && origAirport.name.toLowerCase().includes(q)) ||
        (destAirport.name && destAirport.name.toLowerCase().includes(q)) ||
        (r.route_key && r.route_key.toLowerCase().includes(q));

      const matchCat = selectedCategory === 'ALL' || r.category === selectedCategory;
      const matchOrig = !origin || r.origin_iata === origin;
      const matchDest = !destination || r.destination_iata === destination;
      const matchAl = !selectedAirline || (
        Array.isArray(r.airline_availability) 
          ? r.airline_availability.includes(selectedAirline) 
          : (r.airline_availability && r.airline_availability.includes(selectedAirline))
      );
      const matchFare = !r.current_avg_fare || r.current_avg_fare <= maxFare;

      return matchSearch && matchCat && matchOrig && matchDest && matchAl && matchFare;
    }).sort((a, b) => {
      if (sortBy === 'fare_asc') return (a.current_avg_fare || 0) - (b.current_avg_fare || 0);
      if (sortBy === 'fare_desc') return (b.current_avg_fare || 0) - (a.current_avg_fare || 0);
      if (sortBy === 'distance_desc') return b.distance_km - a.distance_km;
      if (sortBy === 'apix_desc') return (b.current_apix || 0) - (a.current_apix || 0);
      return 0;
    });
  }, [routes, searchTerm, selectedCategory, origin, destination, selectedAirline, maxFare, sortBy, airportMap]);

  const categories = ['ALL', 'Metro', 'Business', 'Tourism', 'Pilgrimage', 'North-East'];

  // Helper to determine realistic cheapest booking window for display
  const getCheapestWindow = (category, distance) => {
    if (category === 'Pilgrimage') return '30–45 Days Out';
    if (category === 'Tourism') return '45–60 Days Out';
    if (distance > 1500) return '30–45 Days Out';
    return '21–30 Days Out';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4 transition-colors">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-sky-600 dark:text-sky-400 border border-slate-200 dark:border-slate-700">
              NATIONAL NETWORK CATALOG
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">36 Hubs &bull; {routes.length} Corridors</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Domestic Route Explorer
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Search domestic sectors by Airport Name, City, or IATA code with live tariffs, flight times, and APIx scores.
          </p>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-2">
          <div className="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'grid' 
                  ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-sm' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'table' 
                  ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-sm' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Controls & Filters */}
      <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
        
        {/* Top row: search + category pills */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Airport Name, City, or IATA Code (e.g. Netaji Subhash, Kolkata, CCU, AYJ, BOM)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-sky-500 dark:focus:border-slate-700 transition-colors"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto pb-1 lg:pb-0">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-sky-50 dark:bg-slate-800 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-slate-700 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Detailed Filter Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-slate-200 dark:border-slate-800 text-xs transition-colors">
          
          <div>
            <label className="text-slate-600 dark:text-slate-400 block mb-1 font-medium">Origin Hub</label>
            <select
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-sky-500 dark:focus:border-slate-700 transition-colors"
            >
              <option value="">All Origins (36 Hubs)</option>
              {airports.map(a => (
                <option key={a.iata} value={a.iata}>{a.iata} — {a.city}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-slate-600 dark:text-slate-400 block mb-1 font-medium">Destination Hub</label>
            <select
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-sky-500 dark:focus:border-slate-700 transition-colors"
            >
              <option value="">All Destinations (36 Hubs)</option>
              {airports.map(a => (
                <option key={a.iata} value={a.iata}>{a.iata} — {a.city}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-slate-600 dark:text-slate-400 block mb-1 font-medium">Operating Carrier</label>
            <select
              value={selectedAirline}
              onChange={(e) => setSelectedAirline(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-sky-500 dark:focus:border-slate-700 transition-colors"
            >
              <option value="">All Carriers (5 Airlines)</option>
              {airlines.map(al => (
                <option key={al.code} value={al.code}>{al.code} — {al.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-slate-600 dark:text-slate-400 block mb-1 font-medium">Sort Order</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-sky-500 dark:focus:border-slate-700 transition-colors"
            >
              <option value="fare_asc">Lowest Average Fare (INR)</option>
              <option value="fare_desc">Highest Average Fare (INR)</option>
              <option value="apix_desc">Highest APIx Surge Score</option>
              <option value="distance_desc">Longest Flight Distance</option>
            </select>
          </div>

        </div>

      </div>

      {/* Results Count Banner */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-mono px-1">
        <span>Showing <strong className="text-sky-600 dark:text-sky-400 font-semibold">{processedRoutes.length}</strong> domestic corridors</span>
        <span>Standard Baseline: ₹4.20 / km</span>
      </div>

      {/* View Mode: Cards Grid */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {processedRoutes.map((r) => {
            const isSurging = (r.current_apix || 100) >= 130;
            const isDiscount = (r.current_apix || 100) < 95;
            const cheapestWindow = getCheapestWindow(r.category, r.distance_km);
            const airlineList = Array.isArray(r.airline_availability) ? r.airline_availability : (r.airline_availability ? r.airline_availability.split(',') : ['6E']);
            const origAirport = airportMap[r.origin_iata];
            const destAirport = airportMap[r.destination_iata];

            return (
              <div 
                key={r.id || r.route_key}
                className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {r.category}
                    </span>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                      isSurging 
                        ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20' 
                        : (isDiscount 
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
                          : 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20')
                    }`}>
                      APIx {formatAPIx(r.current_apix, '112.40')}
                    </span>
                  </div>

                  {/* Route Origin - Destination */}
                  <div className="flex items-center justify-between my-2">
                    <div className="max-w-[40%]">
                      <span className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100">{r.origin_iata}</span>
                      <span className="text-xs text-slate-700 dark:text-slate-300 font-medium block truncate">{r.origin_city || origAirport?.city}</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate" title={r.origin_name || origAirport?.name}>
                        {r.origin_name || origAirport?.name || 'Hub'}
                      </span>
                    </div>

                    <div className="flex flex-col items-center px-2">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{r.distance_km} km</span>
                      <ArrowRight className="w-4 h-4 text-sky-500 dark:text-sky-400 my-0.5" />
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{r.flight_time_mins} min</span>
                    </div>

                    <div className="max-w-[40%] text-right">
                      <span className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100">{r.destination_iata}</span>
                      <span className="text-xs text-slate-700 dark:text-slate-300 font-medium block truncate">{r.destination_city || destAirport?.city}</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate" title={r.destination_name || destAirport?.name}>
                        {r.destination_name || destAirport?.name || 'Hub'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between font-mono">
                    <span className="text-slate-500 dark:text-slate-400">Avg Fare:</span>
                    <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrencyINR(r.current_avg_fare, '₹4,850')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                      Cheapest Window:
                    </span>
                    <span className="text-sky-700 dark:text-sky-300 font-medium font-mono">
                      {cheapestWindow}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <span className="text-slate-500 dark:text-slate-400">Airlines:</span>
                    <div className="flex items-center gap-1 font-mono font-semibold">
                      {airlineList.map(al => (
                        <span key={al} className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[10px]">
                          {al}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* View Mode: High-Density Table */}
      {viewMode === 'table' && (
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm transition-colors">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 text-[11px] uppercase tracking-wider">
                  <th className="p-3">Sector</th>
                  <th className="p-3">Origin Airport</th>
                  <th className="p-3">Destination Airport</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Distance</th>
                  <th className="p-3">Flight Time</th>
                  <th className="p-3">Cheapest Window</th>
                  <th className="p-3">Airlines</th>
                  <th className="p-3">APIx</th>
                  <th className="p-3 text-right">Avg Fare</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {processedRoutes.map((r) => {
                  const origAirport = airportMap[r.origin_iata];
                  const destAirport = airportMap[r.destination_iata];
                  const cheapestWindow = getCheapestWindow(r.category, r.distance_km);
                  const airlineList = Array.isArray(r.airline_availability) ? r.airline_availability : (r.airline_availability ? r.airline_availability.split(',') : ['6E']);

                  return (
                    <tr key={r.id || r.route_key} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="p-3 font-bold text-sky-600 dark:text-sky-400">{r.route_key}</td>
                      <td className="p-3">
                        <span className="text-slate-900 dark:text-slate-200 font-sans font-medium">{r.origin_city || origAirport?.city}</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-sans">{r.origin_name || origAirport?.name}</span>
                      </td>
                      <td className="p-3">
                        <span className="text-slate-900 dark:text-slate-200 font-sans font-medium">{r.destination_city || destAirport?.city}</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-sans">{r.destination_name || destAirport?.name}</span>
                      </td>
                      <td className="p-3">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {r.category}
                        </span>
                      </td>
                      <td className="p-3">{r.distance_km} km</td>
                      <td className="p-3">{r.flight_time_mins} min</td>
                      <td className="p-3 text-sky-700 dark:text-sky-300 text-[11px]">{cheapestWindow}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          {airlineList.map(al => (
                            <span key={al} className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[9px] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              {al}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-3">
                        <span className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
                          (r.current_apix || 100) >= 130 
                            ? 'text-red-600 dark:text-red-400 bg-red-500/10' 
                            : 'text-sky-600 dark:text-sky-400 bg-sky-500/10'
                        }`}>
                          {formatAPIx(r.current_apix, '112.40')}
                        </span>
                      </td>
                      <td className="p-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrencyINR(r.current_avg_fare, '₹4,850')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
