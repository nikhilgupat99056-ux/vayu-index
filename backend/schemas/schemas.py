"""
Pydantic Schemas for VAYU-Index API.
Modern Pydantic v2 compatible schemas.
"""

from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class AirportBase(BaseModel):
    iata: str
    name: str
    city: str
    state: str
    latitude: float
    longitude: float
    region: str
    is_metro: bool = False
    active: bool = True


class AirportOut(AirportBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


class AirlineBase(BaseModel):
    code: str
    name: str
    full_name: str
    market_share: float
    fleet_size: int
    on_time_percent: float
    base_fare_multiplier: float
    color: str
    active: bool = True


class AirlineOut(AirlineBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


class RouteBase(BaseModel):
    origin_iata: str
    destination_iata: str
    distance_km: int
    flight_time_mins: int
    category: str
    route_weight: float
    base_fare: float
    airline_availability: List[str]
    is_active: bool = True


class RouteOut(RouteBase):
    id: int
    route_key: str
    origin_city: Optional[str] = None
    origin_state: Optional[str] = None
    destination_city: Optional[str] = None
    destination_state: Optional[str] = None
    current_avg_fare: Optional[float] = None
    current_apix: Optional[float] = None
    model_config = ConfigDict(from_attributes=True)


class FareOut(BaseModel):
    id: int
    route_id: int
    airline_id: int
    airline_code: Optional[str] = None
    airline_name: Optional[str] = None
    departure_date: str
    booking_window_days: int
    fare_inr: float
    tax_inr: float
    total_fare_inr: float
    recorded_at: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


class APIxOut(BaseModel):
    id: int
    level: str
    entity_key: str
    calculation_date: str
    apix_score: float
    avg_fare: float
    fare_elasticity: float
    moving_avg_7d: Optional[float] = None
    moving_avg_30d: Optional[float] = None
    trend_classification: str
    volatility_score: float
    model_config = ConfigDict(from_attributes=True)


class FestivalOut(BaseModel):
    id: int
    name: str
    slug: str
    start_date: str
    end_date: str
    region_focus: str
    description: Optional[str] = None
    surge_factor: float
    model_config = ConfigDict(from_attributes=True)


class FestivalRouteOut(BaseModel):
    id: int
    festival_id: int
    festival_name: Optional[str] = None
    route_id: int
    route_key: Optional[str] = None
    origin_city: Optional[str] = None
    destination_city: Optional[str] = None
    avg_surge_pct: float
    historical_fare_spike: float
    peak_days_before: int
    recommended_booking_window: str
    model_config = ConfigDict(from_attributes=True)


class RouteFilterRequest(BaseModel):
    origin: Optional[str] = None
    destination: Optional[str] = None
    airline: Optional[str] = None
    category: Optional[str] = None
    max_fare: Optional[float] = None
    booking_window_days: Optional[int] = None
    sort_by: Optional[str] = "fare_asc"


class HealthResponse(BaseModel):
    status: str
    database_connected: bool
    scheduler_running: bool
    api_healthy: bool
    providers_ready: bool
    version: str
    timestamp: str


class FareSaverRequest(BaseModel):
    origin: Optional[str] = None
    destination: Optional[str] = None
    airline: Optional[str] = None
    booking_window_days: Optional[int] = 30
    card_name: Optional[str] = None
    is_festival: Optional[bool] = False
    sort_by: Optional[str] = "savings_desc"  # savings_desc, final_price_asc, final_price_desc, discount_desc
    limit: Optional[int] = 350
    offset: Optional[int] = 0


# ============================================================================
# VAYU-Index v3.0 Request & Response Schemas
# ============================================================================

class UserRegisterRequest(BaseModel):
    email: str
    password: str
    full_name: Optional[str] = "VAYU Traveler"
    mobile: Optional[str] = None
    home_airport: Optional[str] = "DEL"


class UserLoginRequest(BaseModel):
    email: str
    password: str


class UserProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    mobile: Optional[str] = None
    home_airport: Optional[str] = None
    preferred_airlines: Optional[List[str]] = None
    notification_preferences: Optional[dict] = None
    card_preferences: Optional[List[str]] = None


class PriceAlertRequest(BaseModel):
    origin_iata: str
    destination_iata: str
    target_price: float
    alert_type: Optional[str] = "fare_drop"  # fare_drop, fare_surge, window, festival


class AIRecommendRequest(BaseModel):
    origin: str
    destination: str
    travel_date: Optional[str] = None
    flexible_dates: Optional[bool] = True
    budget: Optional[float] = None
    preferred_airline: Optional[str] = None


class BookingWindowRequest(BaseModel):
    origin: str
    destination: str
    departure_date: Optional[str] = None
    return_date: Optional[str] = None
    trip_type: Optional[str] = "one-way"  # "one-way" or "round-trip"
    passengers: Optional[int] = 1
    cabin_class: Optional[str] = "economy"  # "economy", "premium", "business"
    airline_filter: Optional[str] = "ALL"
    stops_filter: Optional[str] = "ALL"  # "ALL", "non-stop", "1-stop"
    time_filter: Optional[str] = "ALL"  # "ALL", "morning", "afternoon", "evening"


class BookTripRequest(BaseModel):
    origin_iata: Optional[str] = None
    origin: Optional[str] = None
    destination_iata: Optional[str] = None
    destination: Optional[str] = None
    departure_date: Optional[str] = None
    return_date: Optional[str] = None
    airline: Optional[str] = "IndiGo"
    flight_number: Optional[str] = "6E-204"
    passenger_name: Optional[str] = "Arjun Verma"
    base_fare: Optional[float] = 4500.0
    final_fare: Optional[float] = None
    fare_paid: Optional[float] = 4200.0


