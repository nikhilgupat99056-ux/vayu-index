"""
SQLAlchemy ORM Models for VAYU-Index.
Tables:
- airports
- airlines
- routes
- fares
- apix
- festival_calendar
- festival_routes
"""

from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, Date, ForeignKey, Text, Index, UniqueConstraint
)
from sqlalchemy.orm import relationship
from backend.database.connection import Base


class Airport(Base):
    __tablename__ = "airports"

    id = Column(Integer, primary_key=True, index=True)
    iata = Column(String(3), unique=True, index=True, nullable=False)
    name = Column(String(120), nullable=False)
    city = Column(String(80), nullable=False, index=True)
    state = Column(String(80), nullable=False, index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    region = Column(String(40), nullable=False)  # North, South, East, West, North-East, Central
    is_metro = Column(Boolean, default=False)
    active = Column(Boolean, default=True)

    # Relationships
    departing_routes = relationship(
        "Route",
        foreign_keys="Route.origin_iata",
        back_populates="origin_airport",
        cascade="all, delete-orphan"
    )
    arriving_routes = relationship(
        "Route",
        foreign_keys="Route.destination_iata",
        back_populates="destination_airport",
        cascade="all, delete-orphan"
    )

    def to_dict(self):
        return {
            "id": self.id,
            "iata": self.iata,
            "name": self.name,
            "city": self.city,
            "state": self.state,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "region": self.region,
            "is_metro": self.is_metro,
            "active": self.active,
        }


class Airline(Base):
    __tablename__ = "airlines"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(3), unique=True, index=True, nullable=False)  # 6E, AI, IX, QP, SG
    name = Column(String(60), nullable=False)
    full_name = Column(String(120), nullable=False)
    market_share = Column(Float, nullable=False)  # percentage e.g. 60.5
    fleet_size = Column(Integer, nullable=False)
    on_time_percent = Column(Float, nullable=False)  # percentage e.g. 88.4
    base_fare_multiplier = Column(Float, default=1.0)
    color = Column(String(20), default="#38BDF8")
    logo_svg = Column(Text, nullable=True)
    active = Column(Boolean, default=True)

    fares = relationship("Fare", back_populates="airline", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "code": self.code,
            "name": self.name,
            "full_name": self.full_name,
            "market_share": self.market_share,
            "fleet_size": self.fleet_size,
            "on_time_percent": self.on_time_percent,
            "base_fare_multiplier": self.base_fare_multiplier,
            "color": self.color,
            "active": self.active,
        }


class Route(Base):
    __tablename__ = "routes"

    id = Column(Integer, primary_key=True, index=True)
    origin_iata = Column(String(3), ForeignKey("airports.iata"), nullable=False, index=True)
    destination_iata = Column(String(3), ForeignKey("airports.iata"), nullable=False, index=True)
    distance_km = Column(Integer, nullable=False)
    flight_time_mins = Column(Integer, nullable=False)
    category = Column(String(40), nullable=False, index=True)  # Metro, Business, North-East, Tourism, Pilgrimage
    route_weight = Column(Float, default=1.0)  # Traffic weighting for index calculation
    base_fare = Column(Float, nullable=False)
    airline_availability = Column(String(100), default="6E,AI,IX,QP,SG")  # Comma separated codes
    is_active = Column(Boolean, default=True)

    origin_airport = relationship("Airport", foreign_keys=[origin_iata], back_populates="departing_routes")
    destination_airport = relationship("Airport", foreign_keys=[destination_iata], back_populates="arriving_routes")
    fares = relationship("Fare", back_populates="route", cascade="all, delete-orphan")
    festival_links = relationship("FestivalRoute", back_populates="route", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("origin_iata", "destination_iata", name="uq_origin_destination"),
        Index("ix_route_pair", "origin_iata", "destination_iata"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "origin_iata": self.origin_iata,
            "destination_iata": self.destination_iata,
            "route_key": f"{self.origin_iata}-{self.destination_iata}",
            "distance_km": self.distance_km,
            "flight_time_mins": self.flight_time_mins,
            "category": self.category,
            "route_weight": self.route_weight,
            "base_fare": self.base_fare,
            "airline_availability": self.airline_availability.split(",") if self.airline_availability else [],
            "is_active": self.is_active,
            "origin_name": self.origin_airport.name if self.origin_airport else None,
            "origin_city": self.origin_airport.city if self.origin_airport else None,
            "origin_state": self.origin_airport.state if self.origin_airport else None,
            "destination_name": self.destination_airport.name if self.destination_airport else None,
            "destination_city": self.destination_airport.city if self.destination_airport else None,
            "destination_state": self.destination_airport.state if self.destination_airport else None,
        }


class Fare(Base):
    __tablename__ = "fares"

    id = Column(Integer, primary_key=True, index=True)
    route_id = Column(Integer, ForeignKey("routes.id"), nullable=False, index=True)
    airline_id = Column(Integer, ForeignKey("airlines.id"), nullable=False, index=True)
    departure_date = Column(Date, nullable=False, index=True)
    booking_window_days = Column(Integer, nullable=False, index=True)  # 0 (same day), 3, 7, 14, 30, 60
    fare_inr = Column(Float, nullable=False)
    tax_inr = Column(Float, default=0.0)
    total_fare_inr = Column(Float, nullable=False)
    recorded_at = Column(DateTime, default=datetime.utcnow, index=True)
    scrape_batch_id = Column(String(50), nullable=True)

    route = relationship("Route", back_populates="fares")
    airline = relationship("Airline", back_populates="fares")

    __table_args__ = (
        Index("ix_fare_query", "route_id", "booking_window_days", "departure_date"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "route_id": self.route_id,
            "airline_id": self.airline_id,
            "airline_code": self.airline.code if self.airline else None,
            "airline_name": self.airline.name if self.airline else None,
            "departure_date": str(self.departure_date),
            "booking_window_days": self.booking_window_days,
            "fare_inr": self.fare_inr,
            "tax_inr": self.tax_inr,
            "total_fare_inr": self.total_fare_inr,
            "recorded_at": self.recorded_at.isoformat() if self.recorded_at else None,
        }


class APIx(Base):
    __tablename__ = "apix"

    id = Column(Integer, primary_key=True, index=True)
    level = Column(String(20), nullable=False, index=True)  # national, state, route
    entity_key = Column(String(50), nullable=False, index=True)  # 'ALL', 'Maharashtra', 'DEL-BOM'
    calculation_date = Column(Date, nullable=False, index=True)
    apix_score = Column(Float, nullable=False)  # Normalized 100 baseline
    avg_fare = Column(Float, nullable=False)
    fare_elasticity = Column(Float, default=0.0)
    moving_avg_7d = Column(Float, nullable=True)
    moving_avg_30d = Column(Float, nullable=True)
    trend_classification = Column(String(30), default="STABLE")  # STRONG_BULLISH, MODERATE_BULLISH, STABLE, MODERATE_BEARISH, STRONG_BEARISH
    volatility_score = Column(Float, default=1.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("level", "entity_key", "calculation_date", name="uq_apix_level_entity_date"),
        Index("ix_apix_lookup", "level", "entity_key", "calculation_date"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "level": self.level,
            "entity_key": self.entity_key,
            "calculation_date": str(self.calculation_date),
            "apix_score": round(self.apix_score, 1),
            "avg_fare": round(self.avg_fare, 0),
            "fare_elasticity": round(self.fare_elasticity, 2),
            "moving_avg_7d": round(self.moving_avg_7d, 1) if self.moving_avg_7d else None,
            "moving_avg_30d": round(self.moving_avg_30d, 1) if self.moving_avg_30d else None,
            "trend_classification": self.trend_classification,
            "volatility_score": round(self.volatility_score, 2),
        }


class FestivalCalendar(Base):
    __tablename__ = "festival_calendar"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    slug = Column(String(100), unique=True, index=True, nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    region_focus = Column(String(100), nullable=False)  # e.g. "Pan-India", "Eastern India", "Western India"
    description = Column(Text, nullable=True)
    surge_factor = Column(Float, default=1.35)  # e.g. 1.6x average spike

    routes = relationship("FestivalRoute", back_populates="festival_calendar", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "slug": self.slug,
            "start_date": str(self.start_date),
            "end_date": str(self.end_date),
            "region_focus": self.region_focus,
            "description": self.description,
            "surge_factor": self.surge_factor,
        }


class FestivalRoute(Base):
    __tablename__ = "festival_routes"

    id = Column(Integer, primary_key=True, index=True)
    festival_id = Column(Integer, ForeignKey("festival_calendar.id"), nullable=False, index=True)
    route_id = Column(Integer, ForeignKey("routes.id"), nullable=False, index=True)
    
    # Specific fields requested: festival, origin, destination, avg_fare, apix, surge, booking_window, airline
    festival = Column(String(100), nullable=True)
    origin = Column(String(10), nullable=True)
    destination = Column(String(10), nullable=True)
    avg_fare = Column(Float, nullable=True)
    apix = Column(Float, nullable=True)
    surge = Column(Float, nullable=True)
    booking_window = Column(String(50), nullable=True)
    airline = Column(String(100), nullable=True)

    # Legacy fields maintained for backward compatibility
    avg_surge_pct = Column(Float, nullable=True, default=50.0)
    historical_fare_spike = Column(Float, nullable=True, default=12000.0)
    peak_days_before = Column(Integer, default=3)
    recommended_booking_window = Column(String(50), default="21-35 days")

    festival_calendar = relationship("FestivalCalendar", back_populates="routes")
    route = relationship("Route", back_populates="festival_links")

    def to_dict(self):
        orig_iata = self.origin or (self.route.origin_iata if self.route else None)
        dest_iata = self.destination or (self.route.destination_iata if self.route else None)
        fest_name = self.festival or (self.festival_calendar.name if self.festival_calendar else None)
        fest_slug = self.festival_calendar.slug if self.festival_calendar else None
        
        orig_city = self.route.origin_airport.city if self.route and self.route.origin_airport else orig_iata
        dest_city = self.route.destination_airport.city if self.route and self.route.destination_airport else dest_iata
        dest_state = self.route.destination_airport.state if self.route and self.route.destination_airport else None
        
        avg_f = self.avg_fare or (self.route.current_avg_fare if self.route else 6500.0)
        surge_val = self.surge if self.surge is not None else (self.avg_surge_pct or 50.0)
        apix_val = self.apix if self.apix is not None else round(100.0 * (1.0 + surge_val / 100.0), 2)
        b_window = self.booking_window or self.recommended_booking_window or "25-40 days"
        
        airlines_str = self.airline or (
            ', '.join(self.route.airline_availability) if self.route and isinstance(self.route.airline_availability, list) 
            else (self.route.airline_availability if self.route and self.route.airline_availability else "IndiGo, Air India")
        )
        fare_spike = self.historical_fare_spike or round(avg_f * (1.0 + surge_val / 100.0), 0)

        return {
            "id": self.id,
            "festival_id": self.festival_id,
            "festival": fest_name,
            "festival_name": fest_name,
            "festival_slug": fest_slug,
            "route_id": self.route_id,
            "origin": orig_iata,
            "destination": dest_iata,
            "origin_iata": orig_iata,
            "destination_iata": dest_iata,
            "origin_city": orig_city,
            "destination_city": dest_city,
            "destination_state": dest_state,
            "route_key": f"{orig_iata}→{dest_iata}" if (orig_iata and dest_iata) else None,
            "avg_fare": avg_f,
            "current_avg_fare": avg_f,
            "apix": apix_val,
            "current_apix": apix_val,
            "surge": surge_val,
            "avg_surge_pct": surge_val,
            "historical_fare_spike": fare_spike,
            "booking_window": b_window,
            "recommended_booking_window": b_window,
            "airline": airlines_str,
            "airlines": airlines_str,
            "peak_days_before": self.peak_days_before,
        }


class CreditCard(Base):
    __tablename__ = "credit_cards"

    id = Column(Integer, primary_key=True, index=True)
    bank = Column(String(50), nullable=False, index=True)  # SBI, HDFC, Axis, ICICI, None
    card_name = Column(String(100), unique=True, nullable=False, index=True)
    card_type = Column(String(50), default="Cashback")  # Cashback, Travel, Rewards, Entry
    annual_fee = Column(Float, default=0.0)
    reward_rate = Column(Float, default=0.0)  # Base reward rate %
    features = Column(Text, nullable=True)
    color = Column(String(20), default="#0284c7")
    logo_symbol = Column(String(10), default="CC")
    is_active = Column(Boolean, default=True)

    offers = relationship("BankOffer", back_populates="card", cascade="all, delete-orphan")
    discounts = relationship("FareDiscount", back_populates="card")

    def to_dict(self):
        return {
            "id": self.id,
            "bank": self.bank,
            "card_name": self.card_name,
            "card_type": self.card_type,
            "annual_fee": self.annual_fee,
            "reward_rate": self.reward_rate,
            "features": self.features,
            "color": self.color,
            "logo_symbol": self.logo_symbol,
            "is_active": self.is_active,
        }


class BankOffer(Base):
    __tablename__ = "bank_offers"

    id = Column(Integer, primary_key=True, index=True)
    card_id = Column(Integer, ForeignKey("credit_cards.id"), nullable=True, index=True)
    bank = Column(String(50), nullable=False, index=True)
    card_name = Column(String(100), nullable=False, index=True)
    offer_title = Column(String(150), nullable=False)
    discount_pct = Column(Float, nullable=False)  # e.g. 10.0, 12.0, 15.0
    max_discount = Column(Float, nullable=False)  # e.g. 1500.0, 2500.0
    min_fare = Column(Float, default=2500.0)
    valid_airlines = Column(String(100), default="ALL")  # "ALL" or "6E,AI,QP,SG,I5"
    valid_routes = Column(String(200), default="ALL")    # "ALL" or specific routes
    festival_eligible = Column(Boolean, default=True)
    festival_bonus_pct = Column(Float, default=0.0)      # Extra bonus discount on festivals
    convenience_fee = Column(Float, default=299.0)
    expiry_date = Column(String(30), default="2026-12-31")
    promo_code = Column(String(30), nullable=True)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)

    card = relationship("CreditCard", back_populates="offers")
    discounts = relationship("FareDiscount", back_populates="offer")

    def to_dict(self):
        return {
            "id": self.id,
            "card_id": self.card_id,
            "bank": self.bank,
            "card_name": self.card_name,
            "offer_title": self.offer_title,
            "discount_pct": self.discount_pct,
            "max_discount": self.max_discount,
            "min_fare": self.min_fare,
            "valid_airlines": self.valid_airlines,
            "valid_routes": self.valid_routes,
            "festival_eligible": self.festival_eligible,
            "festival_bonus_pct": self.festival_bonus_pct,
            "convenience_fee": self.convenience_fee,
            "expiry_date": str(self.expiry_date),
            "promo_code": self.promo_code,
            "description": self.description,
            "is_active": self.is_active,
        }


class FareDiscount(Base):
    __tablename__ = "fare_discounts"

    id = Column(Integer, primary_key=True, index=True)
    route_id = Column(Integer, ForeignKey("routes.id"), nullable=False, index=True)
    card_id = Column(Integer, ForeignKey("credit_cards.id"), nullable=True, index=True)
    offer_id = Column(Integer, ForeignKey("bank_offers.id"), nullable=True, index=True)
    base_fare = Column(Float, nullable=False)
    discount_pct = Column(Float, default=0.0)
    discount_amount = Column(Float, default=0.0)
    convenience_fee = Column(Float, default=299.0)
    final_price = Column(Float, nullable=False)
    savings = Column(Float, default=0.0)
    booking_window_days = Column(Integer, default=30)
    is_festival = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    route = relationship("Route")
    card = relationship("CreditCard", back_populates="discounts")
    offer = relationship("BankOffer", back_populates="discounts")

    def to_dict(self):
        return {
            "id": self.id,
            "route_id": self.route_id,
            "card_id": self.card_id,
            "offer_id": self.offer_id,
            "base_fare": self.base_fare,
            "discount_pct": self.discount_pct,
            "discount_amount": self.discount_amount,
            "convenience_fee": self.convenience_fee,
            "final_price": self.final_price,
            "savings": self.savings,
            "booking_window_days": self.booking_window_days,
            "is_festival": self.is_festival,
            "created_at": str(self.created_at),
        }


# ============================================================================
# VAYU-Index v3.0: USER, AUTHENTICATION & NOTIFICATION MODELS
# ============================================================================

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=True, default="Arjun Verma")
    email = Column(String(120), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    mobile = Column(String(30), nullable=True, default="+91 98765 43210")
    home_airport = Column(String(10), default="DEL")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    preferences = relationship("UserPreference", back_populates="user", uselist=False, cascade="all, delete-orphan")
    saved_routes = relationship("SavedRoute", back_populates="user", cascade="all, delete-orphan")
    saved_searches = relationship("SavedSearch", back_populates="user", cascade="all, delete-orphan")
    card_preferences = relationship("CardPreference", back_populates="user", cascade="all, delete-orphan")
    price_alerts = relationship("PriceAlert", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    trip_history = relationship("TripHistory", back_populates="user", cascade="all, delete-orphan")

    @property
    def full_name(self):
        return self.name or "VAYU Traveler"

    def to_dict(self, include_sensitive=False):
        data = {
            "id": self.id,
            "name": self.name or "Arjun Verma",
            "full_name": self.name or "Arjun Verma",
            "email": self.email,
            "mobile": self.mobile or "+91 98765 43210",
            "home_airport": self.home_airport or "DEL",
            "is_active": self.is_active,
            "created_at": str(self.created_at),
        }
        if self.preferences:
            data["preferences"] = self.preferences.to_dict()
        else:
            data["preferences"] = {
                "preferred_airlines": ["6E", "AI", "QP"],
                "cabin_class": "Economy",
                "notification_preferences": {"push": True, "email": True, "in_app": True},
                "card_preferences": ["SBI Cashback", "Axis Atlas"],
            }
        return data


class UserPreference(Base):
    __tablename__ = "user_preferences"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False, index=True)
    preferred_airlines = Column(String(100), default="6E,AI")
    cabin_class = Column(String(30), default="Economy")
    email_notifications = Column(Boolean, default=True)
    push_notifications = Column(Boolean, default=True)
    in_app_notifications = Column(Boolean, default=True)
    fare_drop_threshold_pct = Column(Float, default=12.0)
    updated_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="preferences")

    def to_dict(self):
        p_airlines = [a.strip() for a in self.preferred_airlines.split(",")] if self.preferred_airlines else ["6E", "AI"]
        return {
            "preferred_airlines": p_airlines,
            "cabin_class": self.cabin_class or "Economy",
            "notification_preferences": {
                "email": bool(self.email_notifications),
                "push": bool(self.push_notifications),
                "in_app": bool(self.in_app_notifications),
            },
            "card_preferences": ["SBI Cashback", "Axis Atlas"],
            "fare_drop_threshold_pct": self.fare_drop_threshold_pct or 12.0,
        }


class SavedRoute(Base):
    __tablename__ = "saved_routes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    route_id = Column(Integer, ForeignKey("routes.id"), nullable=True)
    origin_iata = Column(String(10), nullable=False)
    destination_iata = Column(String(10), nullable=False)
    target_budget = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="saved_routes")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "route_id": self.route_id,
            "route_key": f"{self.origin_iata}-{self.destination_iata}",
            "origin_iata": self.origin_iata,
            "destination_iata": self.destination_iata,
            "target_budget": self.target_budget,
            "target_fare": self.target_budget,
            "created_at": str(self.created_at),
        }


class SavedSearch(Base):
    __tablename__ = "saved_searches"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    origin_iata = Column(String(10), nullable=False)
    destination_iata = Column(String(10), nullable=False)
    travel_date = Column(String(30), nullable=True)
    flexible_days = Column(Integer, default=3)
    budget = Column(Float, nullable=True)
    preferred_airline = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="saved_searches")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "origin": self.origin_iata,
            "destination": self.destination_iata,
            "travel_date": self.travel_date,
            "flexible_days": self.flexible_days,
            "budget": self.budget,
            "preferred_airline": self.preferred_airline,
            "created_at": str(self.created_at),
        }


class CardPreference(Base):
    __tablename__ = "card_preferences"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    card_id = Column(Integer, ForeignKey("credit_cards.id"), nullable=True)
    card_name = Column(String(100), nullable=False)
    is_primary = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="card_preferences")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "card_id": self.card_id,
            "card_name": self.card_name,
            "is_primary": self.is_primary,
            "created_at": str(self.created_at),
        }


class PriceAlert(Base):
    __tablename__ = "price_alerts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    origin_iata = Column(String(10), nullable=False)
    destination_iata = Column(String(10), nullable=False)
    target_price = Column(Float, nullable=False)
    alert_type = Column(String(30), default="FARE_DROP")
    channel = Column(String(30), default="ALL")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="price_alerts")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "route_key": f"{self.origin_iata}-{self.destination_iata}",
            "origin_iata": self.origin_iata,
            "destination_iata": self.destination_iata,
            "target_price": self.target_price,
            "alert_type": self.alert_type,
            "channel": self.channel,
            "is_active": self.is_active,
            "created_at": str(self.created_at),
        }


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    title = Column(String(150), nullable=False)
    message = Column(Text, nullable=False)
    alert_type = Column(String(50), default="FARE_DROP")
    route_key = Column(String(20), nullable=True)
    old_price = Column(Float, nullable=True)
    new_price = Column(Float, nullable=True)
    savings = Column(Float, default=0.0)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="notifications")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "title": self.title,
            "message": self.message,
            "type": self.alert_type.lower() if self.alert_type else "fare_drop",
            "alert_type": self.alert_type,
            "route_key": self.route_key,
            "old_price": self.old_price,
            "new_price": self.new_price,
            "savings": self.savings,
            "is_read": bool(self.is_read),
            "created_at": str(self.created_at),
        }


class TripHistory(Base):
    __tablename__ = "trip_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    pnr_ref = Column(String(30), nullable=False)
    origin_iata = Column(String(10), nullable=False)
    destination_iata = Column(String(10), nullable=False)
    airline = Column(String(50), nullable=False)
    flight_number = Column(String(30), nullable=False)
    departure_time = Column(String(30), nullable=True)
    arrival_time = Column(String(30), nullable=True)
    fare_paid = Column(Float, nullable=False)
    savings = Column(Float, default=0.0)
    booking_date = Column(String(30), nullable=True)
    travel_date = Column(String(30), nullable=True)
    passengers_count = Column(Integer, default=1)
    cabin_class = Column(String(30), default="Economy")
    status = Column(String(30), default="CONFIRMED")

    user = relationship("User", back_populates="trip_history")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "pnr_ref": self.pnr_ref,
            "booking_ref": self.pnr_ref,
            "origin_iata": self.origin_iata,
            "destination_iata": self.destination_iata,
            "route_key": f"{self.origin_iata}-{self.destination_iata}",
            "airline": self.airline,
            "flight_number": self.flight_number,
            "departure_time": self.departure_time or "06:15",
            "arrival_time": self.arrival_time or "08:35",
            "fare_paid": self.fare_paid,
            "final_fare": self.fare_paid,
            "savings": self.savings,
            "booking_date": self.booking_date or str(date.today()),
            "departure_date": self.travel_date or str(date.today() + timedelta(days=20)),
            "travel_date": self.travel_date,
            "passengers_count": self.passengers_count,
            "cabin_class": self.cabin_class,
            "status": self.status,
        }


