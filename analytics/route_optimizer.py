"""
Route Optimizer and Multi-Stop Fare Arbitrage Finder.
Finds indirect alternatives and cost savings across the 36-airport network.
"""

from typing import List, Dict, Any


def evaluate_hub_arbitrage(
    direct_fare: float,
    leg1_fare: float,
    leg2_fare: float,
    layover_mins: int
) -> Dict[str, Any]:
    """Evaluate whether booking via a transit hub offers meaningful cost arbitrage."""
    transit_fare = leg1_fare + leg2_fare
    savings = direct_fare - transit_fare
    savings_pct = (savings / direct_fare) * 100.0 if direct_fare > 0 else 0.0

    viable = savings_pct >= 22.0 and (90 <= layover_mins <= 240)

    return {
        "direct_fare": direct_fare,
        "transit_fare": transit_fare,
        "absolute_savings": round(savings, 0),
        "savings_percentage": round(savings_pct, 1),
        "layover_minutes": layover_mins,
        "is_viable_arbitrage": viable
    }
