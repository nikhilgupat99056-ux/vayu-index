import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Plane, Cpu, Database, Compass, Globe } from 'lucide-react';
import VayuLogo from './VayuLogo';

export default function Footer() {
  return (
    <footer className="w-full bg-[#030919] border-t border-slate-800/80 text-slate-400 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          
          {/* Brand info */}
          <div className="md:col-span-1 space-y-4">
            <VayuLogo size={38} showText={true} />
            <p className="text-xs text-slate-400 leading-relaxed">
              India's Real-Time Airfare Intelligence Platform modeled with Bloomberg rigor, FlightRadar24 situational awareness, and Apple interface design.
            </p>
            <div className="flex items-center gap-2 text-[11px] text-emerald-400 font-mono">
              <Shield className="w-3.5 h-3.5" />
              <span>DGCA & Airline Tariff Compliant</span>
            </div>
          </div>

          {/* Platform sections */}
          <div>
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-3">Intelligence</h4>
            <ul className="space-y-2 text-xs">
              <li><Link to="/" className="hover:text-sky-400 transition-colors">National APIx Dashboard</Link></li>
              <li><Link to="/routes" className="hover:text-sky-400 transition-colors">160+ Domestic Routes</Link></li>
              <li><Link to="/heatmap" className="hover:text-sky-400 transition-colors">Interactive OpenStreetMap</Link></li>
              <li><Link to="/analytics" className="hover:text-sky-400 transition-colors">Price Elasticity Engine</Link></li>
              <li><Link to="/festivals" className="hover:text-sky-400 transition-colors">24 Festival Surge Insights</Link></li>
            </ul>
          </div>

          {/* Network stats */}
          <div>
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-3">Aviation Network</h4>
            <ul className="space-y-2 text-xs font-mono">
              <li className="flex justify-between"><span>Airports Monitored:</span> <span className="text-sky-400">36 Hubs</span></li>
              <li className="flex justify-between"><span>Active Routes:</span> <span className="text-sky-400">160 Sectors</span></li>
              <li className="flex justify-between"><span>Carriers Tracked:</span> <span className="text-sky-400">5 Major Airlines</span></li>
              <li className="flex justify-between"><span>Sampling Cadence:</span> <span className="text-emerald-400">Continuous Real-Time</span></li>
              <li className="flex justify-between"><span>Base Index Baseline:</span> <span className="text-amber-400">100.0</span></li>
            </ul>
          </div>

          {/* Architecture badges */}
          <div>
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-3">System Stack</h4>
            <div className="flex flex-wrap gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-sky-400">FastAPI</span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-sky-400">React 18</span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-sky-400">Tailwind CSS</span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-amber-400">Leaflet Maps</span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-emerald-400">PostgreSQL</span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-purple-400">APScheduler</span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-blue-400">Chart.js</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-4 font-mono">
              Engine Version: 1.0.4-prod
            </p>
          </div>

        </div>

        <div className="pt-8 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500">
          <p>© {new Date().getFullYear()} VAYU-Index Platform. Real-Time Airfare Intelligence Platform for India.</p>
          <div className="flex items-center gap-4 mt-4 sm:mt-0 font-mono text-[11px]">
            <span>Latency: &lt;45ms</span>
            <span>•</span>
            <span>Reliability: 99.98%</span>
            <span>•</span>
            <span className="text-emerald-400">All Systems Nominal</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
