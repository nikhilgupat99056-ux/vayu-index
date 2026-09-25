"""
Scrape Pipeline Orchestrator.
Coordinates concurrent carrier scraping across the 36-airport network and saves data to storage.
"""

from datetime import date, timedelta
import uuid
from typing import List, Dict, Any
from sqlalchemy.orm import Session

from backend.models.models import Route
from scraper.providers.indigo_provider import IndigoProvider
from scraper.providers.air_india_provider import AirIndiaProvider
from scraper.providers.air_india_express_provider import AirIndiaExpressProvider
from scraper.providers.akasa_provider import AkasaProvider
from scraper.providers.spicejet_provider import SpiceJetProvider
from scraper.storage.db_storage import store_scraped_fares
from backend.utils.logger import get_logger

logger = get_logger("ScrapeOrchestrator")


class ScrapeOrchestrator:
    """Manages full pipeline scraping cycles across all registered carriers."""

    def __init__(self):
        self.providers = {
            "6E": IndigoProvider(),
            "AI": AirIndiaProvider(),
            "IX": AirIndiaExpressProvider(),
            "QP": AkasaProvider(),
            "SG": SpiceJetProvider(),
        }

    def run_daily_cycle(self, db: Session, target_date: date = None) -> Dict[str, Any]:
        """Execute standard polling cycle for top active routes."""
        if not target_date:
            target_date = date.today()

        batch_id = f"batch_{target_date.strftime('%Y%m%d')}_{uuid.uuid4().hex[:6]}"
        logger.info(f"Starting fare scrape cycle. Batch ID: {batch_id}")

        routes = db.query(Route).filter(Route.is_active == True).limit(20).all()
        windows = [0, 3, 7, 14, 30]
        collected = []

        for r in routes:
            carriers = r.airline_availability.split(",")
            for c_code in carriers:
                provider = self.providers.get(c_code)
                if not provider:
                    continue
                for w in windows:
                    dep_date = target_date + timedelta(days=w)
                    try:
                        fares = provider.search_fares(
                            origin=r.origin_iata,
                            destination=r.destination_iata,
                            departure_date=dep_date,
                            booking_window_days=w,
                            distance_km=r.distance_km
                        )
                        collected.extend(fares)
                    except Exception as e:
                        logger.error(f"Error fetching fares for {c_code} on {r.origin_iata}-{r.destination_iata}: {e}")

        # Persist to DB
        stored_count = store_scraped_fares(db, collected, batch_id)
        logger.info(f"Scrape cycle finished. Collected: {len(collected)}, Stored: {stored_count}")

        return {
            "batch_id": batch_id,
            "routes_sampled": len(routes),
            "quotes_collected": len(collected),
            "quotes_stored": stored_count
        }
