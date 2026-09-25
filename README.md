# VAYU-Index — India's Real-Time Airfare Intelligence Platform

![VAYU-Index Architecture](https://img.shields.io/badge/Platform-VAYU--Index-blue?style=for-the-badge&logo=airplane)
![Build Status](https://img.shields.io/badge/Build-Passing-brightgreen?style=for-the-badge)
![Coverage](https://img.shields.io/badge/Airports-36_Hubs-38BDF8?style=for-the-badge)
![Routes](https://img.shields.io/badge/Routes-160_Sectors-F59E0B?style=for-the-badge)
![Airlines](https://img.shields.io/badge/Airlines-5_Carriers-10B981?style=for-the-badge)

> **Real-Time Airfare Intelligence Platform for India**  
> Designed at the intersection of **Bloomberg Financial Terminal rigor**, **FlightRadar24 situational awareness**, and **Apple visual aesthetics**.

---

## ✈️ Overview

**VAYU-Index** is a startup-quality SaaS platform that benchmarks and predicts domestic airfare movements across the Republic of India. The platform computes sovereign **APIx (Airfare Price Index)** scores on a normalized 100.0 baseline across 36 airport hubs and 160 domestic corridors, modeling lead-time elasticity, festival demand surges, and carrier fleet pricing dynamics.

---

## 🎨 Design System & Aesthetics

- **Style**: Bloomberg Terminal × FlightRadar24 × Apple Design
- **Theme**: Ultra-dark glassmorphism
  - Background: `#020817`
  - Surface: `#0F172A`
  - Aviation Blue: `#2563EB`
  - Sky Blue: `#38BDF8`
  - Emerald: `#10B981`
  - Saffron Accent: `#F59E0B`
- **Typography**: Plus Jakarta Sans & JetBrains Mono
- **Visuals**: Original multi-layered SVG logo integrating the India map silhouette, ascending airplane trajectory, analytics bar graph, and radar orbit.

---

## 🚀 Key Modules & Capabilities

1. **Executive Dashboard**:
   - Real-time National APIx score ticker with status indicator.
   - Dynamic 30-day APIx trajectory chart with 7-day and 30-day moving averages.
   - Top rising corridors (surge alerts) and top bargain corridors (cooling discounts).
   - Embedded interactive Mini India radar map.
   - Lead time purchasing comparison curve (0 to 60 days).

2. **Route Explorer**:
   - High-density query engine spanning 160 domestic flight sectors.
   - Instant search by airport IATA code, city name, or route key.
   - Category filtering across **Metro**, **Business**, **North-East**, **Tourism**, and **Pilgrimage**.
   - Grid and Table view toggles with price-per-km sorting.

3. **India Geospatial Heatmap (`IndiaRouteMap.jsx`)**:
   - Full OpenStreetMap GIS canvas rendered with React Leaflet.
   - 36 pulsating airport markers with region classifications.
   - 160 domestic route vectors color-coded by fare surge intensity (Emerald <₹4.2k, Sky Blue nominal, Amber elevated, Red surge >₹8.5k).
   - Rich popups displaying Route, Carrier availability, Route APIx, Average Fare, Distance, and optimal booking window.

4. **Festival Surge Radar**:
   - Deep-dive coverage of **23 Indian Festivals** (Chhath Puja, Diwali, Durga Puja, Onam, Pongal, Holi, Ram Navami, Eid, Christmas, etc.).
   - Historical fare spike logs up to **2.30x base fare** on capacity-constrained corridors (e.g. DEL-PAT, BOM-CCU, DEL-AYJ).
   - Strategic advance purchasing recommendations (35 to 60 days lead).

5. **Airline Operator Intelligence**:
   - Profiling India's 5 primary carriers: **IndiGo (6E)**, **Air India (AI)**, **Air India Express (IX)**, **Akasa Air (QP)**, and **SpiceJet (SG)**.
   - Custom SVG vector insignias, market share progress gauges, fleet counts, on-time performance (OTP), and network average seat yields.

6. **APIx Econometric Engine**:
   - Mathematical formula standardizing tariffs against a ₹4.20/km baseline.
   - Price elasticity calculation ($\varepsilon = -0.48$).
   - Trend momentum classification: `STRONG_BULLISH`, `MODERATE_BULLISH`, `STABLE`, `MODERATE_BEARISH`, `STRONG_BEARISH`.

7. **Carrier Scraper Pipeline**:
   - Provider-based architecture with Token Bucket rate limiter, stealth session manager, exponential backoff retries, and data normalizer.

8. **Automated Background Scheduler**:
   - APScheduler cron daemon executing 4 periodic background jobs: daily fare polling, national APIx recalculation, weekly snapshots, and festival spike audits.

---

## 📁 Project Directory Structure

```
vayu-index/
├── backend/
│   ├── api/routes.py            # FastAPI REST endpoints
│   ├── database/connection.py   # PostgreSQL & SQLite engine pool
│   ├── models/models.py         # SQLAlchemy ORM schemas
│   ├── schemas/schemas.py       # Pydantic v2 schemas
│   ├── services/
│   │   ├── apix_engine.py       # Econometric APIx algorithms
│   │   ├── scheduler.py         # APScheduler background daemon
│   │   └── seed_data.py         # 36 airports, 160 routes, 4,380 fares
│   ├── utils/logger.py          # Structured logger
│   └── main.py                  # FastAPI application entrypoint
├── frontend/
│   ├── src/
│   │   ├── assets/logo/
│   │   │   └── VayuLogo.jsx     # Original SVG Logo
│   │   ├── components/
│   │   │   ├── Navbar.jsx       # Header with live ticker
│   │   │   ├── Footer.jsx       # Bloomberg x Apple footer
│   │   │   ├── StatCard.jsx     # Glassmorphic KPI cards
│   │   │   └── IndiaRouteMap.jsx # OpenStreetMap Leaflet component
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx    # Executive dashboard
│   │   │   ├── RouteExplorer.jsx# 160-route catalog
│   │   │   ├── HeatmapPage.jsx  # Full GIS map
│   │   │   ├── AnalyticsPage.jsx# Yield & elasticity modeling
│   │   │   ├── FestivalPage.jsx # 23 festival surges
│   │   │   ├── AirlinesPage.jsx # 5 carrier profiles
│   │   │   └── SettingsPage.jsx # System telemetry & weights
│   │   ├── services/api.js      # Zero-friction API client
│   │   ├── App.jsx              # Router & layout
│   │   └── index.css            # Custom CSS & Leaflet overrides
│   ├── tailwind.config.js       # Design tokens & color system
│   └── vite.config.js
├── scraper/
│   ├── core/                    # Rate limiter, retry, session manager
│   ├── monitoring/              # Scraper audit logging
│   ├── normalizers/             # Standardized fare formatters
│   ├── providers/               # 6E, AI, IX, QP, SG providers
│   ├── scheduler/               # Scrape pipeline orchestrator
│   └── storage/                 # High-performance DB ingestion
├── analytics/                   # Volatility, surge, and arbitrage engines
├── docker/                      # Multi-stage Dockerfiles
├── docs/                        # Architecture, ER diagram, and API manuals
├── tests/                       # Pytest test suite (10/10 passing)
└── docker-compose.yml           # Full-stack container orchestration
```

---

## ⚡ Quickstart Guide

### 1. Zero-Config Local Development (Single Command)

#### Start Backend:
```bash
# In the project root
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Run FastAPI backend (Auto-seeds 36 airports, 160 routes, and 4,380 fares)
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```
API Documentation available at `http://localhost:8000/docs`.

#### Start Frontend:
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

---

### 2. Full-Stack Docker Deployment
```bash
docker-compose up --build
```
- Frontend UI: `http://localhost:3000`
- FastAPI REST Engine: `http://localhost:8000`
- PostgreSQL 16: `localhost:5432`

---

## 🧪 Testing & Verification

Run the comprehensive Pytest verification suite:
```bash
PYTHONPATH=. ./venv/bin/pytest tests/
```

Results:
```
============================= test session starts ==============================
tests/test_api.py ........                                               [ 80%]
tests/test_apix_engine.py ..                                             [100%]
======================= 10 passed in 0.85s =======================
```
