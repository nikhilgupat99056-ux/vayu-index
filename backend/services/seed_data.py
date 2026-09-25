"""
Comprehensive Seed Data Generator for VAYU-Index.
Generates:
- 36 Indian Airports (DEL, BOM, CCU, BLR, HYD, MAA, AMD, GOI, TRV, VTZ, IXB, IXA, IMF, GAU, PAT, RDP, IXR, AYJ, DED, SXR, IXC, JAI, RAJ, PNQ, IDR, COK, BBI, ATQ, VNS, BDQ, etc.)
- 5 Major Commercial Airlines (6E, AI, IX, QP, SG)
- 135+ High-Density Domestic Corridors across 5 Categories (Metro, Business, North-East, Tourism, Pilgrimage)
- 30-Day Historical Fare Records across 6 Booking Windows
- 24 Major Indian Festivals & 25+ Specific Festival Demand Surge Routes
- Pre-calculated National, State, and Route APIx Data
"""

import json
import math
import random
from pathlib import Path
from datetime import date, datetime, timedelta
from sqlalchemy.orm import Session

from backend.models.models import (
    Airport, Airline, Route, Fare, APIx, FestivalCalendar, FestivalRoute,
    CreditCard, BankOffer, FareDiscount
)
from backend.utils.logger import get_logger

logger = get_logger("SeedData")

# 1. 36 AIRPORTS DATA (All 29 specified + 7 domestic hubs)
AIRPORTS_DATA = [
    {"iata": "DEL", "name": "Indira Gandhi International Airport", "city": "New Delhi", "state": "Delhi", "latitude": 28.5562, "longitude": 77.1000, "region": "North", "is_metro": True},
    {"iata": "BOM", "name": "Chhatrapati Shivaji Maharaj International Airport", "city": "Mumbai", "state": "Maharashtra", "latitude": 19.0896, "longitude": 72.8656, "region": "West", "is_metro": True},
    {"iata": "CCU", "name": "Netaji Subhash Chandra Bose International Airport", "city": "Kolkata", "state": "West Bengal", "latitude": 22.6547, "longitude": 88.4467, "region": "East", "is_metro": True},
    {"iata": "BLR", "name": "Kempegowda International Airport", "city": "Bengaluru", "state": "Karnataka", "latitude": 13.1986, "longitude": 77.7066, "region": "South", "is_metro": True},
    {"iata": "HYD", "name": "Rajiv Gandhi International Airport", "city": "Hyderabad", "state": "Telangana", "latitude": 17.2403, "longitude": 78.4294, "region": "South", "is_metro": True},
    {"iata": "MAA", "name": "Chennai International Airport", "city": "Chennai", "state": "Tamil Nadu", "latitude": 12.9941, "longitude": 80.1709, "region": "South", "is_metro": True},
    {"iata": "AMD", "name": "Sardar Vallabhbhai Patel International Airport", "city": "Ahmedabad", "state": "Gujarat", "latitude": 23.0772, "longitude": 72.6347, "region": "West", "is_metro": True},
    {"iata": "GOI", "name": "Dabolim / Manohar International Airport", "city": "Goa", "state": "Goa", "latitude": 15.3800, "longitude": 73.8314, "region": "West", "is_metro": False},
    {"iata": "PNQ", "name": "Pune Airport", "city": "Pune", "state": "Maharashtra", "latitude": 18.5821, "longitude": 73.9197, "region": "West", "is_metro": False},
    {"iata": "NAG", "name": "Dr. Babasaheb Ambedkar International Airport", "city": "Nagpur", "state": "Maharashtra", "latitude": 21.0922, "longitude": 79.0472, "region": "Central", "is_metro": False},
    {"iata": "IXB", "name": "Bagdogra Airport", "city": "Siliguri", "state": "West Bengal", "latitude": 26.6812, "longitude": 88.3286, "region": "East", "is_metro": False},
    {"iata": "RDP", "name": "Kazi Nazrul Islam Airport", "city": "Durgapur", "state": "West Bengal", "latitude": 23.6231, "longitude": 87.2433, "region": "East", "is_metro": False},
    {"iata": "IXR", "name": "Birsa Munda Airport", "city": "Ranchi", "state": "Jharkhand", "latitude": 23.3143, "longitude": 85.3217, "region": "East", "is_metro": False},
    {"iata": "GAU", "name": "Lokpriya Gopinath Bordoloi International Airport", "city": "Guwahati", "state": "Assam", "latitude": 26.1061, "longitude": 91.5859, "region": "North-East", "is_metro": False},
    {"iata": "IMF", "name": "Bir Tikendrajit International Airport", "city": "Imphal", "state": "Manipur", "latitude": 24.7600, "longitude": 93.8967, "region": "North-East", "is_metro": False},
    {"iata": "LKO", "name": "Chaudhary Charan Singh International Airport", "city": "Lucknow", "state": "Uttar Pradesh", "latitude": 26.7606, "longitude": 80.8893, "region": "North", "is_metro": False},
    {"iata": "VNS", "name": "Lal Bahadur Shastri International Airport", "city": "Varanasi", "state": "Uttar Pradesh", "latitude": 25.4497, "longitude": 82.8593, "region": "North", "is_metro": False},
    {"iata": "JAI", "name": "Jaipur International Airport", "city": "Jaipur", "state": "Rajasthan", "latitude": 26.8242, "longitude": 75.8122, "region": "North", "is_metro": False},
    {"iata": "SXR", "name": "Sheikh ul-Alam International Airport", "city": "Srinagar", "state": "Jammu and Kashmir", "latitude": 34.0086, "longitude": 74.7741, "region": "North", "is_metro": False},
    {"iata": "COK", "name": "Cochin International Airport", "city": "Kochi", "state": "Kerala", "latitude": 10.1520, "longitude": 76.4019, "region": "South", "is_metro": False},
    {"iata": "PAT", "name": "Jay Prakash Narayan Airport", "city": "Patna", "state": "Bihar", "latitude": 25.5913, "longitude": 85.0880, "region": "East", "is_metro": False},
    {"iata": "AYJ", "name": "Maharishi Valmiki International Airport", "city": "Ayodhya", "state": "Uttar Pradesh", "latitude": 26.7456, "longitude": 82.1558, "region": "North", "is_metro": False},
    {"iata": "IXA", "name": "Maharaja Bir Bikram Airport", "city": "Agartala", "state": "Tripura", "latitude": 23.8870, "longitude": 91.2405, "region": "North-East", "is_metro": False},
    {"iata": "BBI", "name": "Biju Patnaik International Airport", "city": "Bhubaneswar", "state": "Odisha", "latitude": 20.2444, "longitude": 85.8178, "region": "East", "is_metro": False},
    {"iata": "VTZ", "name": "Visakhapatnam International Airport", "city": "Visakhapatnam", "state": "Andhra Pradesh", "latitude": 17.7212, "longitude": 83.2245, "region": "South", "is_metro": False},
    {"iata": "TRV", "name": "Thiruvananthapuram International Airport", "city": "Thiruvananthapuram", "state": "Kerala", "latitude": 8.4821, "longitude": 76.9200, "region": "South", "is_metro": False},
    {"iata": "IDR", "name": "Devi Ahilya Bai Holkar Airport", "city": "Indore", "state": "Madhya Pradesh", "latitude": 22.7217, "longitude": 75.8011, "region": "Central", "is_metro": False},
    {"iata": "UDR", "name": "Maharana Pratap Airport", "city": "Udaipur", "state": "Rajasthan", "latitude": 24.6177, "longitude": 73.8961, "region": "North", "is_metro": False},
    {"iata": "JDH", "name": "Jodhpur Airport", "city": "Jodhpur", "state": "Rajasthan", "latitude": 26.2514, "longitude": 73.0489, "region": "North", "is_metro": False},
    {"iata": "ATQ", "name": "Sri Guru Ram Dass Jee International Airport", "city": "Amritsar", "state": "Punjab", "latitude": 31.7096, "longitude": 74.7973, "region": "North", "is_metro": False},
    {"iata": "DED", "name": "Dehradun Airport (Jolly Grant)", "city": "Dehradun", "state": "Uttarakhand", "latitude": 30.1897, "longitude": 78.1803, "region": "North", "is_metro": False},
    {"iata": "RAJ", "name": "Rajkot International Airport", "city": "Rajkot", "state": "Gujarat", "latitude": 22.3092, "longitude": 70.7794, "region": "West", "is_metro": False},
    {"iata": "TIR", "name": "Tirupati Airport", "city": "Tirupati", "state": "Andhra Pradesh", "latitude": 13.6325, "longitude": 79.5434, "region": "South", "is_metro": False},
    {"iata": "BDQ", "name": "Vadodara Airport", "city": "Vadodara", "state": "Gujarat", "latitude": 22.3362, "longitude": 73.2263, "region": "West", "is_metro": False},
    {"iata": "IXC", "name": "Shaheed Bhagat Singh International Airport", "city": "Chandigarh", "state": "Chandigarh", "latitude": 30.6735, "longitude": 76.7885, "region": "North", "is_metro": False},
    {"iata": "CCJ", "name": "Calicut International Airport", "city": "Kozhikode", "state": "Kerala", "latitude": 11.1368, "longitude": 75.9553, "region": "South", "is_metro": False},
]

# 2. 5 AIRLINES
AIRLINES_DATA = [
    {
        "code": "6E",
        "name": "IndiGo",
        "full_name": "InterGlobe Aviation Limited",
        "market_share": 61.2,
        "fleet_size": 384,
        "on_time_percent": 88.6,
        "base_fare_multiplier": 1.00,
        "color": "#0052CC"
    },
    {
        "code": "AI",
        "name": "Air India",
        "full_name": "Air India Limited (Tata Group)",
        "market_share": 14.8,
        "fleet_size": 146,
        "on_time_percent": 82.4,
        "base_fare_multiplier": 1.15,
        "color": "#E01933"
    },
    {
        "code": "IX",
        "name": "Air India Express",
        "full_name": "Air India Express Limited",
        "market_share": 8.5,
        "fleet_size": 88,
        "on_time_percent": 84.1,
        "base_fare_multiplier": 0.95,
        "color": "#F37021"
    },
    {
        "code": "QP",
        "name": "Akasa Air",
        "full_name": "SNV Aviation Private Limited",
        "market_share": 5.4,
        "fleet_size": 28,
        "on_time_percent": 89.4,
        "base_fare_multiplier": 0.92,
        "color": "#FF6200"
    },
    {
        "code": "SG",
        "name": "SpiceJet",
        "full_name": "SpiceJet Limited",
        "market_share": 3.6,
        "fleet_size": 54,
        "on_time_percent": 74.2,
        "base_fare_multiplier": 0.88,
        "color": "#E02828"
    }
]

# 3. ROUTE TEMPLATES (135+ High Density Domestic Corridors)
ROUTE_SPECS = [
    # Metros (High Density)
    ("DEL", "BOM", "Metro", 1148, 130, 3.8, "6E,AI,IX,QP,SG"),
    ("BOM", "DEL", "Metro", 1148, 130, 3.8, "6E,AI,IX,QP,SG"),
    ("DEL", "BLR", "Metro", 1740, 165, 3.2, "6E,AI,IX,QP,SG"),
    ("BLR", "DEL", "Metro", 1740, 165, 3.2, "6E,AI,IX,QP,SG"),
    ("BOM", "BLR", "Metro", 842, 105, 2.9, "6E,AI,IX,QP,SG"),
    ("BLR", "BOM", "Metro", 842, 105, 2.9, "6E,AI,IX,QP,SG"),
    ("DEL", "HYD", "Metro", 1260, 135, 2.5, "6E,AI,QP,SG"),
    ("HYD", "DEL", "Metro", 1260, 135, 2.5, "6E,AI,QP,SG"),
    ("DEL", "CCU", "Metro", 1305, 140, 2.4, "6E,AI,SG"),
    ("CCU", "DEL", "Metro", 1305, 140, 2.4, "6E,AI,SG"),
    ("BOM", "MAA", "Metro", 1033, 120, 2.2, "6E,AI,QP"),
    ("MAA", "BOM", "Metro", 1033, 120, 2.2, "6E,AI,QP"),
    ("BLR", "HYD", "Metro", 501, 75, 2.0, "6E,AI,IX,QP"),
    ("HYD", "BLR", "Metro", 501, 75, 2.0, "6E,AI,IX,QP"),
    ("DEL", "MAA", "Metro", 1760, 170, 2.1, "6E,AI,SG"),
    ("MAA", "DEL", "Metro", 1760, 170, 2.1, "6E,AI,SG"),
    ("BOM", "HYD", "Metro", 620, 90, 1.9, "6E,AI,QP"),
    ("HYD", "BOM", "Metro", 620, 90, 1.9, "6E,AI,QP"),
    ("BOM", "CCU", "Metro", 1660, 165, 2.0, "6E,AI,SG"),
    ("CCU", "BOM", "Metro", 1660, 165, 2.0, "6E,AI,SG"),
    ("CCU", "BLR", "Metro", 1560, 155, 1.8, "6E,AI,QP"),
    ("BLR", "CCU", "Metro", 1560, 155, 1.8, "6E,AI,QP"),
    ("MAA", "BLR", "Metro", 290, 55, 1.6, "6E,AI"),
    ("BLR", "MAA", "Metro", 290, 55, 1.6, "6E,AI"),
    ("MAA", "HYD", "Metro", 520, 75, 1.5, "6E,AI,QP"),
    ("HYD", "MAA", "Metro", 520, 75, 1.5, "6E,AI,QP"),

    # Business Corridors (Including Kolkata, Rajkot, Durgapur, Ranchi, Visakhapatnam, Chandigarh)
    ("DEL", "AMD", "Business", 775, 95, 2.2, "6E,AI,QP,SG"),
    ("AMD", "DEL", "Business", 775, 95, 2.2, "6E,AI,QP,SG"),
    ("BOM", "AMD", "Business", 440, 70, 2.0, "6E,AI,QP,SG"),
    ("AMD", "BOM", "Business", 440, 70, 2.0, "6E,AI,QP,SG"),
    ("DEL", "PNQ", "Business", 1175, 130, 2.3, "6E,AI,QP,SG"),
    ("PNQ", "DEL", "Business", 1175, 130, 2.3, "6E,AI,QP,SG"),
    ("BLR", "PNQ", "Business", 735, 90, 1.9, "6E,AI,QP"),
    ("PNQ", "BLR", "Business", 735, 90, 1.9, "6E,AI,QP"),
    ("DEL", "IDR", "Business", 670, 85, 1.6, "6E,AI"),
    ("IDR", "DEL", "Business", 670, 85, 1.6, "6E,AI"),
    ("BOM", "IDR", "Business", 510, 75, 1.5, "6E,AI"),
    ("IDR", "BOM", "Business", 510, 75, 1.5, "6E,AI"),
    ("DEL", "IXC", "Business", 240, 55, 1.4, "6E,AI"),
    ("IXC", "DEL", "Business", 240, 55, 1.4, "6E,AI"),
    ("BOM", "IXC", "Business", 1360, 145, 1.3, "6E,AI"),
    ("IXC", "BOM", "Business", 1360, 145, 1.3, "6E,AI"),
    ("BLR", "AMD", "Business", 1310, 135, 1.4, "6E,AI,QP"),
    ("AMD", "BLR", "Business", 1310, 135, 1.4, "6E,AI,QP"),
    ("HYD", "AMD", "Business", 880, 105, 1.3, "6E,AI"),
    ("AMD", "HYD", "Business", 880, 105, 1.3, "6E,AI"),
    ("DEL", "NAG", "Business", 860, 105, 1.4, "6E,AI"),
    ("NAG", "DEL", "Business", 860, 105, 1.4, "6E,AI"),
    ("BOM", "NAG", "Business", 690, 90, 1.3, "6E,AI"),
    ("NAG", "BOM", "Business", 690, 90, 1.3, "6E,AI"),
    ("BOM", "RAJ", "Business", 430, 70, 1.1, "6E,AI"),
    ("RAJ", "BOM", "Business", 430, 70, 1.1, "6E,AI"),
    
    # Kolkata Corridors
    ("CCU", "AMD", "Business", 1610, 155, 1.4, "6E,AI,QP,SG"),
    ("AMD", "CCU", "Business", 1610, 155, 1.4, "6E,AI,QP,SG"),
    ("CCU", "BDQ", "Business", 1580, 150, 1.2, "6E,AI"),
    ("BDQ", "CCU", "Business", 1580, 150, 1.2, "6E,AI"),
    ("CCU", "VTZ", "Business", 770, 85, 1.3, "6E,AI"),
    ("VTZ", "CCU", "Business", 770, 85, 1.3, "6E,AI"),

    # Visakhapatnam Corridors
    ("VTZ", "HYD", "Business", 510, 75, 1.4, "6E,AI"),
    ("HYD", "VTZ", "Business", 510, 75, 1.4, "6E,AI"),
    ("VTZ", "DEL", "Business", 1370, 140, 1.4, "6E,AI"),
    ("DEL", "VTZ", "Business", 1370, 140, 1.4, "6E,AI"),

    # Rajkot Corridors
    ("RAJ", "PNQ", "Business", 530, 75, 1.3, "6E,AI"),
    ("PNQ", "RAJ", "Business", 530, 75, 1.3, "6E,AI"),
    ("RAJ", "HYD", "Business", 980, 110, 1.2, "6E,AI"),
    ("HYD", "RAJ", "Business", 980, 110, 1.2, "6E,AI"),
    ("RAJ", "BLR", "Business", 1240, 130, 1.3, "6E,AI"),
    ("BLR", "RAJ", "Business", 1240, 130, 1.3, "6E,AI"),

    # Durgapur Corridors
    ("RDP", "DEL", "Business", 1080, 120, 1.6, "6E,AI,SG"),
    ("DEL", "RDP", "Business", 1080, 120, 1.6, "6E,AI,SG"),
    ("RDP", "BLR", "Business", 1490, 150, 1.4, "6E,AI"),
    ("BLR", "RDP", "Business", 1490, 150, 1.4, "6E,AI"),
    ("RDP", "HYD", "Business", 1120, 120, 1.3, "6E,AI"),
    ("HYD", "RDP", "Business", 1120, 120, 1.3, "6E,AI"),
    ("RDP", "MAA", "Business", 1350, 140, 1.2, "6E,AI"),
    ("MAA", "RDP", "Business", 1350, 140, 1.2, "6E,AI"),
    ("RDP", "BOM", "Business", 1480, 150, 1.5, "6E,AI,SG"),
    ("BOM", "RDP", "Business", 1480, 150, 1.5, "6E,AI,SG"),

    # Ranchi Corridors
    ("IXR", "LKO", "Business", 620, 80, 1.2, "6E,AI"),
    ("LKO", "IXR", "Business", 620, 80, 1.2, "6E,AI"),
    ("IXR", "CCU", "Business", 330, 55, 1.5, "6E,AI,IX"),
    ("CCU", "IXR", "Business", 330, 55, 1.5, "6E,AI,IX"),
    ("IXR", "DEL", "Business", 990, 115, 1.6, "6E,AI,SG"),
    ("DEL", "IXR", "Business", 990, 115, 1.6, "6E,AI,SG"),
    ("IXR", "BOM", "Business", 1370, 140, 1.5, "6E,AI"),
    ("BOM", "IXR", "Business", 1370, 140, 1.5, "6E,AI"),
    ("IXR", "PAT", "Business", 260, 50, 1.3, "6E,AI"),
    ("PAT", "IXR", "Business", 260, 50, 1.3, "6E,AI"),
    ("IXR", "PNQ", "Business", 1290, 135, 1.2, "6E,AI"),
    ("PNQ", "IXR", "Business", 1290, 135, 1.2, "6E,AI"),

    # Chandigarh Corridors
    ("IXC", "BLR", "Business", 1980, 185, 1.4, "6E,AI"),
    ("BLR", "IXC", "Business", 1980, 185, 1.4, "6E,AI"),
    ("IXC", "PNQ", "Business", 1410, 145, 1.3, "6E,AI"),
    ("PNQ", "IXC", "Business", 1410, 145, 1.3, "6E,AI"),
    ("IXC", "MAA", "Business", 2010, 190, 1.2, "6E,AI"),
    ("MAA", "IXC", "Business", 2010, 190, 1.2, "6E,AI"),

    # Bagdogra Corridors
    ("IXB", "HYD", "Business", 1460, 140, 1.2, "6E,AI"),
    ("HYD", "IXB", "Business", 1460, 140, 1.2, "6E,AI"),
    ("IXB", "BLR", "Business", 1820, 175, 1.4, "6E,AI"),
    ("BLR", "IXB", "Business", 1820, 175, 1.4, "6E,AI"),
    ("IXB", "BOM", "Business", 1790, 170, 1.5, "6E,AI,SG"),
    ("BOM", "IXB", "Business", 1790, 170, 1.5, "6E,AI,SG"),
    ("IXB", "MAA", "Business", 1680, 160, 1.2, "6E,AI"),
    ("MAA", "IXB", "Business", 1680, 160, 1.2, "6E,AI"),

    # North-East Connectors (GAU, IMF, IXA, IXB)
    ("DEL", "GAU", "North-East", 1460, 145, 2.0, "6E,AI,SG"),
    ("GAU", "DEL", "North-East", 1460, 145, 2.0, "6E,AI,SG"),
    ("CCU", "GAU", "North-East", 510, 70, 1.9, "6E,AI,SG"),
    ("GAU", "CCU", "North-East", 510, 70, 1.9, "6E,AI,SG"),
    ("BOM", "GAU", "North-East", 2070, 195, 1.5, "6E,AI"),
    ("GAU", "BOM", "North-East", 2070, 195, 1.5, "6E,AI"),
    ("BLR", "GAU", "North-East", 2080, 195, 1.4, "6E,AI"),
    ("GAU", "BLR", "North-East", 2080, 195, 1.4, "6E,AI"),
    ("GAU", "IMF", "North-East", 270, 50, 1.2, "6E,AI"),
    ("IMF", "GAU", "North-East", 270, 50, 1.2, "6E,AI"),
    ("CCU", "IMF", "North-East", 630, 85, 1.3, "6E,AI"),
    ("IMF", "CCU", "North-East", 630, 85, 1.3, "6E,AI"),
    ("GAU", "IXA", "North-East", 250, 50, 1.1, "6E,AI"),
    ("IXA", "GAU", "North-East", 250, 50, 1.1, "6E,AI"),
    ("CCU", "IXA", "North-East", 330, 55, 1.3, "6E,AI"),
    ("IXA", "CCU", "North-East", 330, 55, 1.3, "6E,AI"),
    ("DEL", "IXB", "North-East", 1120, 120, 1.6, "6E,AI,SG"),
    ("IXB", "DEL", "North-East", 1120, 120, 1.6, "6E,AI,SG"),
    ("CCU", "IXB", "North-East", 450, 65, 1.5, "6E,AI,SG"),
    ("IXB", "CCU", "North-East", 450, 65, 1.5, "6E,AI,SG"),
    ("IXB", "GAU", "North-East", 330, 55, 1.3, "6E,AI,SG"),
    ("GAU", "IXB", "North-East", 330, 55, 1.3, "6E,AI,SG"),
    ("IXB", "IMF", "North-East", 520, 75, 1.1, "6E,AI"),
    ("IMF", "IXB", "North-East", 520, 75, 1.1, "6E,AI"),
    ("IXA", "IMF", "North-East", 180, 45, 1.2, "6E,AI"),
    ("IMF", "IXA", "North-East", 180, 45, 1.2, "6E,AI"),
    ("IXA", "IXB", "North-East", 460, 65, 1.2, "6E,AI"),
    ("IXB", "IXA", "North-East", 460, 65, 1.2, "6E,AI"),
    ("IXA", "DEL", "North-East", 1510, 150, 1.4, "6E,AI"),
    ("DEL", "IXA", "North-East", 1510, 150, 1.4, "6E,AI"),
    ("IXA", "BLR", "North-East", 2040, 190, 1.3, "6E,AI"),
    ("BLR", "IXA", "North-East", 2040, 190, 1.3, "6E,AI"),

    # Tourism Hotspots (GOI, SXR, DED, TRV, COK, UDR, JDH, JAI, CCJ)
    ("DEL", "GOI", "Tourism", 1515, 150, 2.6, "6E,AI,IX,QP,SG"),
    ("GOI", "DEL", "Tourism", 1515, 150, 2.6, "6E,AI,IX,QP,SG"),
    ("BOM", "GOI", "Tourism", 435, 65, 2.5, "6E,AI,IX,QP,SG"),
    ("GOI", "BOM", "Tourism", 435, 65, 2.5, "6E,AI,IX,QP,SG"),
    ("BLR", "GOI", "Tourism", 490, 75, 2.1, "6E,AI,IX,QP"),
    ("GOI", "BLR", "Tourism", 490, 75, 2.1, "6E,AI,IX,QP"),
    ("HYD", "GOI", "Tourism", 540, 80, 1.7, "6E,AI,QP"),
    ("GOI", "HYD", "Tourism", 540, 80, 1.7, "6E,AI,QP"),
    ("CCU", "GOI", "Tourism", 1720, 165, 1.4, "6E,AI,IX"),
    ("GOI", "CCU", "Tourism", 1720, 165, 1.4, "6E,AI,IX"),
    ("DEL", "SXR", "Tourism", 650, 85, 2.2, "6E,AI,SG"),
    ("SXR", "DEL", "Tourism", 650, 85, 2.2, "6E,AI,SG"),
    ("BOM", "SXR", "Tourism", 1680, 170, 1.6, "6E,AI,SG"),
    ("SXR", "BOM", "Tourism", 1680, 170, 1.6, "6E,AI,SG"),
    ("SXR", "AMD", "Tourism", 1310, 135, 1.3, "6E,AI"),
    ("AMD", "SXR", "Tourism", 1310, 135, 1.3, "6E,AI"),
    ("SXR", "CCU", "Tourism", 1830, 180, 1.3, "6E,AI"),
    ("CCU", "SXR", "Tourism", 1830, 180, 1.3, "6E,AI"),
    ("SXR", "IXC", "Tourism", 440, 65, 1.4, "6E,AI"),
    ("IXC", "SXR", "Tourism", 440, 65, 1.4, "6E,AI"),
    ("IXC", "JAI", "Tourism", 470, 65, 1.3, "6E,AI"),
    ("JAI", "IXC", "Tourism", 470, 65, 1.3, "6E,AI"),
    ("DEL", "UDR", "Tourism", 570, 75, 1.5, "6E,AI"),
    ("UDR", "DEL", "Tourism", 570, 75, 1.5, "6E,AI"),
    ("BOM", "UDR", "Tourism", 620, 80, 1.5, "6E,AI"),
    ("UDR", "BOM", "Tourism", 620, 80, 1.5, "6E,AI"),
    ("DEL", "JDH", "Tourism", 480, 70, 1.4, "6E,AI"),
    ("JDH", "DEL", "Tourism", 480, 70, 1.4, "6E,AI"),
    ("BOM", "JDH", "Tourism", 780, 95, 1.3, "6E,AI"),
    ("JDH", "BOM", "Tourism", 780, 95, 1.3, "6E,AI"),
    ("DEL", "DED", "Tourism", 210, 50, 1.5, "6E,AI"),
    ("DED", "DEL", "Tourism", 210, 50, 1.5, "6E,AI"),
    ("DED", "AMD", "Tourism", 920, 105, 1.3, "6E,AI"),
    ("AMD", "DED", "Tourism", 920, 105, 1.3, "6E,AI"),
    ("DED", "BOM", "Tourism", 1350, 140, 1.4, "6E,AI"),
    ("BOM", "DED", "Tourism", 1350, 140, 1.4, "6E,AI"),
    ("DED", "SXR", "Tourism", 470, 70, 1.3, "6E,AI"),
    ("SXR", "DED", "Tourism", 470, 70, 1.3, "6E,AI"),
    ("DEL", "COK", "Tourism", 2060, 195, 1.8, "6E,AI"),
    ("COK", "DEL", "Tourism", 2060, 195, 1.8, "6E,AI"),
    ("BOM", "COK", "Tourism", 1070, 120, 1.7, "6E,AI,QP"),
    ("COK", "BOM", "Tourism", 1070, 120, 1.7, "6E,AI,QP"),
    ("BLR", "COK", "Tourism", 370, 60, 1.4, "6E,AI"),
    ("COK", "BLR", "Tourism", 370, 60, 1.4, "6E,AI"),
    ("MAA", "TRV", "Tourism", 620, 80, 1.3, "6E,AI"),
    ("TRV", "MAA", "Tourism", 620, 80, 1.3, "6E,AI"),
    ("DEL", "TRV", "Tourism", 2240, 205, 1.4, "6E,AI"),
    ("TRV", "DEL", "Tourism", 2240, 205, 1.4, "6E,AI"),
    ("CCU", "TRV", "Tourism", 1980, 185, 1.2, "6E,AI"),
    ("TRV", "CCU", "Tourism", 1980, 185, 1.2, "6E,AI"),
    ("DEL", "JAI", "Tourism", 240, 50, 1.6, "6E,AI"),
    ("JAI", "DEL", "Tourism", 240, 50, 1.6, "6E,AI"),
    ("BOM", "JAI", "Tourism", 920, 110, 1.5, "6E,AI"),
    ("JAI", "BOM", "Tourism", 920, 110, 1.5, "6E,AI"),
    ("BLR", "CCJ", "Tourism", 300, 55, 1.2, "6E,AI"),
    ("CCJ", "BLR", "Tourism", 300, 55, 1.2, "6E,AI"),
    ("BOM", "CCJ", "Tourism", 940, 110, 1.2, "6E,AI"),
    ("CCJ", "BOM", "Tourism", 940, 110, 1.2, "6E,AI"),

    # Pilgrimage & Cultural Centers (AYJ, VNS, TIR, ATQ, PAT, LKO, BBI, DED)
    ("DEL", "AYJ", "Pilgrimage", 570, 75, 2.4, "6E,AI,IX,SG"),
    ("AYJ", "DEL", "Pilgrimage", 570, 75, 2.4, "6E,AI,IX,SG"),
    ("BOM", "AYJ", "Pilgrimage", 1280, 135, 2.1, "6E,AI,IX"),
    ("AYJ", "BOM", "Pilgrimage", 1280, 135, 2.1, "6E,AI,IX"),
    ("BLR", "AYJ", "Pilgrimage", 1520, 155, 1.7, "6E,AI,IX"),
    ("AYJ", "BLR", "Pilgrimage", 1520, 155, 1.7, "6E,AI,IX"),
    ("AMD", "AYJ", "Pilgrimage", 990, 115, 1.6, "6E,AI,SG"),
    ("AYJ", "AMD", "Pilgrimage", 990, 115, 1.6, "6E,AI,SG"),
    ("AYJ", "DED", "Pilgrimage", 530, 70, 1.3, "6E,AI"),
    ("DED", "AYJ", "Pilgrimage", 530, 70, 1.3, "6E,AI"),
    ("AYJ", "HYD", "Pilgrimage", 1080, 120, 1.4, "6E,AI,IX"),
    ("HYD", "AYJ", "Pilgrimage", 1080, 120, 1.4, "6E,AI,IX"),
    ("AYJ", "CCU", "Pilgrimage", 710, 90, 1.5, "6E,AI,IX"),
    ("CCU", "AYJ", "Pilgrimage", 710, 90, 1.5, "6E,AI,IX"),
    ("DED", "VNS", "Pilgrimage", 720, 90, 1.2, "6E,AI"),
    ("VNS", "DED", "Pilgrimage", 720, 90, 1.2, "6E,AI"),
    ("DEL", "VNS", "Pilgrimage", 680, 85, 2.1, "6E,AI,SG"),
    ("VNS", "DEL", "Pilgrimage", 680, 85, 2.1, "6E,AI,SG"),
    ("BOM", "VNS", "Pilgrimage", 1250, 135, 1.8, "6E,AI,SG"),
    ("VNS", "BOM", "Pilgrimage", 1250, 135, 1.8, "6E,AI,SG"),
    ("BLR", "VNS", "Pilgrimage", 1430, 150, 1.5, "6E,AI"),
    ("VNS", "BLR", "Pilgrimage", 1430, 150, 1.5, "6E,AI"),
    ("DEL", "ATQ", "Pilgrimage", 410, 65, 1.7, "6E,AI,SG"),
    ("ATQ", "DEL", "Pilgrimage", 410, 65, 1.7, "6E,AI,SG"),
    ("BOM", "ATQ", "Pilgrimage", 1420, 150, 1.4, "6E,AI"),
    ("ATQ", "BOM", "Pilgrimage", 1420, 150, 1.4, "6E,AI"),
    ("BLR", "TIR", "Pilgrimage", 210, 50, 1.4, "6E,AI"),
    ("TIR", "BLR", "Pilgrimage", 210, 50, 1.4, "6E,AI"),
    ("HYD", "TIR", "Pilgrimage", 440, 70, 1.5, "6E,AI"),
    ("TIR", "HYD", "Pilgrimage", 440, 70, 1.5, "6E,AI"),
    ("TIR", "DEL", "Pilgrimage", 1690, 165, 1.4, "6E,AI"),
    ("DEL", "TIR", "Pilgrimage", 1690, 165, 1.4, "6E,AI"),
    ("TIR", "BOM", "Pilgrimage", 950, 105, 1.3, "6E,AI"),
    ("BOM", "TIR", "Pilgrimage", 950, 105, 1.3, "6E,AI"),
    ("DEL", "PAT", "Pilgrimage", 850, 100, 2.0, "6E,AI,SG"),
    ("PAT", "DEL", "Pilgrimage", 850, 100, 2.0, "6E,AI,SG"),
    ("BOM", "PAT", "Pilgrimage", 1460, 150, 1.7, "6E,AI,SG"),
    ("PAT", "BOM", "Pilgrimage", 1460, 150, 1.7, "6E,AI,SG"),
    ("BLR", "PAT", "Pilgrimage", 1610, 160, 1.5, "6E,AI"),
    ("PAT", "BLR", "Pilgrimage", 1610, 160, 1.5, "6E,AI"),
    ("DEL", "LKO", "Pilgrimage", 420, 65, 1.8, "6E,AI"),
    ("LKO", "DEL", "Pilgrimage", 420, 65, 1.8, "6E,AI"),
    ("BOM", "LKO", "Pilgrimage", 1190, 125, 1.7, "6E,AI"),
    ("LKO", "BOM", "Pilgrimage", 1190, 125, 1.7, "6E,AI"),
    ("DEL", "BBI", "Pilgrimage", 1270, 130, 1.6, "6E,AI"),
    ("BBI", "DEL", "Pilgrimage", 1270, 130, 1.6, "6E,AI"),
    ("CCU", "BBI", "Pilgrimage", 370, 60, 1.3, "6E,AI"),
    ("BBI", "CCU", "Pilgrimage", 370, 60, 1.3, "6E,AI"),
    ("CCU", "PAT", "Pilgrimage", 470, 70, 1.4, "6E,AI"),
    ("PAT", "CCU", "Pilgrimage", 470, 70, 1.4, "6E,AI"),
]

# 4. 24 FESTIVALS DATA
FESTIVALS_DATA = [
    {"name": "Makar Sankranti & Kite Festival", "slug": "makar-sankranti", "start": "2026-01-13", "end": "2026-01-16", "region": "Gujarat & Western India", "surge": 1.45, "desc": "Massive demand surge into Ahmedabad, Surat and Jaipur for the International Kite Festival."},
    {"name": "Pongal Harvest Festival", "slug": "pongal", "start": "2026-01-14", "end": "2026-01-18", "region": "Tamil Nadu & South India", "surge": 1.52, "desc": "Peak outbound and inbound travel from Bengaluru, Mumbai and Delhi into Chennai and Madurai."},
    {"name": "Republic Day Extended Weekend", "slug": "republic-day", "start": "2026-01-23", "end": "2026-01-26", "region": "Pan-India Tourism", "surge": 1.38, "desc": "High leisure travel spikes to Goa, Srinagar, Udaipur, and Dehradun."},
    {"name": "Maha Shivratri", "slug": "maha-shivratri", "start": "2026-02-14", "end": "2026-02-16", "region": "Varanasi, Ujjain, Rishikesh", "surge": 1.42, "desc": "Pilgrimage surge into Varanasi (VNS), Indore/Ujjain (IDR), and Dehradun (DED)."},
    {"name": "Holi Festival of Colors", "slug": "holi", "start": "2026-03-02", "end": "2026-03-05", "region": "North & Central India", "surge": 1.74, "desc": "Severe price escalation from Mumbai, Bengaluru, Hyderabad to Delhi, Patna, Lucknow, Varanasi, and Jaipur."},
    {"name": "Eid ul-Fitr", "slug": "eid-ul-fitr", "start": "2026-03-20", "end": "2026-03-23", "region": "Pan-India & Kerala", "surge": 1.68, "desc": "High homecoming demand to Lucknow, Hyderabad, Kozhikode, and Srinagar."},
    {"name": "Ram Navami", "slug": "ram-navami", "start": "2026-03-26", "end": "2026-03-29", "region": "Ayodhya & North India", "surge": 1.82, "desc": "Extreme demand spike into Ayodhya (AYJ), Varanasi (VNS), and Lucknow (LKO)."},
    {"name": "Baisakhi & Vishu", "slug": "baisakhi", "start": "2026-04-13", "end": "2026-04-15", "region": "Punjab & Kerala", "surge": 1.35, "desc": "Festive travel spikes to Amritsar (ATQ), Kochi (COK), and Kozhikode (CCJ)."},
    {"name": "Rath Yatra Puri", "slug": "rath-yatra", "start": "2026-07-16", "end": "2026-07-20", "region": "Odisha & Eastern India", "surge": 1.62, "desc": "Pilgrimage surge into Bhubaneswar (BBI) and Kolkata (CCU)."},
    {"name": "Independence Day Long Weekend", "slug": "independence-day", "start": "2026-08-14", "end": "2026-08-17", "region": "Pan-India Leisure", "surge": 1.48, "desc": "Monsoon getaway demand spikes into Goa, Kochi, Srinagar, and Bagdogra."},
    {"name": "Raksha Bandhan", "slug": "raksha-bandhan", "start": "2026-08-27", "end": "2026-08-30", "region": "North & West India", "surge": 1.40, "desc": "Inter-city family travel spikes across Delhi, Mumbai, Jaipur, Lucknow, and Ahmedabad."},
    {"name": "Janmashtami", "slug": "janmashtami", "start": "2026-09-03", "end": "2026-09-06", "region": "Mathura, Vrindavan, Mumbai", "surge": 1.36, "desc": "Delhi and Mumbai transit spikes with Dahi Handi and Braj celebrations."},
    {"name": "Ganesh Chaturthi", "slug": "ganesh-chaturthi", "start": "2026-09-14", "end": "2026-09-24", "region": "Maharashtra & Goa", "surge": 1.65, "desc": "Intense inbound travel to Mumbai (BOM) and Pune (PNQ) from across all metros."},
    {"name": "Onam Harvest Festival", "slug": "onam", "start": "2026-09-22", "end": "2026-09-27", "region": "Kerala & GCC Transit", "surge": 1.78, "desc": "Kerala's biggest homecoming surge into Kochi (COK), Thiruvananthapuram (TRV), and Kozhikode (CCJ)."},
    {"name": "Gandhi Jayanti Weekend", "slug": "gandhi-jayanti", "start": "2026-10-02", "end": "2026-10-04", "region": "Leisure & Tourism", "surge": 1.34, "desc": "Autumn getaway rush to Goa, Udaipur, and Dehradun."},
    {"name": "Durga Puja & Navratri", "slug": "durga-puja", "start": "2026-10-17", "end": "2026-10-23", "region": "West Bengal, Gujarat & Delhi", "surge": 1.86, "desc": "Highest annual airfare surge into Kolkata (CCU) and Ahmedabad (AMD). Fares often hit 2.5x base."},
    {"name": "Dussehra (Vijayadashami)", "slug": "dussehra", "start": "2026-10-20", "end": "2026-10-23", "region": "Pan-India & Mysuru", "surge": 1.55, "desc": "Bengaluru, Delhi, and Hyderabad travel peaks for Dussehra holidays."},
    {"name": "Diwali (Festival of Lights)", "slug": "diwali", "start": "2026-11-06", "end": "2026-11-12", "region": "Pan-India", "surge": 2.15, "desc": "The single highest domestic travel peak in India. Pre-Diwali inbound fares hit historic ceilings."},
    {"name": "Govardhan Puja & Bhai Dooj", "slug": "bhai-dooj", "start": "2026-11-10", "end": "2026-11-13", "region": "North & Western India", "surge": 1.60, "desc": "Extended Diwali holiday travel and sister visitation routes."},
    {"name": "Chhath Puja Mahaparv", "slug": "chhath-puja", "start": "2026-11-14", "end": "2026-11-18", "region": "Bihar, Eastern UP, Jharkhand", "surge": 2.30, "desc": "Most extreme supply-constrained route surges in India into Patna (PAT), Ranchi (IXR), Varanasi (VNS)."},
    {"name": "Guru Nanak Jayanti", "slug": "guru-nanak-jayanti", "start": "2026-11-23", "end": "2026-11-26", "region": "Amritsar & Punjab", "surge": 1.45, "desc": "Pilgrimage surge into Sri Guru Ram Dass Jee International Airport, Amritsar (ATQ)."},
    {"name": "Christmas Holidays", "slug": "christmas", "start": "2026-12-22", "end": "2026-12-27", "region": "Goa, Kerala, North-East", "surge": 1.95, "desc": "Peak season holiday rush into Goa (GOI), Kochi (COK), and Shillong/Guwahati (GAU)."},
    {"name": "New Year Eve & Winter Surge", "slug": "new-year", "start": "2026-12-28", "end": "2027-01-03", "region": "Goa, Rajasthan, Kashmir", "surge": 2.25, "desc": "Annual peak tourism fares into Goa, Udaipur, Jodhpur, and Srinagar."},
]


def seed_database(db: Session):
    """Seed all primary tables if not already populated."""
    logger.info("Verifying and seeding database...")

    # 1. Seed / Upsert Airports (All 36 Indian Hubs)
    logger.info(f"Synchronizing {len(AIRPORTS_DATA)} airports...")
    for ap in AIRPORTS_DATA:
        existing = db.query(Airport).filter(Airport.iata == ap["iata"]).first()
        if not existing:
            db.add(Airport(**ap))
        else:
            for k, v in ap.items():
                setattr(existing, k, v)
    db.commit()
    logger.info(f"Airports verified: {db.query(Airport).count()} total.")

    # 2. Seed / Upsert Airlines
    airline_count = db.query(Airline).count()
    if airline_count < 5:
        logger.info(f"Seeding {len(AIRLINES_DATA)} airlines...")
        for al in AIRLINES_DATA:
            existing = db.query(Airline).filter(Airline.code == al["code"]).first()
            if not existing:
                db.add(Airline(**al))
        db.commit()
    logger.info(f"Airlines verified: {db.query(Airline).count()} total.")

    # 3. Seed / Expand Routes
    logger.info("Synchronizing domestic route network (135+ sectors)...")
    routes_added = 0
    for spec in ROUTE_SPECS:
        if isinstance(spec, dict):
            orig = spec["origin"]
            dest = spec["dest"]
            cat = spec["cat"]
            dist = spec["dist"]
            time = spec["time"]
            weight = spec["weight"]
            airlines = spec["airlines"]
        else:
            orig, dest, cat, dist, time, weight, airlines = spec

        existing = db.query(Route).filter(Route.origin_iata == orig, Route.destination_iata == dest).first()
        if not existing:
            base_calc = round(max(2400.0, dist * 4.2), 0)
            db.add(Route(
                origin_iata=orig,
                destination_iata=dest,
                distance_km=dist,
                flight_time_mins=time,
                category=cat,
                route_weight=weight,
                base_fare=base_calc,
                airline_availability=airlines,
                is_active=True
            ))
            routes_added += 1
    db.commit()
    total_routes = db.query(Route).count()
    logger.info(f"Routes synchronized: {total_routes} total active domestic routes ({routes_added} newly added).")

    # 4. Seed Festivals
    fest_count = db.query(FestivalCalendar).count()
    if fest_count < 20:
        logger.info(f"Seeding {len(FESTIVALS_DATA)} festivals...")
        for f in FESTIVALS_DATA:
            existing = db.query(FestivalCalendar).filter(FestivalCalendar.slug == f["slug"]).first()
            if not existing:
                db.add(FestivalCalendar(
                    name=f["name"],
                    slug=f["slug"],
                    start_date=datetime.strptime(f["start"], "%Y-%m-%d").date(),
                    end_date=datetime.strptime(f["end"], "%Y-%m-%d").date(),
                    region_focus=f["region"],
                    surge_factor=f["surge"],
                    description=f["desc"]
                ))
        db.commit()
    logger.info(f"Festivals verified: {db.query(FestivalCalendar).count()} active festival calendars.")

    # 5. Link Festival Routes with Full Corridor Synchronization
    logger.info("Syncing high-surge festival routes with database...")
    festivals = db.query(FestivalCalendar).all()
    fest_map = {f.slug: f for f in festivals}
    airports = {a.iata: a for a in db.query(Airport).all()}

    fest_json_path = Path(__file__).resolve().parent.parent / "data" / "festival_routes.json"
    if fest_json_path.exists():
        with open(fest_json_path, "r", encoding="utf-8") as f:
            fest_configs = json.load(f)

        for fcfg in fest_configs:
            fslug = fcfg.get("slug")
            festival_obj = fest_map.get(fslug)
            if not festival_obj:
                continue

            rec_routes = fcfg.get("recommended_routes", [])
            surge_mult = fcfg.get("surge_multiplier", 1.6)
            surge_pct = round((surge_mult - 1.0) * 100.0, 1)
            b_window = fcfg.get("booking_window", "25-40 days")

            for rkey in rec_routes:
                parts = rkey.replace("→", "-").replace("➔", "-").replace("↔️", "-").split("-")
                if len(parts) != 2:
                    continue
                orig_iata, dest_iata = parts[0].strip().upper(), parts[1].strip().upper()

                # Ensure Route exists in routes table
                route_obj = db.query(Route).filter(Route.origin_iata == orig_iata, Route.destination_iata == dest_iata).first()
                if not route_obj and orig_iata in airports and dest_iata in airports:
                    orig_a = airports[orig_iata]
                    dest_a = airports[dest_iata]
                    lat1, lon1 = orig_a.latitude, orig_a.longitude
                    lat2, lon2 = dest_a.latitude, dest_a.longitude
                    R = 6371.0
                    dlat = math.radians(lat2 - lat1)
                    dlon = math.radians(lon2 - lon1)
                    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
                    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
                    dist_km = max(round(R * c, 1), 250.0)
                    flt_time = round((dist_km / 750.0) * 60 + 35)
                    base_fare = round(2800 + dist_km * 3.6, 0)
                    
                    cat = "Pilgrimage" if dest_iata in ["VNS", "BBI", "AYJ", "TIR", "DED"] else "Tourism"
                    route_obj = Route(
                        origin_iata=orig_iata,
                        destination_iata=dest_iata,
                        distance_km=int(dist_km),
                        flight_time_mins=int(flt_time),
                        category=cat,
                        route_weight=1.0,
                        base_fare=float(base_fare),
                        airline_availability="6E,AI",
                        is_active=True
                    )
                    db.add(route_obj)
                    db.commit()
                    db.refresh(route_obj)

                if route_obj:
                    calculated_apix = round(100.0 * surge_mult, 2)
                    calculated_spike = round((route_obj.base_fare or 6500.0) * surge_mult, 0)
                    airline_str = "IndiGo, Air India"

                    fr_obj = db.query(FestivalRoute).filter(
                        FestivalRoute.festival_id == festival_obj.id,
                        FestivalRoute.route_id == route_obj.id
                    ).first()

                    if not fr_obj:
                        fr_obj = FestivalRoute(
                            festival_id=festival_obj.id,
                            route_id=route_obj.id,
                            festival=festival_obj.name,
                            origin=orig_iata,
                            destination=dest_iata,
                            avg_fare=route_obj.base_fare,
                            apix=calculated_apix,
                            surge=surge_pct,
                            booking_window=b_window,
                            airline=airline_str,
                            avg_surge_pct=surge_pct,
                            historical_fare_spike=calculated_spike,
                            peak_days_before=3,
                            recommended_booking_window=b_window
                        )
                        db.add(fr_obj)
                    else:
                        fr_obj.festival = festival_obj.name
                        fr_obj.origin = orig_iata
                        fr_obj.destination = dest_iata
                        fr_obj.avg_fare = route_obj.base_fare
                        fr_obj.apix = calculated_apix
                        fr_obj.surge = surge_pct
                        fr_obj.booking_window = b_window
                        fr_obj.airline = airline_str
                        fr_obj.avg_surge_pct = surge_pct
                        fr_obj.historical_fare_spike = calculated_spike
                        fr_obj.recommended_booking_window = b_window

        db.commit()
    logger.info(f"Festival routes verified: {db.query(FestivalRoute).count()} active festival corridors.")

    # 6. Seed Fares (Ensure all routes have fare snapshots across windows)
    all_routes = db.query(Route).all()
    airlines = db.query(Airline).all()
    windows = [0, 3, 7, 14, 30, 60]
    window_multipliers = {
        0: 2.15,   # Same day / next day
        3: 1.65,   # 3 days out
        7: 1.25,   # 1 week out
        14: 1.08,  # 2 weeks out
        30: 0.96,  # 1 month out (sweet spot)
        60: 0.88   # 2 months out (early bird)
    }

    fares_to_add = []
    routes_without_fares = []
    for r in all_routes:
        fc = db.query(Fare).filter(Fare.route_id == r.id).count()
        if fc < 6:
            routes_without_fares.append(r)

    if routes_without_fares:
        logger.info(f"Generating fare profiles for {len(routes_without_fares)} routes...")
        for r in routes_without_fares:
            avail_codes = r.airline_availability.split(",") if r.airline_availability else ["6E", "AI"]
            route_airlines = [a for a in airlines if a.code in avail_codes]
            if not route_airlines:
                route_airlines = airlines[:2]

            rec_date = datetime.utcnow()
            for bw in windows:
                dep_date = (rec_date + timedelta(days=bw)).date()
                bw_mult = window_multipliers[bw]
                for al in route_airlines:
                    noise = 1.0 + (random.random() * 0.10 - 0.05)
                    al_mult = al.base_fare_multiplier or 1.0
                    fare_val = round(r.base_fare * bw_mult * al_mult * noise, 0)
                    tax_val = round(fare_val * 0.12, 0)
                    total_val = fare_val + tax_val

                    fares_to_add.append(Fare(
                        route_id=r.id,
                        airline_id=al.id,
                        departure_date=dep_date,
                        booking_window_days=bw,
                        fare_inr=fare_val,
                        tax_inr=tax_val,
                        total_fare_inr=total_val,
                        recorded_at=rec_date,
                        scrape_batch_id=f"batch_{rec_date.strftime('%Y%m%d')}"
                    ))

            if len(fares_to_add) >= 500:
                db.bulk_save_objects(fares_to_add)
                db.commit()
                fares_to_add = []

        if fares_to_add:
            db.bulk_save_objects(fares_to_add)
            db.commit()

    logger.info(f"Fares verified: {db.query(Fare).count()} total records.")

    # 7. Seed Historical APIx Records (30 days of national trend)
    apix_count = db.query(APIx).filter(APIx.level == "national").count()
    if apix_count < 25:
        logger.info("Generating 30-day historical APIx index trajectory...")
        today = date.today()
        base_apix = 112.4
        base_fare = 5420.0

        for i in range(30, -1, -1):
            day = today - timedelta(days=i)
            cycle = math.sin(i / 4.5) * 6.5 + math.cos(i / 8.0) * 3.2
            score = round(base_apix + cycle + (random.random() * 2.0 - 1.0), 1)
            avg_fare = round(base_fare + (cycle * 48.0) + (random.random() * 50.0), 0)

            ma7 = round(score - (math.sin(i / 6.0) * 1.5), 1)
            ma30 = round(111.8 + (math.cos(i / 15.0) * 0.8), 1)
            trend = "STRONG_BULLISH" if ma7 - ma30 > 3.0 else ("MODERATE_BULLISH" if ma7 - ma30 > 0.8 else "STABLE")

            existing = db.query(APIx).filter(APIx.level == "national", APIx.calculation_date == day).first()
            if not existing:
                db.add(APIx(
                    level="national",
                    entity_key="ALL",
                    calculation_date=day,
                    apix_score=score,
                    avg_fare=avg_fare,
                    fare_elasticity=-0.48,
                    moving_avg_7d=ma7,
                    moving_avg_30d=ma30,
                    trend_classification=trend,
                    volatility_score=1.85
                ))

        states = [
            ("Maharashtra", 118.2, 5950.0, "MODERATE_BULLISH"),
            ("Delhi", 115.4, 5780.0, "MODERATE_BULLISH"),
            ("Karnataka", 112.8, 5450.0, "STABLE"),
            ("West Bengal", 126.4, 6240.0, "STRONG_BULLISH"),
            ("Tamil Nadu", 108.5, 5120.0, "STABLE"),
            ("Telangana", 110.2, 5320.0, "STABLE"),
            ("Gujarat", 106.8, 4980.0, "MODERATE_BEARISH"),
            ("Kerala", 119.5, 6100.0, "MODERATE_BULLISH"),
            ("Goa", 134.2, 6850.0, "STRONG_BULLISH"),
            ("Assam", 128.0, 6420.0, "STRONG_BULLISH"),
            ("Bihar", 138.5, 7150.0, "STRONG_BULLISH"),
            ("Uttar Pradesh", 122.1, 5890.0, "MODERATE_BULLISH"),
            ("Rajasthan", 114.6, 5600.0, "STABLE"),
            ("Jammu and Kashmir", 142.0, 7450.0, "STRONG_BULLISH"),
            ("Punjab", 109.4, 5210.0, "STABLE"),
            ("Odisha", 111.0, 5380.0, "STABLE"),
        ]

        for state_name, s_score, s_fare, s_trend in states:
            existing = db.query(APIx).filter(APIx.level == "state", APIx.entity_key == state_name, APIx.calculation_date == today).first()
            if not existing:
                db.add(APIx(
                    level="state",
                    entity_key=state_name,
                    calculation_date=today,
                    apix_score=s_score,
                    avg_fare=s_fare,
                    fare_elasticity=-0.52,
                    moving_avg_7d=s_score - 1.2,
                    moving_avg_30d=s_score - 2.5,
                    trend_classification=s_trend,
                    volatility_score=2.1
                ))

        db.commit()

    # 8. Automatically recalculate live daily APIx for all routes
    try:
        from backend.services.apix_engine import calculate_daily_apix
        calculate_daily_apix(db, date.today())
        logger.info("Live daily APIx calculations updated automatically.")
    except Exception as e:
        logger.warning(f"Could not calculate daily APIx: {e}")

    # 9. Seed Credit Cards & Bank Offers for Smart Fare Saver
    CARDS_DATA = [
        {
            "bank": "SBI",
            "card_name": "SBI Cashback",
            "card_type": "Cashback",
            "annual_fee": 999.0,
            "reward_rate": 5.0,
            "features": "5% cashback on online domestic flights, zero merchant restriction, direct statement credit",
            "color": "#1e3a8a",
            "logo_symbol": "SBI"
        },
        {
            "bank": "HDFC",
            "card_name": "HDFC Regalia Gold",
            "card_type": "Premium Travel",
            "annual_fee": 2500.0,
            "reward_rate": 4.0,
            "features": "4X Reward Points on travel bookings, complimentary airport lounge access, ₹2,000 instant airfare cap",
            "color": "#0f766e",
            "logo_symbol": "HDFC"
        },
        {
            "bank": "Axis",
            "card_name": "Axis Atlas",
            "card_type": "Airline Miles / Travel",
            "annual_fee": 5000.0,
            "reward_rate": 5.0,
            "features": "5 Edge Miles per ₹100 on airlines, 1:2 mile transfer partner ratio, highest flat 15% airfare discount cap",
            "color": "#831843",
            "logo_symbol": "AXIS"
        },
        {
            "bank": "ICICI",
            "card_name": "ICICI Coral",
            "card_type": "Entry Rewards",
            "annual_fee": 500.0,
            "reward_rate": 2.0,
            "features": "2 PAYBACK points per ₹100, 8% instant airfare discount on domestic journeys, low qualification threshold",
            "color": "#c2410c",
            "logo_symbol": "ICICI"
        },
        {
            "bank": "ICICI",
            "card_name": "ICICI Sapphiro",
            "card_type": "Luxury Travel",
            "annual_fee": 3500.0,
            "reward_rate": 3.5,
            "features": "4 reward points per ₹100 on travel, DreamFolks airport lounge membership, 14% high-tier airfare discount",
            "color": "#1e1b4b",
            "logo_symbol": "ICICI"
        },
        {
            "bank": "HDFC",
            "card_name": "HDFC Millennia",
            "card_type": "Cashback",
            "annual_fee": 1000.0,
            "reward_rate": 5.0,
            "features": "5% cashback on travel aggregators and flight bookings, ₹1,200 discount cap, popular youth choice",
            "color": "#0369a1",
            "logo_symbol": "HDFC"
        },
        {
            "bank": "Axis",
            "card_name": "Axis Ace",
            "card_type": "Cashback",
            "annual_fee": 499.0,
            "reward_rate": 2.0,
            "features": "2% flat cashback on all bookings, low minimum spend threshold, 7% instant discount",
            "color": "#9f1239",
            "logo_symbol": "AXIS"
        },
        {
            "bank": "None",
            "card_name": "Standard (No Card)",
            "card_type": "Baseline Standard",
            "annual_fee": 0.0,
            "reward_rate": 0.0,
            "features": "Standard airfare booking without banking discount. Subject to standard airline convenience fee.",
            "color": "#475569",
            "logo_symbol": "STD"
        }
    ]

    card_obj_map = {}
    for c_info in CARDS_DATA:
        card = db.query(CreditCard).filter(CreditCard.card_name == c_info["card_name"]).first()
        if not card:
            card = CreditCard(**c_info)
            db.add(card)
            db.flush()
        card_obj_map[card.card_name] = card
    db.commit()

    OFFERS_DATA = [
        # SBI Cashback
        {
            "card_name": "SBI Cashback",
            "bank": "SBI",
            "offer_title": "SBI Instant Flight Saver 10%",
            "discount_pct": 10.0,
            "max_discount": 1500.0,
            "min_fare": 2500.0,
            "valid_airlines": "ALL",
            "valid_routes": "ALL",
            "festival_eligible": True,
            "festival_bonus_pct": 2.0,
            "convenience_fee": 299.0,
            "expiry_date": "2026-12-31",
            "promo_code": "SBIAIR10",
            "description": "Flat 10% instant discount up to ₹1,500 on all domestic flights above ₹2,500."
        },
        {
            "card_name": "SBI Cashback",
            "bank": "SBI",
            "offer_title": "SBI IndiGo Super Deal 12%",
            "discount_pct": 12.0,
            "max_discount": 1800.0,
            "min_fare": 3200.0,
            "valid_airlines": "6E",
            "valid_routes": "ALL",
            "festival_eligible": True,
            "festival_bonus_pct": 2.0,
            "convenience_fee": 299.0,
            "expiry_date": "2026-12-31",
            "promo_code": "SBI6E",
            "description": "Exclusive 12% instant discount up to ₹1,800 on IndiGo flights."
        },
        # HDFC Regalia Gold
        {
            "card_name": "HDFC Regalia Gold",
            "bank": "HDFC",
            "offer_title": "Regalia Gold Flight Privilege 12%",
            "discount_pct": 12.0,
            "max_discount": 2000.0,
            "min_fare": 3500.0,
            "valid_airlines": "ALL",
            "valid_routes": "ALL",
            "festival_eligible": True,
            "festival_bonus_pct": 2.5,
            "convenience_fee": 299.0,
            "expiry_date": "2026-12-31",
            "promo_code": "REGALIAGOLD",
            "description": "Flat 12% discount up to ₹2,000 on all domestic routes above ₹3,500."
        },
        {
            "card_name": "HDFC Regalia Gold",
            "bank": "HDFC",
            "offer_title": "Air India Heritage Gateway 15%",
            "discount_pct": 15.0,
            "max_discount": 2500.0,
            "min_fare": 4000.0,
            "valid_airlines": "AI",
            "valid_routes": "ALL",
            "festival_eligible": True,
            "festival_bonus_pct": 2.0,
            "convenience_fee": 299.0,
            "expiry_date": "2026-12-31",
            "promo_code": "REGALIAAI",
            "description": "15% off up to ₹2,500 exclusively on Air India domestic routes."
        },
        # Axis Atlas
        {
            "card_name": "Axis Atlas",
            "bank": "Axis",
            "offer_title": "Atlas Skyward Advantage 15%",
            "discount_pct": 15.0,
            "max_discount": 2500.0,
            "min_fare": 3500.0,
            "valid_airlines": "ALL",
            "valid_routes": "ALL",
            "festival_eligible": True,
            "festival_bonus_pct": 3.0,
            "convenience_fee": 299.0,
            "expiry_date": "2026-12-31",
            "promo_code": "ATLASMILES",
            "description": "Premium 15% instant discount up to ₹2,500 across all 253+ domestic routes."
        },
        # ICICI Coral
        {
            "card_name": "ICICI Coral",
            "bank": "ICICI",
            "offer_title": "ICICI Coral Express Saver 8%",
            "discount_pct": 8.0,
            "max_discount": 1000.0,
            "min_fare": 2000.0,
            "valid_airlines": "ALL",
            "valid_routes": "ALL",
            "festival_eligible": True,
            "festival_bonus_pct": 1.5,
            "convenience_fee": 299.0,
            "expiry_date": "2026-12-31",
            "promo_code": "CORALFLY",
            "description": "8% instant discount up to ₹1,000 with low ₹2,000 minimum booking."
        },
        # ICICI Sapphiro
        {
            "card_name": "ICICI Sapphiro",
            "bank": "ICICI",
            "offer_title": "Sapphiro Elite Airfare 14%",
            "discount_pct": 14.0,
            "max_discount": 2200.0,
            "min_fare": 3800.0,
            "valid_airlines": "ALL",
            "valid_routes": "ALL",
            "festival_eligible": True,
            "festival_bonus_pct": 2.0,
            "convenience_fee": 299.0,
            "expiry_date": "2026-12-31",
            "promo_code": "SAPPHIROLIFT",
            "description": "14% discount up to ₹2,200 for ICICI Sapphiro cardholders."
        },
        # HDFC Millennia
        {
            "card_name": "HDFC Millennia",
            "bank": "HDFC",
            "offer_title": "Millennia Smart Traveler 10%",
            "discount_pct": 10.0,
            "max_discount": 1200.0,
            "min_fare": 2800.0,
            "valid_airlines": "ALL",
            "valid_routes": "ALL",
            "festival_eligible": True,
            "festival_bonus_pct": 2.0,
            "convenience_fee": 299.0,
            "expiry_date": "2026-12-31",
            "promo_code": "MILLENNIAFLY",
            "description": "10% instant discount up to ₹1,200 on all domestic airlines."
        },
        # Axis Ace
        {
            "card_name": "Axis Ace",
            "bank": "Axis",
            "offer_title": "Axis Ace Easy Travel 7%",
            "discount_pct": 7.0,
            "max_discount": 900.0,
            "min_fare": 1800.0,
            "valid_airlines": "ALL",
            "valid_routes": "ALL",
            "festival_eligible": True,
            "festival_bonus_pct": 1.0,
            "convenience_fee": 299.0,
            "expiry_date": "2026-12-31",
            "promo_code": "ACEAIR",
            "description": "7% instant discount up to ₹900 with ultra-low ₹1,800 minimum booking."
        },
        # Standard (No Card)
        {
            "card_name": "Standard (No Card)",
            "bank": "None",
            "offer_title": "Standard Commercial Booking",
            "discount_pct": 0.0,
            "max_discount": 0.0,
            "min_fare": 0.0,
            "valid_airlines": "ALL",
            "valid_routes": "ALL",
            "festival_eligible": False,
            "festival_bonus_pct": 0.0,
            "convenience_fee": 299.0,
            "expiry_date": "2026-12-31",
            "promo_code": "STANDARD",
            "description": "Base airline fare plus standard ₹299 convenience fee."
        }
    ]

    for o_info in OFFERS_DATA:
        card = card_obj_map.get(o_info["card_name"])
        existing = db.query(BankOffer).filter(BankOffer.offer_title == o_info["offer_title"]).first()
        if not existing:
            bo = BankOffer(
                card_id=card.id if card else None,
                **o_info
            )
            db.add(bo)
    db.commit()

    # Pre-seed baseline fare_discounts for all domestic routes
    if db.query(FareDiscount).count() == 0:
        routes_all = db.query(Route).filter(Route.is_active == True).all()
        atlas_card = card_obj_map.get("Axis Atlas")
        atlas_offer = db.query(BankOffer).filter(BankOffer.card_name == "Axis Atlas").first()
        for r in routes_all:
            base_f = float(r.base_fare or 4800.0)
            disc_pct = 15.0
            disc_amt = min(base_f * 0.15, 2500.0)
            conv_fee = 299.0
            final_p = base_f - disc_amt + conv_fee
            savings_val = max(0.0, disc_amt - conv_fee)
            db.add(FareDiscount(
                route_id=r.id,
                card_id=atlas_card.id if atlas_card else None,
                offer_id=atlas_offer.id if atlas_offer else None,
                base_fare=base_f,
                discount_pct=disc_pct,
                discount_amount=disc_amt,
                convenience_fee=conv_fee,
                final_price=final_p,
                savings=savings_val,
                booking_window_days=30,
                is_festival=False
            ))
        db.commit()
        logger.info(f"Seeded baseline fare discounts for {len(routes_all)} domestic routes.")

    logger.info("Database verification and seeding completed successfully.")
