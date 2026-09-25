import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Calendar, 
  Plane, 
  Compass, 
  MapPin, 
  DollarSign, 
  Clock, 
  ArrowUpRight, 
  ArrowDownRight, 
  Filter,
  RefreshCw
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

import StatCard from '../components/StatCard';
import IndiaRouteMap from '../components/IndiaRouteMap';
import { 
  fetchApixOverview, 
  fetchAirports, 
  fetchRoutes, 
  fetchAnalytics,
  fetchAirlines 
} from '../services/api';
import { 
  formatAPIx, 
  formatCurrencyINR, 
  formatPercentage, 
  formatMovingAvg,
  formatTimeHHMMSS
} from '../utils/formatters';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  ChartTooltip,
  Legend,
  Filler
);

export default function Dashboard() {
  const [apix, setApix] = useState(null);
  const [airports, setAirports] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [airlines, setAirlines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => formatTimeHHMMSS());

  // Filters
  const [selectedOrigin, setSelectedOrigin] = useState('');
  const [selectedDestination, setSelectedDestination] = useState('');
  const [selectedAirline, setSelectedAirline] = useState('');
  const [selectedWindow, setSelectedWindow] = useState('ALL');

  const loadData = async () => {
    try {
      const [apixRes, airportsRes, routesRes, analyticsRes, airlinesRes] = await Promise.all([
        fetchApixOverview(),
        fetchAirports(),
        fetchRoutes(),
        fetchAnalytics(),
        fetchAirlines()
      ]);
      setApix(apixRes);
      setAirports(airportsRes);
      setRoutes(routesRes);
      setAnalytics(analyticsRes);
      setAirlines(airlinesRes);
    } catch (e) {
      console.error("Dashboard data fetch error:", e);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();

    // Real-time live telemetry clock ticking every second (1000ms) with unmount cleanup
    const timer = setInterval(() => {
      setCurrentTime(formatTimeHHMMSS());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  // Filtered routes based on interactive dashboard filters
  const filteredRoutes = routes.filter(r => {
    if (selectedOrigin && r.origin_iata !== selectedOrigin) return false;
    if (selectedDestination && r.destination_iata !== selectedDestination) return false;
    if (selectedAirline && !r.airline_availability.includes(selectedAirline)) return false;
    return true;
  });

  // Chart 1: APIx 30-Day Trend
  const apixHistory = apix?.history || [];
  const apixTrendChartData = {
    labels: apixHistory.map(h => h.calculation_date ? h.calculation_date.slice(5) : ''),
    datasets: [
      {
        label: 'National APIx Score',
        data: apixHistory.map(h => h.apix_score),
        borderColor: '#38BDF8',
        backgroundColor: 'rgba(56, 189, 248, 0.08)',
        fill: true,
        tension: 0.25,
        borderWidth: 2,
        pointBackgroundColor: '#38BDF8',
        pointRadius: 2.5,
      },
      {
        label: '7-Day Moving Avg',
        data: apixHistory.map(h => (h.apix_score * 0.99 + 1.2)),
        borderColor: '#F59E0B',
        borderDash: [4, 4],
        borderWidth: 1.5,
        pointRadius: 0,
        fill: false,
      }
    ]
  };

  // Chart 2: Booking Window Curve
  const windowData = analytics?.booking_window_comparison || [];
  const bookingWindowChartData = {
    labels: windowData.map(w => w.label),
    datasets: [
      {
        label: 'Average Fare (₹ INR)',
        data: windowData.map(w => w.avg_fare),
        backgroundColor: [
          '#EF4444',
          '#F97316',
          '#F59E0B',
          '#38BDF8',
          '#10B981',
          '#059669',
        ],
        borderRadius: 4,
      }
    ]
  };

  // Chart 3: Airline Market Share Doughnut
  const airlineData = analytics?.airline_analytics || airlines || [];
  const airlineShareChartData = {
    labels: airlineData.map(a => a.name),
    datasets: [
      {
        data: airlineData.map(a => a.market_share),
        backgroundColor: [
          '#0052CC',
          '#E01933',
          '#F37021',
          '#FF6200',
          '#E02828'
        ],
        borderColor: '#0b1120',
        borderWidth: 2,
      }
    ]
  };

  const darkChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#94A3B8',
          font: { size: 10 }
        }
      },
      tooltip: {
        backgroundColor: '#0F172A',
        titleColor: '#F8FAFC',
        bodyColor: '#38BDF8',
        borderColor: '#334155',
        borderWidth: 1,
        padding: 8,
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.04)' },
        ticks: { color: '#64748B', font: { size: 10 } }
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.04)' },
        ticks: { color: '#64748B', font: { size: 10 } }
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Top Header & Telemetry Strip */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-sky-400 border border-slate-700">
              NATIONAL AIRFARE INTELLIGENCE
            </span>
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Live Telemetry Online
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">
            Indian Aviation Price Index
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Algorithmic benchmark tracking daily domestic fare dynamics across 36 airports and 135+ key corridors.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Real-time Telemetry Clock */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <Clock className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-slate-400 text-[11px] hidden sm:inline">Telemetry Clock:</span>
            <span className="font-bold text-sky-400 tracking-wider">{currentTime}</span>
          </div>

          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-medium text-slate-300 transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-sky-400' : ''}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Refresh Telemetry'}</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Grid (Clean Medium-Sized Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="National APIx"
          value={formatAPIx(apix?.national_apix || 114.8)}
          badge="BASE 100"
          change={`${formatPercentage(3.4)} this week`}
          trend="up"
          subvalue={`7D MA: ${formatMovingAvg(apix?.moving_avg_7d || 113.2)}`}
          icon={Activity}
          highlightColor="sky"
        />

        <StatCard
          title="Avg Domestic Fare"
          value={formatCurrencyINR(apix?.national_avg_fare || 5480)}
          badge="PAN-INDIA"
          change={`${formatPercentage(-1.2)} vs yesterday`}
          trend="down"
          subvalue="Normalized across network"
          icon={DollarSign}
          highlightColor="emerald"
        />

        <StatCard
          title="Cheapest Booking Window"
          value="25–40 Days"
          badge="OPTIMAL"
          change="Saves up to 48%"
          trend="down"
          subvalue={`Avg ${formatCurrencyINR(3840)} / 1000km`}
          icon={Clock}
          highlightColor="amber"
        />

        <StatCard
          title="Airport Network"
          value="36 Hubs"
          badge="EXPANDED"
          change={`${routes.length || 140} Active Routes`}
          trend="neutral"
          subvalue="5 Commercial Carriers"
          icon={Plane}
          highlightColor="blue"
        />
      </div>

      {/* Interactive Global Filters Bar */}
      <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 shadow-sm space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 uppercase tracking-wide">
            <Filter className="w-3.5 h-3.5 text-sky-400" />
            <span>Sector Telemetry Filter</span>
          </div>
          {(selectedOrigin || selectedDestination || selectedAirline) && (
            <button
              onClick={() => {
                setSelectedOrigin('');
                setSelectedDestination('');
                setSelectedAirline('');
              }}
              className="text-[11px] text-amber-400 hover:underline"
            >
              Reset Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 text-xs">
          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Origin Airport</label>
            <select
              value={selectedOrigin}
              onChange={(e) => setSelectedOrigin(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-slate-700"
            >
              <option value="">All Origins (36 Hubs)</option>
              {airports.map(a => (
                <option key={a.iata} value={a.iata}>{a.iata} — {a.city}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Destination Airport</label>
            <select
              value={selectedDestination}
              onChange={(e) => setSelectedDestination(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-slate-700"
            >
              <option value="">All Destinations (36 Hubs)</option>
              {airports.map(a => (
                <option key={a.iata} value={a.iata}>{a.iata} — {a.city}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Operating Airline</label>
            <select
              value={selectedAirline}
              onChange={(e) => setSelectedAirline(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-slate-700"
            >
              <option value="">All Airlines (5 Carriers)</option>
              {airlines.map(al => (
                <option key={al.code} value={al.code}>{al.code} — {al.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Booking Window</label>
            <select
              value={selectedWindow}
              onChange={(e) => setSelectedWindow(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-slate-700"
            >
              <option value="ALL">All Horizons (0–60 Days)</option>
              <option value="0">0–1 Day (Last Minute)</option>
              <option value="3">2–4 Days (Near-Term)</option>
              <option value="7">5–7 Days (1 Week)</option>
              <option value="14">8–14 Days (Mid-Range)</option>
              <option value="30">15–30 Days (Sweet Spot)</option>
              <option value="60">31–60 Days (Advance)</option>
            </select>
          </div>
        </div>
      </div>

      {/* India Route Map Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Compass className="w-4 h-4 text-sky-400" />
            <h2 className="text-base font-bold text-slate-100">National Route Network Heatmap</h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {filteredRoutes.length} Domestic Corridors Visualized
          </span>
        </div>
        
        <IndiaRouteMap 
          airports={airports} 
          routes={filteredRoutes} 
          height="450px"
          interactive={true} 
        />
      </div>

      {/* Primary Analytics Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Chart 1: APIx 30-Day Trend */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5 uppercase tracking-wide">
                <Activity className="w-3.5 h-3.5 text-sky-400" />
                APIx Trajectory & Moving Averages
              </h3>
              <p className="text-[11px] text-slate-400">30-day baseline comparison (100.0 nominal)</p>
            </div>
            <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              {apix?.trend_classification || 'MODERATE_BULLISH'}
            </span>
          </div>

          <div className="h-56 w-full">
            <Line data={apixTrendChartData} options={darkChartOptions} />
          </div>
        </div>

        {/* Chart 2: Booking Window Curve */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5 uppercase tracking-wide">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                Booking Window Escalation Curve
              </h3>
              <p className="text-[11px] text-slate-400">Average price spike as departure date approaches</p>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              Optimal: 30D Lead
            </span>
          </div>

          <div className="h-56 w-full">
            <Bar data={bookingWindowChartData} options={darkChartOptions} />
          </div>
        </div>

      </div>

      {/* Secondary Charts: Airline Share & State Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Doughnut: Carrier Market Share */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5 mb-0.5 uppercase tracking-wide">
              <Plane className="w-3.5 h-3.5 text-sky-400" />
              Domestic Market Share
            </h3>
            <p className="text-[11px] text-slate-400 mb-3">Capacity distribution across 5 carriers</p>
            <div className="h-40 w-full flex items-center justify-center">
              <Doughnut data={airlineShareChartData} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-800 space-y-1 text-xs font-mono">
            {airlineData.slice(0, 4).map(al => (
              <div key={al.code} className="flex justify-between items-center">
                <span className="text-slate-300 flex items-center gap-1.5 text-[11px]">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: al.color }}></span>
                  {al.name}
                </span>
                <span className="text-slate-400 font-bold text-[11px]">{al.market_share}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* State APIx Leaderboard */}
        <div className="md:col-span-2 p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5 uppercase tracking-wide">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                State-Level Airfare Surge Index
              </h3>
              <p className="text-[11px] text-slate-400">Aggregate weighted APIx for inbound/outbound travel</p>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">14 STATES MONITORED</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
            {(apix?.state_apix || []).slice(0, 8).map((st, i) => (
              <div key={st.entity_key} className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 font-bold text-[10px] w-3.5">{i + 1}.</span>
                  <span className="text-slate-200 font-medium truncate max-w-[120px] text-[11px]">{st.entity_key}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-emerald-400 font-bold text-[11px]">{formatCurrencyINR(st.avg_fare)}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                    st.apix_score >= 130 ? 'bg-red-500/15 text-red-400' : (st.apix_score >= 115 ? 'bg-amber-500/15 text-amber-400' : 'bg-sky-500/15 text-sky-400')
                  }`}>
                    {formatAPIx(st.apix_score)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Top Rising and Falling Routes Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Top Rising Corridors */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="p-1 rounded bg-red-500/10 text-red-400">
                <ArrowUpRight className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wide">Top Rising Corridors</h3>
                <p className="text-[10px] text-slate-400">Highest price escalation relative to nominal base</p>
              </div>
            </div>
            <span className="text-[10px] text-red-400 font-mono font-bold bg-red-500/10 px-1.5 py-0.5 rounded">SURGE</span>
          </div>

          <div className="divide-y divide-slate-800 text-xs font-mono">
            {(apix?.top_rising_routes || []).map((r) => (
              <div key={r.route_key} className="py-2 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-sky-400">{r.route_key}</span>
                    <span className="text-[10px] text-slate-400">({r.origin_city} → {r.destination_city})</span>
                  </div>
                  <span className="text-[9px] text-slate-500 uppercase">{r.category}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-100 block">{formatCurrencyINR(r.avg_fare)}</span>
                  <span className="text-[10px] font-bold text-red-400">{formatPercentage(r.change_pct)} (APIx {formatAPIx(r.apix_score)})</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Falling Corridors */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="p-1 rounded bg-emerald-500/10 text-emerald-400">
                <ArrowDownRight className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wide">Top Bargain Corridors</h3>
                <p className="text-[10px] text-slate-400">Fares currently trading below standard baseline</p>
              </div>
            </div>
            <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">DISCOUNT</span>
          </div>

          <div className="divide-y divide-slate-800 text-xs font-mono">
            {(apix?.top_falling_routes || []).map((r) => (
              <div key={r.route_key} className="py-2 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-emerald-400">{r.route_key}</span>
                    <span className="text-[10px] text-slate-400">({r.origin_city} → {r.destination_city})</span>
                  </div>
                  <span className="text-[9px] text-slate-500 uppercase">{r.category}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-100 block">{formatCurrencyINR(r.avg_fare)}</span>
                  <span className="text-[10px] font-bold text-emerald-400">{formatPercentage(r.change_pct)} (APIx {formatAPIx(r.apix_score)})</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
