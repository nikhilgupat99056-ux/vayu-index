/**
 * VAYU-Index API Client
 * Connects to FastAPI backend with graceful fallback to localized cached data.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

export const fetchAirports = async (region = null) => {
  try {
    const url = region ? `${API_BASE_URL}/airports?region=${encodeURIComponent(region)}` : `${API_BASE_URL}/airports`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Network error fetching airports');
    return await res.json();
  } catch (err) {
    console.warn('Backend unavailable, using client fallback for airports', err);
    return FALLBACK_AIRPORTS;
  }
};

export const fetchRoutes = async (params = {}) => {
  try {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE_URL}/routes${query ? '?' + query : ''}`);
    if (!res.ok) throw new Error('Network error fetching routes');
    return await res.json();
  } catch (err) {
    console.warn('Backend unavailable, using client fallback for routes', err);
    return FALLBACK_ROUTES;
  }
};

export const filterRoutes = async (filterPayload) => {
  try {
    const res = await fetch(`${API_BASE_URL}/routes/filter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(filterPayload)
    });
    if (!res.ok) throw new Error('Network error filtering routes');
    return await res.json();
  } catch (err) {
    console.warn('Backend unavailable, falling back to local route filtering', err);
    return FALLBACK_ROUTES.filter(r => {
      if (filterPayload.origin && r.origin_iata !== filterPayload.origin) return false;
      if (filterPayload.destination && r.destination_iata !== filterPayload.destination) return false;
      if (filterPayload.category && r.category !== filterPayload.category) return false;
      return true;
    });
  }
};

export const fetchAirlines = async () => {
  try {
    const res = await fetch(`${API_BASE_URL}/airlines`);
    if (!res.ok) throw new Error('Network error fetching airlines');
    return await res.json();
  } catch (err) {
    console.warn('Backend unavailable, using client fallback for airlines', err);
    return FALLBACK_AIRLINES;
  }
};

export const fetchApixOverview = async () => {
  try {
    const res = await fetch(`${API_BASE_URL}/apix`);
    if (!res.ok) throw new Error('Network error fetching APIx overview');
    return await res.json();
  } catch (err) {
    console.warn('Backend unavailable, using client fallback for APIx overview', err);
    return FALLBACK_APIX;
  }
};

export const fetchAnalytics = async () => {
  try {
    const res = await fetch(`${API_BASE_URL}/analytics`);
    if (!res.ok) throw new Error('Network error fetching analytics');
    return await res.json();
  } catch (err) {
    console.warn('Backend unavailable, using client fallback for analytics', err);
    return FALLBACK_ANALYTICS;
  }
};

export const fetchFestivalInsights = async () => {
  try {
    const res = await fetch(`${API_BASE_URL}/festival`);
    if (!res.ok) throw new Error('Network error fetching festival insights');
    return await res.json();
  } catch (err) {
    console.warn('Backend unavailable, using client fallback for festival insights', err);
    return FALLBACK_FESTIVALS;
  }
};

export const fetchCreditCards = async () => {
  try {
    const res = await fetch(`${API_BASE_URL}/cards`);
    if (!res.ok) throw new Error('Network error fetching credit cards');
    return await res.json();
  } catch (err) {
    console.warn('Backend unavailable, using client fallback for credit cards', err);
    return [
      { id: 1, bank: 'SBI', card_name: 'SBI Cashback', card_type: 'Cashback', reward_rate: 5.0, color: '#1e3a8a' },
      { id: 2, bank: 'HDFC', card_name: 'HDFC Regalia Gold', card_type: 'Premium Travel', reward_rate: 4.0, color: '#0f766e' },
      { id: 3, bank: 'Axis', card_name: 'Axis Atlas', card_type: 'Airline Miles / Travel', reward_rate: 5.0, color: '#831843' },
      { id: 4, bank: 'ICICI', card_name: 'ICICI Coral', card_type: 'Entry Rewards', reward_rate: 2.0, color: '#c2410c' },
      { id: 5, bank: 'ICICI', card_name: 'ICICI Sapphiro', card_type: 'Luxury Travel', reward_rate: 3.5, color: '#1e1b4b' },
      { id: 6, bank: 'HDFC', card_name: 'HDFC Millennia', card_type: 'Cashback', reward_rate: 5.0, color: '#0369a1' },
      { id: 7, bank: 'Axis', card_name: 'Axis Ace', card_type: 'Cashback', reward_rate: 2.0, color: '#9f1239' },
      { id: 8, bank: 'None', card_name: 'Standard (No Card)', card_type: 'Baseline Standard', reward_rate: 0.0, color: '#475569' }
    ];
  }
};

export const fetchBankOffers = async (cardName = null, airline = null) => {
  try {
    const params = new URLSearchParams();
    if (cardName) params.append('card_name', cardName);
    if (airline) params.append('airline', airline);
    const qs = params.toString();
    const res = await fetch(`${API_BASE_URL}/offers${qs ? '?' + qs : ''}`);
    if (!res.ok) throw new Error('Network error fetching bank offers');
    return await res.json();
  } catch (err) {
    console.warn('Backend unavailable, using client fallback for bank offers', err);
    return [];
  }
};

export const calculateFareSaver = async (payload = {}) => {
  try {
    const res = await fetch(`${API_BASE_URL}/fare-saver`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Network error calculating fare saver');
    return await res.json();
  } catch (err) {
    console.warn('Backend unavailable, calculating local fare saver fallback', err);
    return { routes: [], total_routes: 0, summary: {} };
  }
};

export const fetchSavingsSummary = async () => {
  try {
    const res = await fetch(`${API_BASE_URL}/savings-summary`);
    if (!res.ok) throw new Error('Network error fetching savings summary');
    return await res.json();
  } catch (err) {
    console.warn('Backend unavailable, using client fallback for savings summary', err);
    return null;
  }
};

export const fetchHealth = async (retries = 2) => {
  const endpoints = [
    'http://localhost:8000/health',
    'http://localhost:8000/api/health',
    'http://127.0.0.1:8000/health',
    'http://127.0.0.1:8000/api/health'
  ];

  for (const url of endpoints) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const startTime = performance.now();
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });
      clearTimeout(timeoutId);
      const latency = Math.round(performance.now() - startTime);

      if (res.ok) {
        const data = await res.json();
        return {
          ...data,
          status: data.status === 'healthy' ? 'healthy' : data.status,
          database: data.database || (data.database_connected ? 'connected' : 'disconnected'),
          api: data.api || 'online',
          database_connected: data.database === 'connected' || Boolean(data.database_connected),
          api_healthy: true,
          latency_ms: latency,
          endpoint: url
        };
      }
    } catch (err) {
      // try next endpoint
    }
  }

  if (retries > 0) {
    await new Promise(r => setTimeout(r, 600));
    return fetchHealth(retries - 1);
  }

  return {
    status: 'offline',
    database: 'disconnected',
    api: 'offline',
    database_connected: false,
    scheduler_running: false,
    api_healthy: false,
    providers_ready: false,
    version: '1.0.0 (Offline Mode)'
  };
};

export const pingHealth = async () => {
  return await fetchHealth(1);
};

// ---------------- LOCAL FALLBACK DATA ----------------

export const FALLBACK_AIRPORTS = [
  { iata: "DEL", name: "Indira Gandhi International Airport", city: "New Delhi", state: "Delhi", latitude: 28.5562, longitude: 77.1000, region: "North", is_metro: true },
  { iata: "BOM", name: "Chhatrapati Shivaji Maharaj International Airport", city: "Mumbai", state: "Maharashtra", latitude: 19.0896, longitude: 72.8656, region: "West", is_metro: true },
  { iata: "CCU", name: "Netaji Subhash Chandra Bose International Airport", city: "Kolkata", state: "West Bengal", latitude: 22.6547, longitude: 88.4467, region: "East", is_metro: true },
  { iata: "BLR", name: "Kempegowda International Airport", city: "Bengaluru", state: "Karnataka", latitude: 13.1986, longitude: 77.7066, region: "South", is_metro: true },
  { iata: "HYD", name: "Rajiv Gandhi International Airport", city: "Hyderabad", state: "Telangana", latitude: 17.2403, longitude: 78.4294, region: "South", is_metro: true },
  { iata: "MAA", name: "Chennai International Airport", city: "Chennai", state: "Tamil Nadu", latitude: 12.9941, longitude: 80.1709, region: "South", is_metro: true },
  { iata: "AMD", name: "Sardar Vallabhbhai Patel International Airport", city: "Ahmedabad", state: "Gujarat", latitude: 23.0772, longitude: 72.6347, region: "West", is_metro: true },
  { iata: "GOI", name: "Dabolim / Manohar International Airport", city: "Goa", state: "Goa", latitude: 15.3800, longitude: 73.8314, region: "West", is_metro: false },
  { iata: "PNQ", name: "Pune Airport", city: "Pune", state: "Maharashtra", latitude: 18.5821, longitude: 73.9197, region: "West", is_metro: false },
  { iata: "NAG", name: "Dr. Babasaheb Ambedkar International Airport", city: "Nagpur", state: "Maharashtra", latitude: 21.0922, longitude: 79.0472, region: "Central", is_metro: false },
  { iata: "IXB", name: "Bagdogra Airport", city: "Siliguri", state: "West Bengal", latitude: 26.6812, longitude: 88.3286, region: "East", is_metro: false },
  { iata: "RDP", name: "Kazi Nazrul Islam Airport", city: "Durgapur", state: "West Bengal", latitude: 23.6231, longitude: 87.2433, region: "East", is_metro: false },
  { iata: "IXR", name: "Birsa Munda Airport", city: "Ranchi", state: "Jharkhand", latitude: 23.3143, longitude: 85.3217, region: "East", is_metro: false },
  { iata: "GAU", name: "Lokpriya Gopinath Bordoloi International Airport", city: "Guwahati", state: "Assam", latitude: 26.1061, longitude: 91.5859, region: "North-East", is_metro: false },
  { iata: "IMF", name: "Bir Tikendrajit International Airport", city: "Imphal", state: "Manipur", latitude: 24.7600, longitude: 93.8967, region: "North-East", is_metro: false },
  { iata: "LKO", name: "Chaudhary Charan Singh International Airport", city: "Lucknow", state: "Uttar Pradesh", latitude: 26.7606, longitude: 80.8893, region: "North", is_metro: false },
  { iata: "VNS", name: "Lal Bahadur Shastri International Airport", city: "Varanasi", state: "Uttar Pradesh", latitude: 25.4497, longitude: 82.8593, region: "North", is_metro: false },
  { iata: "JAI", name: "Jaipur International Airport", city: "Jaipur", state: "Rajasthan", latitude: 26.8242, longitude: 75.8122, region: "North", is_metro: false },
  { iata: "SXR", name: "Sheikh ul-Alam International Airport", city: "Srinagar", state: "Jammu and Kashmir", latitude: 34.0086, longitude: 74.7741, region: "North", is_metro: false },
  { iata: "COK", name: "Cochin International Airport", city: "Kochi", state: "Kerala", latitude: 10.1520, longitude: 76.4019, region: "South", is_metro: false },
  { iata: "PAT", name: "Jay Prakash Narayan Airport", city: "Patna", state: "Bihar", latitude: 25.5913, longitude: 85.0880, region: "East", is_metro: false },
  { iata: "AYJ", name: "Maharishi Valmiki International Airport", city: "Ayodhya", state: "Uttar Pradesh", latitude: 26.7456, longitude: 82.1558, region: "North", is_metro: false },
  { iata: "IXA", name: "Maharaja Bir Bikram Airport", city: "Agartala", state: "Tripura", latitude: 23.8870, longitude: 91.2405, region: "North-East", is_metro: false },
  { iata: "BBI", name: "Biju Patnaik International Airport", city: "Bhubaneswar", state: "Odisha", latitude: 20.2444, longitude: 85.8178, region: "East", is_metro: false },
  { iata: "VTZ", name: "Visakhapatnam International Airport", city: "Visakhapatnam", state: "Andhra Pradesh", latitude: 17.7212, longitude: 83.2245, region: "South", is_metro: false },
  { iata: "TRV", name: "Thiruvananthapuram International Airport", city: "Thiruvananthapuram", state: "Kerala", latitude: 8.4821, longitude: 76.9200, region: "South", is_metro: false },
  { iata: "IDR", name: "Devi Ahilya Bai Holkar Airport", city: "Indore", state: "Madhya Pradesh", latitude: 22.7217, longitude: 75.8011, region: "Central", is_metro: false },
  { iata: "UDR", name: "Maharana Pratap Airport", city: "Udaipur", state: "Rajasthan", latitude: 24.6177, longitude: 73.8961, region: "North", is_metro: false },
  { iata: "JDH", name: "Jodhpur Airport", city: "Jodhpur", state: "Rajasthan", latitude: 26.2514, longitude: 73.0489, region: "North", is_metro: false },
  { iata: "ATQ", name: "Sri Guru Ram Dass Jee International Airport", city: "Amritsar", state: "Punjab", latitude: 31.7096, longitude: 74.7973, region: "North", is_metro: false },
  { iata: "DED", name: "Dehradun Airport (Jolly Grant)", city: "Dehradun", state: "Uttarakhand", latitude: 30.1897, longitude: 78.1803, region: "North", is_metro: false },
  { iata: "RAJ", name: "Rajkot International Airport", city: "Rajkot", state: "Gujarat", latitude: 22.3092, longitude: 70.7794, region: "West", is_metro: false },
  { iata: "TIR", name: "Tirupati Airport", city: "Tirupati", state: "Andhra Pradesh", latitude: 13.6325, longitude: 79.5434, region: "South", is_metro: false },
  { iata: "BDQ", name: "Vadodara Airport", city: "Vadodara", state: "Gujarat", latitude: 22.3362, longitude: 73.2263, region: "West", is_metro: false },
  { iata: "IXC", name: "Shaheed Bhagat Singh International Airport", city: "Chandigarh", state: "Chandigarh", latitude: 30.6735, longitude: 76.7885, region: "North", is_metro: false },
  { iata: "CCJ", name: "Calicut International Airport", city: "Kozhikode", state: "Kerala", latitude: 11.1368, longitude: 75.9553, region: "South", is_metro: false },
];

export const FALLBACK_AIRLINES = [
  { code: "6E", name: "IndiGo", full_name: "InterGlobe Aviation Ltd", market_share: 61.2, fleet_size: 384, on_time_percent: 88.6, avg_fare: 4950, routes_covered: 154, color: "#0052CC", trend: "EXPANDING" },
  { code: "AI", name: "Air India", full_name: "Air India Limited (Tata Group)", market_share: 14.8, fleet_size: 146, on_time_percent: 82.4, avg_fare: 5720, routes_covered: 128, color: "#E01933", trend: "STABLE" },
  { code: "IX", name: "Air India Express", full_name: "Air India Express Ltd", market_share: 8.5, fleet_size: 88, on_time_percent: 84.1, avg_fare: 4680, routes_covered: 74, color: "#F37021", trend: "EXPANDING" },
  { code: "QP", name: "Akasa Air", full_name: "SNV Aviation Pvt Ltd", market_share: 5.4, fleet_size: 28, on_time_percent: 89.4, avg_fare: 4490, routes_covered: 52, color: "#FF6200", trend: "EXPANDING" },
  { code: "SG", name: "SpiceJet", full_name: "SpiceJet Limited", market_share: 3.6, fleet_size: 54, on_time_percent: 74.2, avg_fare: 4320, routes_covered: 48, color: "#E02828", trend: "OPTIMIZING" },
];

export const FALLBACK_ROUTES = [
  { id: 1, route_key: "DEL-BOM", origin_iata: "DEL", destination_iata: "BOM", origin_city: "New Delhi", destination_city: "Mumbai", origin_name: "Indira Gandhi International Airport", destination_name: "Chhatrapati Shivaji Maharaj International Airport", category: "Metro", distance_km: 1148, flight_time_mins: 130, current_avg_fare: 5850, current_apix: 121.2, airline_availability: ["6E", "AI", "IX", "QP", "SG"] },
  { id: 2, route_key: "DEL-BLR", origin_iata: "DEL", destination_iata: "BLR", origin_city: "New Delhi", destination_city: "Bengaluru", origin_name: "Indira Gandhi International Airport", destination_name: "Kempegowda International Airport", category: "Metro", distance_km: 1740, flight_time_mins: 165, current_avg_fare: 7400, current_apix: 101.4, airline_availability: ["6E", "AI", "IX", "QP", "SG"] },
  { id: 3, route_key: "BOM-BLR", origin_iata: "BOM", destination_iata: "BLR", origin_city: "Mumbai", destination_city: "Bengaluru", origin_name: "Chhatrapati Shivaji Maharaj International Airport", destination_name: "Kempegowda International Airport", category: "Metro", distance_km: 842, flight_time_mins: 105, current_avg_fare: 4650, current_apix: 131.5, airline_availability: ["6E", "AI", "IX", "QP", "SG"] },
  { id: 4, route_key: "DEL-GOI", origin_iata: "DEL", destination_iata: "GOI", origin_city: "New Delhi", destination_city: "Goa", origin_name: "Indira Gandhi International Airport", destination_name: "Dabolim / Manohar International Airport", category: "Tourism", distance_km: 1515, flight_time_mins: 150, current_avg_fare: 8900, current_apix: 139.8, airline_availability: ["6E", "AI", "IX", "QP", "SG"] },
  { id: 5, route_key: "DEL-AYJ", origin_iata: "DEL", destination_iata: "AYJ", origin_city: "New Delhi", destination_city: "Ayodhya", origin_name: "Indira Gandhi International Airport", destination_name: "Maharishi Valmiki International Airport", category: "Pilgrimage", distance_km: 570, flight_time_mins: 75, current_avg_fare: 5200, current_apix: 142.6, airline_availability: ["6E", "AI", "IX", "SG"] },
  { id: 6, route_key: "DEL-CCU", origin_iata: "DEL", destination_iata: "CCU", origin_city: "New Delhi", destination_city: "Kolkata", origin_name: "Indira Gandhi International Airport", destination_name: "Netaji Subhash Chandra Bose International Airport", category: "Metro", distance_km: 1305, flight_time_mins: 140, current_avg_fare: 6200, current_apix: 113.1, airline_availability: ["6E", "AI", "SG"] },
  { id: 7, route_key: "DEL-GAU", origin_iata: "DEL", destination_iata: "GAU", origin_city: "New Delhi", destination_city: "Guwahati", origin_name: "Indira Gandhi International Airport", destination_name: "Lokpriya Gopinath Bordoloi International Airport", category: "North-East", distance_km: 1460, flight_time_mins: 145, current_avg_fare: 6950, current_apix: 113.4, airline_availability: ["6E", "AI", "SG"] },
  { id: 8, route_key: "DEL-AMD", origin_iata: "DEL", destination_iata: "AMD", origin_city: "New Delhi", destination_city: "Ahmedabad", origin_name: "Indira Gandhi International Airport", destination_name: "Sardar Vallabhbhai Patel International Airport", category: "Business", distance_km: 775, flight_time_mins: 95, current_avg_fare: 4300, current_apix: 132.1, airline_availability: ["6E", "AI", "QP", "SG"] },
  { id: 9, route_key: "DEL-SXR", origin_iata: "DEL", destination_iata: "SXR", origin_city: "New Delhi", destination_city: "Srinagar", origin_name: "Indira Gandhi International Airport", destination_name: "Sheikh ul-Alam International Airport", category: "Tourism", distance_km: 650, flight_time_mins: 85, current_avg_fare: 6400, current_apix: 148.2, airline_availability: ["6E", "AI", "SG"] },
  { id: 10, route_key: "DEL-PAT", origin_iata: "DEL", destination_iata: "PAT", origin_city: "New Delhi", destination_city: "Patna", origin_name: "Indira Gandhi International Airport", destination_name: "Jay Prakash Narayan Airport", category: "Pilgrimage", distance_km: 850, flight_time_mins: 100, current_avg_fare: 6100, current_apix: 145.2, airline_availability: ["6E", "AI", "SG"] },
  { id: 11, route_key: "CCU-AMD", origin_iata: "CCU", destination_iata: "AMD", origin_city: "Kolkata", destination_city: "Ahmedabad", origin_name: "Netaji Subhash Chandra Bose International Airport", destination_name: "Sardar Vallabhbhai Patel International Airport", category: "Business", distance_km: 1610, flight_time_mins: 155, current_avg_fare: 6850, current_apix: 118.2, airline_availability: ["6E", "AI", "QP", "SG"] },
  { id: 12, route_key: "CCU-BDQ", origin_iata: "CCU", destination_iata: "BDQ", origin_city: "Kolkata", destination_city: "Vadodara", origin_name: "Netaji Subhash Chandra Bose International Airport", destination_name: "Vadodara Airport", category: "Business", distance_km: 1580, flight_time_mins: 150, current_avg_fare: 6700, current_apix: 116.5, airline_availability: ["6E", "AI"] },
  { id: 13, route_key: "CCU-AYJ", origin_iata: "CCU", destination_iata: "AYJ", origin_city: "Kolkata", destination_city: "Ayodhya", origin_name: "Netaji Subhash Chandra Bose International Airport", destination_name: "Maharishi Valmiki International Airport", category: "Pilgrimage", distance_km: 710, flight_time_mins: 90, current_avg_fare: 4850, current_apix: 135.2, airline_availability: ["6E", "AI", "IX"] },
  { id: 14, route_key: "CCU-GOI", origin_iata: "CCU", destination_iata: "GOI", origin_city: "Kolkata", destination_city: "Goa", origin_name: "Netaji Subhash Chandra Bose International Airport", destination_name: "Dabolim / Manohar International Airport", category: "Tourism", distance_km: 1720, flight_time_mins: 165, current_avg_fare: 8200, current_apix: 128.4, airline_availability: ["6E", "AI", "IX"] },
  { id: 15, route_key: "CCU-TRV", origin_iata: "CCU", destination_iata: "TRV", origin_city: "Kolkata", destination_city: "Thiruvananthapuram", origin_name: "Netaji Subhash Chandra Bose International Airport", destination_name: "Thiruvananthapuram International Airport", category: "Tourism", distance_km: 1980, flight_time_mins: 185, current_avg_fare: 8900, current_apix: 119.5, airline_availability: ["6E", "AI"] },
  { id: 16, route_key: "CCU-VTZ", origin_iata: "CCU", destination_iata: "VTZ", origin_city: "Kolkata", destination_city: "Visakhapatnam", origin_name: "Netaji Subhash Chandra Bose International Airport", destination_name: "Visakhapatnam International Airport", category: "Business", distance_km: 770, flight_time_mins: 85, current_avg_fare: 4400, current_apix: 124.0, airline_availability: ["6E", "AI"] },
  { id: 17, route_key: "IXB-GAU", origin_iata: "IXB", destination_iata: "GAU", origin_city: "Siliguri", destination_city: "Guwahati", origin_name: "Bagdogra Airport", destination_name: "Lokpriya Gopinath Bordoloi International Airport", category: "North-East", distance_km: 330, flight_time_mins: 55, current_avg_fare: 2950, current_apix: 128.0, airline_availability: ["6E", "AI", "SG"] },
  { id: 18, route_key: "IXB-HYD", origin_iata: "IXB", destination_iata: "HYD", origin_city: "Siliguri", destination_city: "Hyderabad", origin_name: "Bagdogra Airport", destination_name: "Rajiv Gandhi International Airport", category: "Business", distance_km: 1460, flight_time_mins: 140, current_avg_fare: 6750, current_apix: 115.0, airline_availability: ["6E", "AI"] },
  { id: 19, route_key: "IXB-BLR", origin_iata: "IXB", destination_iata: "BLR", origin_city: "Siliguri", destination_city: "Bengaluru", origin_name: "Bagdogra Airport", destination_name: "Kempegowda International Airport", category: "Business", distance_km: 1820, flight_time_mins: 175, current_avg_fare: 8400, current_apix: 122.5, airline_availability: ["6E", "AI"] },
  { id: 20, route_key: "IXB-BOM", origin_iata: "IXB", destination_iata: "BOM", origin_city: "Siliguri", destination_city: "Mumbai", origin_name: "Bagdogra Airport", destination_name: "Chhatrapati Shivaji Maharaj International Airport", category: "Business", distance_km: 1790, flight_time_mins: 170, current_avg_fare: 8100, current_apix: 124.0, airline_availability: ["6E", "AI", "SG"] },
  { id: 21, route_key: "IXB-MAA", origin_iata: "IXB", destination_iata: "MAA", origin_city: "Siliguri", destination_city: "Chennai", origin_name: "Bagdogra Airport", destination_name: "Chennai International Airport", category: "Business", distance_km: 1680, flight_time_mins: 160, current_avg_fare: 7600, current_apix: 118.0, airline_availability: ["6E", "AI"] },
  { id: 22, route_key: "IXB-IMF", origin_iata: "IXB", destination_iata: "IMF", origin_city: "Siliguri", destination_city: "Imphal", origin_name: "Bagdogra Airport", destination_name: "Bir Tikendrajit International Airport", category: "North-East", distance_km: 520, flight_time_mins: 75, current_avg_fare: 3800, current_apix: 130.0, airline_availability: ["6E", "AI"] },
  { id: 23, route_key: "AYJ-DED", origin_iata: "AYJ", destination_iata: "DED", origin_city: "Ayodhya", destination_city: "Dehradun", origin_name: "Maharishi Valmiki International Airport", destination_name: "Dehradun Airport (Jolly Grant)", category: "Pilgrimage", distance_km: 530, flight_time_mins: 70, current_avg_fare: 4100, current_apix: 138.0, airline_availability: ["6E", "AI"] },
  { id: 24, route_key: "AYJ-HYD", origin_iata: "AYJ", destination_iata: "HYD", origin_city: "Ayodhya", destination_city: "Hyderabad", origin_name: "Maharishi Valmiki International Airport", destination_name: "Rajiv Gandhi International Airport", category: "Pilgrimage", distance_km: 1080, flight_time_mins: 120, current_avg_fare: 5900, current_apix: 132.0, airline_availability: ["6E", "AI", "IX"] },
  { id: 25, route_key: "AYJ-CCU", origin_iata: "AYJ", destination_iata: "CCU", origin_city: "Ayodhya", destination_city: "Kolkata", origin_name: "Maharishi Valmiki International Airport", destination_name: "Netaji Subhash Chandra Bose International Airport", category: "Pilgrimage", distance_km: 710, flight_time_mins: 90, current_avg_fare: 4850, current_apix: 135.0, airline_availability: ["6E", "AI", "IX"] },
  { id: 26, route_key: "AYJ-DEL", origin_iata: "AYJ", destination_iata: "DEL", origin_city: "Ayodhya", destination_city: "New Delhi", origin_name: "Maharishi Valmiki International Airport", destination_name: "Indira Gandhi International Airport", category: "Pilgrimage", distance_km: 570, flight_time_mins: 75, current_avg_fare: 5200, current_apix: 142.6, airline_availability: ["6E", "AI", "IX", "SG"] },
  { id: 27, route_key: "AYJ-BOM", origin_iata: "AYJ", destination_iata: "BOM", origin_city: "Ayodhya", destination_city: "Mumbai", origin_name: "Maharishi Valmiki International Airport", destination_name: "Chhatrapati Shivaji Maharaj International Airport", category: "Pilgrimage", distance_km: 1280, flight_time_mins: 135, current_avg_fare: 6800, current_apix: 136.0, airline_availability: ["6E", "AI", "IX"] },
  { id: 28, route_key: "RDP-DEL", origin_iata: "RDP", destination_iata: "DEL", origin_city: "Durgapur", destination_city: "New Delhi", origin_name: "Kazi Nazrul Islam Airport", destination_name: "Indira Gandhi International Airport", category: "Business", distance_km: 1080, flight_time_mins: 120, current_avg_fare: 5400, current_apix: 122.0, airline_availability: ["6E", "AI", "SG"] },
  { id: 29, route_key: "RDP-BLR", origin_iata: "RDP", destination_iata: "BLR", origin_city: "Durgapur", destination_city: "Bengaluru", origin_name: "Kazi Nazrul Islam Airport", destination_name: "Kempegowda International Airport", category: "Business", distance_km: 1490, flight_time_mins: 150, current_avg_fare: 6900, current_apix: 120.0, airline_availability: ["6E", "AI"] },
  { id: 30, route_key: "RDP-HYD", origin_iata: "RDP", destination_iata: "HYD", origin_city: "Durgapur", destination_city: "Hyderabad", origin_name: "Kazi Nazrul Islam Airport", destination_name: "Rajiv Gandhi International Airport", category: "Business", distance_km: 1120, flight_time_mins: 120, current_avg_fare: 5800, current_apix: 123.0, airline_availability: ["6E", "AI"] },
  { id: 31, route_key: "RDP-MAA", origin_iata: "RDP", destination_iata: "MAA", origin_city: "Durgapur", destination_city: "Chennai", origin_name: "Kazi Nazrul Islam Airport", destination_name: "Chennai International Airport", category: "Business", distance_km: 1350, flight_time_mins: 140, current_avg_fare: 6400, current_apix: 119.0, airline_availability: ["6E", "AI"] },
  { id: 32, route_key: "RDP-BOM", origin_iata: "RDP", destination_iata: "BOM", origin_city: "Durgapur", destination_city: "Mumbai", origin_name: "Kazi Nazrul Islam Airport", destination_name: "Chhatrapati Shivaji Maharaj International Airport", category: "Business", distance_km: 1480, flight_time_mins: 150, current_avg_fare: 6950, current_apix: 121.0, airline_availability: ["6E", "AI", "SG"] },
  { id: 33, route_key: "RAJ-PNQ", origin_iata: "RAJ", destination_iata: "PNQ", origin_city: "Rajkot", destination_city: "Pune", origin_name: "Rajkot International Airport", destination_name: "Pune Airport", category: "Business", distance_km: 530, flight_time_mins: 75, current_avg_fare: 3950, current_apix: 126.0, airline_availability: ["6E", "AI"] },
  { id: 34, route_key: "RAJ-HYD", origin_iata: "RAJ", destination_iata: "HYD", origin_city: "Rajkot", destination_city: "Hyderabad", origin_name: "Rajkot International Airport", destination_name: "Rajiv Gandhi International Airport", category: "Business", distance_km: 980, flight_time_mins: 110, current_avg_fare: 5100, current_apix: 122.0, airline_availability: ["6E", "AI"] },
  { id: 35, route_key: "RAJ-BLR", origin_iata: "RAJ", destination_iata: "BLR", origin_city: "Rajkot", destination_city: "Bengaluru", origin_name: "Rajkot International Airport", destination_name: "Kempegowda International Airport", category: "Business", distance_km: 1240, flight_time_mins: 130, current_avg_fare: 6200, current_apix: 124.0, airline_availability: ["6E", "AI"] },
  { id: 36, route_key: "TIR-HYD", origin_iata: "TIR", destination_iata: "HYD", origin_city: "Tirupati", destination_city: "Hyderabad", origin_name: "Tirupati Airport", destination_name: "Rajiv Gandhi International Airport", category: "Pilgrimage", distance_km: 440, flight_time_mins: 70, current_avg_fare: 3600, current_apix: 132.0, airline_availability: ["6E", "AI"] },
  { id: 37, route_key: "TIR-DEL", origin_iata: "TIR", destination_iata: "DEL", origin_city: "Tirupati", destination_city: "New Delhi", origin_name: "Tirupati Airport", destination_name: "Indira Gandhi International Airport", category: "Pilgrimage", distance_km: 1690, flight_time_mins: 165, current_avg_fare: 7900, current_apix: 126.0, airline_availability: ["6E", "AI"] },
  { id: 38, route_key: "TIR-BOM", origin_iata: "TIR", destination_iata: "BOM", origin_city: "Tirupati", destination_city: "Mumbai", origin_name: "Tirupati Airport", destination_name: "Chhatrapati Shivaji Maharaj International Airport", category: "Pilgrimage", distance_km: 950, flight_time_mins: 105, current_avg_fare: 5400, current_apix: 130.0, airline_availability: ["6E", "AI"] },
  { id: 39, route_key: "IXR-LKO", origin_iata: "IXR", destination_iata: "LKO", origin_city: "Ranchi", destination_city: "Lucknow", origin_name: "Birsa Munda Airport", destination_name: "Chaudhary Charan Singh International Airport", category: "Business", distance_km: 620, flight_time_mins: 80, current_avg_fare: 4300, current_apix: 125.0, airline_availability: ["6E", "AI"] },
  { id: 40, route_key: "IXR-CCU", origin_iata: "IXR", destination_iata: "CCU", origin_city: "Ranchi", destination_city: "Kolkata", origin_name: "Birsa Munda Airport", destination_name: "Netaji Subhash Chandra Bose International Airport", category: "Business", distance_km: 330, flight_time_mins: 55, current_avg_fare: 2800, current_apix: 122.0, airline_availability: ["6E", "AI", "IX"] },
  { id: 41, route_key: "IXR-DEL", origin_iata: "IXR", destination_iata: "DEL", origin_city: "Ranchi", destination_city: "New Delhi", origin_name: "Birsa Munda Airport", destination_name: "Indira Gandhi International Airport", category: "Business", distance_km: 990, flight_time_mins: 115, current_avg_fare: 5200, current_apix: 126.0, airline_availability: ["6E", "AI", "SG"] },
  { id: 42, route_key: "IXR-BOM", origin_iata: "IXR", destination_iata: "BOM", origin_city: "Ranchi", destination_city: "Mumbai", origin_name: "Birsa Munda Airport", destination_name: "Chhatrapati Shivaji Maharaj International Airport", category: "Business", distance_km: 1370, flight_time_mins: 140, current_avg_fare: 6600, current_apix: 122.0, airline_availability: ["6E", "AI"] },
  { id: 43, route_key: "IXR-PAT", origin_iata: "IXR", destination_iata: "PAT", origin_city: "Ranchi", destination_city: "Patna", origin_name: "Birsa Munda Airport", destination_name: "Jay Prakash Narayan Airport", category: "Business", distance_km: 260, flight_time_mins: 50, current_avg_fare: 2600, current_apix: 124.0, airline_availability: ["6E", "AI"] },
  { id: 44, route_key: "IXR-PNQ", origin_iata: "IXR", destination_iata: "PNQ", origin_city: "Ranchi", destination_city: "Pune", origin_name: "Birsa Munda Airport", destination_name: "Pune Airport", category: "Business", distance_km: 1290, flight_time_mins: 135, current_avg_fare: 6400, current_apix: 123.0, airline_availability: ["6E", "AI"] },
  { id: 45, route_key: "DED-DEL", origin_iata: "DED", destination_iata: "DEL", origin_city: "Dehradun", destination_city: "New Delhi", origin_name: "Dehradun Airport (Jolly Grant)", destination_name: "Indira Gandhi International Airport", category: "Tourism", distance_km: 210, flight_time_mins: 50, current_avg_fare: 2800, current_apix: 134.0, airline_availability: ["6E", "AI"] },
  { id: 46, route_key: "DED-AMD", origin_iata: "DED", destination_iata: "AMD", origin_city: "Dehradun", destination_city: "Ahmedabad", origin_name: "Dehradun Airport (Jolly Grant)", destination_name: "Sardar Vallabhbhai Patel International Airport", category: "Tourism", distance_km: 920, flight_time_mins: 105, current_avg_fare: 4900, current_apix: 127.0, airline_availability: ["6E", "AI"] },
  { id: 47, route_key: "DED-BOM", origin_iata: "DED", destination_iata: "BOM", origin_city: "Dehradun", destination_city: "Mumbai", origin_name: "Dehradun Airport (Jolly Grant)", destination_name: "Chhatrapati Shivaji Maharaj International Airport", category: "Tourism", distance_km: 1350, flight_time_mins: 140, current_avg_fare: 6700, current_apix: 125.0, airline_availability: ["6E", "AI"] },
  { id: 48, route_key: "DED-VNS", origin_iata: "DED", destination_iata: "VNS", origin_city: "Dehradun", destination_city: "Varanasi", origin_name: "Dehradun Airport (Jolly Grant)", destination_name: "Lal Bahadur Shastri International Airport", category: "Pilgrimage", distance_km: 720, flight_time_mins: 90, current_avg_fare: 4500, current_apix: 132.0, airline_availability: ["6E", "AI"] },
  { id: 49, route_key: "DED-SXR", origin_iata: "DED", destination_iata: "SXR", origin_city: "Dehradun", destination_city: "Srinagar", origin_name: "Dehradun Airport (Jolly Grant)", destination_name: "Sheikh ul-Alam International Airport", category: "Tourism", distance_km: 470, flight_time_mins: 70, current_avg_fare: 4200, current_apix: 136.0, airline_availability: ["6E", "AI"] },
  { id: 50, route_key: "VTZ-CCU", origin_iata: "VTZ", destination_iata: "CCU", origin_city: "Visakhapatnam", destination_city: "Kolkata", origin_name: "Visakhapatnam International Airport", destination_name: "Netaji Subhash Chandra Bose International Airport", category: "Business", distance_km: 770, flight_time_mins: 85, current_avg_fare: 4400, current_apix: 124.0, airline_availability: ["6E", "AI"] },
  { id: 51, route_key: "VTZ-HYD", origin_iata: "VTZ", destination_iata: "HYD", origin_city: "Visakhapatnam", destination_city: "Hyderabad", origin_name: "Visakhapatnam International Airport", destination_name: "Rajiv Gandhi International Airport", category: "Business", distance_km: 510, flight_time_mins: 75, current_avg_fare: 3500, current_apix: 128.0, airline_availability: ["6E", "AI"] },
  { id: 52, route_key: "VTZ-DEL", origin_iata: "VTZ", destination_iata: "DEL", origin_city: "Visakhapatnam", destination_city: "New Delhi", origin_name: "Visakhapatnam International Airport", destination_name: "Indira Gandhi International Airport", category: "Business", distance_km: 1370, flight_time_mins: 140, current_avg_fare: 6600, current_apix: 122.0, airline_availability: ["6E", "AI"] },
  { id: 53, route_key: "SXR-BOM", origin_iata: "SXR", destination_iata: "BOM", origin_city: "Srinagar", destination_city: "Mumbai", origin_name: "Sheikh ul-Alam International Airport", destination_name: "Chhatrapati Shivaji Maharaj International Airport", category: "Tourism", distance_km: 1680, flight_time_mins: 170, current_avg_fare: 8600, current_apix: 136.0, airline_availability: ["6E", "AI", "SG"] },
  { id: 54, route_key: "SXR-AMD", origin_iata: "SXR", destination_iata: "AMD", origin_city: "Srinagar", destination_city: "Ahmedabad", origin_name: "Sheikh ul-Alam International Airport", destination_name: "Sardar Vallabhbhai Patel International Airport", category: "Tourism", distance_km: 1310, flight_time_mins: 135, current_avg_fare: 7200, current_apix: 131.0, airline_availability: ["6E", "AI"] },
  { id: 55, route_key: "SXR-CCU", origin_iata: "SXR", destination_iata: "CCU", origin_city: "Srinagar", destination_city: "Kolkata", origin_name: "Sheikh ul-Alam International Airport", destination_name: "Netaji Subhash Chandra Bose International Airport", category: "Tourism", distance_km: 1830, flight_time_mins: 180, current_avg_fare: 9100, current_apix: 134.0, airline_availability: ["6E", "AI"] },
  { id: 56, route_key: "SXR-DEL", origin_iata: "SXR", destination_iata: "DEL", origin_city: "Srinagar", destination_city: "New Delhi", origin_name: "Sheikh ul-Alam International Airport", destination_name: "Indira Gandhi International Airport", category: "Tourism", distance_km: 650, flight_time_mins: 85, current_avg_fare: 6400, current_apix: 148.2, airline_availability: ["6E", "AI", "SG"] },
  { id: 57, route_key: "SXR-IXC", origin_iata: "SXR", destination_iata: "IXC", origin_city: "Srinagar", destination_city: "Chandigarh", origin_name: "Sheikh ul-Alam International Airport", destination_name: "Shaheed Bhagat Singh International Airport", category: "Tourism", distance_km: 440, flight_time_mins: 65, current_avg_fare: 4400, current_apix: 138.0, airline_availability: ["6E", "AI"] },
  { id: 58, route_key: "IXC-BLR", origin_iata: "IXC", destination_iata: "BLR", origin_city: "Chandigarh", destination_city: "Bengaluru", origin_name: "Shaheed Bhagat Singh International Airport", destination_name: "Kempegowda International Airport", category: "Business", distance_km: 1980, flight_time_mins: 185, current_avg_fare: 8700, current_apix: 119.0, airline_availability: ["6E", "AI"] },
  { id: 59, route_key: "IXC-PNQ", origin_iata: "IXC", destination_iata: "PNQ", origin_city: "Chandigarh", destination_city: "Pune", origin_name: "Shaheed Bhagat Singh International Airport", destination_name: "Pune Airport", category: "Business", distance_km: 1410, flight_time_mins: 145, current_avg_fare: 6700, current_apix: 122.0, airline_availability: ["6E", "AI"] },
  { id: 60, route_key: "IXC-MAA", origin_iata: "IXC", destination_iata: "MAA", origin_city: "Chandigarh", destination_city: "Chennai", origin_name: "Shaheed Bhagat Singh International Airport", destination_name: "Chennai International Airport", category: "Business", distance_km: 2010, flight_time_mins: 190, current_avg_fare: 8900, current_apix: 118.0, airline_availability: ["6E", "AI"] },
  { id: 61, route_key: "IXC-JAI", origin_iata: "IXC", destination_iata: "JAI", origin_city: "Chandigarh", destination_city: "Jaipur", origin_name: "Shaheed Bhagat Singh International Airport", destination_name: "Jaipur International Airport", category: "Tourism", distance_km: 470, flight_time_mins: 65, current_avg_fare: 3600, current_apix: 126.0, airline_availability: ["6E", "AI"] },
  { id: 62, route_key: "IXC-SXR", origin_iata: "IXC", destination_iata: "SXR", origin_city: "Chandigarh", destination_city: "Srinagar", origin_name: "Shaheed Bhagat Singh International Airport", destination_name: "Sheikh ul-Alam International Airport", category: "Tourism", distance_km: 440, flight_time_mins: 65, current_avg_fare: 4400, current_apix: 138.0, airline_availability: ["6E", "AI"] },
  { id: 63, route_key: "IXA-IMF", origin_iata: "IXA", destination_iata: "IMF", origin_city: "Agartala", destination_city: "Imphal", origin_name: "Maharaja Bir Bikram Airport", destination_name: "Bir Tikendrajit International Airport", category: "North-East", distance_km: 180, flight_time_mins: 45, current_avg_fare: 2400, current_apix: 132.0, airline_availability: ["6E", "AI"] },
  { id: 64, route_key: "IXA-CCU", origin_iata: "IXA", destination_iata: "CCU", origin_city: "Agartala", destination_city: "Kolkata", origin_name: "Maharaja Bir Bikram Airport", destination_name: "Netaji Subhash Chandra Bose International Airport", category: "North-East", distance_km: 330, flight_time_mins: 55, current_avg_fare: 3100, current_apix: 136.0, airline_availability: ["6E", "AI", "SG"] },
  { id: 65, route_key: "IXA-IXB", origin_iata: "IXA", destination_iata: "IXB", origin_city: "Agartala", destination_city: "Siliguri", origin_name: "Maharaja Bir Bikram Airport", destination_name: "Bagdogra Airport", category: "North-East", distance_km: 460, flight_time_mins: 65, current_avg_fare: 3700, current_apix: 129.0, airline_availability: ["6E", "AI"] },
  { id: 66, route_key: "IXA-DEL", origin_iata: "IXA", destination_iata: "DEL", origin_city: "Agartala", destination_city: "New Delhi", origin_name: "Maharaja Bir Bikram Airport", destination_name: "Indira Gandhi International Airport", category: "North-East", distance_km: 1510, flight_time_mins: 150, current_avg_fare: 7100, current_apix: 123.0, airline_availability: ["6E", "AI"] },
  { id: 67, route_key: "IXA-BLR", origin_iata: "IXA", destination_iata: "BLR", origin_city: "Agartala", destination_city: "Bengaluru", origin_name: "Maharaja Bir Bikram Airport", destination_name: "Kempegowda International Airport", category: "North-East", distance_km: 2040, flight_time_mins: 190, current_avg_fare: 9200, current_apix: 120.0, airline_availability: ["6E", "AI"] },
  { id: 68, route_key: "IXA-GAU", origin_iata: "IXA", destination_iata: "GAU", origin_city: "Agartala", destination_city: "Guwahati", origin_name: "Maharaja Bir Bikram Airport", destination_name: "Lokpriya Gopinath Bordoloi International Airport", category: "North-East", distance_km: 250, flight_time_mins: 50, current_avg_fare: 2700, current_apix: 130.0, airline_availability: ["6E", "AI"] }
];

export const FALLBACK_APIX = {
  national_apix: 114.8,
  national_avg_fare: 5480,
  moving_avg_7d: 113.2,
  moving_avg_30d: 111.4,
  trend_classification: "MODERATE_BULLISH",
  elasticity: -0.48,
  airports_monitored: 36,
  routes_tracked: 160,
  airlines_monitored: 5,
  cheapest_booking_window: "30-45 Days Out (Avg ₹3,840)",
  history: [
    { calculation_date: "2026-09-01", apix_score: 108.4, avg_fare: 5210 },
    { calculation_date: "2026-09-05", apix_score: 109.8, avg_fare: 5280 },
    { calculation_date: "2026-09-10", apix_score: 111.2, avg_fare: 5350 },
    { calculation_date: "2026-09-15", apix_score: 112.9, avg_fare: 5410 },
    { calculation_date: "2026-09-20", apix_score: 113.8, avg_fare: 5440 },
    { calculation_date: "2026-09-24", apix_score: 114.8, avg_fare: 5480 },
  ],
  state_apix: [
    { entity_key: "Jammu and Kashmir", apix_score: 142.0, avg_fare: 7450, trend_classification: "STRONG_BULLISH" },
    { entity_key: "Bihar", apix_score: 138.5, avg_fare: 7150, trend_classification: "STRONG_BULLISH" },
    { entity_key: "Goa", apix_score: 134.2, avg_fare: 6850, trend_classification: "STRONG_BULLISH" },
    { entity_key: "Assam", apix_score: 128.0, avg_fare: 6420, trend_classification: "STRONG_BULLISH" },
    { entity_key: "West Bengal", apix_score: 126.4, avg_fare: 6240, trend_classification: "STRONG_BULLISH" },
    { entity_key: "Uttar Pradesh", apix_score: 122.1, avg_fare: 5890, trend_classification: "MODERATE_BULLISH" },
    { entity_key: "Maharashtra", apix_score: 118.2, avg_fare: 5950, trend_classification: "MODERATE_BULLISH" },
    { entity_key: "Kerala", apix_score: 119.5, avg_fare: 6100, trend_classification: "MODERATE_BULLISH" },
    { entity_key: "Delhi", apix_score: 115.4, avg_fare: 5780, trend_classification: "MODERATE_BULLISH" },
    { entity_key: "Karnataka", apix_score: 112.8, avg_fare: 5450, trend_classification: "STABLE" },
    { entity_key: "Telangana", apix_score: 110.2, avg_fare: 5320, trend_classification: "STABLE" },
    { entity_key: "Tamil Nadu", apix_score: 108.5, avg_fare: 5120, trend_classification: "STABLE" },
    { entity_key: "Gujarat", apix_score: 106.8, avg_fare: 4980, trend_classification: "MODERATE_BEARISH" },
  ],
  top_rising_routes: [
    { route_id: 9, route_key: "DEL-SXR", origin_city: "New Delhi", destination_city: "Srinagar", category: "Tourism", apix_score: 148.2, avg_fare: 6400, change_pct: 48.2, trend: "SURGE" },
    { route_id: 10, route_key: "DEL-PAT", origin_city: "New Delhi", destination_city: "Patna", category: "Pilgrimage", apix_score: 145.2, avg_fare: 6100, change_pct: 45.2, trend: "SURGE" },
    { route_id: 5, route_key: "DEL-AYJ", origin_city: "New Delhi", destination_city: "Ayodhya", category: "Pilgrimage", apix_score: 142.6, avg_fare: 5200, change_pct: 42.6, trend: "SURGE" },
    { route_id: 4, route_key: "DEL-GOI", origin_city: "New Delhi", destination_city: "Goa", category: "Tourism", apix_score: 139.8, avg_fare: 8900, change_pct: 39.8, trend: "SURGE" },
    { route_id: 11, route_key: "BOM-GOI", origin_city: "Mumbai", destination_city: "Goa", category: "Tourism", apix_score: 138.4, avg_fare: 3850, change_pct: 38.4, trend: "SURGE" }
  ],
  top_falling_routes: [
    { route_id: 8, route_key: "DEL-AMD", origin_city: "New Delhi", destination_city: "Ahmedabad", category: "Business", apix_score: 94.2, avg_fare: 3100, change_pct: -5.8, trend: "COOL" },
    { route_id: 2, route_key: "DEL-BLR", origin_city: "New Delhi", destination_city: "Bengaluru", category: "Metro", apix_score: 101.4, avg_fare: 7400, change_pct: 1.4, trend: "NORMAL" },
    { route_id: 6, route_key: "DEL-CCU", origin_city: "New Delhi", destination_city: "Kolkata", category: "Metro", apix_score: 104.5, avg_fare: 5800, change_pct: 4.5, trend: "NORMAL" }
  ]
};

export const FALLBACK_ANALYTICS = {
  booking_window_comparison: [
    { window_days: 0, label: "0-1 Days", avg_fare: 10850, multiplier: 2.47 },
    { window_days: 3, label: "2-4 Days", avg_fare: 8250, multiplier: 1.88 },
    { window_days: 7, label: "5-7 Days", avg_fare: 6450, multiplier: 1.47 },
    { window_days: 14, label: "8-14 Days", avg_fare: 5350, multiplier: 1.22 },
    { window_days: 30, label: "15-30 Days", avg_fare: 4400, multiplier: 1.00 },
    { window_days: 60, label: "31-60 Days", avg_fare: 3890, multiplier: 0.88 }
  ],
  airline_analytics: [
    { code: "6E", name: "IndiGo", market_share: 61.2, fleet_size: 384, on_time_percent: 88.6, avg_fare: 4950, color: "#0052CC" },
    { code: "AI", name: "Air India", market_share: 14.8, fleet_size: 146, on_time_percent: 82.4, avg_fare: 5720, color: "#E01933" },
    { code: "IX", name: "Air India Express", market_share: 8.5, fleet_size: 88, on_time_percent: 84.1, avg_fare: 4680, color: "#F37021" },
    { code: "QP", name: "Akasa Air", market_share: 5.4, fleet_size: 28, on_time_percent: 89.4, avg_fare: 4490, color: "#FF6200" },
    { code: "SG", name: "SpiceJet", market_share: 3.6, fleet_size: 54, on_time_percent: 74.2, avg_fare: 4320, color: "#E02828" }
  ],
  category_analytics: [
    { category: "Metro", route_count: 26, avg_fare: 5950, category_apix: 114.2 },
    { category: "Business", route_count: 28, avg_fare: 4890, category_apix: 108.5 },
    { category: "Tourism", route_count: 34, avg_fare: 6850, category_apix: 136.4 },
    { category: "Pilgrimage", route_count: 42, avg_fare: 6240, category_apix: 132.8 },
    { category: "North-East", route_count: 22, avg_fare: 6720, category_apix: 118.6 }
  ],
  summary: {
    total_airports: 36,
    total_routes: 160,
    total_fares_sampled: 4380,
    cheapest_window_days: 30,
    sweet_spot_advice: "Book between 25 and 45 days in advance for lowest guaranteed fares.",
    elasticity_coefficient: -0.48
  }
};

export const FALLBACK_FESTIVALS = {
  total_festivals: 23,
  overall_surge_factor: 1.68,
  festivals: [
    { id: 1, name: "Makar Sankranti & Kite Festival", slug: "makar-sankranti", start_date: "2026-01-13", end_date: "2026-01-16", region_focus: "Gujarat & Western India", surge_factor: 1.45, description: "Massive demand surge into Ahmedabad, Surat and Jaipur for the International Kite Festival." },
    { id: 2, name: "Pongal Harvest Festival", slug: "pongal", start_date: "2026-01-14", end_date: "2026-01-18", region_focus: "Tamil Nadu & South India", surge_factor: 1.52, description: "Peak outbound and inbound travel from Bengaluru, Mumbai and Delhi into Chennai and Madurai." },
    { id: 3, name: "Holi Festival of Colors", slug: "holi", start_date: "2026-03-02", end_date: "2026-03-05", region_focus: "North & Central India", surge_factor: 1.74, description: "Severe price escalation from Mumbai, Bengaluru to Delhi, Patna, Lucknow, Varanasi." },
    { id: 4, name: "Ram Navami", slug: "ram-navami", start_date: "2026-03-26", end_date: "2026-03-29", region_focus: "Ayodhya & North India", surge_factor: 1.82, description: "Extreme demand spike into Ayodhya (AYJ), Varanasi (VNS), and Lucknow." },
    { id: 5, name: "Ganesh Chaturthi", slug: "ganesh-chaturthi", start_date: "2026-09-14", end_date: "2026-09-24", region_focus: "Maharashtra & Goa", surge_factor: 1.65, description: "Intense inbound travel to Mumbai (BOM) and Pune (PNQ) from across all metros." },
    { id: 6, name: "Onam Harvest Festival", slug: "onam", start_date: "2026-09-22", end_date: "2026-09-27", region_focus: "Kerala & GCC Transit", surge_factor: 1.78, description: "Kerala's biggest homecoming surge into Kochi (COK), Thiruvananthapuram, Kozhikode." },
    { id: 7, name: "Durga Puja & Navratri", slug: "durga-puja", start_date: "2026-10-17", end_date: "2026-10-23", region_focus: "West Bengal & Gujarat", surge_factor: 1.86, description: "Highest annual airfare surge into Kolkata (CCU) and Ahmedabad (AMD)." },
    { id: 8, name: "Diwali (Festival of Lights)", slug: "diwali", start_date: "2026-11-06", end_date: "2026-11-12", region_focus: "Pan-India", surge_factor: 2.15, description: "The single highest domestic travel peak in India. Pre-Diwali inbound fares hit historic ceilings." },
    { id: 9, name: "Chhath Puja Mahaparv", slug: "chhath-puja", start_date: "2026-11-14", end_date: "2026-11-18", region_focus: "Bihar, Eastern UP, Jharkhand", surge_factor: 2.30, description: "Most extreme supply-constrained route surges in India into Patna (PAT), Ranchi, Varanasi." },
    { id: 10, name: "Christmas Holidays", slug: "christmas", start_date: "2026-12-22", end_date: "2026-12-27", region_focus: "Goa, Kerala, North-East", surge_factor: 1.95, description: "Peak season holiday rush into Goa (GOI), Kochi (COK), and Guwahati." },
    { id: 11, name: "New Year Eve & Winter Surge", slug: "new-year", start_date: "2026-12-28", end_date: "2027-01-03", region_focus: "Goa, Rajasthan, Kashmir", surge_factor: 2.25, description: "Annual peak tourism fares into Goa, Udaipur, Jodhpur, and Srinagar." }
  ],
  top_surge_routes: [
    { id: 1, festival_name: "Chhath Puja Mahaparv", route_key: "DEL-PAT", origin_city: "New Delhi", destination_city: "Patna", avg_surge_pct: 125.0, historical_fare_spike: 18500, peak_days_before: 2, recommended_booking_window: "45-60 days" },
    { id: 2, festival_name: "Chhath Puja Mahaparv", route_key: "BOM-PAT", origin_city: "Mumbai", destination_city: "Patna", avg_surge_pct: 132.0, historical_fare_spike: 21000, peak_days_before: 3, recommended_booking_window: "45-60 days" },
    { id: 3, festival_name: "New Year Eve", route_key: "DEL-GOI", origin_city: "New Delhi", destination_city: "Goa", avg_surge_pct: 135.0, historical_fare_spike: 23500, peak_days_before: 4, recommended_booking_window: "45-75 days" },
    { id: 4, festival_name: "Durga Puja & Navratri", route_key: "BOM-CCU", origin_city: "Mumbai", destination_city: "Kolkata", avg_surge_pct: 94.0, historical_fare_spike: 16200, peak_days_before: 4, recommended_booking_window: "30-50 days" },
    { id: 5, festival_name: "Durga Puja & Navratri", route_key: "DEL-CCU", origin_city: "New Delhi", destination_city: "Kolkata", avg_surge_pct: 88.0, historical_fare_spike: 14500, peak_days_before: 3, recommended_booking_window: "28-45 days" },
    { id: 6, festival_name: "Diwali (Festival of Lights)", route_key: "BLR-DEL", origin_city: "Bengaluru", destination_city: "New Delhi", avg_surge_pct: 82.0, historical_fare_spike: 14200, peak_days_before: 2, recommended_booking_window: "25-40 days" },
    { id: 7, festival_name: "Ram Navami", route_key: "BOM-AYJ", origin_city: "Mumbai", destination_city: "Ayodhya", avg_surge_pct: 118.0, historical_fare_spike: 16800, peak_days_before: 3, recommended_booking_window: "30-45 days" },
    { id: 8, festival_name: "Onam Harvest Festival", route_key: "DEL-COK", origin_city: "New Delhi", destination_city: "Kochi", avg_surge_pct: 90.0, historical_fare_spike: 17500, peak_days_before: 3, recommended_booking_window: "30-45 days" }
  ],
  surge_timeline_insights: {
    peak_festivals: ["Chhath Puja (2.3x)", "New Year Eve (2.25x)", "Diwali (2.15x)", "Durga Puja (1.86x)"],
    recommended_advance_booking: "Book 35 to 60 days before festive dates to avoid 100%+ price jumps."
  }
};
