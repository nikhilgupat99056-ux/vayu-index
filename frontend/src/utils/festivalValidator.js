/**
 * VAYU-Index Festival Route Validator & Geographical Corridors Utility
 * Ensures 100% geographically accurate festival corridors.
 * Eliminates incorrect route generation and enforces state-level validation.
 */

export const AIRPORT_STATE_MAP = {
  // Tamil Nadu
  MAA: 'Tamil Nadu',
  TRZ: 'Tamil Nadu',
  IXM: 'Tamil Nadu',
  CJB: 'Tamil Nadu',

  // West Bengal
  CCU: 'West Bengal',
  IXB: 'West Bengal',
  RDP: 'West Bengal',

  // Bihar
  PAT: 'Bihar',
  GAY: 'Bihar',

  // Uttar Pradesh
  VNS: 'Uttar Pradesh',
  LKO: 'Uttar Pradesh',
  AYJ: 'Uttar Pradesh',

  // Jharkhand
  IXR: 'Jharkhand',

  // Delhi
  DEL: 'Delhi',

  // Rajasthan
  JAI: 'Rajasthan',
  JDH: 'Rajasthan',
  UDR: 'Rajasthan',

  // Gujarat
  AMD: 'Gujarat',
  BDQ: 'Gujarat',
  RAJ: 'Gujarat',

  // Kerala
  COK: 'Kerala',
  TRV: 'Kerala',
  CCJ: 'Kerala',

  // Goa
  GOI: 'Goa',

  // Maharashtra
  BOM: 'Maharashtra',
  PNQ: 'Maharashtra',
  NAG: 'Maharashtra',

  // Karnataka
  BLR: 'Karnataka',

  // Telangana & Andhra Pradesh
  HYD: 'Telangana',
  VTZ: 'Andhra Pradesh',
  TIR: 'Andhra Pradesh',

  // Odisha
  BBI: 'Odisha',

  // Punjab & Chandigarh
  ATQ: 'Punjab',
  IXC: 'Chandigarh',

  // Uttarakhand
  DED: 'Uttarakhand',

  // Jammu and Kashmir
  SXR: 'Jammu and Kashmir',

  // Madhya Pradesh
  IDR: 'Madhya Pradesh',
  JLR: 'Madhya Pradesh',

  // North-East
  GAU: 'Assam',
  IXA: 'Tripura',
  IMF: 'Manipur'
};

export const AIRPORT_CITY_MAP = {
  MAA: 'Chennai',
  TRZ: 'Tiruchirappalli',
  IXM: 'Madurai',
  CCU: 'Kolkata',
  PAT: 'Patna',
  GAY: 'Gaya',
  VNS: 'Varanasi',
  IXR: 'Ranchi',
  DEL: 'New Delhi',
  LKO: 'Lucknow',
  JAI: 'Jaipur',
  AMD: 'Ahmedabad',
  COK: 'Kochi',
  TRV: 'Thiruvananthapuram',
  GOI: 'Goa',
  AYJ: 'Ayodhya',
  BOM: 'Mumbai',
  PNQ: 'Pune',
  BLR: 'Bengaluru',
  HYD: 'Hyderabad',
  VTZ: 'Visakhapatnam',
  TIR: 'Tirupati',
  BBI: 'Bhubaneswar',
  ATQ: 'Amritsar',
  IXC: 'Chandigarh',
  DED: 'Dehradun',
  SXR: 'Srinagar',
  IDR: 'Indore',
  GAU: 'Guwahati',
  IXA: 'Agartala',
  IMF: 'Imphal',
  IXB: 'Siliguri/Bagdogra',
  RDP: 'Durgapur',
  BDQ: 'Vadodara',
  RAJ: 'Rajkot',
  JDH: 'Jodhpur',
  UDR: 'Udaipur',
  CCJ: 'Kozhikode'
};

export const AIRPORT_COORDS = {
  MAA: [12.9941, 80.1709],
  TRZ: [10.7654, 78.7097],
  IXM: [9.8345, 78.0934],
  CCU: [22.6547, 88.4467],
  PAT: [25.5913, 85.0880],
  GAY: [24.7443, 84.9512],
  VNS: [25.4524, 82.8593],
  IXR: [23.3143, 85.3217],
  DEL: [28.5562, 77.1000],
  LKO: [26.7606, 80.8893],
  JAI: [26.8242, 75.8122],
  AMD: [23.0734, 72.6266],
  COK: [10.1520, 76.4019],
  TRV: [8.4821, 76.9200],
  GOI: [15.3800, 73.8314],
  AYJ: [26.7483, 82.1558],
  BOM: [19.0896, 72.8656],
  PNQ: [18.5822, 73.9197],
  BLR: [13.1986, 77.7066],
  HYD: [17.2403, 78.4294],
  VTZ: [17.7212, 83.2245],
  TIR: [13.6325, 79.5434],
  BBI: [20.2444, 85.8178],
  ATQ: [31.7096, 74.7973],
  IXC: [30.6735, 76.7885],
  DED: [30.1897, 78.1803],
  SXR: [33.9871, 74.7741],
  IDR: [22.7217, 75.8011],
  GAU: [26.1061, 91.5859],
  IXA: [23.8870, 91.2405],
  IMF: [24.7600, 93.8967],
  IXB: [26.6812, 88.3286],
  RDP: [23.6214, 87.2464],
  BDQ: [22.3308, 73.2263],
  RAJ: [22.3092, 70.7794],
  JDH: [26.2511, 73.0489],
  UDR: [24.6177, 73.8961],
  CCJ: [11.1369, 75.9553]
};

/**
 * Normalizes a route string or object into origin and destination IATA
 */
export function parseRouteKey(route) {
  if (!route) return { originIata: '', destinationIata: '', routeKey: '' };
  
  if (typeof route === 'string') {
    const parts = route.split(/[-➔→]/);
    const originIata = (parts[0] || '').trim().toUpperCase();
    const destinationIata = (parts[1] || '').trim().toUpperCase();
    return {
      originIata,
      destinationIata,
      routeKey: `${originIata}→${destinationIata}`
    };
  }

  const originIata = (route.origin_iata || (route.route_key ? route.route_key.split(/[-➔→]/)[0] : '')).trim().toUpperCase();
  const destinationIata = (route.destination_iata || (route.route_key ? route.route_key.split(/[-➔→]/)[1] : '')).trim().toUpperCase();

  return {
    originIata,
    destinationIata,
    routeKey: `${originIata}→${destinationIata}`
  };
}

/**
 * Strict Route Validation:
 * Validates that a route strictly belongs to the festival based on:
 * 1. Explicit prohibition list (Never Pongal->PAT, Onam->JAI, Durga Puja->GOI, Chhath->MAA, Ram Navami->COK)
 * 2. Destination airport belongs to festival's destination_airports
 * 3. Destination airport's state belongs to festival's primary_states
 */
export function isValidFestivalRoute(route, festival, airportLookup = {}) {
  if (!festival || !route) return false;

  const { originIata, destinationIata } = parseRouteKey(route);
  if (!originIata || !destinationIata || originIata === destinationIata) return false;

  const festName = (festival.festival_name || festival.name || '').toLowerCase();
  const festSlug = (festival.slug || '').toLowerCase();

  // 1. Explicit Blacklist Enforcement:
  // - Pongal -> Patna
  if ((festName.includes('pongal') || festSlug.includes('pongal')) && (destinationIata === 'PAT' || destinationIata === 'GAY')) {
    return false;
  }
  // - Onam -> Jaipur
  if ((festName.includes('onam') || festSlug.includes('onam')) && (destinationIata === 'JAI' || destinationIata === 'JDH' || destinationIata === 'UDR')) {
    return false;
  }
  // - Durga Puja -> Goa
  if ((festName.includes('durga') || festSlug.includes('durga')) && destinationIata === 'GOI') {
    return false;
  }
  // - Chhath -> Chennai
  if ((festName.includes('chhath') || festSlug.includes('chhath')) && (destinationIata === 'MAA' || destinationIata === 'BLR' || destinationIata === 'COK')) {
    return false;
  }
  // - Ram Navami -> Kochi
  if ((festName.includes('ram navami') || festSlug.includes('ram-navami')) && (destinationIata === 'COK' || destinationIata === 'TRV' || destinationIata === 'GOI')) {
    return false;
  }

  // 2. Validate against festival recommended destination airports if defined
  if (festival.destination_airports && festival.destination_airports.length > 0) {
    const destMatch = festival.destination_airports.some(
      d => d.trim().toUpperCase() === destinationIata
    );
    if (!destMatch) return false;
  }

  // 3. Destination State Geographic Validation
  if (festival.primary_states && festival.primary_states.length > 0) {
    const airportMeta = airportLookup[destinationIata];
    const destState = (airportMeta?.state || AIRPORT_STATE_MAP[destinationIata] || '').toLowerCase().trim();

    if (destState) {
      const isPanIndia = festival.primary_states.some(ps => ps.toLowerCase().includes('pan-india'));
      if (!isPanIndia) {
        const stateMatch = festival.primary_states.some(ps => {
          const normPS = ps.toLowerCase().trim();
          return destState.includes(normPS) || normPS.includes(destState);
        });
        if (!stateMatch) return false;
      }
    }
  }

  return true;
}
