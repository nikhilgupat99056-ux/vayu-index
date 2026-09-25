"""
Session Manager for Scraper Pipeline.
Handles carrier request sessions, rotating user agents, and simulated browser fingerprints.
"""

import random
from typing import Dict

USER_AGENTS = [
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
]


class SessionManager:
    """Manages carrier headers, cookies and simulated headers."""

    def __init__(self, carrier_code: str):
        self.carrier_code = carrier_code
        self.current_user_agent = random.choice(USER_AGENTS)

    def get_headers(self) -> Dict[str, str]:
        return {
            "User-Agent": self.current_user_agent,
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "en-IN,en;q=0.9",
            "Cache-Control": "no-cache",
            "Pragma": "no-cache",
            "X-Requested-With": "XMLHttpRequest",
            "Referer": f"https://www.{self.carrier_code.lower()}.com/"
        }

    def rotate_identity(self):
        """Rotate simulated user agent."""
        self.current_user_agent = random.choice(USER_AGENTS)
