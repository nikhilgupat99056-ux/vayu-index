import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  MapContainer, 
  TileLayer, 
  Marker, 
  Popup, 
  Tooltip, 
  Polyline, 
  ScaleControl,
  useMap 
} from 'react-leaflet';
import L from 'leaflet';
import { 
  Search, 
  Compass, 
  Layers, 
  RotateCcw
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { formatAPIx, formatCurrencyINR } from '../utils/formatters';

// Fix for leaflet default icons in react
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Map View Controller for smooth animated panning and zooming to airports
function MapController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom || 6, {
        animate: true,
        duration: 0.8
      });
    }
  }, [center, zoom, map]);
  return null;
}

// Generate intermediate points for a realistic curved aviation arc (Bézier interpolation)
function generateCurvedFlightArc(start, end, curvature = 0.12, numPoints = 20) {
  const [lat1, lon1] = start;
  const [lat2, lon2] = end;

  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;
  const dist = Math.sqrt(dLat * dLat + dLon * dLon);

  if (dist < 0.5) {
    return [start, end];
  }

  const midLat = (lat1 + lat2) / 2;
  const midLon = (lon1 + lon2) / 2;

  const normLat = -dLon / dist;
  const normLon = dLat / dist;

  const controlLat = midLat + normLat * dist * curvature;
  const controlLon = midLon + normLon * dist * curvature;

  const points = [];
  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    const invT = 1 - t;
    const lat = invT * invT * lat1 + 2 * invT * t * controlLat + t * t * lat2;
    const lon = invT * invT * lon1 + 2 * invT * t * controlLon + t * t * lon2;
    points.push([lat, lon]);
  }
  return points;
}

export default function IndiaRouteMap({ 
  airports = [], 
  routes = [], 
  height = "580px",
  interactive = true,
  highlightedDestinations = [],
  focusedAirport = null
}) {
  const [selectedAirport, setSelectedAirport] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [showRoutes, setShowRoutes] = useState(true);
  const [mapCenter, setMapCenter] = useState([22.5937, 78.9629]);
  const [mapZoom, setMapZoom] = useState(5);

  // Fast coordinate lookup for 36 airports
  const airportCoords = useMemo(() => {
    const map = {};
    airports.forEach(a => {
      map[a.iata] = [a.latitude, a.longitude];
    });
    return map;
  }, [airports]);

  // Airport details map
  const airportDetails = useMemo(() => {
    const map = {};
    airports.forEach(a => {
      map[a.iata] = a;
    });
    return map;
  }, [airports]);

  // Filter routes dynamically based on search, category and selected airport
  const filteredRoutes = useMemo(() => {
    return routes.filter(r => {
      const matchCat = activeCategory === 'ALL' || r.category === activeCategory;
      
      const q = searchQuery.toLowerCase().trim();
      const origAirport = airportDetails[r.origin_iata] || {};
      const destAirport = airportDetails[r.destination_iata] || {};

      const matchSearch = !q || 
        r.origin_iata.toLowerCase().includes(q) ||
        r.destination_iata.toLowerCase().includes(q) ||
        (r.origin_city && r.origin_city.toLowerCase().includes(q)) ||
        (r.destination_city && r.destination_city.toLowerCase().includes(q)) ||
        (r.origin_name && r.origin_name.toLowerCase().includes(q)) ||
        (r.destination_name && r.destination_name.toLowerCase().includes(q)) ||
        (origAirport.name && origAirport.name.toLowerCase().includes(q)) ||
        (destAirport.name && destAirport.name.toLowerCase().includes(q)) ||
        (r.route_key && r.route_key.toLowerCase().includes(q));

      const matchSelected = !selectedAirport || 
        r.origin_iata === selectedAirport.iata || 
        r.destination_iata === selectedAirport.iata;

      return matchCat && matchSearch && matchSelected;
    });
  }, [routes, activeCategory, searchQuery, selectedAirport, airportDetails]);

  // Dynamic fare intensity classification based on APIx score:
  // - 🟢 Bargain Window → APIx below 95 (Green #10B981, thin, opacity 0.55)
  // - 🔵 Normal Baseline → APIx 95–115 (Blue #38BDF8, thin, opacity 0.55)
  // - 🟡 Elevated Demand → APIx 116–135 (Yellow #F59E0B, medium width)
  // - 🔴 Severe Surge → APIx above 135 (Red #EF4444, thick highlighted)
  const getRouteTariffTier = (apix) => {
    const val = Number(apix) || 100;
    if (val < 95) {
      return {
        tier: 'bargain',
        label: 'Bargain Window',
        color: '#10B981', // Green
        weight: 1.6,
        opacity: 0.55
      };
    }
    if (val <= 115) {
      return {
        tier: 'normal',
        label: 'Normal Baseline',
        color: '#38BDF8', // Blue
        weight: 1.6,
        opacity: 0.55
      };
    }
    if (val <= 135) {
      return {
        tier: 'elevated',
        label: 'Elevated Demand',
        color: '#F59E0B', // Yellow
        weight: 2.4,
        opacity: 0.80
      };
    }
    return {
      tier: 'surge',
      label: 'Severe Surge',
      color: '#EF4444', // Red
      weight: 3.4,
      opacity: 0.95
    };
  };

  // Dynamic legend counts computed from current filtered corridors
  const legendStats = useMemo(() => {
    let bargain = 0;
    let normal = 0;
    let elevated = 0;
    let surge = 0;

    filteredRoutes.forEach((r) => {
      const apix = Number(r.current_apix) || 100;
      if (apix < 95) bargain++;
      else if (apix <= 115) normal++;
      else if (apix <= 135) elevated++;
      else surge++;
    });

    return {
      bargain,
      normal,
      elevated,
      surge,
      total: filteredRoutes.length
    };
  }, [filteredRoutes]);

  // Reset selected airport/route when incoming routes list changes (e.g. festival switch)
  useEffect(() => {
    setSelectedAirport(null);
    setSelectedRoute(null);
  }, [routes]);

  // Auto-center map on focused airport or festival destination hubs
  useEffect(() => {
    if (focusedAirport && airportCoords[focusedAirport]) {
      setMapCenter(airportCoords[focusedAirport]);
      setMapZoom(6);
      return;
    }
    
    // Zoom and center to multi-airport festival destination region
    if (highlightedDestinations && highlightedDestinations.length > 0) {
      const validCoords = highlightedDestinations
        .map(iata => airportCoords[iata])
        .filter(Boolean);

      if (validCoords.length === 1) {
        setMapCenter(validCoords[0]);
        setMapZoom(6);
      } else if (validCoords.length > 1) {
        const lats = validCoords.map(c => c[0]);
        const lons = validCoords.map(c => c[1]);
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLon = Math.min(...lons);
        const maxLon = Math.max(...lons);
        const centerLat = (minLat + maxLat) / 2;
        const centerLon = (minLon + maxLon) / 2;

        const maxSpan = Math.max(maxLat - minLat, maxLon - minLon);
        let zoomLevel = 5.5;
        if (maxSpan > 14) zoomLevel = 4.5;
        else if (maxSpan > 7) zoomLevel = 5;
        else if (maxSpan > 3) zoomLevel = 5.5;
        else zoomLevel = 6;

        setMapCenter([centerLat, centerLon]);
        setMapZoom(zoomLevel);
      }
    }
  }, [focusedAirport, highlightedDestinations, airportCoords]);

  // Clean, professional airport marker icon with festival destination highlighting
  const createAirportIcon = (airport, isSelected) => {
    const isMetro = airport.is_metro;
    const isDestination = highlightedDestinations.includes(airport.iata);
    const baseColor = isDestination ? '#d97706' : (isSelected ? '#0284c7' : (isMetro ? '#1e3a8a' : '#1e293b'));
    const borderColor = isDestination ? '#fbbf24' : (isSelected ? '#38bdf8' : (isMetro ? '#60a5fa' : '#475569'));
    const size = isDestination ? 28 : (isSelected ? 26 : (isMetro ? 22 : 18));
    const shadow = isDestination 
      ? 'box-shadow: 0 0 16px rgba(245, 158, 11, 0.9), 0 0 28px rgba(239, 68, 68, 0.5);' 
      : 'box-shadow: 0 1px 3px rgba(0,0,0,0.5);';

    return L.divIcon({
      className: 'vayu-osm-airport-marker',
      html: `
        <div style="
          width: ${size}px;
          height: ${size}px;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: ${baseColor};
          border: ${isDestination ? '2.5px' : '1.5px'} solid ${borderColor};
          border-radius: 9999px;
          ${shadow}
          cursor: pointer;
        ">
          <span style="
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace;
            font-weight: 800;
            font-size: ${size < 20 ? '7.5px' : '8.5px'};
            color: #FFFFFF;
            letter-spacing: -0.3px;
          ">${airport.iata}</span>
        </div>
      `,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      popupAnchor: [0, -size / 2],
    });
  };

  const handleAirportSelect = (airport) => {
    setSelectedAirport(airport);
    setMapCenter([airport.latitude, airport.longitude]);
    setMapZoom(7);
  };

  const handleResetView = () => {
    setSelectedAirport(null);
    setSelectedRoute(null);
    setSearchQuery('');
    setActiveCategory('ALL');
    setMapCenter([22.5937, 78.9629]);
    setMapZoom(5);
  };

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-slate-800 bg-[#090e1a] shadow-sm">
      
      {/* Top Map Controls Overlay */}
      {interactive && (
        <div className="absolute top-3 left-3 right-3 z-[1000] flex flex-wrap items-center justify-between gap-2 pointer-events-none">
          
          {/* Airport Search Bar */}
          <div className="pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs w-full sm:w-72 shadow-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Search airports or corridors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-slate-100 placeholder-slate-500 focus:outline-none w-full text-xs font-medium"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Route Category Pills */}
          <div className="pointer-events-auto flex items-center gap-1 overflow-x-auto p-1 rounded-lg bg-slate-900 border border-slate-800 shadow-sm">
            {['ALL', 'Metro', 'Business', 'Tourism', 'Pilgrimage', 'North-East'].map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                  activeCategory === cat
                    ? 'bg-slate-800 text-sky-400 border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Reset View Button */}
          {(selectedAirport || searchQuery || activeCategory !== 'ALL') && (
            <button
              onClick={handleResetView}
              className="pointer-events-auto flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium shadow-sm transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}

        </div>
      )}

      {/* React Leaflet Map Canvas with ORIGINAL OpenStreetMap Tiles */}
      <div style={{ height }}>
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          minZoom={4}
          maxZoom={12}
          scrollWheelZoom={interactive}
          zoomControl={interactive}
          attributionControl={true}
          style={{ height: "100%", width: "100%", background: "#0b1120" }}
        >
          <MapController center={mapCenter} zoom={mapZoom} />

          {/* ORIGINAL OpenStreetMap TileLayer as required */}
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            maxZoom={19}
          />

          <ScaleControl position="bottomleft" imperial={false} />

          {/* Render 120-150 Domestic Routes dynamically without hardcoded polylines */}
          {/* Render Domestic Routes dynamically with dynamic APIx line styling */}
          {showRoutes && filteredRoutes.map((route, idx) => {
            const start = airportCoords[route.origin_iata];
            const end = airportCoords[route.destination_iata];
            if (!start || !end) return null;

            const arcPoints = generateCurvedFlightArc(start, end, 0.12, 20);
            const apixVal = Number(route.current_apix) || 100;
            const tierInfo = getRouteTariffTier(apixVal);

            const isSelected = selectedRoute && (
              (selectedRoute.origin_iata === route.origin_iata && selectedRoute.destination_iata === route.destination_iata) ||
              (selectedRoute.route_key && selectedRoute.route_key === route.route_key) ||
              (selectedRoute.id && selectedRoute.id === route.id)
            );

            // Dynamic line styling:
            // - Green & Blue -> thin opacity 0.55
            // - Yellow -> medium width
            // - Red -> thick highlighted
            // - Selected route -> glowing cyan
            const routeColor = isSelected ? '#06B6D4' : (route.color || tierInfo.color);
            const routeWeight = isSelected ? 4.2 : tierInfo.weight;
            const routeOpacity = isSelected ? 1.0 : tierInfo.opacity;

            const airlinesList = Array.isArray(route.airline_availability) 
              ? route.airline_availability.join(', ') 
              : (route.airline || route.airlines || route.airline_availability || 'IndiGo, Air India');

            const cheapestWindow = route.booking_window || route.recommended_booking_window || '25–40 Days Lead';
            const originCity = route.origin_city || airportDetails[route.origin_iata]?.city || route.origin_iata;
            const destCity = route.destination_city || airportDetails[route.destination_iata]?.city || route.destination_iata;

            return (
              <Polyline
                key={`route-${route.id || route.route_key || idx}`}
                positions={arcPoints}
                pathOptions={{
                  color: routeColor,
                  weight: routeWeight,
                  opacity: routeOpacity,
                  dashArray: isSelected ? undefined : '8, 8',
                  className: isSelected ? 'vayu-route-selected' : 'vayu-route-path vayu-festival-animated-corridor'
                }}
                eventHandlers={{
                  click: () => setSelectedRoute(route)
                }}
              >
                <Popup>
                  <div className="p-3 text-slate-100 text-xs min-w-[220px] space-y-2 bg-slate-900 rounded-lg border border-slate-800 shadow-lg">
                    
                    <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-sky-400 font-mono">
                        <span>{route.origin_iata}</span>
                        <span className="text-slate-500">➔</span>
                        <span>{route.destination_iata}</span>
                      </div>
                      <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                        {route.category}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-300">
                      <span>{originCity}</span>
                      <span className="text-slate-500 mx-1">to</span>
                      <span>{destCity}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 text-xs font-mono bg-slate-950 p-2 rounded border border-slate-800">
                      <div>
                        <span className="text-slate-500 text-[10px] block">Avg Fare:</span>
                        <span className="text-emerald-400 font-bold text-xs">
                          {formatCurrencyINR(route.current_avg_fare || route.avg_fare, '₹4,850')}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] block">APIx:</span>
                        <span className="font-bold text-xs" style={{ color: isSelected ? '#06B6D4' : tierInfo.color }}>
                          {formatAPIx(route.current_apix || route.apix, '112.40')}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] block">Distance:</span>
                        <span className="text-slate-300">{route.distance_km} km</span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] block">Flight Time:</span>
                        <span className="text-slate-300">{route.flight_time_mins} min</span>
                      </div>
                    </div>

                    <div className="space-y-0.5 text-[10px] font-mono text-slate-400">
                      <div className="flex justify-between">
                        <span>Cheapest Window:</span>
                        <span className="text-sky-300 font-medium">{cheapestWindow}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Airlines:</span>
                        <span className="text-slate-200">{airlinesList}</span>
                      </div>
                    </div>

                  </div>
                </Popup>
              </Polyline>
            );
          })}

          {/* Render 36 Indian Commercial Airport Markers */}
          {airports.map((airport) => {
            const isSelected = selectedAirport?.iata === airport.iata;
            const outboundCount = routes.filter(r => r.origin_iata === airport.iata).length;
            const inboundCount = routes.filter(r => r.destination_iata === airport.iata).length;

            return (
              <Marker
                key={airport.iata}
                position={[airport.latitude, airport.longitude]}
                icon={createAirportIcon(airport, isSelected)}
                eventHandlers={{
                  click: () => {
                    handleAirportSelect(airport);
                  },
                }}
              >
                <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>
                  <div className="font-sans text-xs p-0.5 text-slate-900">
                    <div className="font-mono font-bold text-sky-800 text-xs">
                      {airport.iata} — {airport.city}
                    </div>
                    <div className="text-[10px] text-slate-600">
                      {airport.name}
                    </div>
                    <div className="text-[9px] text-slate-500 font-mono">
                      {airport.region} Region &bull; {outboundCount + inboundCount} Routes
                    </div>
                  </div>
                </Tooltip>

                <Popup>
                  <div className="p-3 text-slate-100 text-xs min-w-[220px] space-y-2 bg-slate-900 rounded-lg border border-slate-800 shadow-lg">
                    
                    <div className="border-b border-slate-800 pb-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 font-mono">
                          <span className="font-bold text-sm text-sky-400">{airport.iata}</span>
                          <span className="text-slate-300 text-xs">&bull; {airport.city}</span>
                        </div>
                        {highlightedDestinations.includes(airport.iata) ? (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            🔥 Festival Hub
                          </span>
                        ) : (
                          <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                            airport.is_metro ? 'bg-slate-800 text-sky-400 border border-slate-700' : 'bg-slate-800 text-slate-300'
                          }`}>
                            {airport.is_metro ? 'Metro Hub' : 'Regional'}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5 truncate">
                        {airport.name}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono bg-slate-950 p-2 rounded border border-slate-800">
                      <div>
                        <span className="text-slate-500 block">State:</span>
                        <span className="text-slate-200">{airport.state}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Region:</span>
                        <span className="text-slate-200">{airport.region}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Outbound:</span>
                        <span className="text-sky-400 font-bold">{outboundCount} Corridors</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Inbound:</span>
                        <span className="text-emerald-400 font-bold">{inboundCount} Corridors</span>
                      </div>
                    </div>

                    <div className="pt-1">
                      <button
                        onClick={() => handleAirportSelect(airport)}
                        className="w-full py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-sky-400 font-medium text-xs transition-colors border border-slate-700 flex items-center justify-center gap-1.5"
                      >
                        <Compass className="w-3 h-3" />
                        <span>Filter Corridors from {airport.iata}</span>
                      </button>
                    </div>

                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {/* Dynamic Map Legend & Intensity Scale Overlay */}
      <div className="absolute bottom-3 right-3 z-[1000] p-3 rounded-xl bg-slate-900/95 border border-slate-800 text-[11px] text-slate-300 shadow-xl space-y-2 pointer-events-auto min-w-[220px] backdrop-blur-md">
        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
          <span className="font-bold text-slate-200 flex items-center gap-1.5 text-xs">
            <Layers className="w-3.5 h-3.5 text-sky-400" />
            Tariff Heatmap Legend
          </span>
          <span className="text-[10px] text-sky-400 font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700">
            {activeCategory}
          </span>
        </div>

        <div className="space-y-1.5 font-mono text-[11px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-emerald-500/20"></span>
              <span>Bargain Window</span>
            </div>
            <div className="text-right">
              <span className="text-emerald-400 font-bold">{legendStats.bargain} routes</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400 ring-2 ring-sky-500/20"></span>
              <span>Normal Baseline</span>
            </div>
            <div className="text-right">
              <span className="text-sky-400 font-bold">{legendStats.normal} routes</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-amber-500/20"></span>
              <span>Elevated Demand</span>
            </div>
            <div className="text-right">
              <span className="text-amber-400 font-bold">{legendStats.elevated} routes</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-red-500/20"></span>
              <span>Severe Surge</span>
            </div>
            <div className="text-right">
              <span className="text-red-400 font-bold">{legendStats.surge} routes</span>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between font-mono">
          <span>Total:</span>
          <span className="font-bold text-slate-100">{legendStats.total} routes</span>
        </div>
      </div>

    </div>
  );
}
