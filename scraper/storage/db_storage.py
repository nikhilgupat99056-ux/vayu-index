"""
Database Storage Pipeline for Scraped Fares.
Batches and commits normalized fare entities to PostgreSQL/SQLite.
"""

from typing import List, Dict, Any
from datetime import datetime
from sqlalchemy.orm import Session

from backend.models.models import Fare, Route, Airline
from backend.utils.logger import get_logger

logger = get_logger("ScraperStorage")


def store_scraped_fares(db: Session, fare_dicts: List[Dict[str, Any]], batch_id: str) -> int:
    """Commit batch of scraped fares to database."""
    if not fare_dicts:
        return 0

    route_cache = {}
    airline_cache = {}

    fares_to_insert = []
    for item in fare_dicts:
        r_key = item["route_key"]
        orig, dest = r_key.split("-")

        if r_key not in route_cache:
            r = db.query(Route).filter(Route.origin_iata == orig, Route.destination_iata == dest).first()
            route_cache[r_key] = r.id if r else None

        r_id = route_cache[r_key]
        if not r_id:
            continue

        c_code = item["carrier_code"]
        if c_code not in airline_cache:
            al = db.query(Airline).filter(Airline.code == c_code).first()
            airline_cache[c_code] = al.id if al else None

        al_id = airline_cache[c_code]
        if not al_id:
            continue

        fares_to_insert.append(
            Fare(
                route_id=r_id,
                airline_id=al_id,
                departure_date=datetime.strptime(item["departure_date"], "%Y-%m-%d").date(),
                booking_window_days=item["booking_window_days"],
                fare_inr=item["base_fare"],
                tax_inr=item["tax"],
                total_fare_inr=item["total_fare"],
                scrape_batch_id=batch_id,
                recorded_at=datetime.utcnow()
            )
        )

    if fares_to_insert:
        db.bulk_save_objects(fares_to_insert)
        db.commit()
        logger.info(f"Stored {len(fares_to_insert)} fares under batch {batch_id}.")

    return len(fares_to_insert)
