"""
Abstract Base Provider for Airline Scraping.
Defines common interface, session handling, and mock response generators.
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Any
from datetime import date
import random
import time

from scraper.core.rate_limiter import RateLimiter
from scraper.core.session_manager import SessionManager
from scraper.normalizers.fare_normalizer import normalize_fare_record
from scraper.monitoring.logger import log_scrape_attempt


class BaseAirlineProvider(ABC):
    """Abstract base class for all airline fare fetchers."""

    def __init__(self, code: str, name: str, requests_per_sec: float = 2.0):
        self.code = code
        self.name = name
        self.rate_limiter = RateLimiter(requests_per_second=requests_per_sec)
        self.session_manager = SessionManager(code)

    @abstractmethod
    def search_fares(self, origin: str, destination: str, departure_date: date, booking_window_days: int) -> List[Dict[str, Any]]:
        """Fetch fares for a specific route and departure date."""
        pass

    def simulate_realistic_fare(self, distance_km: int, window_days: int, multiplier: float = 1.0) -> float:
        """
        Simulate a realistic dynamic pricing curve:
        - Last minute (0-2 days): surge 1.8x - 2.5x
        - 3-7 days: 1.4x - 1.8x
        - 8-14 days: 1.1x - 1.3x
        - 15-30 days: 0.95x - 1.05x (sweet spot)
        - 31-60 days: 0.85x - 0.95x (advance purchase)
        """
        base_rate = max(2400.0, distance_km * 4.2)
        curve_factors = {
            0: 2.15,
            3: 1.65,
            7: 1.25,
            14: 1.08,
            30: 0.96,
            60: 0.88,
        }
        # Find closest window
        closest_w = min(curve_factors.keys(), key=lambda k: abs(k - window_days))
        curve_factor = curve_factors[closest_w]

        # Carrier multiplier + subtle market fluctuation (±4%)
        noise = 1.0 + (random.random() * 0.08 - 0.04)
        calculated = base_rate * curve_factor * multiplier * noise
        return round(calculated, 0)
