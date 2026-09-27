import asyncio
from datetime import datetime, timezone
from io import BytesIO
from types import SimpleNamespace
import unittest
from unittest.mock import patch
import zipfile
from pathlib import Path
import tempfile
import httpx

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event as sql_event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.db.base_class import Base
from app.db.session import get_db
from app.models.sensor import Sensor, Measurement
from app.models.event import PollutionEvent
from app.models.weather import WeatherLog
from app.models.forecast import FireEvidence, DispersionRun
from app.api.endpoints import data, dispersion
from app.core.cache import observations_cache
from app.core.config import settings
from app.services.forecast_service import normalize_response, ForecastService
from app.services.hysplit import ready_payload
from app.services.hysplit import HysplitWorker
from app.services.hysplit_output import parse_archive
from app.services.meteo_client import OpenMeteoClient
from app.services.firms_client import NASA_FIRMSClient
from app.services.satellite import compose

NOW = datetime(2026, 9, 27, 6, tzinfo=timezone.utc)

def archive(kml):
    content = BytesIO()
    with zipfile.ZipFile(content, "w") as z:
        z.writestr("contours.kml", kml)
    return content.getvalue()

KML = '''<kml xmlns="http://www.opengis.net/kml/2.2"><Document><Folder>
<TimeSpan><begin>2026-09-27T06:00:00Z</begin><end>2026-09-27T07:00:00Z</end></TimeSpan>
<Placemark><name>Relative contour</name><Polygon><outerBoundaryIs><LinearRing><coordinates>
77,28,0 78,28,0 78,29,0 77,28,0
</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark></Folder></Document></kml>'''

class DataTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://", poolclass=StaticPool, connect_args={"check_same_thread": False})
        Base.metadata.create_all(self.engine)
        self.factory = sessionmaker(bind=self.engine)
        self.db = self.factory()
        self.db.add_all([Sensor(id=1, provider_id="1", name="Station", lat=28, lon=77, provider="openaq"),
                         Sensor(id=2, provider_id="2", name="No reading", lat=28, lon=78, provider="openaq"),
                         Sensor(id=3, provider_id="3", name="Brazil", lat=-14, lon=-51, provider="openaq"),
                         Sensor(id=4, provider_id="mock_1", name="Mock", lat=28, lon=77, provider="openaq")])
        self.db.add_all([Measurement(id=1, sensor_id=1, timestamp=NOW, parameter="pm25", value=18),
                         Measurement(id=2, sensor_id=1, timestamp=NOW, parameter="pm25", value=0),
                         Measurement(id=3, sensor_id=1, timestamp=NOW, parameter="pm10", value=999)])
        self.db.add(PollutionEvent(id=1, lat=28, lon=77, origin_country="UNK", event_type="biomass_burning", severity="LOW", confidence_score=90, detected_at=NOW, status="ACTIVE", plume_polygon={"fake": "x" * 100000}))
        self.db.commit()
        observations_cache.clear()

    def tearDown(self):
        self.db.close()
        self.engine.dispose()
        observations_cache.clear()

    def test_latest_measurement_one_query_zero_missing_and_region(self):
        queries = []
        sql_event.listen(self.engine, "before_cursor_execute", lambda *args: queries.append(args[2]))
        rows = data.sensor_records(self.db, "india")
        self.assertEqual(len(queries), 1)
        self.assertEqual(len(rows), 2)
        self.assertEqual(rows[0]["pm25"], 0)
        self.assertIsNone(rows[1]["pm25"])
        self.assertTrue(rows[0]["timestamp"].endswith("+00:00"))

    def test_legacy_geometry_and_claims_not_served(self):
        row = data.event_records(self.db, "india")[0]
        self.assertNotIn("plume_polygon", row)
        self.assertNotIn("confidence", row)
        self.assertEqual(row["provenance_status"], "unverified")

    def test_observation_cache_avoids_second_query_and_validates_region(self):
        app = FastAPI()
        app.include_router(data.router)
        app.dependency_overrides[get_db] = lambda: self.db
        with TestClient(app) as client:
            first = client.get("/events?node=india")
            self.assertEqual(first.status_code, 200)
            with patch.object(data, "event_records", side_effect=AssertionError("cache miss")):
                self.assertEqual(client.get("/events?node=india").content, first.content)
            self.assertEqual(client.get("/events?node=unknown").status_code, 422)

    def test_meteo_retains_all_hours_and_locations(self):
        fixture = {"hourly": {"time": ["2026-09-27T06:00", "2026-09-27T07:00"],
            "wind_speed_10m": [0, 2], "wind_direction_10m": [0, 90], "boundary_layer_height": [100, 200]}}
        with patch("app.services.meteo_client.SessionLocal", self.factory):
            client = OpenMeteoClient()
            client._save_weather_log(28, 77, fixture)
            client._save_weather_log(29, 78, fixture)
            client._save_weather_log(28, 77, fixture)
        self.assertEqual(self.db.query(WeatherLog).count(), 4)

    def test_firms_deduplicates_location_and_time_and_stores_evidence(self):
        fixture = {"latitude": "28", "longitude": "77", "acq_date": "2026-09-27", "acq_time": "600", "frp": "12", "confidence": "n", "satellite": "N20", "instrument": "VIIRS"}
        with patch("app.services.firms_client.SessionLocal", self.factory):
            NASA_FIRMSClient()._save_hotspots([fixture, {**fixture, "longitude": "79"}, fixture])
        self.assertEqual(self.db.query(PollutionEvent).count(), 2)
        self.assertEqual(self.db.query(FireEvidence).count(), 2)

    def test_submission_requires_operator_and_noaa_configuration(self):
        app = FastAPI()
        app.include_router(dispersion.router)
        app.dependency_overrides[get_db] = lambda: self.db
        body = {"start_at": NOW.isoformat(), "release_bottom_m": 0, "release_top_m": 100,
                "release_duration_minutes": 60, "duration_hours": 24, "averaged_layer_top_m": 100,
                "assumptions": "Unit release scenario, emissions unknown"}
        with TestClient(app) as client, patch.object(settings, "MODEL_OPERATOR_TOKEN", "test-token"), patch.object(settings, "HYSPLIT_AUTH_HEADERS", {}):
            self.assertEqual(client.post("/events/1/runs", json=body).status_code, 403)
            self.assertEqual(client.post("/events/1/runs", json=body, headers={"X-Operator-Token": "test-token"}).status_code, 503)
            self.assertEqual(self.db.query(DispersionRun).count(), 0)

class ScientificDataTests(unittest.TestCase):
    def test_normalization_keeps_zero_null_and_utc(self):
        doc = {"latitude": 28, "longitude": 77, "hourly": {"time": ["2026-09-27T06:00", "2026-09-27T07:00"], "wind_speed_10m": [0, None]}}
        result = normalize_response(doc, [(28, 77)], ["wind_speed_10m"])
        self.assertEqual(result[0]["hours"]["2026-09-27T06:00:00+00:00"]["wind_speed_10m"], 0)
        self.assertIsNone(result[0]["hours"]["2026-09-27T07:00:00+00:00"]["wind_speed_10m"])
        with self.assertRaises(ValueError):
            normalize_response(doc, [(28, 77), (29, 78)], ["wind_speed_10m"])

    def test_noaa_payload_preserves_release_assumptions(self):
        request = {"start_at": "2026-09-27T12:00:00+05:30", "release_bottom_m": 10,
            "release_top_m": 500, "release_duration_minutes": 120, "duration_hours": 24, "averaged_layer_top_m": 200}
        result = ready_payload(SimpleNamespace(lat=28, lon=77), request)
        self.assertEqual(result["startTime"], "06:30")
        self.assertEqual(result["releaseDuration"], 120)
        self.assertEqual(result["releaseTop"], 500)
        self.assertNotIn("reply", result)

    def test_contour_geometry_time_and_relative_units(self):
        feature = parse_archive(archive(KML))["features"][0]
        self.assertEqual(feature["geometry"]["coordinates"][0][0], [77, 28])
        self.assertEqual(feature["properties"]["quantity"], "relative_dispersion")
        self.assertEqual(feature["properties"]["valid_to"], "2026-09-27T07:00:00+00:00")

    def test_undated_or_unsafe_model_output_is_rejected(self):
        for text in [KML.replace("TimeSpan", "Missing"), '<!DOCTYPE kml [<!ENTITY x "test">]>' + KML,
                     KML.replace("77,28,0 78", "777,28,0 78")]:
            with self.assertRaises(ValueError):
                parse_archive(archive(text))

    def test_missing_imagery_returns_unavailable(self):
        self.assertIsNone(compose([None], [(0, 0)], 128, 128))

class AsyncForecastTests(unittest.IsolatedAsyncioTestCase):
    async def test_concurrent_requests_share_one_nonblocking_refresh(self):
        service = ForecastService()
        started = 0
        release = asyncio.Event()
        async def refresh(_):
            nonlocal started
            started += 1
            await release.wait()
        with patch("app.services.forecast_service.load_snapshot", return_value=None), patch.object(service, "refresh", refresh):
            results = await asyncio.gather(service.get("india"), service.get("india"))
            await asyncio.sleep(0)
            self.assertEqual(started, 1)
            self.assertTrue(all(result["status"] == "loading" for result in results))
            release.set()
            await service.close()

class HysplitLifecycleTests(unittest.IsolatedAsyncioTestCase):
    async def test_submit_poll_download_convert_and_persist(self):
        engine = create_engine("sqlite://", poolclass=StaticPool, connect_args={"check_same_thread": False})
        Base.metadata.create_all(engine)
        factory = sessionmaker(bind=engine)
        run_id = "5fd8a9d7-5dc7-4184-a0aa-06f2f517e8c4"
        with factory() as db:
            db.add(DispersionRun(id=run_id, event_id=1, status="SUBMITTING", created_at=NOW, updated_at=NOW, request={}))
            db.commit()
        paths = []
        def transport(request):
            paths.append(request.url.path)
            if request.method == "POST":
                return httpx.Response(200, json={"uuid": run_id})
            if "/status/" in request.url.path:
                return httpx.Response(200, json={"jobStatus": "COMPLETED"})
            return httpx.Response(200, content=archive(KML))
        worker = HysplitWorker()
        with tempfile.TemporaryDirectory() as folder, patch("app.services.hysplit.SessionLocal", factory), patch("app.services.hysplit.RUNTIME_DIR", Path(folder)):
            worker.client = httpx.AsyncClient(base_url="https://apps.arl.noaa.gov/ready2", transport=httpx.MockTransport(transport))
            await worker.submit(run_id, {"application": "none"})
            await worker.poll(run_id, run_id)
            with factory() as db:
                result = db.get(DispersionRun, run_id)
                self.assertEqual(result.status, "COMPLETED")
                self.assertEqual(result.result["features"][0]["properties"]["run_id"], run_id)
            self.assertTrue((Path(folder) / "hysplit" / f"{run_id}.zip").exists())
            self.assertEqual(paths[0], "/ready2/api/v1/disp")
            await worker.close()
        engine.dispose()

if __name__ == "__main__":
    unittest.main()
