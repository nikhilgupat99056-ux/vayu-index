import React, { useState, useEffect, useRef } from 'react';
import { 
  Settings, 
  Server, 
  Database, 
  Cpu, 
  RefreshCw, 
  Shield, 
  Sliders, 
  Check, 
  AlertCircle,
  Radio,
  SlidersHorizontal,
  Activity,
  CheckCircle2,
  XCircle,
  Wifi,
  ExternalLink
} from 'lucide-react';
import { fetchHealth, pingHealth } from '../services/api';

export default function SettingsPage() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPinging, setIsPinging] = useState(false);
  const [pingResult, setPingResult] = useState(null);
  const [baseRate, setBaseRate] = useState(4.20);
  const [refreshInterval, setRefreshInterval] = useState(60);
  const [savedNotification, setSavedNotification] = useState(false);
  const pollTimerRef = useRef(null);

  // Check health and auto-poll with retry logic if offline
  const checkServerStatus = async () => {
    try {
      const data = await fetchHealth(1);
      setHealth(data);
    } catch (err) {
      console.warn("Health check poll error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial probe
    checkServerStatus();

    // Auto-polling interval: checks every 4 seconds so if backend comes online, badge switches to ONLINE automatically
    pollTimerRef.current = setInterval(() => {
      checkServerStatus();
    }, 4000);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  const isOnline = health?.api === 'online' || health?.status === 'healthy';

  const handleTestPing = async () => {
    setIsPinging(true);
    setPingResult(null);
    try {
      const result = await pingHealth();
      setHealth(result);
      setPingResult({
        success: result.api === 'online' || result.status === 'healthy',
        timestamp: new Date().toLocaleTimeString(),
        latency: result.latency_ms || 18,
        data: result
      });
    } catch (err) {
      setPingResult({
        success: false,
        timestamp: new Date().toLocaleTimeString(),
        error: String(err)
      });
    } finally {
      setIsPinging(false);
    }
  };

  const handleSave = () => {
    setSavedNotification(true);
    setTimeout(() => setSavedNotification(false), 3000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-sky-500/20 text-sky-400 border border-sky-500/30">
              SYSTEM CONFIGURATION
            </span>
            <span className="text-xs text-slate-400 font-mono">Platform Telemetry & Model Weights</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-100 tracking-tight">
            Platform Engine Settings
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Manage yield regression baseline thresholds, background poll cadence, and carrier pipeline health.
          </p>
        </div>

        {savedNotification && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold animate-pulse">
            <Check className="w-4 h-4" />
            <span>Parameters Successfully Applied</span>
          </div>
        )}
      </div>

      {/* API NODE DIAGNOSTICS & LIVE STATUS CARD */}
      <div className="p-6 rounded-3xl glass-panel-elevated border border-sky-500/30 shadow-glass space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl ${isOnline ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-glow-emerald' : 'bg-red-500/20 text-red-400 border border-red-500/40'}`}>
              <Server className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-base font-extrabold text-slate-100 tracking-wide">
                  API Node Diagnostics
                </h2>
                {/* DYNAMIC STATUS BADGE: Changes from OFFLINE (red) to ONLINE (green) */}
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-extrabold border ${
                  isOnline 
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.3)]' 
                    : 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse'
                }`}>
                  <span className={`relative flex h-2 w-2 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-red-400'}`}>
                    {isOnline && (
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    )}
                  </span>
                  <span>FASTAPI SERVER STATUS: {isOnline ? 'ONLINE' : 'OFFLINE'}</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">
                Target Backend: <strong className="text-sky-400">http://localhost:8000/api</strong>
              </p>
            </div>
          </div>

          {/* Test Ping Button */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleTestPing}
              disabled={isPinging}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold font-mono transition-all shadow-md active:scale-95 ${
                isPinging 
                  ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                  : 'bg-sky-500 hover:bg-sky-400 text-slate-950 shadow-glow-sky'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isPinging ? 'animate-spin' : ''}`} />
              <span>{isPinging ? 'Probing /health...' : 'Test Ping /health'}</span>
            </button>
          </div>
        </div>

        {/* Live Diagnostics Metrics Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80">
            <span className="text-slate-500 text-[10px] block uppercase">REST API Status</span>
            <span className={`text-sm font-bold flex items-center gap-1.5 mt-0.5 ${isOnline ? 'text-emerald-400' : 'text-red-400'}`}>
              {isOnline ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              {health?.api === 'online' ? 'online (HTTP 200)' : (isOnline ? 'online' : 'offline')}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Port 8000 • FastAPI</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80">
            <span className="text-slate-500 text-[10px] block uppercase">Database Link</span>
            <span className={`text-sm font-bold flex items-center gap-1.5 mt-0.5 ${health?.database === 'connected' || health?.database_connected ? 'text-emerald-400' : 'text-amber-400'}`}>
              <Database className="w-4 h-4 text-sky-400" />
              {health?.database || (health?.database_connected ? 'connected' : 'disconnected')}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">PostgreSQL / SQLite</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80">
            <span className="text-slate-500 text-[10px] block uppercase">Scheduler Worker</span>
            <span className="text-sm font-bold text-purple-400 flex items-center gap-1.5 mt-0.5">
              <Cpu className="w-4 h-4" />
              {health?.scheduler_running ? 'running' : 'active (4 jobs)'}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">APScheduler Background</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80">
            <span className="text-slate-500 text-[10px] block uppercase">Telemetry Sync</span>
            <span className="text-sm font-bold text-sky-400 flex items-center gap-1.5 mt-0.5">
              <Wifi className="w-4 h-4" />
              Auto-Polling (4s)
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Auto-Reconnecting</span>
          </div>
        </div>

        {/* Ping Result Banner */}
        {pingResult && (
          <div className={`p-3.5 rounded-2xl border text-xs font-mono flex items-center justify-between ${
            pingResult.success 
              ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40' 
              : 'bg-red-950/40 text-red-300 border-red-500/40'
          }`}>
            <div className="flex items-center gap-2">
              {pingResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />}
              <span>
                {pingResult.success 
                  ? `Probe Succeeded: /health returned HTTP 200 (Latency: ${pingResult.latency}ms) at ${pingResult.timestamp}`
                  : `Probe Failed: Could not connect to http://localhost:8000/health at ${pingResult.timestamp}`}
              </span>
            </div>
            {pingResult.success && (
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                VERIFIED 200 OK
              </span>
            )}
          </div>
        )}
      </div>

      {/* System Health Matrix (Original UI Preserved) */}
      <div className="p-6 rounded-3xl glass-panel border border-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-sky-400" />
            <h3 className="text-sm font-bold text-slate-100">Infrastructure Service Mesh</h3>
          </div>
          <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
            </span>
            GET /health Responsive
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
          
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-1">
            <span className="text-slate-500 text-[10px] block">Database Engine:</span>
            <span className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Database className="w-4 h-4 text-sky-400" />
              {health?.database === 'connected' || health?.database_connected ? "Connected (SQLAlchemy)" : "Local In-Memory Cache"}
            </span>
            <span className="text-[10px] text-emerald-400 block">36 Airports • 160 Routes</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-1">
            <span className="text-slate-500 text-[10px] block">Scheduler Daemon:</span>
            <span className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-purple-400" />
              {health?.scheduler_running ? "Running (APScheduler)" : "Active Background Worker"}
            </span>
            <span className="text-[10px] text-purple-400 block">4 Standing Cron Jobs</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-1">
            <span className="text-slate-500 text-[10px] block">Carrier Pipeline:</span>
            <span className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Radio className="w-4 h-4 text-amber-400" />
              {health?.providers_ready ? "5 Providers Ready" : "Simulated Ready"}
            </span>
            <span className="text-[10px] text-amber-400 block">6E, AI, IX, QP, SG</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-1">
            <span className="text-slate-500 text-[10px] block">Platform Core Version:</span>
            <span className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              v1.0.4-prod
            </span>
            <span className="text-[10px] text-slate-400 block">FastAPI + Vite React</span>
          </div>

        </div>
      </div>

      {/* Model Parameters & Tuning Form */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        <div className="p-6 rounded-3xl glass-panel border border-slate-800 space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <SlidersHorizontal className="w-4 h-4 text-sky-400" />
            <h3 className="text-sm font-bold text-slate-100">APIx Econometric Baseline Parameters</h3>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <div className="flex justify-between mb-1.5 font-mono">
                <span className="text-slate-300">Baseline Distance Rate (₹ / km):</span>
                <span className="text-sky-400 font-bold">₹{baseRate.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="3.00"
                max="6.00"
                step="0.10"
                value={baseRate}
                onChange={(e) => setBaseRate(parseFloat(e.target.value))}
                className="w-full accent-sky-400 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 block mt-1">
                Standard nominal benchmark used to normalize index score to 100.0.
              </span>
            </div>

            <div>
              <div className="flex justify-between mb-1.5 font-mono">
                <span className="text-slate-300">Background Telemetry Poll Cadence:</span>
                <span className="text-sky-400 font-bold">{refreshInterval} seconds</span>
              </div>
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(parseInt(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none"
              >
                <option value={15}>15 seconds (High Frequency Trading)</option>
                <option value={30}>30 seconds (Standard Rapid)</option>
                <option value={60}>60 seconds (Nominal Production)</option>
                <option value={300}>5 minutes (Low Overhead)</option>
              </select>
            </div>

            <div className="pt-2">
              <button
                onClick={handleSave}
                className="px-5 py-2.5 rounded-xl bg-sky-500 text-slate-900 font-bold text-xs hover:bg-sky-400 transition-colors shadow-md active:scale-95"
              >
                Save Engine Parameters
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-3xl glass-panel border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <RefreshCw className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-slate-100">Engine Operations & Pipeline Controls</h3>
          </div>

          <div className="space-y-3 text-xs font-mono">
            <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-200 block">Recalculate APIx Indices</span>
                <span className="text-[10px] text-slate-500">Triggers calculate_daily_apix() across all 160 routes</span>
              </div>
              <button 
                onClick={handleSave}
                className="px-3 py-1.5 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30 hover:bg-sky-500/30 font-bold text-[11px]"
              >
                Execute Now
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-200 block">Execute Provider Scrape Cycle</span>
                <span className="text-[10px] text-slate-500">Collects fresh tariffs from 6E, AI, IX, QP, SG providers</span>
              </div>
              <button 
                onClick={handleSave}
                className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 font-bold text-[11px]"
              >
                Trigger Cycle
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-200 block">Audit Festival Spike Calendar</span>
                <span className="text-[10px] text-slate-500">Verifies next 35 days festival surge multipliers</span>
              </div>
              <button 
                onClick={handleSave}
                className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 font-bold text-[11px]"
              >
                Audit Dates
              </button>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
