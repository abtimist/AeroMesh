import unittest
from datetime import datetime, timezone
from unittest.mock import patch
import httpx
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.db.base_class import Base
from app.models.sensor import Sensor, Measurement
from app.models.forecast import MeasurementEvidence
from app.services import openaq_client as module


class OpenAQTests(unittest.TestCase):
    def test_units_and_parameter_not_assumed(self):
        for units in ("µg/m³", "μg/m³", "ug/m3"):
            self.assertTrue(module.pm25_parameter({"name": "pm25", "units": units}))
        self.assertFalse(module.pm25_parameter({"name": "pm10", "units": "ug/m3"}))
        self.assertFalse(module.pm25_parameter({"name": "pm25", "units": "mg/m3"}))

    def test_zero_deduplication_invalid_values_and_provenance(self):
        engine = create_engine("sqlite://", poolclass=StaticPool, connect_args={"check_same_thread": False})
        Base.metadata.create_all(engine)
        factory = sessionmaker(bind=engine)
        with factory() as db:
            db.add(Sensor(id=1, provider_id="42", name="test", lat=0, lon=0, provider="openaq"))
            db.commit()
        now = datetime.now(timezone.utc).isoformat()
        row = {"value": 0, "time": now, "upstream_id": 123}
        with patch.object(module, "SessionLocal", factory):
            client = module.OpenAQClient()
            self.assertEqual(client._save_measurements(1, [row, row, {**row, "value": float('nan')}, {**row, "value": -1}]), 2)
        with factory() as db:
            self.assertEqual(db.query(Measurement).count(), 1)
            self.assertEqual(db.query(Measurement).first().value, 0)
            self.assertEqual(db.query(MeasurementEvidence).first().upstream_sensor_id, "123")
        engine.dispose()


class RateTests(unittest.IsolatedAsyncioTestCase):
    async def test_rate_limit_stops_followup_requests(self):
        calls = []
        def responder(request):
            calls.append(request.url.path)
            return httpx.Response(429, headers={"retry-after": "60"})
        with patch.object(module, "_next_request", 0):
            async with httpx.AsyncClient(transport=httpx.MockTransport(responder)) as http:
                client = module.OpenAQClient()
                with self.assertRaises(httpx.HTTPStatusError):
                    await client.request(http, "/locations")
                with self.assertRaises(RuntimeError):
                    await client.request(http, "/locations")
                self.assertEqual(client.health["error"], "rate_limited")
                self.assertEqual(len(calls), 1)


if __name__ == '__main__':
    unittest.main()
