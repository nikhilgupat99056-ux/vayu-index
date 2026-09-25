# VAYU-Index API Reference Manual

Base URL: `http://localhost:8000/api`  
Interactive Swagger Docs: `http://localhost:8000/docs`  
ReDoc: `http://localhost:8000/redoc`

---

## 1. System Health

### `GET /health`
Returns system health, database readiness, background worker state, and carrier pipeline status.

**Response `200 OK`**:
```json
{
  "status": "healthy",
  "database_connected": true,
  "scheduler_running": true,
  "api_healthy": true,
  "providers_ready": true,
  "version": "1.0.0",
  "timestamp": "2026-09-24T07:40:00.000000"
}
```

---

## 2. Airport Network

### `GET /api/airports`
Returns all 36 Indian commercial airports.

**Query Parameters**:
- `region` (optional): Filter by region (`North`, `South`, `East`, `West`, `North-East`, `Central`).

**Sample Response**:
```json
[
  {
    "id": 1,
    "iata": "DEL",
    "name": "Indira Gandhi International Airport",
    "city": "New Delhi",
    "state": "Delhi",
    "latitude": 28.5562,
    "longitude": 77.1000,
    "region": "North",
    "is_metro": true,
    "active": true
  }
]
```

---

## 3. Domestic Route Network

### `GET /api/routes`
Returns domestic flight corridors with live-calculated average tariffs and route APIx scores.

**Query Parameters**:
- `category` (optional): `Metro`, `Business`, `North-East`, `Tourism`, `Pilgrimage`
- `origin` (optional): e.g. `DEL`
- `destination` (optional): e.g. `BOM`

### `POST /api/routes/filter`
Full interactive multi-criteria route query engine.

**Request Body**:
```json
{
  "origin": "DEL",
  "destination": "BOM",
  "category": "Metro",
  "airline": "6E",
  "max_fare": 8000.0,
  "booking_window_days": 14,
  "sort_by": "fare_asc"
}
```

---

## 4. Airline Fleet & Performance

### `GET /api/airlines`
Returns profile cards of the 5 commercial carriers.

**Response**:
```json
[
  {
    "id": 1,
    "code": "6E",
    "name": "IndiGo",
    "full_name": "InterGlobe Aviation Limited",
    "market_share": 61.2,
    "fleet_size": 384,
    "on_time_percent": 88.6,
    "avg_fare": 4950.0,
    "routes_covered": 154,
    "color": "#0052CC",
    "trend": "EXPANDING"
  }
]
```

---

## 5. APIx Econometric Intelligence

### `GET /api/apix`
Primary executive dashboard feed containing current National APIx, 30-day index trajectory, state breakdown, and top surging/cooling sectors.

### `GET /api/apix/national`
Historical 30-day time-series of national scores and moving averages.

### `GET /api/apix/state`
State-by-state weighted APIx index scores for GIS heatmaps.

---

## 6. Festival Surge Insights

### `GET /api/festival`
Returns 23 festival calendar events with cultural descriptions, peak surge multipliers (up to 2.30x for Chhath Puja/Diwali), and 25+ specific festival surging corridors.

---

## 7. Platform Econometrics

### `GET /api/analytics`
Detailed lead-time pricing curves (0d, 3d, 7d, 14d, 30d, 60d), category yield pressure, price elasticity coefficients, and sweet-spot purchasing guidance.
