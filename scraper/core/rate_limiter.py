"""
Token Bucket Rate Limiter for Scraper Providers.
Prevents carrier blocking and distributes load evenly.
"""

import time
import threading


class RateLimiter:
    """Thread-safe Token Bucket Rate Limiter."""

    def __init__(self, requests_per_second: float = 2.0, max_burst: int = 5):
        self.capacity = max_burst
        self.tokens = max_burst
        self.rate = requests_per_second
        self.last_update = time.time()
        self.lock = threading.Lock()

    def acquire(self):
        """Wait until a token is available."""
        with self.lock:
            now = time.time()
            elapsed = now - self.last_update
            self.last_update = now

            # Replenish tokens
            self.tokens = min(self.capacity, self.tokens + elapsed * self.rate)

            if self.tokens >= 1.0:
                self.tokens -= 1.0
                return

            wait_time = (1.0 - self.tokens) / self.rate
            time.sleep(wait_time)
            self.tokens = 0.0
