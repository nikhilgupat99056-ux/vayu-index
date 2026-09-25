import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

// Pages
import Dashboard from './pages/Dashboard';
import RouteExplorer from './pages/RouteExplorer';
import HeatmapPage from './pages/HeatmapPage';
import AnalyticsPage from './pages/AnalyticsPage';
import FestivalPage from './pages/FestivalPage';
import FareSaverPage from './pages/FareSaverPage';
import AirlinesPage from './pages/AirlinesPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-[#020817] text-slate-100 flex flex-col font-sans selection:bg-sky-500/20 selection:text-white">
        {/* Persistent Bloomberg x FlightRadar24 Style Header */}
        <Navbar />

        {/* Dynamic Page Router */}
        <main className="flex-1 w-full">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/routes" element={<RouteExplorer />} />
            <Route path="/heatmap" element={<HeatmapPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/festivals" element={<FestivalPage />} />
            <Route path="/fare-saver" element={<FareSaverPage />} />
            <Route path="/airlines" element={<AirlinesPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            {/* Fallback */}
            <Route path="*" element={<Dashboard />} />
          </Routes>
        </main>

        {/* Persistent Bloomberg x FlightRadar24 Style Footer */}
        <Footer />
      </div>
    </Router>
  );
}
