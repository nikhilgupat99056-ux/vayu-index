"""
Unit Tests for APIx Engine Mathematical Logic.
"""

from backend.services.apix_engine import classify_trend, calculate_lead_time_elasticity


def test_classify_trend():
    assert classify_trend(120.0, 100.0) == "STRONG_BULLISH"
    assert classify_trend(104.0, 100.0) == "MODERATE_BULLISH"
    assert classify_trend(100.5, 100.0) == "STABLE"
    assert classify_trend(95.0, 100.0) == "MODERATE_BEARISH"
    assert classify_trend(88.0, 100.0) == "STRONG_BEARISH"


def test_calculate_lead_time_elasticity():
    window_fares = {
        0: 11000.0,
        3: 8200.0,
        7: 6400.0,
        14: 5200.0,
        30: 4400.0,
        60: 3900.0
    }
    elasticity = calculate_lead_time_elasticity(window_fares)
    assert elasticity < 0.0  # Must be negative (fares drop as lead time increases)
    assert -3.5 <= elasticity <= 0.0
