import React, { useState, useEffect } from 'react';
import { Globe, Radio } from 'lucide-react';
import IndiaRouteMap from '../components/IndiaRouteMap';
import { fetchAirports, fetchRoutes, fetchApixOverview } from '../services/api';
import { formatAPIx, formatCurrencyINR } from '../utils/formatters';

export default function HeatmapPage() {
  const [airports, setAirports] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [apix, setApix] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchAirports(), fetchRoutes(), fetchApixOverview()]).then(
      ([airportsData, routesData, apixData]) => {
        setAirports(airportsData);
        setRoutes(routesData);
        setApix(apixData);
        setLoading(false);
      }
    );
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-sky-400 border border-slate-700">
              GEOSPATIAL INTELLIGENCE
            </span>
            <span className="flex items-center gap-1.5 text-xs text-sky-400 font-mono">
              <span className="inline-flex rounded-full h-2 w-2 bg-sky-400"></span>
              Live GIS Radar Feeds
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">
            India Airfare & Route Heatmap
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            OpenStreetMap geospatial projection with 36 airports and dynamic flight corridors. Filter sectors by category.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs text-slate-400 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
          <span>Active Hubs: <strong className="text-sky-400">36</strong></span>
          <span>&bull;</span>
          <span>Domestic Corridors: <strong className="text-emerald-400">{routes.length}</strong></span>
        </div>
      </div>

      {/* Main Full-Size Map Component */}
      <div className="space-y-3">
        <IndiaRouteMap 
          airports={airports} 
          routes={routes} 
          height="620px"
          interactive={true} 
        />
      </div>

      {/* State-wise Geospatial Airfare Metrics */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5 uppercase tracking-wide">
              <Globe className="w-4 h-4 text-sky-400" />
              State-Level Airfare Surge Index
            </h3>
            <p className="text-xs text-slate-400">Airfare pressure index weighted by arrival and departure traffic density</p>
          </div>
          <span className="text-[10px] font-mono text-slate-500">14 MONITORED STATES</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {(apix?.state_apix || []).map((st) => {
            const isHigh = st.apix_score >= 130;
            const isElevated = st.apix_score >= 115 && st.apix_score < 130;

            return (
              <div 
                key={st.entity_key}
                className="p-3 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-200 truncate">{st.entity_key}</span>
                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                    isHigh ? 'bg-red-500/15 text-red-400' : (
                      isElevated ? 'bg-amber-500/15 text-amber-400' : 'bg-sky-500/15 text-sky-400'
                    )
                  }`}>
                    APIx {formatAPIx(st.apix_score)}
                  </span>
                </div>

                <div className="flex items-baseline justify-between font-mono text-xs">
                  <span className="text-slate-400 text-[11px]">Avg Fare:</span>
                  <span className="font-bold text-slate-100">{formatCurrencyINR(st.avg_fare)}</span>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-1 border-t border-slate-800/60">
                  <span>Trend:</span>
                  <span className={st.trend_classification?.includes('BULLISH') ? 'text-amber-400' : 'text-emerald-400'}>
                    {st.trend_classification || 'STABLE'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
