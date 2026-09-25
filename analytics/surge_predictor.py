"""
Surge Predictor and Machine Learning Feature Pipeline for VAYU-Index.
Predicts probability of fare spikes based on booking lead time, festival proximity, and capacity.
"""

from typing import Dict, Any


def predict_fare_surge(
    current_fare: float,
    base_fare: float,
    days_to_departure: int,
    is_festival_window: bool = False,
    festival_surge_multiplier: float = 1.0
) -> Dict[str, Any]:
    """
    Predict projected peak fare and surge probability.
    """
    surge_prob = 0.15

    # Near term probability scaling
    if days_to_departure <= 2:
        surge_prob = 0.95
    elif days_to_departure <= 7:
        surge_prob = 0.75
    elif days_to_departure <= 14:
        surge_prob = 0.45
    else:
        surge_prob = 0.20

    if is_festival_window:
        surge_prob = min(0.98, surge_prob + 0.35)

    projected_multiplier = 1.0
    if days_to_departure <= 2:
        projected_multiplier = 1.95 * festival_surge_multiplier
    elif days_to_departure <= 7:
        projected_multiplier = 1.55 * festival_surge_multiplier
    elif days_to_departure <= 14:
        projected_multiplier = 1.25 * festival_surge_multiplier
    else:
        projected_multiplier = 1.05 * festival_surge_multiplier

    projected_peak_fare = round(base_fare * projected_multiplier, 0)

    advice = "Buy immediately" if surge_prob >= 0.70 else (
        "Monitor closely" if surge_prob >= 0.40 else "Optimal window to lock fares"
    )

    return {
        "surge_probability": round(surge_prob * 100, 1),
        "risk_level": "CRITICAL" if surge_prob >= 0.75 else ("HIGH" if surge_prob >= 0.50 else "MODERATE"),
        "projected_peak_fare": projected_peak_fare,
        "recommendation": advice
    }
