import React, { useState, useEffect } from 'react';
import { 
  Plane, 
  Clock, 
  Compass, 
  TrendingUp, 
  ShieldCheck, 
  DollarSign, 
  CheckCircle2, 
  Award,
  Layers
} from 'lucide-react';
import { fetchAirlines } from '../services/api';
import { formatCurrencyINR, formatPercentage } from '../utils/formatters';

// SVG Logos for each carrier
const AirlineLogos = {
  "6E": (
    <svg viewBox="0 0 100 100" className="w-10 h-10" fill="none">
      <circle cx="50" cy="50" r="46" fill="#0052CC" fillOpacity="0.2" stroke="#0052CC" strokeWidth="3" />
      <path d="M28 58 L50 26 L72 58 L50 48 Z" fill="#0052CC" />
      <circle cx="50" cy="48" r="6" fill="#FFFFFF" />
    </svg>
  ),
  "AI": (
    <svg viewBox="0 0 100 100" className="w-10 h-10" fill="none">
      <circle cx="50" cy="50" r="46" fill="#E01933" fillOpacity="0.2" stroke="#E01933" strokeWidth="3" />
      <path d="M24 64 C 40 30, 60 25, 78 36 C 70 52, 50 68, 24 64 Z" fill="#E01933" />
      <circle cx="62" cy="42" r="5" fill="#F59E0B" />
    </svg>
  ),
  "IX": (
    <svg viewBox="0 0 100 100" className="w-10 h-10" fill="none">
      <circle cx="50" cy="50" r="46" fill="#F37021" fillOpacity="0.2" stroke="#F37021" strokeWidth="3" />
      <path d="M25 50 L75 50" stroke="#F37021" strokeWidth="6" strokeLinecap="round" />
      <path d="M50 25 L75 50 L50 75" stroke="#F37021" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  "QP": (
    <svg viewBox="0 0 100 100" className="w-10 h-10" fill="none">
      <circle cx="50" cy="50" r="46" fill="#FF6200" fillOpacity="0.2" stroke="#FF6200" strokeWidth="3" />
      <path d="M28 66 L50 32 L72 66 L58 66 L50 50 L42 66 Z" fill="#FF6200" />
      <path d="M35 72 Q 50 82 65 72" stroke="#FF6200" strokeWidth="3" strokeLinecap="round" />
    </svg>
  ),
  "SG": (
    <svg viewBox="0 0 100 100" className="w-10 h-10" fill="none">
      <circle cx="50" cy="50" r="46" fill="#E02828" fillOpacity="0.2" stroke="#E02828" strokeWidth="3" />
      <circle cx="36" cy="50" r="8" fill="#E02828" />
      <circle cx="50" cy="38" r="8" fill="#E02828" />
      <circle cx="64" cy="50" r="8" fill="#E02828" />
      <circle cx="50" cy="62" r="8" fill="#E02828" />
    </svg>
  ),
};

export default function AirlinesPage() {
  const [airlines, setAirlines] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAirlines().then(data => {
      setAirlines(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-sky-500/20 text-sky-400 border border-sky-500/30">
              COMMERCIAL OPERATOR INTELLIGENCE
            </span>
            <span className="text-xs text-slate-400 font-mono">5 Major Indian Carriers</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-100 tracking-tight">
            Airline Fleet & Tariff Profiles
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time benchmarking across domestic market share, average seat yield, punctuality, and route footprint.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono text-slate-400 bg-slate-900/80 px-4 py-2 rounded-2xl border border-slate-800">
          <span>Total Fleet Tracked: <strong className="text-sky-400">700 Aircraft</strong></span>
        </div>
      </div>

      {/* 5 Airline Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {airlines.map((al) => {
          return (
            <div
              key={al.code}
              className="p-6 rounded-3xl glass-panel border border-slate-800 hover:border-slate-700 transition-all duration-300 hover:-translate-y-1 hover:shadow-glass flex flex-col justify-between"
            >
              <div>
                {/* Header with SVG Logo and Status Badge */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-1 rounded-2xl bg-slate-900 border border-slate-800">
                      {AirlineLogos[al.code] || AirlineLogos["6E"]}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-extrabold text-slate-100">{al.name}</span>
                        <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-slate-800 text-sky-400 font-bold border border-slate-700">
                          {al.code}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 block truncate max-w-[180px]">
                        {al.full_name}
                      </span>
                    </div>
                  </div>

                  <span className={`text-[10px] uppercase font-bold font-mono px-2 py-0.5 rounded-full ${
                    al.trend === 'EXPANDING' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'bg-slate-800 text-slate-300 border border-slate-700'
                  }`}>
                    {al.trend}
                  </span>
                </div>

                {/* Market Share Progress Bar */}
                <div className="my-4 space-y-1.5">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-400">Domestic Market Share:</span>
                    <span className="font-bold text-slate-200">{al.market_share}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${al.market_share}%`,
                        backgroundColor: al.color || '#38BDF8',
                      }}
                    ></div>
                  </div>
                </div>

                {/* 4-KPI Mini Matrix */}
                <div className="grid grid-cols-2 gap-3 my-4 text-xs font-mono">
                  
                  <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80">
                    <span className="text-slate-500 text-[10px] block mb-0.5">Average Tariff:</span>
                    <span className="text-base font-bold text-emerald-400">
                      {formatCurrencyINR(al.avg_fare, '₹4,950')}
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80">
                    <span className="text-slate-500 text-[10px] block mb-0.5">On-Time %:</span>
                    <span className="text-base font-bold text-sky-400">
                      {formatPercentage(al.on_time_percent, false)}
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80">
                    <span className="text-slate-500 text-[10px] block mb-0.5">Fleet Size:</span>
                    <span className="text-base font-bold text-slate-200">
                      {al.fleet_size} Jets
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80">
                    <span className="text-slate-500 text-[10px] block mb-0.5">Sectors Served:</span>
                    <span className="text-base font-bold text-slate-200">
                      {al.routes_covered || 95}+
                    </span>
                  </div>

                </div>
              </div>

              {/* Footer specs */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1 text-emerald-400 font-mono">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  DGCA Monitored
                </span>
                <span className="font-mono text-slate-500">Tier 1 Operator</span>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
