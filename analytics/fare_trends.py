"""
Fare Trends Analytics Engine.
Calculates historical price volatility, exponential moving averages, and corridor comparisons.
"""

from typing import List, Dict, Any
import numpy as np
import pandas as pd


def compute_corridor_volatility(fares: List[float]) -> float:
    """Calculate normalized volatility coefficient."""
    if len(fares) < 2:
        return 0.0
    mean_fare = float(np.mean(fares))
    if mean_fare <= 0:
        return 0.0
    std_dev = float(np.std(fares))
    return round((std_dev / mean_fare) * 100.0, 2)


def compute_exponential_moving_average(series: List[float], span: int = 7) -> List[float]:
    """Compute EMA series for price signals."""
    if not series:
        return []
    s = pd.Series(series)
    ema = s.ewm(span=span, adjust=False).mean()
    return [round(float(v), 2) for v in ema.tolist()]
