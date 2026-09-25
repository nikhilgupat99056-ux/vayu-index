"""
Backend Integration and API Test Suite for VAYU-Index.
"""

import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ["healthy", "degraded"]
    assert data["api_healthy"] is True
    assert data["database_connected"] is True


def test_get_airports():
    response = client.get("/api/airports")
    assert response.status_code == 200
    airports = response.json()
    assert len(airports) >= 36
    # Verify primary hubs exist
    iatas = [a["iata"] for a in airports]
    for hub in ["DEL", "BOM", "BLR", "CCU", "HYD", "MAA", "AYJ", "GOI"]:
        assert hub in iatas


def test_get_airlines():
    response = client.get("/api/airlines")
    assert response.status_code == 200
    airlines = response.json()
    assert len(airlines) == 5
    codes = [al["code"] for al in airlines]
    assert "6E" in codes
    assert "AI" in codes
    assert "QP" in codes


def test_get_routes():
    response = client.get("/api/routes")
    assert response.status_code == 200
    routes = response.json()
    assert len(routes) >= 50
    first = routes[0]
    assert "origin_iata" in first
    assert "destination_iata" in first
    assert "current_avg_fare" in first
    assert "current_apix" in first


def test_routes_filter():
    payload = {
        "origin": "DEL",
        "category": "Metro"
    }
    response = client.post("/api/routes/filter", json=payload)
    assert response.status_code == 200
    results = response.json()
    assert len(results) > 0
    for r in results:
        assert r["origin_iata"] == "DEL"
        assert r["category"] == "Metro"


def test_get_apix_overview():
    response = client.get("/api/apix")
    assert response.status_code == 200
    data = response.json()
    assert "national_apix" in data
    assert "history" in data
    assert len(data["history"]) > 0
    assert "state_apix" in data
    assert len(data["top_rising_routes"]) > 0


def test_get_festival_insights():
    response = client.get("/api/festival")
    assert response.status_code == 200
    data = response.json()
    assert data["total_festivals"] >= 20
    assert len(data["festivals"]) >= 20
    assert len(data["top_surge_routes"]) > 0


def test_get_analytics():
    response = client.get("/api/analytics")
    assert response.status_code == 200
    data = response.json()
    assert "booking_window_comparison" in data
    assert "airline_analytics" in data
    assert "category_analytics" in data
