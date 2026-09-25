"""
Exponential Backoff Retry Manager with Jitter.
Handles network glitches and carrier throttle responses.
"""

import time
import random
import functools
from typing import Callable, Any, Type, Tuple


def with_retry(
    max_attempts: int = 3,
    initial_delay: float = 0.5,
    backoff_factor: float = 2.0,
    exceptions: Tuple[Type[Exception], ...] = (Exception,)
) -> Callable:
    """Decorator to retry flaky scraping routines with exponential backoff and jitter."""
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            delay = initial_delay
            last_exception = None

            for attempt in range(1, max_attempts + 1):
                try:
                    return func(*args, **kwargs)
                except exceptions as e:
                    last_exception = e
                    if attempt == max_attempts:
                        break
                    jitter = random.uniform(0.1, 0.3) * delay
                    sleep_time = delay + jitter
                    time.sleep(sleep_time)
                    delay *= backoff_factor

            raise last_exception
        return wrapper
    return decorator
