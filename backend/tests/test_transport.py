"""Analytic transport cases and invalid-provider responses, never live fixtures."""
import unittest
from datetime import datetime, timedelta, timezone
from unittest.mock import patch
import httpx
import numpy as np
from app.services import transport

START = datetime(2026, 9, 29, tzinfo=timezone.utc)


def forcing(u=0, v=0):
    uv = np.zeros((4, 5, 5, 2))
    uv[..., 0], uv[..., 1] = u, v
    return {"latitudes": [-4, -2, 0, 2, 4], "longitudes": [-4, -2, 0, 2, 4],
            "times": [(START + timedelta(hours=h)).timestamp() for h in range(4)], "uv": uv.tolist()}


def inputs(**values):
    return {"start_at": START.isoformat(), "duration_hours": 2, "release_duration_minutes": 60,
            "diffusivity_m2_s": 0, "seed": 42, "assumptions": "Analytic test fixture", **values}


class TransportTests(unittest.TestCase):
    def test_constant_east_wind_centroid_and_mass(self):
        result = transport.simulate(0, 0, inputs(), forcing(10, 0))
        # Uniform release over hour one: mean parcel age at hour two is 1.5 h.
        expected_lon = np.degrees(10 * 5400 / 6371000)
        self.assertAlmostEqual(result["frames"][-1]["centroid"][0], expected_lon, places=3)
        self.assertAlmostEqual(result["frames"][-1]["centroid"][1], 0)
        self.assertTrue(result["features"])
        for frame in result["frames"]:
            self.assertAlmostEqual(frame["grid_mass"], frame["released_fraction"], places=10)

    def test_calm_does_not_manufacture_transport(self):
        result = transport.simulate(0, 0, inputs(), forcing())
        self.assertEqual(result["frames"][-1]["centroid"], [0, 0])

    def test_diffusion_reproducibility_and_time_dependent_wind(self):
        met = forcing()
        uv = np.array(met["uv"])
        uv[1:, ..., 1] = 10
        met["uv"] = uv.tolist()
        first = transport.simulate(0, 0, inputs(diffusivity_m2_s=100), met)
        second = transport.simulate(0, 0, inputs(diffusivity_m2_s=100), met)
        self.assertEqual(first, second)
        self.assertGreater(first["frames"][-1]["centroid"][1], 0)
        self.assertEqual(first["features"][0]["properties"]["model"], "gfs-tracer-v1")

    def test_no_spatial_or_temporal_extrapolation(self):
        met = tuple(np.array(forcing()[k]) for k in ("latitudes", "longitudes", "times", "uv"))
        with self.assertRaises(ValueError):
            transport.sample_wind(met, np.array([[8., 0.]]), START.timestamp())
        with self.assertRaises(ValueError):
            transport.sample_wind(met, np.array([[0., 0.]]), START.timestamp() - 1)

    def test_bilinear_and_temporal_interpolation(self):
        data = forcing()
        uv = np.array(data["uv"])
        for t in range(4):
            for y in range(5):
                for x in range(5):
                    uv[t, y, x] = [x * 2 + t * 2, y * 2]
        met = tuple(np.array(data[k]) for k in ("latitudes", "longitudes", "times")) + (uv,)
        sample = transport.sample_wind(met, np.array([[-1., -1.]]), START.timestamp() + 1800)
        np.testing.assert_allclose(sample, [[4, 3]])


class ProviderTests(unittest.IsolatedAsyncioTestCase):
    async def test_incomplete_provider_grid_rejected(self):
        async def get(*args, **kwargs):
            return httpx.Response(200, json=[], request=httpx.Request("GET", "https://test/forecast"))
        with patch.object(httpx.AsyncClient, "get", get), self.assertRaises(ValueError):
            await transport.fetch_winds(0, 0, START, 2)

    async def test_provider_westerly_converts_to_eastward(self):
        times = [(START + timedelta(hours=h)).isoformat() for h in range(4)]
        doc = {"hourly_units": {"wind_speed_10m": "m/s", "wind_direction_10m": "°"},
               "hourly": {"time": times, "wind_speed_10m": [10] * 4, "wind_direction_10m": [270] * 4}}
        async def get(*args, **kwargs):
            return httpx.Response(200, json=[doc] * 25, request=httpx.Request("GET", "https://test/forecast"))
        with patch.object(httpx.AsyncClient, "get", get):
            result = await transport.fetch_winds(0, 0, START, 2)
        np.testing.assert_allclose(result["uv"][0][0][0], [10, 0], atol=1e-10)
        self.assertEqual(len(result["sha256"]), 64)


if __name__ == "__main__":
    unittest.main()
