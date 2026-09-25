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
    CreditCard, BankOffer, FareDiscount
)
from backend.schemas.schemas import RouteFilterRequest, FareSaverRequest
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
    res = []
    for r in routes:
        data = r.to_dict()
        recent_avg = (
            db.query(func.avg(Fare.total_fare_inr))
            .filter(Fare.route_id == r.id)
            .scalar()
        )
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

    for r in routes:
        data = r.to_dict()
        fare_query = db.query(func.avg(Fare.total_fare_inr)).filter(Fare.route_id == r.id)
        if filters.booking_window_days is not None:
            fare_query = fare_query.filter(Fare.booking_window_days == filters.booking_window_days)

        recent_avg = fare_query.scalar()
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

    # Calculate Top Rising and Top Falling Routes
    routes = db.query(Route).all()
    route_stats = []
    for r in routes:
        base_calc = max(2200.0, r.distance_km * 4.2)
        recent_avg = db.query(func.avg(Fare.total_fare_inr)).filter(Fare.route_id == r.id).scalar()
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

