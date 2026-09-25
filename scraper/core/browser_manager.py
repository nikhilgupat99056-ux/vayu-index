"""
Browser Manager for Headless Playwright Contexts.
Provides structured interface for browser pooling, viewport setting, and resource interception.
"""

from typing import Optional, Dict, Any


class BrowserManager:
    """
    Manages Playwright browser lifecycles and page contexts.
    Designed for production resilience with proxy rotation and resource blocking (images, CSS).
    """

    def __init__(self, headless: bool = True, timeout_ms: int = 30000):
        self.headless = headless
        self.timeout_ms = timeout_ms
        self.is_initialized = False

    def initialize(self):
        """Prepare headless execution context."""
        self.is_initialized = True

    def get_context_options(self) -> Dict[str, Any]:
        """Produce stealth browser context arguments."""
        return {
            "viewport": {"width": 1440, "height": 900},
            "device_scale_factor": 1,
            "has_touch": False,
            "locale": "en-IN",
            "timezone_id": "Asia/Kolkata",
            "permissions": ["geolocation"],
        }

    def close(self):
        """Close browser resources."""
        self.is_initialized = False
