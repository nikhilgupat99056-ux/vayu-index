import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  Percent, 
  Layers, 
  DollarSign, 
  Info, 
  Sparkles,
  Zap,
  Target
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { fetchAnalytics } from '../services/api';
import { formatAPIx, formatCurrencyINR, formatPercentage } from '../utils/formatters';
import { useTheme } from '../context/ThemeContext';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const { isDark } = useTheme();

  useEffect(() => {
    fetchAnalytics().then(data => {
      setAnalytics(data);
      setLoading(false);
    });
  }, []);

  const bookingWindows = analytics?.booking_window_comparison || [];
  const airlines = analytics?.airline_analytics || [];
  const categories = analytics?.category_analytics || [];

  // Chart 1: Price Elasticity / Lead time surge curve
  const elasticityChartData = {
    labels: bookingWindows.map(w => w.label),
    datasets: [
      {
        label: 'Average Fare (₹)',
        data: bookingWindows.map(w => w.avg_fare),
        borderColor: '#EF4444',
        backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)',
        fill: true,
        tension: 0.35,
        borderWidth: 3,
        pointBackgroundColor: '#EF4444',
        pointRadius: 5,
      },
      {
        label: 'Nominal Baseline Threshold (₹)',
        data: bookingWindows.map(() => 4400),
        borderColor: '#38BDF8',
        borderDash: [6, 6],
        borderWidth: 2,
        pointRadius: 0,
        fill: false,
      }
    ]
  };

  // Chart 2: Category Average Fare & APIx
  const categoryChartData = {
    labels: categories.map(c => c.category),
    datasets: [
      {
        label: 'Average Fare (₹)',
        data: categories.map(c => c.avg_fare),
        backgroundColor: '#2563EB',
        borderRadius: 8,
      },
      {
        label: 'Category APIx Index',
        data: categories.map(c => c.category_apix * 45), // Scaled for dual visibility
        backgroundColor: '#F59E0B',
        borderRadius: 8,
      }
    ]
  };

  // Chart 3: Airline Average Tariffs
  const airlineTariffChartData = {
    labels: airlines.map(a => a.name),
    datasets: [
      {
        label: 'Network Avg Fare (₹)',
        data: airlines.map(a => a.avg_fare),
        backgroundColor: airlines.map(a => a.color || '#38BDF8'),
        borderRadius: 8,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: isDark ? '#94A3B8' : '#475569',
          font: { family: 'Plus Jakarta Sans', size: 11 }
        }
      },
      tooltip: {
        backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
        titleColor: isDark ? '#F8FAFC' : '#0F172A',
        bodyColor: isDark ? '#38BDF8' : '#0284C7',
        borderColor: isDark ? 'rgba(56, 189, 248, 0.3)' : 'rgba(2, 132, 199, 0.3)',
        borderWidth: 1,
        padding: 10
      }
    },
    scales: {
      x: {
        grid: { color: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.06)' },
        ticks: { color: isDark ? '#64748B' : '#64748B', font: { size: 10 } }
      },
      y: {
        grid: { color: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.06)' },
        ticks: { color: isDark ? '#64748B' : '#64748B', font: { size: 10 } }
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800/80 pb-6 transition-colors">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/30">
              ECONOMETRIC MODELING
            </span>
            <span className="text-xs text-amber-600 dark:text-amber-400 font-mono">Lead Time Elasticity: -0.48</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            Airfare Elasticity & Yield Analytics
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Mathematical modeling of airline revenue management algorithms, purchasing lead times, and capacity utilization.
          </p>
        </div>

        <div className="flex items-center gap-2 p-2 rounded-2xl glass-panel text-xs font-mono text-emerald-600 dark:text-emerald-400">
          <Target className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
          <span>Optimal Lead: 25-40 Days (48% Alpha)</span>
        </div>
      </div>

      {/* Main Elasticity Curve & Recommendation Banner */}
      <div className="p-6 rounded-3xl glass-panel border border-slate-200 dark:border-slate-800 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Clock className="w-4 h-4 text-red-500 dark:text-red-400" />
              Dynamic Price Spike vs Booking Horizon Curve
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Notice the hyperbolic escalation within 7 days of scheduled departure.
            </p>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300">
            Sensitivity: <strong className="text-red-500 dark:text-red-400">High (&gt;140% spike)</strong>
          </div>
        </div>

        <div className="h-72 w-full">
          <Line data={elasticityChartData} options={chartOptions} />
        </div>

        {/* Lead Time Table Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-4 border-t border-slate-200 dark:border-slate-800 text-xs font-mono">
          {bookingWindows.map((w) => (
            <div key={w.window_days} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-center">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block mb-1 uppercase">{w.label}</span>
              <span className="text-base font-bold text-slate-900 dark:text-slate-100 block">{formatCurrencyINR(w.avg_fare)}</span>
              <span className={`text-[11px] font-bold ${w.multiplier > 1.2 ? 'text-red-600 dark:text-red-400' : (w.multiplier < 1.0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400')}`}>
                {w.multiplier}x Base
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Dual Column: Category Economics & Carrier Spread */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Category Tariffs */}
        <div className="p-6 rounded-3xl glass-panel border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Layers className="w-4 h-4 text-sky-500 dark:text-sky-400" />
                Yield Pressure by Route Category
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Tourism & Pilgrimage exhibit the steepest demand peaks</p>
            </div>
          </div>

          <div className="h-64 w-full">
            <Bar data={categoryChartData} options={chartOptions} />
          </div>

          <div className="space-y-2 text-xs font-mono pt-3 border-t border-slate-200 dark:border-slate-800">
            {categories.map((c) => (
              <div key={c.category} className="flex justify-between items-center py-1">
                <span className="text-slate-700 dark:text-slate-300">{c.category} Corridors ({c.route_count} routes)</span>
                <div className="flex items-center gap-3">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">{formatCurrencyINR(c.avg_fare)}</span>
                  <span className="text-amber-600 dark:text-amber-400 font-bold">APIx {formatAPIx(c.category_apix)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Carrier Average Tariffs */}
        <div className="p-6 rounded-3xl glass-panel border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                Network Average Tariff by Commercial Airline
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Comparing full-service vs low-cost carrier fare benchmarks</p>
            </div>
          </div>

          <div className="h-64 w-full">
            <Bar data={airlineTariffChartData} options={chartOptions} />
          </div>

          <div className="space-y-2 text-xs font-mono pt-3 border-t border-slate-200 dark:border-slate-800">
            {airlines.map((a) => (
              <div key={a.code} className="flex justify-between items-center py-1">
                <span className="text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: a.color }}></span>
                  {a.name} ({a.code})
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">On-Time: {formatPercentage(a.on_time_percent, false)}</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">{formatCurrencyINR(a.avg_fare)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
