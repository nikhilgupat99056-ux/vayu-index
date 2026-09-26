import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

// Existing Pages
import Dashboard from './pages/Dashboard';
import RouteExplorer from './pages/RouteExplorer';
import HeatmapPage from './pages/HeatmapPage';
import AnalyticsPage from './pages/AnalyticsPage';
import FestivalPage from './pages/FestivalPage';
import FareSaverPage from './pages/FareSaverPage';
import AirlinesPage from './pages/AirlinesPage';
import SettingsPage from './pages/SettingsPage';

// VAYU-Index v3.0 New Pages
import AuthPage from './pages/AuthPage';
import ProfilePage from './pages/ProfilePage';
import AIAdvisorPage from './pages/AIAdvisorPage';
import BookingWindowPage from './pages/BookingWindowPage';
import NotificationsPage from './pages/NotificationsPage';

import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-slate-50 dark:bg-[#020817] text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-sky-500/20 selection:text-white transition-colors duration-200">
            {/* Persistent Header */}
            <Navbar />

            {/* Dynamic Page Router */}
            <main className="flex-1 w-full">
              <Routes>
                {/* Core Dashboards */}
                <Route path="/" element={<Dashboard />} />
                <Route path="/routes" element={<RouteExplorer />} />
                <Route path="/heatmap" element={<HeatmapPage />} />
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="/festivals" element={<FestivalPage />} />
                <Route path="/fare-saver" element={<FareSaverPage />} />
                <Route path="/airlines" element={<AirlinesPage />} />
                <Route path="/settings" element={<SettingsPage />} />

                {/* V3.0 Upgrades */}
                <Route path="/login" element={<AuthPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/ai-advisor" element={<AIAdvisorPage />} />
                <Route path="/booking" element={<BookingWindowPage />} />
                <Route path="/notifications" element={<NotificationsPage />} />

                {/* Fallback */}
                <Route path="*" element={<Dashboard />} />
              </Routes>
            </main>

            {/* Persistent Footer */}
            <Footer />
          </div>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}
