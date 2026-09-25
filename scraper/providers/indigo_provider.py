"""
IndiGo Airlines (6E) Provider Module.
High frequency low-cost carrier provider simulator with realistic price engine.
"""

from typing import List, Dict, Any
from datetime import date
import time

from scraper.providers.base_provider import BaseAirlineProvider
from scraper.normalizers.fare_normalizer import normalize_fare_record
from scraper.monitoring.logger import log_scrape_attempt


class IndigoProvider(BaseAirlineProvider):
    def __init__(self):
        super().__init__(code="6E", name="IndiGo", requests_per_sec=3.0)

    def search_fares(self, origin: str, destination: str, departure_date: date, booking_window_days: int, distance_km: int = 1000) -> List[Dict[str, Any]]:
        start_time = time.time()
        self.rate_limiter.acquire()

        # IndiGo baseline multiplier: 1.00
        raw_fare = self.simulate_realistic_fare(distance_km, booking_window_days, multiplier=1.00)
        rec = normalize_fare_record(
            carrier_code=self.code,
            origin_iata=origin,
            dest_iata=destination,
            dep_date=str(departure_date),
            raw_fare=raw_fare,
            booking_window_days=booking_window_days
        )

        latency = (time.time() - start_time) * 1000.0
        log_scrape_attempt(self.name, f"{origin}-{destination}", 200, 1, latency)
        return [rec]
