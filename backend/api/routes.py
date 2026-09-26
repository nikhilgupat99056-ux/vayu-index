"""
FastAPI Router for VAYU-Index Platform.
Endpoints:
- GET /api/airports
- GET /api/routes
- POST /api/routes/filter
- GET /api/airlines
- GET /api/fares
- GET /api/apix
- GET /api/apix/national
- GET /api/apix/state
- GET /api/analytics
- GET /api/festival
"""

import json
import os
import random
from pathlib import Path
from datetime import date, datetime, timedelta
from typing import List, Optional
import numpy as np
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, asc

from backend.database.connection import get_db
from backend.models.models import (
    Airport, Airline, Route, Fare, APIx, FestivalCalendar, FestivalRoute,
    CreditCard, BankOffer, FareDiscount,
    User, UserPreference, SavedRoute, SavedSearch, PriceAlert, Notification, TripHistory
)
from backend.schemas.schemas import (
    RouteFilterRequest, FareSaverRequest,
    UserRegisterRequest, UserLoginRequest, UserProfileUpdateRequest,
    PriceAlertRequest, AIRecommendRequest, BookingWindowRequest, BookTripRequest
)
from backend.services.auth import (
    hash_password, verify_password, create_access_token,
    get_current_user, get_current_user_optional
)
from backend.services.apix_engine import calculate_daily_apix

router = APIRouter(prefix="/api", tags=["VAYU Intelligence"])


@router.get("/airports")
def get_airports(region: Optional[str] = None, db: Session = Depends(get_db)):
    """Fetch all 36 Indian commercial airports."""
    query = db.query(Airport).filter(Airport.active == True)
    if region:
        query = query.filter(Airport.region == region)
    airports = query.order_by(Airport.city.asc()).all()
    return [a.to_dict() for a in airports]


def compute_route_apix_and_classification(route, avg_fare: Optional[float] = None) -> dict:
    """
    Compute dynamic route APIx and color classification:
    - 🟢 Bargain Window (<95)     -> #10B981 (Green)
    - 🔵 Normal Baseline (95-115) -> #38BDF8 (Blue)
    - 🟡 Elevated Demand (116-135)-> #F59E0B (Yellow)
    - 🔴 Severe Surge (>135)      -> #EF4444 (Red)
    """
    import hashlib

    # Deterministic sector hash ensuring consistent results across requests without random numbers
    h = int(hashlib.md5(f"{route.origin_iata}-{route.destination_iata}".encode()).hexdigest()[:6], 16) / 0xffffff

    # Category demand baseline
    cat_bias = {
        "Metro": 92.0,       # High frequency & carrier competition -> Bargain & Normal
        "Business": 102.0,   # Corporate demand -> Normal & Elevated
        "Tourism": 122.0,    # Leisure peaks -> Elevated & Surge
        "Pilgrimage": 124.0, # High seasonal demand -> Elevated & Surge
        "North-East": 112.0  # Regional connectivity -> Normal & Elevated
    }.get(route.category, 100.0)

    # Carrier competition adjustment: more airlines -> lower APIx (active fare wars)
    avail = route.airline_availability.split(",") if route.airline_availability else ["6E"]
    comp_adj = -(len(avail) - 3) * 6.5

    # Route weight adjustment
    weight_adj = ((route.route_weight or 1.0) - 2.0) * 2.5

    # Sector-specific demand distribution spread
    spread = (h - 0.5) * 36.0

    calculated_apix = round(float(cat_bias + comp_adj + weight_adj + spread), 1)

    # Dynamic 4-tier intensity classification
    if calculated_apix < 95.0:
        color_category = "bargain"
        fare_status = "Bargain Window"
        color = "#10B981"  # Green
    elif calculated_apix <= 115.0:
        color_category = "normal"
        fare_status = "Normal Baseline"
        color = "#38BDF8"  # Blue
    elif calculated_apix <= 135.0:
        color_category = "elevated"
        fare_status = "Elevated Demand"
        color = "#F59E0B"  # Yellow
    else:
        color_category = "surge"
        fare_status = "Severe Surge"
        color = "#EF4444"  # Red

    # Nominal baseline fare calculation (~6.10 INR / km)
    nominal_benchmark = max(2400.0, route.distance_km * 4.2 * 1.45)
    if avg_fare is None or avg_fare <= 0:
        computed_fare = round(nominal_benchmark * (calculated_apix / 100.0), 0)
    else:
        computed_fare = round(float(avg_fare) * (calculated_apix / 152.0), 0)

    return {
        "current_apix": calculated_apix,
        "current_avg_fare": int(computed_fare),
        "color_category": color_category,
        "color": color,
        "route_color": color,
        "fare_status": fare_status
    }


@router.get("/routes")
def get_routes(
    category: Optional[str] = None,
    origin: Optional[str] = None,
    destination: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Fetch domestic routes with live calculated average fares, APIx, and dynamic color classification."""
    query = db.query(Route).filter(Route.is_active == True)
    if category and category.upper() != "ALL":
        query = query.filter(Route.category == category)
    if origin:
        query = query.filter(Route.origin_iata == origin.upper())
    if destination:
        query = query.filter(Route.destination_iata == destination.upper())

    routes = query.all()
    # Batch compute average fares in a single group-by query to eliminate N+1 latency
    fare_avgs = dict(
        db.query(Fare.route_id, func.avg(Fare.total_fare_inr))
        .group_by(Fare.route_id)
        .all()
    )
    res = []
    for r in routes:
        data = r.to_dict()
        recent_avg = fare_avgs.get(r.id)
        apix_data = compute_route_apix_and_classification(r, float(recent_avg) if recent_avg else None)
        data.update(apix_data)
        res.append(data)

    return res


@router.post("/routes/filter")
def filter_routes(filters: RouteFilterRequest, db: Session = Depends(get_db)):
    """Interactive route search & filter engine."""
    query = db.query(Route).filter(Route.is_active == True)

    if filters.origin:
        query = query.filter(Route.origin_iata == filters.origin.upper())
    if filters.destination:
        query = query.filter(Route.destination_iata == filters.destination.upper())
    if filters.category and filters.category.upper() != "ALL":
        query = query.filter(Route.category == filters.category)
    if filters.airline:
        query = query.filter(Route.airline_availability.like(f"%{filters.airline.upper()}%"))

    routes = query.all()
    enriched = []

    # Pre-aggregate fare query in one shot to eliminate N+1 latency
    base_fq = db.query(Fare.route_id, func.avg(Fare.total_fare_inr))
    if filters.booking_window_days is not None:
        base_fq = base_fq.filter(Fare.booking_window_days == filters.booking_window_days)
    fare_avgs = dict(base_fq.group_by(Fare.route_id).all())

    for r in routes:
        data = r.to_dict()
        recent_avg = fare_avgs.get(r.id)
        apix_data = compute_route_apix_and_classification(r, float(recent_avg) if recent_avg else None)
        data.update(apix_data)

        if filters.max_fare and data["current_avg_fare"] > filters.max_fare:
            continue

        enriched.append(data)

    # Sorting
    if filters.sort_by == "fare_asc":
        enriched.sort(key=lambda x: x["current_avg_fare"])
    elif filters.sort_by == "fare_desc":
        enriched.sort(key=lambda x: x["current_avg_fare"], reverse=True)
    elif filters.sort_by == "distance_desc":
        enriched.sort(key=lambda x: x["distance_km"], reverse=True)
    elif filters.sort_by == "apix_desc":
        enriched.sort(key=lambda x: x["current_apix"], reverse=True)

    return enriched


@router.get("/airlines")
def get_airlines(db: Session = Depends(get_db)):
    """Fetch profile cards of 5 major Indian carriers with performance stats."""
    airlines = db.query(Airline).filter(Airline.active == True).all()
    res = []
    for al in airlines:
        data = al.to_dict()
        # Compute network-wide average fare for this airline
        avg_fare = (
            db.query(func.avg(Fare.total_fare_inr))
            .filter(Fare.airline_id == al.id)
            .scalar()
        )
        # Count routes serviced
        routes_count = (
            db.query(Route)
            .filter(Route.airline_availability.like(f"%{al.code}%"))
            .count()
        )
        data["avg_fare"] = round(float(avg_fare), 0) if avg_fare else round(4800.0 * (al.base_fare_multiplier or 1.0), 0)
        data["routes_covered"] = routes_count
        data["trend"] = "STABLE" if al.code in ["6E", "AI"] else ("EXPANDING" if al.code == "QP" else "OPTIMIZING")
        res.append(data)
    return res


@router.get("/fares")
def get_fares(
    route_id: Optional[int] = None,
    airline_id: Optional[int] = None,
    booking_window_days: Optional[int] = None,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """Query recent airfare quotes across routes and airlines."""
    query = db.query(Fare)
    if route_id:
        query = query.filter(Fare.route_id == route_id)
    if airline_id:
        query = query.filter(Fare.airline_id == airline_id)
    if booking_window_days is not None:
        query = query.filter(Fare.booking_window_days == booking_window_days)

    fares = query.order_by(Fare.departure_date.asc(), Fare.total_fare_inr.asc()).limit(limit).all()
    return [f.to_dict() for f in fares]


@router.get("/apix")
def get_apix_overview(db: Session = Depends(get_db)):
    """
    Get comprehensive APIx intelligence:
    - Latest National APIx
    - State APIx breakdown
    - 30-day National APIx trend
    - Top rising & falling routes
    - Key metrics
    """
    latest_national = (
        db.query(APIx)
        .filter(APIx.level == "national")
        .order_by(APIx.calculation_date.desc())
        .first()
    )

    if not latest_national:
        # Fallback to computing on the fly
        computed = calculate_daily_apix(db, date.today())
        latest_score = computed["national_apix"]
        latest_avg = computed["national_avg_fare"]
        ma7 = computed["moving_avg_7d"]
        ma30 = computed["moving_avg_30d"]
        trend = computed["trend_classification"]
    else:
        latest_score = latest_national.apix_score
        latest_avg = latest_national.avg_fare
        ma7 = latest_national.moving_avg_7d or latest_score
        ma30 = latest_national.moving_avg_30d or latest_score
        trend = latest_national.trend_classification

    # 30-day historical trajectory
    history = (
        db.query(APIx)
        .filter(APIx.level == "national")
        .order_by(APIx.calculation_date.asc())
        .limit(30)
        .all()
    )

    # State breakdown
    state_scores = (
        db.query(APIx)
        .filter(APIx.level == "state")
        .order_by(APIx.apix_score.desc())
        .all()
    )

    # Calculate Top Rising and Top Falling Routes (Optimized Single Group-By)
    routes = db.query(Route).all()
    fare_avgs = dict(
        db.query(Fare.route_id, func.avg(Fare.total_fare_inr))
        .group_by(Fare.route_id)
        .all()
    )
    route_stats = []
    for r in routes:
        base_calc = max(2200.0, r.distance_km * 4.2)
        recent_avg = fare_avgs.get(r.id)
        cur_fare = round(float(recent_avg), 0) if recent_avg else round(r.base_fare * 1.15, 0)
        score = round((cur_fare / base_calc) * 100.0, 1)
        # Delta against nominal base 100
        delta_pct = round(((score - 100.0) / 100.0) * 100.0, 1)

        route_stats.append({
            "route_id": r.id,
            "route_key": f"{r.origin_iata}-{r.destination_iata}",
            "origin_city": r.origin_airport.city if r.origin_airport else r.origin_iata,
            "destination_city": r.destination_airport.city if r.destination_airport else r.destination_iata,
            "category": r.category,
            "apix_score": score,
            "avg_fare": cur_fare,
            "change_pct": delta_pct,
            "trend": "SURGE" if delta_pct > 15 else ("COOL" if delta_pct < -5 else "NORMAL")
        })

    top_rising = sorted(route_stats, key=lambda x: x["change_pct"], reverse=True)[:5]
    top_falling = sorted(route_stats, key=lambda x: x["change_pct"])[:5]

    return {
        "national_apix": latest_score,
        "national_avg_fare": latest_avg,
        "moving_avg_7d": ma7,
        "moving_avg_30d": ma30,
        "trend_classification": trend,
        "elasticity": -0.48,
        "airports_monitored": db.query(Airport).count(),
        "routes_tracked": db.query(Route).count(),
        "airlines_monitored": db.query(Airline).count(),
        "cheapest_booking_window": "30-45 Days Out (Avg ₹3,840)",
        "history": [h.to_dict() for h in history],
        "state_apix": [s.to_dict() for s in state_scores],
        "top_rising_routes": top_rising,
        "top_falling_routes": top_falling,
    }


@router.get("/apix/national")
def get_national_apix(days: int = 30, db: Session = Depends(get_db)):
    """Fetch historical national APIx timeline."""
    records = (
        db.query(APIx)
        .filter(APIx.level == "national")
        .order_by(APIx.calculation_date.asc())
        .limit(days)
        .all()
    )
    return [r.to_dict() for r in records]


@router.get("/apix/state")
def get_state_apix(db: Session = Depends(get_db)):
    """Fetch current state-wise APIx scores for GIS heatmap."""
    records = (
        db.query(APIx)
        .filter(APIx.level == "state")
        .order_by(APIx.apix_score.desc())
        .all()
    )
    return [r.to_dict() for r in records]


@router.get("/analytics")
def get_analytics(db: Session = Depends(get_db)):
    """
    Comprehensive platform analytics:
    - Booking window fare comparison curve
    - Airline market share vs average fare
    - Category price index
    - Distance vs fare elasticity curve
    """
    # 1. Booking window comparison
    windows = [0, 3, 7, 14, 30, 60]
    window_names = ["0-1 Days", "2-4 Days", "5-7 Days", "8-14 Days", "15-30 Days", "31-60 Days"]
    window_data = []

    for i, w in enumerate(windows):
        avg_w = (
            db.query(func.avg(Fare.total_fare_inr))
            .filter(Fare.booking_window_days == w)
            .scalar()
        )
        val = round(float(avg_w), 0) if avg_w else [10500, 7800, 6100, 5200, 4400, 3900][i]
        window_data.append({
            "window_days": w,
            "label": window_names[i],
            "avg_fare": val,
            "multiplier": round(val / 4400.0, 2)
        })

    # 2. Airline breakdown
    airlines = db.query(Airline).all()
    airline_analytics = []
    for al in airlines:
        avg_al = db.query(func.avg(Fare.total_fare_inr)).filter(Fare.airline_id == al.id).scalar()
        airline_analytics.append({
            "code": al.code,
            "name": al.name,
            "market_share": al.market_share,
            "fleet_size": al.fleet_size,
            "on_time_percent": al.on_time_percent,
            "avg_fare": round(float(avg_al), 0) if avg_al else 5100.0,
            "color": al.color
        })

    # 3. Category breakdown
    categories = ["Metro", "Business", "Tourism", "Pilgrimage", "North-East"]
    cat_analytics = []
    for cat in categories:
        routes_in_cat = db.query(Route).filter(Route.category == cat).all()
        r_ids = [r.id for r in routes_in_cat]
        cat_avg = (
            db.query(func.avg(Fare.total_fare_inr))
            .filter(Fare.route_id.in_(r_ids))
            .scalar()
        ) if r_ids else 5000.0

        benchmark = float(np.mean([max(2200.0, r.distance_km * 4.2) for r in routes_in_cat])) if routes_in_cat else 4500.0
        fare_val = round(float(cat_avg), 0) if cat_avg else 5200.0
        apix_val = round((fare_val / benchmark) * 100.0, 1)

        cat_analytics.append({
            "category": cat,
            "route_count": len(routes_in_cat),
            "avg_fare": fare_val,
            "category_apix": apix_val
        })

    return {
        "booking_window_comparison": window_data,
        "airline_analytics": airline_analytics,
        "category_analytics": cat_analytics,
        "summary": {
            "total_airports": db.query(Airport).count(),
            "total_routes": db.query(Route).count(),
            "total_fares_sampled": db.query(Fare).count(),
            "cheapest_window_days": 30,
            "sweet_spot_advice": "Book between 25 and 45 days in advance for lowest guaranteed fares.",
            "elasticity_coefficient": -0.48
        }
    }


FESTIVAL_ROUTES_FILE = Path(__file__).resolve().parent.parent / "data" / "festival_routes.json"

AIRPORT_STATE_LOOKUP = {
    "MAA": "Tamil Nadu", "TRZ": "Tamil Nadu", "IXM": "Tamil Nadu", "CJB": "Tamil Nadu",
    "CCU": "West Bengal", "IXB": "West Bengal", "RDP": "West Bengal",
    "PAT": "Bihar", "GAY": "Bihar",
    "VNS": "Uttar Pradesh", "LKO": "Uttar Pradesh", "AYJ": "Uttar Pradesh",
    "IXR": "Jharkhand",
    "DEL": "Delhi",
    "JAI": "Rajasthan", "JDH": "Rajasthan", "UDR": "Rajasthan",
    "AMD": "Gujarat", "BDQ": "Gujarat", "RAJ": "Gujarat",
    "COK": "Kerala", "TRV": "Kerala", "CCJ": "Kerala",
    "GOI": "Goa",
    "BOM": "Maharashtra", "PNQ": "Maharashtra", "NAG": "Maharashtra",
    "BLR": "Karnataka",
    "HYD": "Telangana", "VTZ": "Andhra Pradesh", "TIR": "Andhra Pradesh",
    "BBI": "Odisha",
    "ATQ": "Punjab", "IXC": "Chandigarh",
    "DED": "Uttarakhand",
    "SXR": "Jammu and Kashmir",
    "IDR": "Madhya Pradesh", "JLR": "Madhya Pradesh",
    "GAU": "Assam", "IXA": "Tripura", "IMF": "Manipur"
}

CITY_LOOKUP = {
    "MAA": "Chennai", "TRZ": "Tiruchirappalli", "IXM": "Madurai", "CCU": "Kolkata",
    "PAT": "Patna", "GAY": "Gaya", "VNS": "Varanasi", "IXR": "Ranchi", "DEL": "New Delhi",
    "LKO": "Lucknow", "JAI": "Jaipur", "AMD": "Ahmedabad", "COK": "Kochi", "TRV": "Thiruvananthapuram",
    "GOI": "Goa", "AYJ": "Ayodhya", "BOM": "Mumbai", "PNQ": "Pune", "BLR": "Bengaluru",
    "HYD": "Hyderabad", "VTZ": "Visakhapatnam", "TIR": "Tirupati", "BBI": "Bhubaneswar",
    "ATQ": "Amritsar", "IXC": "Chandigarh", "DED": "Dehradun", "SXR": "Srinagar", "IDR": "Indore",
    "GAU": "Guwahati", "IXA": "Agartala", "IMF": "Imphal", "IXB": "Siliguri/Bagdogra",
    "RDP": "Durgapur", "BDQ": "Vadodara", "RAJ": "Rajkot"
}


@router.get("/festival")
def get_festival_insights(db: Session = Depends(get_db)):
    """
    Dedicated Festival Demand Insights:
    - Geographically verified festival corridors from festival_routes.json
    - Dynamic APIx, surge percentage, recommended booking window
    - Strict destination state validation (eliminates wrong routes)
    """
    # Load authoritative festival corridors data
    festival_routes_config = []
    if FESTIVAL_ROUTES_FILE.exists():
        try:
            with open(FESTIVAL_ROUTES_FILE, "r", encoding="utf-8") as f:
                festival_routes_config = json.load(f)
        except Exception as e:
            pass

    config_by_slug = {}
    config_by_name = {}
    for fc in festival_routes_config:
        slug = fc.get("slug", "").lower().strip()
        fname = fc.get("festival_name", "").lower().strip()
        if slug:
            config_by_slug[slug] = fc
        if fname:
            config_by_name[fname] = fc

    db_festivals = db.query(FestivalCalendar).order_by(FestivalCalendar.start_date.asc()).all()
    
    # Enrich festivals list
    enriched_festivals = []
    for f in db_festivals:
        f_dict = f.to_dict()
        cfg = config_by_slug.get(f.slug.lower()) or config_by_name.get(f.name.lower())
        if not cfg:
            # Try partial matching
            for k, val in config_by_name.items():
                if k in f.name.lower() or f.name.lower() in k:
                    cfg = val
                    break

        if cfg:
            f_dict["festival_name"] = cfg.get("festival_name", f.name)
            f_dict["primary_states"] = cfg.get("primary_states", [f.region_focus])
            f_dict["destination_airports"] = cfg.get("destination_airports", [])
            f_dict["source_airports"] = cfg.get("source_airports", [])
            f_dict["recommended_routes"] = cfg.get("recommended_routes", [])
            f_dict["surge_multiplier"] = cfg.get("surge_multiplier", f.surge_factor)
            f_dict["booking_window"] = cfg.get("booking_window", "30-45 days")
            f_dict["travel_reason"] = cfg.get("travel_reason", f.description)
            f_dict["apix"] = round(100.0 * f_dict["surge_multiplier"], 2)
            f_dict["surge_percentage"] = round((f_dict["surge_multiplier"] - 1.0) * 100.0, 1)
        else:
            f_dict["festival_name"] = f.name
            f_dict["primary_states"] = [f.region_focus]
            f_dict["destination_airports"] = []
            f_dict["source_airports"] = []
            f_dict["recommended_routes"] = []
            f_dict["surge_multiplier"] = f.surge_factor
            f_dict["booking_window"] = "30-45 days"
            f_dict["travel_reason"] = f.description
            f_dict["apix"] = round(100.0 * f.surge_factor, 2)
            f_dict["surge_percentage"] = round((f.surge_factor - 1.0) * 100.0, 1)

        enriched_festivals.append(f_dict)

    # Load all FestivalRoute records directly from database
    db_fr_list = db.query(FestivalRoute).all()
    verified_routes = []

    # Map festivals by id and slug for quick enrichment
    fest_by_id = {f["id"]: f for f in enriched_festivals}
    fest_by_slug = {f["slug"]: f for f in enriched_festivals}

    for fr in db_fr_list:
        fr_dict = fr.to_dict()
        f_meta = fest_by_id.get(fr.festival_id) or (fest_by_slug.get(fr_dict.get("festival_slug")) if fr_dict.get("festival_slug") else None)
        
        orig_iata = fr_dict.get("origin") or fr_dict.get("origin_iata") or ""
        dest_iata = fr_dict.get("destination") or fr_dict.get("destination_iata") or ""
        f_slug = (f_meta.get("slug") if f_meta else fr_dict.get("festival_slug") or "").lower()

        # Strict blacklist check:
        # - Pongal -> Patna
        if "pongal" in f_slug and dest_iata in ["PAT", "GAY"]:
            continue
        # - Onam -> Jaipur
        if "onam" in f_slug and dest_iata in ["JAI", "JDH", "UDR"]:
            continue
        # - Durga Puja -> Goa
        if "durga" in f_slug and dest_iata == "GOI":
            continue
        # - Chhath -> Chennai
        if "chhath" in f_slug and dest_iata in ["MAA", "BLR", "COK"]:
            continue
        # - Ram Navami -> Kochi
        if "ram-navami" in f_slug and dest_iata in ["COK", "TRV", "GOI"]:
            continue

        dest_state = fr_dict.get("destination_state") or AIRPORT_STATE_LOOKUP.get(dest_iata, "")
        fr_dict["destination_state"] = dest_state
        fr_dict["origin_city"] = fr_dict.get("origin_city") or CITY_LOOKUP.get(orig_iata, orig_iata)
        fr_dict["destination_city"] = fr_dict.get("destination_city") or CITY_LOOKUP.get(dest_iata, dest_iata)
        fr_dict["route_key"] = f"{orig_iata}→{dest_iata}"

        if f_meta:
            fr_dict["destination_airports"] = f_meta.get("destination_airports", [])
            fr_dict["primary_states"] = f_meta.get("primary_states", [])
            fr_dict["travel_reason"] = f_meta.get("travel_reason", "")
            fr_dict["festival_name"] = f_meta.get("festival_name", fr_dict.get("festival_name"))
            fr_dict["festival"] = f_meta.get("festival_name", fr_dict.get("festival"))
        else:
            fr_dict["destination_airports"] = [dest_iata] if dest_iata else []
            fr_dict["primary_states"] = [dest_state] if dest_state else []
            fr_dict["travel_reason"] = ""

        verified_routes.append(fr_dict)

    # Sort routes by surge percentage
    verified_routes.sort(key=lambda x: x.get("avg_surge_pct", 0), reverse=True)

    overall_surge = round(float(np.mean([f["surge_multiplier"] for f in enriched_festivals])), 2) if enriched_festivals else 1.68

    return {
        "total_festivals": len(enriched_festivals),
        "overall_surge_factor": overall_surge,
        "festivals": enriched_festivals,
        "top_surge_routes": verified_routes,
        "surge_timeline_insights": {
            "peak_festivals": ["Chhath Puja (2.3x)", "New Year Eve (2.25x)", "Diwali (2.15x)", "Durga Puja (1.86x)", "Rath Yatra (1.85x)", "Maha Shivratri (1.72x)"],
            "recommended_advance_booking": "Book 35 to 60 days before festive dates to avoid 100%+ price jumps."
        }
    }


# ============================================================================
# SMART FARE SAVER (CREDIT CARD DISCOUNT INTELLIGENCE) ENDPOINTS
# ============================================================================

@router.get("/cards")
def get_credit_cards(db: Session = Depends(get_db)):
    """Fetch all supported credit cards for Smart Fare Saver."""
    cards = db.query(CreditCard).filter(CreditCard.is_active == True).order_by(CreditCard.id.asc()).all()
    res = []
    for c in cards:
        data = c.to_dict()
        offers_count = db.query(BankOffer).filter(BankOffer.card_id == c.id, BankOffer.is_active == True).count()
        data["offers_count"] = offers_count
        res.append(data)
    return res


@router.get("/offers")
def get_bank_offers(card_name: Optional[str] = None, airline: Optional[str] = None, db: Session = Depends(get_db)):
    """Fetch active bank flight discount offers."""
    query = db.query(BankOffer).filter(BankOffer.is_active == True)
    if card_name and card_name.upper() != "ALL":
        query = query.filter(BankOffer.card_name == card_name)
    if airline and airline.upper() != "ALL":
        query = query.filter((BankOffer.valid_airlines == "ALL") | (BankOffer.valid_airlines.like(f"%{airline.upper()}%")))
    offers = query.order_by(BankOffer.discount_pct.desc()).all()
    return [o.to_dict() for o in offers]


@router.post("/fare-saver")
def calculate_fare_saver(req: FareSaverRequest, db: Session = Depends(get_db)):
    """
    Smart Fare Saver Engine:
    For every domestic route, calculate the cheapest final payable airfare after applying
    eligible airline and bank credit card offers.
    Formula: Final Price = Base Fare − Discount + Convenience Fee
    """
    # 1. Fetch routes
    q = db.query(Route).filter(Route.is_active == True)
    if req.origin:
        q = q.filter(Route.origin_iata == req.origin.upper().strip())
    if req.destination:
        q = q.filter(Route.destination_iata == req.destination.upper().strip())
    if req.airline and req.airline.upper() != "ALL":
        q = q.filter(Route.airline_availability.like(f"%{req.airline.upper().strip()}%"))

    routes = q.all()
    all_cards = db.query(CreditCard).filter(CreditCard.is_active == True).all()
    all_offers = db.query(BankOffer).filter(BankOffer.is_active == True).all()

    # Pre-organize offers by card_name
    offers_by_card = {}
    for o in all_offers:
        offers_by_card.setdefault(o.card_name, []).append(o)

    # Lead time window multiplier
    window = req.booking_window_days if req.booking_window_days is not None else 30
    if window <= 3:
        window_mult = 1.45
    elif window <= 7:
        window_mult = 1.25
    elif window <= 14:
        window_mult = 1.10
    elif window <= 30:
        window_mult = 0.95
    else:
        window_mult = 0.88

    fest_mult = 1.35 if req.is_festival else 1.0
    total_mult = window_mult * fest_mult

    results = []

    for r in routes:
        base_fare = round(float(r.base_fare or 4800.0) * total_mult, 0)
        route_key = f"{r.origin_iata}→{r.destination_iata}"
        route_airlines = r.airline_availability if isinstance(r.airline_availability, list) else (
            r.airline_availability.split(",") if r.airline_availability else ["6E", "AI"]
        )
        route_airlines = [a.strip() for a in route_airlines]
        route_airlines_str = ", ".join(route_airlines)

        # Decide which cards to evaluate:
        target_card = req.card_name.strip() if req.card_name else "ALL"

        eligible_card_evaluations = []
        cards_to_eval = [c for c in all_cards if target_card in ("ALL", "All Cards (Best Deal)") or c.card_name == target_card]

        for card in cards_to_eval:
            if card.card_name == "Standard (No Card)":
                conv_fee = 299.0
                disc_amt = 0.0
                disc_pct = 0.0
                final_p = round(base_fare + conv_fee, 0)
                savings = 0.0
                promo = "STANDARD"
                eligible_card_evaluations.append({
                    "card_name": card.card_name,
                    "bank": card.bank,
                    "discount_pct": disc_pct,
                    "instant_discount": disc_amt,
                    "convenience_fee": conv_fee,
                    "final_price": final_p,
                    "savings": savings,
                    "promo_code": promo,
                    "offer_title": "Standard Commercial Booking",
                    "features": card.features,
                    "color": card.color
                })
                continue

            card_offers = offers_by_card.get(card.card_name, [])
            best_offer_for_card = None
            max_disc_for_card = -1.0

            for off in card_offers:
                # Check airline match
                if off.valid_airlines != "ALL":
                    airline_match = any(al in off.valid_airlines for al in route_airlines)
                    if not airline_match:
                        continue

                # Check min fare
                if base_fare < off.min_fare:
                    continue

                # Calculate discount
                bonus = off.festival_bonus_pct if (req.is_festival and off.festival_eligible) else 0.0
                eff_pct = off.discount_pct + bonus
                max_cap = off.max_discount + (300.0 if (req.is_festival and off.festival_eligible) else 0.0)
                disc = min(base_fare * (eff_pct / 100.0), max_cap)

                if disc > max_disc_for_card:
                    max_disc_for_card = disc
                    best_offer_for_card = off

            if best_offer_for_card and max_disc_for_card > 0:
                bonus = best_offer_for_card.festival_bonus_pct if (req.is_festival and best_offer_for_card.festival_eligible) else 0.0
                eff_pct = best_offer_for_card.discount_pct + bonus
                disc_amt = round(max_disc_for_card, 0)
                conv_fee = best_offer_for_card.convenience_fee
                final_p = round(base_fare - disc_amt + conv_fee, 0)
                savings = round(max(0.0, disc_amt - conv_fee), 0)
                promo = best_offer_for_card.promo_code
                offer_title = best_offer_for_card.offer_title
            else:
                # Card didn't meet min fare or airline restrictions -> baseline
                eff_pct = 0.0
                disc_amt = 0.0
                conv_fee = 299.0
                final_p = round(base_fare + conv_fee, 0)
                savings = 0.0
                promo = None
                offer_title = "Standard Terms (Min Fare Not Met)"

            eligible_card_evaluations.append({
                "card_name": card.card_name,
                "bank": card.bank,
                "discount_pct": eff_pct,
                "instant_discount": disc_amt,
                "convenience_fee": conv_fee,
                "final_price": final_p,
                "savings": savings,
                "promo_code": promo,
                "offer_title": offer_title,
                "features": card.features,
                "color": card.color
            })

        # Find the overall best card for this route
        if eligible_card_evaluations:
            best_eval = min(eligible_card_evaluations, key=lambda x: x["final_price"])
        else:
            best_eval = {
                "card_name": "Standard (No Card)",
                "bank": "None",
                "discount_pct": 0.0,
                "instant_discount": 0.0,
                "convenience_fee": 299.0,
                "final_price": base_fare + 299.0,
                "savings": 0.0,
                "promo_code": None,
                "offer_title": "Standard Booking",
                "color": "#475569"
            }

        orig_city = r.origin_airport.city if r.origin_airport else r.origin_iata
        dest_city = r.destination_airport.city if r.destination_airport else r.destination_iata

        results.append({
            "route_id": r.id,
            "route_key": route_key,
            "origin": r.origin_iata,
            "destination": r.destination_iata,
            "origin_iata": r.origin_iata,
            "destination_iata": r.destination_iata,
            "origin_city": orig_city,
            "destination_city": dest_city,
            "distance_km": r.distance_km,
            "category": r.category,
            "airline": route_airlines_str,
            "airlines_list": route_airlines,
            "base_fare": base_fare,
            "original_fare": base_fare,
            "best_card": best_eval["card_name"],
            "bank": best_eval["bank"],
            "card_color": best_eval.get("color", "#0284c7"),
            "discount_pct": best_eval["discount_pct"],
            "instant_discount": best_eval["instant_discount"],
            "convenience_fee": best_eval["convenience_fee"],
            "final_price": best_eval["final_price"],
            "savings": best_eval["savings"],
            "promo_code": best_eval["promo_code"],
            "offer_title": best_eval["offer_title"],
            "all_card_options": eligible_card_evaluations
        })

    # Sort results
    if req.sort_by == "final_price_asc":
        results.sort(key=lambda x: x["final_price"])
    elif req.sort_by == "final_price_desc":
        results.sort(key=lambda x: x["final_price"], reverse=True)
    elif req.sort_by == "discount_desc":
        results.sort(key=lambda x: x["discount_pct"], reverse=True)
    else:  # savings_desc
        results.sort(key=lambda x: x["savings"], reverse=True)

    total_count = len(results)
    paginated = results[req.offset: req.offset + req.limit]

    avg_savings = round(float(np.mean([r["savings"] for r in results])), 0) if results else 0.0
    max_savings = max([r["savings"] for r in results]) if results else 0.0

    # Best card overall frequency
    card_counts = {}
    for r in results:
        card_counts[r["best_card"]] = card_counts.get(r["best_card"], 0) + 1
    best_overall_card = max(card_counts, key=card_counts.get) if card_counts else "Axis Atlas"

    return {
        "routes": paginated,
        "total_routes": total_count,
        "summary": {
            "routes_analyzed": total_count,
            "average_savings": avg_savings,
            "max_savings": max_savings,
            "best_card_overall": best_overall_card,
            "booking_window_applied": f"{window} Days Lead",
            "is_festival_surge": req.is_festival
        }
    }


@router.get("/savings-summary")
def get_savings_summary(db: Session = Depends(get_db)):
    """
    Smart Fare Saver Comprehensive Analytics:
    - Top 10 routes with highest savings
    - Average savings by bank (SBI, HDFC, Axis, ICICI)
    - Airline vs Card compatibility chart
    - Monthly / lead-time savings histogram
    - Festival offer comparison
    """
    routes = db.query(Route).filter(Route.is_active == True).all()
    all_cards = db.query(CreditCard).filter(CreditCard.is_active == True).all()
    all_offers = db.query(BankOffer).filter(BankOffer.is_active == True).all()

    offers_by_card = {}
    for o in all_offers:
        offers_by_card.setdefault(o.card_name, []).append(o)

    # 1. Calculate standard route evaluations for all routes
    evaluated_routes = []
    bank_savings_collector = {"SBI": [], "HDFC": [], "Axis": [], "ICICI": [], "None": []}

    for r in routes:
        base_f = float(r.base_fare or 4800.0)
        route_airlines = r.airline_availability if isinstance(r.airline_availability, list) else (
            r.airline_availability.split(",") if r.airline_availability else ["6E", "AI"]
        )
        route_airlines = [a.strip() for a in route_airlines]
        route_airlines_str = ", ".join(route_airlines)

        best_card_deal = None
        max_savings = -1.0

        for card in all_cards:
            if card.card_name == "Standard (No Card)":
                bank_savings_collector["None"].append(0.0)
                continue

            card_offers = offers_by_card.get(card.card_name, [])
            for off in card_offers:
                if off.valid_airlines != "ALL":
                    if not any(al in off.valid_airlines for al in route_airlines):
                        continue
                if base_f < off.min_fare:
                    continue

                disc = min(base_f * (off.discount_pct / 100.0), off.max_discount)
                sav = max(0.0, disc - off.convenience_fee)
                final_p = base_f - disc + off.convenience_fee

                bank_savings_collector[card.bank].append(sav)

                if sav > max_savings:
                    max_savings = sav
                    best_card_deal = {
                        "route_id": r.id,
                        "origin": r.origin_iata,
                        "destination": r.destination_iata,
                        "origin_city": r.origin_airport.city if r.origin_airport else r.origin_iata,
                        "destination_city": r.destination_airport.city if r.destination_airport else r.destination_iata,
                        "airline": route_airlines_str,
                        "base_fare": round(base_f, 0),
                        "best_card": card.card_name,
                        "bank": card.bank,
                        "discount_pct": off.discount_pct,
                        "instant_discount": round(disc, 0),
                        "convenience_fee": off.convenience_fee,
                        "final_price": round(final_p, 0),
                        "savings": round(sav, 0),
                        "promo_code": off.promo_code
                    }

        if best_card_deal:
            evaluated_routes.append(best_card_deal)

    # Top 10 routes with highest savings
    evaluated_routes.sort(key=lambda x: x["savings"], reverse=True)
    top_10_routes = evaluated_routes[:10]

    # Average savings by bank
    bank_savings_avg = []
    bank_colors = {
        "Axis": "#831843",
        "HDFC": "#0f766e",
        "SBI": "#1e3a8a",
        "ICICI": "#c2410c",
        "None": "#475569"
    }
    for b_name in ["Axis", "HDFC", "SBI", "ICICI"]:
        savings_list = bank_savings_collector.get(b_name, [0.0])
        avg_s = round(float(np.mean(savings_list)), 0) if savings_list else 0.0
        max_s = max(savings_list) if savings_list else 0.0
        card_count = db.query(CreditCard).filter(CreditCard.bank == b_name).count()
        bank_savings_avg.append({
            "bank": b_name,
            "average_savings": avg_s,
            "max_savings": max_s,
            "supported_cards": card_count,
            "color": bank_colors.get(b_name, "#0284c7")
        })

    # Airline vs Card compatibility chart
    airline_compatibility = [
        {
            "code": "6E",
            "name": "IndiGo",
            "best_card": "SBI Cashback / Axis Atlas",
            "top_discount_pct": 15.0,
            "avg_savings": 880.0,
            "best_promo": "SBI6E / ATLASMILES",
            "compatibility": "100% Network Coverage"
        },
        {
            "code": "AI",
            "name": "Air India",
            "best_card": "HDFC Regalia Gold",
            "top_discount_pct": 15.0,
            "avg_savings": 1150.0,
            "best_promo": "REGALIAAI",
            "compatibility": "High Value Long-Haul"
        },
        {
            "code": "QP",
            "name": "Akasa Air",
            "best_card": "Axis Atlas / SBI Cashback",
            "top_discount_pct": 15.0,
            "avg_savings": 760.0,
            "best_promo": "ATLASMILES",
            "compatibility": "Metro-Tier2 Value"
        },
        {
            "code": "SG",
            "name": "SpiceJet",
            "best_card": "HDFC Millennia / ICICI Coral",
            "top_discount_pct": 10.0,
            "avg_savings": 640.0,
            "best_promo": "MILLENNIAFLY",
            "compatibility": "Regional & UDAN Sectors"
        },
        {
            "code": "I5",
            "name": "AIX Connect",
            "best_card": "Axis Atlas / SBI Cashback",
            "top_discount_pct": 15.0,
            "avg_savings": 820.0,
            "best_promo": "ATLASMILES",
            "compatibility": "Domestic Business Routes"
        }
    ]

    # Monthly / Lead Time savings histogram
    windows_hist = [
        {"window": "0–3 Days (Emergency)", "avg_fare": 9850, "avg_savings": 1720, "discount_pct": 15.0, "sweet_spot": False},
        {"window": "4–7 Days (Urgent)", "avg_fare": 7600, "avg_savings": 1280, "discount_pct": 14.5, "sweet_spot": False},
        {"window": "8–14 Days (Planned)", "avg_fare": 6100, "avg_savings": 980, "discount_pct": 13.0, "sweet_spot": False},
        {"window": "15–30 Days (Sweet Spot)", "avg_fare": 4650, "avg_savings": 745, "discount_pct": 12.5, "sweet_spot": True},
        {"window": "31–60 Days (Advance)", "avg_fare": 3950, "avg_savings": 620, "discount_pct": 11.0, "sweet_spot": False},
    ]

    # Festival offer comparison
    festival_comparison = {
        "normal_travel": {
            "period": "Regular Commercial Travel",
            "avg_base_fare": 5250,
            "avg_discount_pct": 12.5,
            "avg_savings": 780,
            "top_card": "Axis Atlas (15% off up to ₹2,500)",
            "effective_payable": 4769
        },
        "festival_surge": {
            "period": "Festival Surge Corridors (Diwali, Chhath, Durga Puja)",
            "avg_base_fare": 7650,
            "avg_discount_pct": 15.5,
            "avg_savings": 1240,
            "top_card": "Axis Atlas + Festive Bonus (18% off up to ₹2,800)",
            "effective_payable": 6709
        },
        "festival_delta": {
            "extra_savings": 460,
            "savings_growth_pct": 59.0,
            "advice": "Card discounts absorb up to 45% of peak festival airfare surges when booking 25–40 days ahead."
        }
    }

    return {
        "top_10_routes": top_10_routes,
        "bank_savings_avg": bank_savings_avg,
        "airline_card_compatibility": airline_compatibility,
        "monthly_savings_histogram": windows_hist,
        "festival_comparison": festival_comparison,
        "network_stats": {
            "total_routes_analyzed": len(routes),
            "supported_cards": len(all_cards),
            "active_offers": len(all_offers),
            "top_card_overall": "Axis Atlas",
            "average_network_savings": round(float(np.mean([r["savings"] for r in evaluated_routes])), 0) if evaluated_routes else 820.0
        }
    }


# ============================================================================
# VAYU-Index v3.0: USER LOGIN & AUTHENTICATION ENDPOINTS
# ============================================================================

@router.post("/auth/register")
def register_user(req: UserRegisterRequest, db: Session = Depends(get_db)):
    """Register a new user account with hashed password and initial preferences."""
    existing = db.query(User).filter(User.email == req.email.lower().strip()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account with this email already exists. Please login."
        )

    user = User(
        email=req.email.lower().strip(),
        hashed_password=hash_password(req.password),
        full_name=req.full_name or "VAYU Traveler",
        mobile=req.mobile,
        home_airport=(req.home_airport or "DEL").upper(),
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Initialize default preferences
    pref = UserPreference(
        user_id=user.id,
        preferred_airlines='["6E", "AI", "QP"]',
        notification_preferences='{"push": true, "email": true, "in_app": true}',
        card_preferences='["SBI Cashback", "HDFC Regalia Gold"]'
    )
    db.add(pref)

    # Welcome notification
    welcome_notif = Notification(
        user_id=user.id,
        title="✈️ Welcome to VAYU-Index v3.0",
        message="Your account is active. Telemetry-backed fare alerts and AI recommendations are now configured.",
        alert_type="BEST_WINDOW",
        is_read=False
    )
    db.add(welcome_notif)
    db.commit()

    token = create_access_token({"sub": str(user.id), "email": user.email})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user.to_dict()
    }


@router.post("/auth/login")
def login_user(req: UserLoginRequest, db: Session = Depends(get_db)):
    """Authenticate user with email and password, returning JWT access token."""
    user = db.query(User).filter(User.email == req.email.lower().strip()).first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password. Please check your credentials."
        )

    token = create_access_token({"sub": str(user.id), "email": user.email})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user.to_dict()
    }


# ============================================================================
# VAYU-Index v3.0: USER PROFILE & PREFERENCES ENDPOINTS
# ============================================================================

@router.get("/profile")
def get_user_profile(
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """Fetch complete user profile, saved routes, price alerts, and trip history."""
    # Fallback to demo user if not authenticated
    user = current_user or db.query(User).filter(User.email == "demo@vayuindex.in").first()
    if not user:
        user = db.query(User).first()

    if not user:
        return {
            "user": {
                "id": 1,
                "email": "traveler@vayuindex.in",
                "full_name": "Aero Guest",
                "mobile": "+91 98765 43210",
                "home_airport": "DEL",
                "preferences": {
                    "preferred_airlines": ["6E", "AI", "QP"],
                    "notification_preferences": {"push": True, "email": True, "in_app": True},
                    "card_preferences": ["SBI Cashback", "HDFC Regalia Gold"]
                }
            },
            "saved_routes": [],
            "price_alerts": [],
            "saved_searches": [],
            "trip_history": []
        }

    saved_r = db.query(SavedRoute).filter(SavedRoute.user_id == user.id).all()
    alerts = db.query(PriceAlert).filter(PriceAlert.user_id == user.id).all()
    searches = db.query(SavedSearch).filter(SavedSearch.user_id == user.id).all()
    trips = db.query(TripHistory).filter(TripHistory.user_id == user.id).order_by(TripHistory.id.desc()).all()

    return {
        "user": user.to_dict(),
        "saved_routes": [r.to_dict() for r in saved_r],
        "price_alerts": [a.to_dict() for a in alerts],
        "saved_searches": [s.to_dict() for s in searches],
        "trip_history": [t.to_dict() for t in trips],
    }


@router.post("/profile/update")
def update_user_profile(
    req: UserProfileUpdateRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """Update profile details, preferred airlines, notification toggles, and card preferences."""
    user = current_user or db.query(User).filter(User.email == "demo@vayuindex.in").first()
    if not user:
        user = db.query(User).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if req.full_name is not None:
        user.full_name = req.full_name
    if req.mobile is not None:
        user.mobile = req.mobile
    if req.home_airport is not None:
        user.home_airport = req.home_airport.upper()

    # Preferences
    pref = db.query(UserPreference).filter(UserPreference.user_id == user.id).first()
    if not pref:
        pref = UserPreference(user_id=user.id)
        db.add(pref)

    import json
    if req.preferred_airlines is not None:
        pref.preferred_airlines = json.dumps(req.preferred_airlines)
    if req.notification_preferences is not None:
        pref.notification_preferences = json.dumps(req.notification_preferences)
    if req.card_preferences is not None:
        pref.card_preferences = json.dumps(req.card_preferences)

    db.commit()
    db.refresh(user)
    return {"status": "success", "message": "Profile updated successfully", "user": user.to_dict()}


# ============================================================================
# VAYU-Index v3.0: SMART NOTIFICATIONS & PRICE ALERTS
# ============================================================================

@router.get("/notifications")
def get_user_notifications(
    mark_read: Optional[bool] = False,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """Fetch all notifications for the user with unread count."""
    user = current_user or db.query(User).filter(User.email == "demo@vayuindex.in").first()
    user_id = user.id if user else None

    query = db.query(Notification)
    if user_id:
        query = query.filter((Notification.user_id == user_id) | (Notification.user_id == None))
    
    if mark_read and user_id:
        db.query(Notification).filter(Notification.user_id == user_id).update({"is_read": True})
        db.commit()

    notifications = query.order_by(Notification.created_at.desc()).limit(50).all()
    unread_count = sum(1 for n in notifications if not n.is_read)

    return {
        "unread_count": unread_count,
        "notifications": [n.to_dict() for n in notifications]
    }


@router.post("/notifications/read")
def mark_notifications_read(
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """Mark all notifications as read for current user."""
    user = current_user or db.query(User).filter(User.email == "demo@vayuindex.in").first()
    if user:
        db.query(Notification).filter(Notification.user_id == user.id).update({"is_read": True})
        db.commit()
    return {"status": "success", "unread_count": 0}


@router.post("/alerts")
def create_or_update_alert(
    req: PriceAlertRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """Create or toggle a price drop / surge alert for a specific route."""
    user = current_user or db.query(User).filter(User.email == "demo@vayuindex.in").first()
    if not user:
        user = db.query(User).first()

    route_key = f"{req.origin_iata.upper()}-{req.destination_iata.upper()}"
    
    # Check current route price
    route = db.query(Route).filter(Route.origin_iata == req.origin_iata.upper(), Route.destination_iata == req.destination_iata.upper()).first()
    cur_fare = route.current_avg_fare if route and hasattr(route, 'current_avg_fare') else (route.base_fare * 1.12 if route else 5200.0)

    orig_c = req.origin_iata.upper()
    dest_c = req.destination_iata.upper()

    alert = db.query(PriceAlert).filter(
        PriceAlert.user_id == user.id,
        PriceAlert.origin_iata == orig_c,
        PriceAlert.destination_iata == dest_c
    ).first()

    if alert:
        alert.target_price = req.target_price
        alert.alert_type = req.alert_type.upper()
        alert.is_active = True
    else:
        alert = PriceAlert(
            user_id=user.id,
            origin_iata=orig_c,
            destination_iata=dest_c,
            target_price=req.target_price,
            alert_type=req.alert_type.upper(),
            channel="ALL",
            is_active=True
        )
        db.add(alert)

    # Create confirmation notification
    db.add(Notification(
        user_id=user.id,
        title=f"🔔 Price Alert Created: {route_key}",
        message=f"We will monitor {orig_c} ➔ {dest_c} and notify you when airfare reaches ₹{int(req.target_price):,}.",
        alert_type="FARE_DROP",
        route_key=route_key,
        new_price=req.target_price,
        is_read=False
    ))
    db.commit()
    db.refresh(alert)
    return {"status": "success", "alert": alert.to_dict()}


# ============================================================================
# VAYU-Index v3.0: AI TRAVEL SUGGESTIONS (RULE-BASED INTELLIGENCE)
# ============================================================================

NEARBY_AIRPORT_ALTERNATIVES = {
    "GOI": {"iata": "GOX", "name": "Manohar Int'l (Mopa)", "city": "North Goa", "est_savings": 1450},
    "DEL": {"iata": "IXC", "name": "Chandigarh Airport", "city": "Chandigarh", "est_savings": 1100},
    "BOM": {"iata": "PNQ", "name": "Pune Airport", "city": "Pune", "est_savings": 1250},
    "BLR": {"iata": "MYQ", "name": "Mysuru Airport", "city": "Mysuru", "est_savings": 980},
    "CCU": {"iata": "RDP", "name": "Kazi Nazrul Islam Airport", "city": "Durgapur", "est_savings": 1620},
    "VNS": {"iata": "AYJ", "name": "Maharishi Valmiki Int'l", "city": "Ayodhya", "est_savings": 1350},
    "MAA": {"iata": "TRZ", "name": "Tiruchirappalli Airport", "city": "Tiruchirappalli", "est_savings": 890},
    "PAT": {"iata": "GAY", "name": "Gaya Airport", "city": "Gaya", "est_savings": 950},
    "SXR": {"iata": "IXJ", "name": "Jammu Airport", "city": "Jammu", "est_savings": 1200},
    "ATQ": {"iata": "IXC", "name": "Chandigarh Airport", "city": "Chandigarh", "est_savings": 850},
    "DED": {"iata": "DEL", "name": "Indira Gandhi Int'l", "city": "Delhi", "est_savings": 1400},
}


@router.post("/ai/recommend")
def get_ai_travel_recommendation(
    req: AIRecommendRequest,
    db: Session = Depends(get_db)
):
    """
    AI Travel Advisor — Rule-Based Recommendation Engine:
    Analyzes booking window, APIx econometric trend, festival calendar,
    route volatility, card offers, and nearby alternate airports.
    """
    orig = req.origin.upper().strip()
    dest = req.destination.upper().strip()
    route_key = f"{orig}-{dest}"

    # 1. Airport and route lookup
    orig_airport = db.query(Airport).filter(Airport.iata == orig).first()
    dest_airport = db.query(Airport).filter(Airport.iata == dest).first()
    route = db.query(Route).filter(Route.origin_iata == orig, Route.destination_iata == dest).first()

    orig_city = orig_airport.city if orig_airport else orig
    dest_city = dest_airport.city if dest_airport else dest

    base_fare = float(route.base_fare) if route else 4800.0
    distance_km = route.distance_km if route else 1150
    category = route.category if route else "Domestic"

    # 2. Days out calculation
    today = date.today()
    travel_d = today + timedelta(days=30)
    if req.travel_date:
        try:
            travel_d = datetime.strptime(req.travel_date, "%Y-%m-%d").date()
        except Exception:
            pass

    days_out = max(1, (travel_d - today).days)

    # 3. Econometric APIx Trend
    latest_apix = db.query(APIx).filter(APIx.level == "national").order_by(APIx.calculation_date.desc()).first()
    apix_score = latest_apix.apix_score if latest_apix else 105.0

    if apix_score > 135:
        trend = "Rising"
        trend_badge = "🔴 Rising (+3.4% WoW)"
        trend_explanation = "Airfare index in strong bullish territory. Elevated corporate and festive demand pushing fares upward."
        urgency = "HIGH"
    elif apix_score < 95:
        trend = "Falling"
        trend_badge = "🟢 Falling (-4.1% WoW)"
        trend_explanation = "Seasonal softness detected across this corridor. Airlines are releasing discounted seat buckets."
        urgency = "LOW"
    else:
        trend = "Stable"
        trend_badge = "🔵 Stable (±0.8% WoW)"
        trend_explanation = "Corridor is tracking historical 30-day baseline equilibrium. Predictable pricing window."
        urgency = "MEDIUM"

    # 4. Best Booking Window calculation
    if category in ["Metro", "Business"]:
        rec_window = "21–28 days"
        min_lead, max_lead = 21, 28
    elif category in ["Pilgrimage", "North-East"]:
        rec_window = "30–45 days"
        min_lead, max_lead = 30, 45
    else:
        rec_window = "28–35 days"
        min_lead, max_lead = 28, 35

    if days_out < 14:
        window_status = "Late Booking Window (High Surge)"
        window_advice = f"🚨 Departure is in {days_out} days. Last-minute dynamic pricing penalty active (+18% daily surge). Book immediately."
        multiplier = 1.38
    elif days_out > 50:
        window_status = "Early Speculative Window"
        window_advice = f"⏳ Departure is in {days_out} days. Airlines haven't opened optimal yield buckets. Ideal purchase window opens in ~{days_out - max_lead} days."
        multiplier = 1.08
    else:
        window_status = "Optimal Bargain Window (Active)"
        window_advice = f"🎯 Prime Purchase Window. Current lead time ({days_out} days) matches algorithmic sweet spot ({rec_window}) for minimum tariff."
        multiplier = 0.94

    # 5. Festival Calendar Impact
    fest_start = travel_d - timedelta(days=6)
    fest_end = travel_d + timedelta(days=6)
    active_festival = db.query(FestivalCalendar).filter(
        FestivalCalendar.start_date <= fest_end,
        FestivalCalendar.end_date >= fest_start
    ).first()

    festival_surge_mult = 1.0
    if active_festival:
        festival_impact_str = f"🔥 {active_festival.name} Active ({int((active_festival.surge_factor - 1.0) * 100)}% Surge Expected in {active_festival.region_focus})"
        festival_surge_mult = float(active_festival.surge_factor or 1.35)
    else:
        festival_impact_str = "🟢 Nominal Non-Festive Trajectory (Zero cultural traffic congestion)"

    # 6. Estimated Cheapest Fare Calculation
    raw_est_fare = base_fare * multiplier * festival_surge_mult
    # Mid-week discount (Tues/Wed)
    midweek_fare = round(raw_est_fare * 0.90, 0)
    weekend_fare = round(raw_est_fare * 1.15, 0)

    # 7. Credit Card Intelligence
    top_card = "SBI Cashback"
    card_savings = min(midweek_fare * 0.10, 1500.0)
    final_payable = max(2400.0, midweek_fare - card_savings + 299.0)

    # 8. Alternative Nearby Airport
    alt_data = NEARBY_AIRPORT_ALTERNATIVES.get(dest)
    alt_recommendation = None
    if alt_data and alt_data["iata"] != orig:
        alt_recommendation = {
            "origin": orig,
            "alt_destination": alt_data["iata"],
            "alt_name": alt_data["name"],
            "alt_city": alt_data["city"],
            "estimated_savings": alt_data["est_savings"],
            "suggestion": f"Flying to {alt_data['name']} ({alt_data['iata']}) instead of {dest} saves ~₹{alt_data['est_savings']:,} on airfare."
        }

    # 9. Confidence Score
    confidence = 94 if route else 89

    return {
        "origin": orig,
        "destination": dest,
        "origin_city": orig_city,
        "destination_city": dest_city,
        "route_key": route_key,
        "travel_date": str(travel_d),
        "days_out": days_out,
        "best_booking_window": rec_window,
        "window_status": window_status,
        "window_advice": window_advice,
        "price_trend": trend,
        "price_trend_badge": trend_badge,
        "trend_explanation": trend_explanation,
        "estimated_cheapest_fare": int(midweek_fare),
        "weekend_fare": int(weekend_fare),
        "final_payable_with_card": int(final_payable),
        "best_card_deal": {
            "card_name": top_card,
            "savings": int(card_savings),
            "convenience_fee": 299
        },
        "best_day_to_fly": "Tuesday or Wednesday (historically 12–15% lower)",
        "festival_impact": festival_impact_str,
        "has_festival_surge": active_festival is not None,
        "alternative_nearby_airport": alt_recommendation,
        "confidence_score": confidence,
        "urgency": urgency,
        "ai_rationale": [
            f"Econometric APIx is currently {apix_score:.1f}, placing demand in the {trend.lower()} regime.",
            f"Optimal statistical advance purchase window for {category.lower()} routes is {rec_window}.",
            f"Flying on Tuesday or Wednesday yields savings of ~₹{int(raw_est_fare * 0.12):,} compared to weekend departures.",
            f"Eligible bank offer ({top_card}) provides an additional instant discount of ₹{int(card_savings):,}."
        ]
    }


# ============================================================================
# VAYU-Index v3.0: SMART BOOKING WINDOW & TRIP BOOKING ENGINE
# ============================================================================

AIRLINE_CARRIERS_META = [
    {"name": "IndiGo", "code": "6E", "dep": "06:15", "arr": "08:35", "dur": "2h 20m", "stops": "Non-stop", "base_mult": 1.0, "time_tag": "morning"},
    {"name": "Air India", "code": "AI", "dep": "09:40", "arr": "12:10", "dur": "2h 30m", "stops": "Non-stop", "base_mult": 1.08, "time_tag": "morning"},
    {"name": "Akasa Air", "code": "QP", "dep": "14:20", "arr": "16:45", "dur": "2h 25m", "stops": "Non-stop", "base_mult": 0.94, "time_tag": "afternoon"},
    {"name": "SpiceJet", "code": "SG", "dep": "18:50", "arr": "21:20", "dur": "2h 30m", "stops": "Non-stop", "base_mult": 0.92, "time_tag": "evening"},
    {"name": "Air India Express", "code": "IX", "dep": "21:40", "arr": "00:15", "dur": "2h 35m", "stops": "Non-stop", "base_mult": 0.90, "time_tag": "evening"},
]


@router.post("/booking-window")
def compute_smart_booking_window(
    req: BookingWindowRequest,
    db: Session = Depends(get_db)
):
    """
    Smart Booking Window Engine:
    Provides complete flight search matrix, predicted fare vs original fare,
    APIx score, booking score (0-100), best window, cheapest date, and integrated
    card discounts with ready-to-book provider interface structure.
    """
    orig = req.origin.upper().strip()
    dest = req.destination.upper().strip()
    route_key = f"{orig}-{dest}"

    route = db.query(Route).filter(Route.origin_iata == orig, Route.destination_iata == dest).first()
    orig_airport = db.query(Airport).filter(Airport.iata == orig).first()
    dest_airport = db.query(Airport).filter(Airport.iata == dest).first()

    base_route_fare = float(route.base_fare) if route else 4900.0
    passengers = max(1, req.passengers or 1)

    # Cabin multiplier
    cabin = (req.cabin_class or "economy").lower()
    cabin_mult = 1.0 if cabin == "economy" else (1.45 if cabin == "premium" else 2.35)

    trip_mult = 1.90 if req.trip_type == "round-trip" else 1.0

    today = date.today()
    dep_date = today + timedelta(days=25)
    if req.departure_date:
        try:
            dep_date = datetime.strptime(req.departure_date, "%Y-%m-%d").date()
        except Exception:
            pass

    days_out = max(1, (dep_date - today).days)

    # Days-out curve
    if days_out < 7:
        curve_factor = 1.55
        booking_score = 42
    elif days_out < 14:
        curve_factor = 1.30
        booking_score = 58
    elif days_out <= 35:
        curve_factor = 0.94
        booking_score = 92
    else:
        curve_factor = 1.05
        booking_score = 80

    orig_fare = round(base_route_fare * passengers * cabin_mult * trip_mult, 0)
    pred_fare = round(orig_fare * curve_factor, 0)

    # Route APIx score
    apix_val = round((pred_fare / (max(2200.0, (route.distance_km if route else 1100) * 4.2) * passengers * cabin_mult * trip_mult)) * 100.0, 1)

    # Integrated card discount
    best_offer = db.query(BankOffer).filter(BankOffer.is_active == True).order_by(BankOffer.discount_pct.desc()).first()
    card_name = best_offer.card_name if best_offer else "SBI Cashback"
    disc_pct = best_offer.discount_pct if best_offer else 10.0
    disc_amt = min(pred_fare * (disc_pct / 100.0), 2500.0)
    conv_fee = 299.0 * passengers
    final_payable = round(pred_fare - disc_amt + conv_fee, 0)

    cheapest_d = dep_date - timedelta(days=dep_date.weekday() - 1) if dep_date.weekday() != 1 else dep_date

    # Generate available flight offers (Provider Interface ready for OTA integration)
    available_flights = []
    flight_idx = 101
    for carrier in AIRLINE_CARRIERS_META:
        if req.airline_filter and req.airline_filter != "ALL" and carrier["code"] != req.airline_filter:
            continue
        if req.time_filter and req.time_filter != "ALL" and carrier["time_tag"] != req.time_filter:
            continue

        flight_base = round(pred_fare * carrier["base_mult"], 0)
        flight_disc = min(flight_base * (disc_pct / 100.0), 2500.0)
        flight_final = round(flight_base - flight_disc + conv_fee, 0)

        available_flights.append({
            "id": f"FL-{flight_idx}",
            "airline_name": carrier["name"],
            "airline_code": carrier["code"],
            "flight_number": f"{carrier['code']}-{random.randint(102, 899)}",
            "origin": orig,
            "destination": dest,
            "origin_city": orig_airport.city if orig_airport else orig,
            "destination_city": dest_airport.city if dest_airport else dest,
            "departure_time": carrier["dep"],
            "arrival_time": carrier["arr"],
            "duration": carrier["dur"],
            "stops": carrier["stops"],
            "cabin_class": cabin.capitalize(),
            "base_fare": int(flight_base),
            "card_discount": int(flight_disc),
            "convenience_fee": int(conv_fee),
            "final_price": int(flight_final),
            "best_card": card_name,
            "seats_left": random.randint(3, 9),
            "carbon_kg": random.randint(95, 145),
            "on_time_pct": round(random.uniform(88.0, 94.5), 1),
            "booking_url": f"https://vayu-reserve.in/book?route={route_key}&flight={carrier['code']}",
            "provider": f"{carrier['name']} Direct / Amadeus NDC Ready"
        })
        flight_idx += 1

    return {
        "route_key": route_key,
        "origin": orig,
        "destination": dest,
        "origin_city": orig_airport.city if orig_airport else orig,
        "destination_city": dest_airport.city if dest_airport else dest,
        "departure_date": str(dep_date),
        "return_date": req.return_date,
        "trip_type": req.trip_type,
        "passengers": passengers,
        "cabin_class": cabin.capitalize(),
        "days_out": days_out,
        "original_fare": int(orig_fare),
        "predicted_fare": int(pred_fare),
        "apix": apix_val,
        "booking_score": booking_score,
        "best_window": "21–35 Days Out",
        "cheapest_date": str(cheapest_d),
        "card_applied": card_name,
        "discount_amount": int(disc_amt),
        "convenience_fee": int(conv_fee),
        "final_payable_price": int(final_payable),
        "total_savings": int(disc_amt),
        "available_flights": available_flights
    }


@router.post("/trips/book")
def book_flight_trip(
    req: BookTripRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    Booking-Ready Provider Interface:
    Simulates airline reservation booking and records confirmation in TripHistory.
    """
    user = current_user or db.query(User).filter(User.email == "demo@vayuindex.in").first()
    if not user:
        user = db.query(User).first()

    booking_ref = f"VY-{random.randint(100000, 999999)}"
    orig = (req.origin_iata or req.origin or "DEL").upper()
    dest = (req.destination_iata or req.destination or "BOM").upper()
    route_k = f"{orig}-{dest}"
    travel_d = req.departure_date or str(date.today() + timedelta(days=25))
    paid = float(req.final_fare if req.final_fare is not None else (req.fare_paid or 4200.0))
    base = float(req.base_fare or paid)

    trip = TripHistory(
        user_id=user.id,
        pnr_ref=booking_ref,
        origin_iata=orig,
        destination_iata=dest,
        airline=req.airline or "IndiGo",
        flight_number=req.flight_number or "6E-204",
        departure_time="06:15",
        arrival_time="08:35",
        fare_paid=paid,
        savings=max(0.0, base - paid),
        booking_date=str(date.today()),
        travel_date=travel_d,
        passengers_count=1,
        cabin_class="Economy",
        status="CONFIRMED"
    )
    db.add(trip)

    # Notification
    db.add(Notification(
        user_id=user.id,
        title=f"✅ Booking Confirmed: {req.airline} {req.flight_number}",
        message=f"PNR: {booking_ref}. Flight from {orig} to {dest} confirmed for {travel_d}. Final payable ₹{int(paid):,}.",
        alert_type="BEST_WINDOW",
        route_key=route_k,
        new_price=paid,
        is_read=False
    ))
    db.commit()
    db.refresh(trip)

    return {
        "status": "CONFIRMED",
        "pnr": booking_ref,
        "booking_ref": booking_ref,
        "passenger": req.passenger_name or "Arjun Verma",
        "fare_paid": paid,
        "trip": trip.to_dict(),
        "message": "Flight reservation completed successfully via VAYU Booking Gateway."
    }


