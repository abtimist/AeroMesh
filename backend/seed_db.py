"""
AeroMesh Database Seeder — Comprehensive BRICS Sensor Network
Seeds realistic sensor stations across ALL major BRICS cities.
"""
import sys
sys.path.append('.')
import datetime
import json
import math
from app.db.session import SessionLocal
from app.models.sensor import Sensor, Measurement
from app.models.event import PollutionEvent

db = SessionLocal()

# ============================================================
# BRICS SENSOR NETWORK — Major cities with realistic PM2.5
# ============================================================
BRICS_SENSORS = [
    # INDIA — Most polluted cities
    {"id": "in_delhi",       "name": "Delhi (Connaught Place)", "lat": 28.6315, "lon": 77.2167, "pm25": 287.0},
    {"id": "in_delhi_n",     "name": "Delhi (Rohini)",          "lat": 28.7495, "lon": 77.0560, "pm25": 312.0},
    {"id": "in_noida",       "name": "Noida (Sector 62)",       "lat": 28.6280, "lon": 77.3649, "pm25": 265.0},
    {"id": "in_gurgaon",     "name": "Gurugram (Cyber Hub)",    "lat": 28.4957, "lon": 77.0889, "pm25": 220.0},
    {"id": "in_mumbai",      "name": "Mumbai (Bandra)",         "lat": 19.0596, "lon": 72.8295, "pm25": 98.0},
    {"id": "in_mumbai_w",    "name": "Mumbai (Worli)",          "lat": 19.0178, "lon": 72.8150, "pm25": 85.0},
    {"id": "in_kolkata",     "name": "Kolkata (Park Street)",   "lat": 22.5516, "lon": 88.3515, "pm25": 145.0},
    {"id": "in_chennai",     "name": "Chennai (T.Nagar)",       "lat": 13.0408, "lon": 80.2338, "pm25": 62.0},
    {"id": "in_bangalore",   "name": "Bengaluru (MG Road)",     "lat": 12.9756, "lon": 77.6046, "pm25": 48.0},
    {"id": "in_hyderabad",   "name": "Hyderabad (HITEC City)",  "lat": 17.4485, "lon": 78.3908, "pm25": 55.0},
    {"id": "in_lucknow",     "name": "Lucknow",                 "lat": 26.8467, "lon": 80.9462, "pm25": 198.0},
    {"id": "in_jaipur",      "name": "Jaipur",                  "lat": 26.9124, "lon": 75.7873, "pm25": 135.0},
    {"id": "in_ahmedabad",   "name": "Ahmedabad",               "lat": 23.0225, "lon": 72.5714, "pm25": 110.0},
    {"id": "in_pune",        "name": "Pune",                    "lat": 18.5204, "lon": 73.8567, "pm25": 72.0},
    {"id": "in_varanasi",    "name": "Varanasi",                "lat": 25.3176, "lon": 83.0063, "pm25": 205.0},
    {"id": "in_patna",       "name": "Patna",                   "lat": 25.6093, "lon": 85.1376, "pm25": 245.0},

    # BRAZIL
    {"id": "br_saopaulo",    "name": "São Paulo (Paulista)",    "lat": -23.5613, "lon": -46.6557, "pm25": 42.0},
    {"id": "br_rio",         "name": "Rio de Janeiro (Copa)",   "lat": -22.9068, "lon": -43.1729, "pm25": 35.0},
    {"id": "br_brasilia",    "name": "Brasília",                "lat": -15.8267, "lon": -47.9218, "pm25": 28.0},
    {"id": "br_manaus",      "name": "Manaus (Amazon)",         "lat": -3.1190,  "lon": -60.0217, "pm25": 88.0},
    {"id": "br_belem",       "name": "Belém",                   "lat": -1.4558,  "lon": -48.5024, "pm25": 72.0},
    {"id": "br_fortaleza",   "name": "Fortaleza",               "lat": -3.7172,  "lon": -38.5433, "pm25": 22.0},
    {"id": "br_recife",      "name": "Recife",                  "lat": -8.0476,  "lon": -34.8770, "pm25": 18.0},
    {"id": "br_porto",       "name": "Porto Alegre",            "lat": -30.0346, "lon": -51.2177, "pm25": 25.0},
    {"id": "br_cuiaba",      "name": "Cuiabá (Pantanal)",       "lat": -15.6014, "lon": -56.0979, "pm25": 95.0},

    # CHINA
    {"id": "cn_beijing",     "name": "Beijing (Dongcheng)",     "lat": 39.9042, "lon": 116.4074, "pm25": 175.0},
    {"id": "cn_beijing_w",   "name": "Beijing (Haidian)",       "lat": 39.9599, "lon": 116.2982, "pm25": 162.0},
    {"id": "cn_shanghai",    "name": "Shanghai (Pudong)",       "lat": 31.2304, "lon": 121.4737, "pm25": 85.0},
    {"id": "cn_guangzhou",   "name": "Guangzhou",               "lat": 23.1291, "lon": 113.2644, "pm25": 68.0},
    {"id": "cn_shenzhen",    "name": "Shenzhen",                "lat": 22.5431, "lon": 114.0579, "pm25": 55.0},
    {"id": "cn_chengdu",     "name": "Chengdu",                 "lat": 30.5728, "lon": 104.0668, "pm25": 92.0},
    {"id": "cn_wuhan",       "name": "Wuhan",                   "lat": 30.5928, "lon": 114.3055, "pm25": 78.0},
    {"id": "cn_xian",        "name": "Xi'an",                   "lat": 34.3416, "lon": 108.9398, "pm25": 125.0},
    {"id": "cn_chongqing",   "name": "Chongqing",               "lat": 29.4316, "lon": 106.9123, "pm25": 88.0},
    {"id": "cn_harbin",      "name": "Harbin",                  "lat": 45.8038, "lon": 126.5350, "pm25": 140.0},

    # SOUTH AFRICA
    {"id": "za_joburg",      "name": "Johannesburg (Sandton)",  "lat": -26.1076, "lon": 28.0567, "pm25": 45.0},
    {"id": "za_pretoria",    "name": "Pretoria",                "lat": -25.7479, "lon": 28.2293, "pm25": 38.0},
    {"id": "za_durban",      "name": "Durban",                  "lat": -29.8587, "lon": 31.0218, "pm25": 32.0},
    {"id": "za_capetown",    "name": "Cape Town",               "lat": -33.9249, "lon": 18.4241, "pm25": 18.0},
    {"id": "za_porteli",     "name": "Port Elizabeth",          "lat": -33.9608, "lon": 25.6022, "pm25": 22.0},
    {"id": "za_vaal",        "name": "Vaal Triangle",           "lat": -26.6732, "lon": 27.9262, "pm25": 65.0},

    # RUSSIA (BRICS member)
    {"id": "ru_moscow",      "name": "Moscow",                  "lat": 55.7558, "lon": 37.6173, "pm25": 42.0},
    {"id": "ru_stpeter",     "name": "St. Petersburg",          "lat": 59.9311, "lon": 30.3609, "pm25": 35.0},
    {"id": "ru_novosibirsk", "name": "Novosibirsk",             "lat": 55.0084, "lon": 82.9357, "pm25": 58.0},
    {"id": "ru_krasnoyarsk", "name": "Krasnoyarsk",             "lat": 56.0153, "lon": 92.8932, "pm25": 82.0},
    {"id": "ru_chelyabinsk", "name": "Chelyabinsk",             "lat": 55.1644, "lon": 61.4368, "pm25": 68.0},
]

from app.services.plume_model import GaussianPlumeModel

# ============================================================
# POLLUTION EVENTS — Active incidents with Gaussian plume polygons
# ============================================================

def make_plume_polygon(lat, lon, wind_dir_deg=135, distance_km=40):
    """Generate a realistic plume cone polygon from source using the new physics model."""
    # Assuming wind speed based on distance (hack for seeding)
    wind_speed = distance_km / 10.0 
    poly = GaussianPlumeModel.calculate_plume_polygon(
        source_lat=lat, source_lon=lon,
        wind_speed_ms=wind_speed, wind_dir_deg=wind_dir_deg,
        pblh=1000.0, distance_km=distance_km
    )
    # Convert Shapely Polygon to GeoJSON dict
    return {
        "type": "Polygon",
        "coordinates": [list(poly.exterior.coords)]
    }

EVENTS = [
    {"country": "IN", "type": "stubble_burning",   "lat": 28.85, "lon": 76.95, "severity": "CRITICAL", "conf": 94.5, "wind": 135, "dist": 60},
    {"country": "IN", "type": "industrial_emission","lat": 28.56, "lon": 77.32, "severity": "HIGH",     "conf": 88.0, "wind": 160, "dist": 35},
    {"country": "IN", "type": "biomass_burning",    "lat": 25.45, "lon": 83.10, "severity": "HIGH",     "conf": 82.0, "wind": 110, "dist": 45},
    {"country": "BR", "type": "forest_fire",        "lat": -3.20, "lon": -60.10,"severity": "CRITICAL", "conf": 91.0, "wind": 90,  "dist": 80},
    {"country": "BR", "type": "agricultural_burn",  "lat": -15.55,"lon": -56.10,"severity": "HIGH",     "conf": 78.0, "wind": 100, "dist": 50},
    {"country": "CN", "type": "industrial_emission","lat": 39.85, "lon": 116.50,"severity": "HIGH",     "conf": 85.0, "wind": 200, "dist": 40},
    {"country": "ZA", "type": "veld_fire",          "lat": -26.70,"lon": 27.95, "severity": "MEDIUM",   "conf": 72.0, "wind": 180, "dist": 30},
    {"country": "RU", "type": "forest_fire",        "lat": 56.10, "lon": 93.00, "severity": "CRITICAL", "conf": 90.0, "wind": 80,  "dist": 70},
]


def seed():
    print("🗑️  Clearing old data...")
    db.query(Measurement).delete()
    db.query(Sensor).delete()
    db.query(PollutionEvent).delete()
    db.commit()

    now = datetime.datetime.now(datetime.timezone.utc)

    print(f"📡 Inserting {len(BRICS_SENSORS)} sensors across BRICS...")
    for sd in BRICS_SENSORS:
        sensor = Sensor(
            provider_id=sd['id'], name=sd['name'],
            lat=sd['lat'], lon=sd['lon'], provider='OpenAQ'
        )
        db.add(sensor)
        db.flush()
        meas = Measurement(
            sensor_id=sensor.id, timestamp=now,
            parameter="pm25", value=sd['pm25']
        )
        db.add(meas)

    print(f"🔥 Inserting {len(EVENTS)} pollution events with plume polygons...")
    for ev in EVENTS:
        plume = make_plume_polygon(ev['lat'], ev['lon'], ev['wind'], ev['dist'])
        event = PollutionEvent(
            origin_country=ev['country'],
            event_type=ev['type'],
            lat=ev['lat'], lon=ev['lon'],
            severity=ev['severity'],
            confidence_score=ev['conf'],
            detected_at=now,
            plume_polygon=plume,
            status="ACTIVE"
        )
        db.add(event)

    db.commit()
    print(f"✅ Seeded {len(BRICS_SENSORS)} sensors + {len(EVENTS)} events across BRICS nations.")
    print("   Countries: India 🇮🇳, Brazil 🇧🇷, China 🇨🇳, South Africa 🇿🇦, Russia 🇷🇺")

if __name__ == '__main__':
    seed()
