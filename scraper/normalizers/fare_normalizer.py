"""
Fare Data Normalizer.
Harmonizes diverse carrier fare structures, taxes, and baggage allowances into standard VAYU records.
"""

from typing import Dict, Any


def normalize_fare_record(
    carrier_code: str,
    origin_iata: str,
    dest_iata: str,
    dep_date: str,
    raw_fare: float,
    booking_window_days: int,
    tax_rate: float = 0.12
) -> Dict[str, Any]:
    """Normalize raw fare data into the unified platform schema."""
    clean_fare = round(float(raw_fare), 2)
    tax_amount = round(clean_fare * tax_rate, 2)
    total = clean_fare + tax_amount

    return {
        "carrier_code": carrier_code.upper(),
        "route_key": f"{origin_iata.upper()}-{dest_iata.upper()}",
        "departure_date": dep_date,
        "booking_window_days": booking_window_days,
        "base_fare": clean_fare,
        "tax": tax_amount,
        "total_fare": total,
        "currency": "INR"
    }
