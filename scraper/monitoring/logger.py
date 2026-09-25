"""
Monitoring and Structured Audit Logger for Scraping Pipeline.
"""

from backend.utils.logger import get_logger

scraper_logger = get_logger("CarrierScraper")


def log_scrape_attempt(carrier: str, route: str, status_code: int, count: int, latency_ms: float):
    scraper_logger.info(
        f"[{carrier}] Route: {route} | Status: {status_code} | Fares Found: {count} | Latency: {latency_ms:.1f}ms"
    )
