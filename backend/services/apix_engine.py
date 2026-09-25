"""
VAYU-Index APIx (Airfare Price Index) Engine.
Calculates National, State, and Route-level APIx scores, elasticity,
moving averages, and trend classifications.
"""

from datetime import date, datetime, timedelta
from typing import Dict, List, Optional, Any
import numpy as np
import pandas as pd
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.models.models import Airport, Airline, Route, Fare, APIx
from backend.utils.logger import get_logger

logger = get_logger("APIx-Engine")

# Standard booking window weights reflecting purchasing patterns in India
# (0-1 day = 18%, 2-7 days = 34%, 8-14 days = 22%, 15-30 days = 16%, 31-60 days = 10%)
WINDOW_WEIGHTS = {
    0: 0.18,
    3: 0.34,
    7: 0.22,
    14: 0.16,
    30: 0.07,
    60: 0.03,
}

BASE_RATE_PER_KM = 4.2  # INR per km standard baseline
MIN_BASE_FARE = 2200.0   # Base floor for short sectors


def classify_trend(short_ma: float, long_ma: float) -> str:
    """Classify the price trend momentum."""
    if not long_ma or long_ma <= 0:
        return "STABLE"
    diff_pct = ((short_ma - long_ma) / long_ma) * 100.0
    if diff_pct >= 8.0:
        return "STRONG_BULLISH"
    elif diff_pct >= 2.5:
        return "MODERATE_BULLISH"
    elif diff_pct <= -8.0:
        return "STRONG_BEARISH"
    elif diff_pct <= -2.5:
        return "MODERATE_BEARISH"
    return "STABLE"


def calculate_lead_time_elasticity(fares_by_window: Dict[int, float]) -> float:
    """
    Calculate price elasticity with respect to booking lead time.
    % Change in Fare / % Change in Lead Time.
    """
    sorted_windows = sorted(fares_by_window.keys())
    if len(sorted_windows) < 2:
        return -0.45  # Standard default elasticity
    
    # Compare 0/3-day (near term) with 30/60-day (advance)
    near_window = sorted_windows[0]
    far_window = sorted_windows[-1]
    
    near_fare = fares_by_window[near_window]
    far_fare = fares_by_window[far_window]
    
    if far_fare <= 0 or (far_window - near_window) == 0:
        return -0.45
    
    delta_fare_pct = (near_fare - far_fare) / far_fare
    delta_window_pct = max(0.1, (far_window - near_window) / 30.0)
    
    elasticity = -1.0 * (delta_fare_pct / delta_window_pct)
    return float(np.clip(elasticity, -3.5, 0.0))


def calculate_route_apix(db: Session, route_id: int, target_date: date) -> Dict[str, Any]:
    """Calculate APIx score for a single domestic route."""
    route = db.query(Route).filter(Route.id == route_id).first()
    if not route:
        return None

    # Fetch fares for this route around target departure
    fares = (
        db.query(Fare)
        .filter(
            Fare.route_id == route_id,
            Fare.departure_date >= target_date,
            Fare.departure_date <= target_date + timedelta(days=7)
        )
        .all()
    )

    if not fares:
        # Fallback to route base fare calculation
        theoretical_base = max(MIN_BASE_FARE, route.distance_km * BASE_RATE_PER_KM)
        return {
            "entity_key": f"{route.origin_iata}-{route.destination_iata}",
            "apix_score": 100.0,
            "avg_fare": theoretical_base,
            "elasticity": -0.45,
            "volatility": 1.0,
            "route_id": route_id,
        }

    # Group fares by booking window
    window_fares: Dict[int, List[float]] = {}
    for f in fares:
        bw = f.booking_window_days
        window_fares.setdefault(bw, []).append(f.total_fare_inr)

    # Average fare per window
    avg_by_window = {w: float(np.mean(vals)) for w, vals in window_fares.items()}

    # Weighted fare across all windows
    weighted_fare = 0.0
    total_weights = 0.0
    for w, avg_val in avg_by_window.items():
        weight = WINDOW_WEIGHTS.get(w, 0.1)
        weighted_fare += avg_val * weight
        total_weights += weight

    if total_weights > 0:
        composite_fare = weighted_fare / total_weights
    else:
        composite_fare = float(np.mean([f.total_fare_inr for f in fares]))

    # Benchmark base fare based on distance
    benchmark_base = max(MIN_BASE_FARE, route.distance_km * BASE_RATE_PER_KM)
    apix_score = (composite_fare / benchmark_base) * 100.0

    elasticity = calculate_lead_time_elasticity(avg_by_window)
    volatility = float(np.std([f.total_fare_inr for f in fares]) / max(composite_fare, 1.0) * 10.0)

    return {
        "entity_key": f"{route.origin_iata}-{route.destination_iata}",
        "apix_score": float(np.clip(apix_score, 40.0, 350.0)),
        "avg_fare": float(composite_fare),
        "elasticity": elasticity,
        "volatility": volatility,
        "route_id": route_id,
    }


def calculate_state_apix(db: Session, state_name: str, target_date: date) -> Dict[str, Any]:
    """Calculate aggregate APIx for all routes touching a specific state."""
    # Find airports in this state
    state_airports = db.query(Airport.iata).filter(Airport.state == state_name).all()
    iatas = [r[0] for r in state_airports]
    if not iatas:
        return None

    # Find routes involving these airports
    routes = (
        db.query(Route)
        .filter((Route.origin_iata.in_(iatas)) | (Route.destination_iata.in_(iatas)))
        .all()
    )

    if not routes:
        return None

    route_apix_list = []
    total_weight = 0.0
    weighted_apix_sum = 0.0
    weighted_fare_sum = 0.0

    for r in routes:
        r_res = calculate_route_apix(db, r.id, target_date)
        if r_res:
            weight = r.route_weight or 1.0
            weighted_apix_sum += r_res["apix_score"] * weight
            weighted_fare_sum += r_res["avg_fare"] * weight
            total_weight += weight
            route_apix_list.append(r_res["apix_score"])

    if total_weight == 0:
        return None

    final_apix = weighted_apix_sum / total_weight
    final_fare = weighted_fare_sum / total_weight
    volatility = float(np.std(route_apix_list)) if len(route_apix_list) > 1 else 1.2

    return {
        "entity_key": state_name,
        "apix_score": float(final_apix),
        "avg_fare": float(final_fare),
        "volatility": volatility,
        "route_count": len(routes),
    }


def calculate_daily_apix(db: Session, target_date: date) -> Dict[str, Any]:
    """Calculate and store daily National APIx and top route/state records."""
    all_routes = db.query(Route).filter(Route.is_active == True).all()
    if not all_routes:
        return {"national_apix": 100.0, "avg_fare": 5200.0}

    total_weight = 0.0
    weighted_apix_sum = 0.0
    weighted_fare_sum = 0.0
    all_scores = []

    # 1. Calculate each route APIx
    for r in all_routes:
        r_res = calculate_route_apix(db, r.id, target_date)
        if r_res:
            w = r.route_weight or 1.0
            weighted_apix_sum += r_res["apix_score"] * w
            weighted_fare_sum += r_res["avg_fare"] * w
            total_weight += w
            all_scores.append(r_res["apix_score"])

    national_apix = weighted_apix_sum / total_weight if total_weight > 0 else 100.0
    national_avg_fare = weighted_fare_sum / total_weight if total_weight > 0 else 5200.0

    # Retrieve prior national scores for 7d and 30d moving average
    past_records = (
        db.query(APIx.apix_score)
        .filter(APIx.level == "national", APIx.calculation_date < target_date)
        .order_by(APIx.calculation_date.desc())
        .limit(30)
        .all()
    )
    past_scores = [r[0] for r in past_records]

    ma_7 = float(np.mean([national_apix] + past_scores[:6])) if past_scores else national_apix
    ma_30 = float(np.mean([national_apix] + past_scores[:29])) if past_scores else national_apix
    trend = classify_trend(ma_7, ma_30)

    # Upsert national APIx record
    existing = (
        db.query(APIx)
        .filter(APIx.level == "national", APIx.entity_key == "ALL", APIx.calculation_date == target_date)
        .first()
    )
    if existing:
        existing.apix_score = national_apix
        existing.avg_fare = national_avg_fare
        existing.moving_avg_7d = ma_7
        existing.moving_avg_30d = ma_30
        existing.trend_classification = trend
    else:
        new_national = APIx(
            level="national",
            entity_key="ALL",
            calculation_date=target_date,
            apix_score=national_apix,
            avg_fare=national_avg_fare,
            fare_elasticity=-0.48,
            moving_avg_7d=ma_7,
            moving_avg_30d=ma_30,
            trend_classification=trend,
            volatility_score=float(np.std(all_scores)) if all_scores else 2.1,
        )
        db.add(new_national)

    db.commit()

    return {
        "calculation_date": str(target_date),
        "national_apix": round(national_apix, 1),
        "national_avg_fare": round(national_avg_fare, 0),
        "moving_avg_7d": round(ma_7, 1),
        "moving_avg_30d": round(ma_30, 1),
        "trend_classification": trend,
        "routes_evaluated": len(all_routes),
    }


def calculate_weekly_apix(db: Session, end_date: date) -> Dict[str, Any]:
    """Calculate rolling 7-day weekly snapshot."""
    start_date = end_date - timedelta(days=6)
    records = (
        db.query(APIx)
        .filter(APIx.level == "national", APIx.calculation_date >= start_date, APIx.calculation_date <= end_date)
        .all()
    )
    if not records:
        return calculate_daily_apix(db, end_date)

    avg_apix = float(np.mean([r.apix_score for r in records]))
    avg_fare = float(np.mean([r.avg_fare for r in records]))
    min_apix = min([r.apix_score for r in records])
    max_apix = max([r.apix_score for r in records])

    return {
        "period": f"{start_date} to {end_date}",
        "weekly_apix": round(avg_apix, 1),
        "weekly_avg_fare": round(avg_fare, 0),
        "apix_spread": round(max_apix - min_apix, 1),
        "trend": records[-1].trend_classification if records else "STABLE"
    }


def calculate_monthly_apix(db: Session, year: int, month: int) -> Dict[str, Any]:
    """Calculate monthly snapshot."""
    import calendar
    _, last_day = calendar.monthrange(year, month)
    start_date = date(year, month, 1)
    end_date = date(year, month, last_day)

    records = (
        db.query(APIx)
        .filter(APIx.level == "national", APIx.calculation_date >= start_date, APIx.calculation_date <= end_date)
        .all()
    )
    if not records:
        return {"monthly_apix": 100.0, "status": "no_data"}

    return {
        "month": f"{year}-{month:02d}",
        "monthly_apix": round(float(np.mean([r.apix_score for r in records])), 1),
        "monthly_avg_fare": round(float(np.mean([r.avg_fare for r in records])), 0),
        "days_recorded": len(records)
    }
