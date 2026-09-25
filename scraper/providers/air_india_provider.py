"""
Air India (AI) Provider Module.
Full-service national carrier provider simulator with baggage and meals included.
"""

from typing import List, Dict, Any
from datetime import date
import time

from scraper.providers.base_provider import BaseAirlineProvider
from scraper.normalizers.fare_normalizer import normalize_fare_record
from scraper.monitoring.logger import log_scrape_attempt


class AirIndiaProvider(BaseAirlineProvider):
    def __init__(self):
        super().__init__(code="AI", name="Air India", requests_per_sec=2.5)

    def search_fares(self, origin: str, destination: str, departure_date: date, booking_window_days: int, distance_km: int = 1000) -> List[Dict[str, Any]]:
        start_time = time.time()
        self.rate_limiter.acquire()

        # Air India full service baseline multiplier: 1.15
        raw_fare = self.simulate_realistic_fare(distance_km, booking_window_days, multiplier=1.15)
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
