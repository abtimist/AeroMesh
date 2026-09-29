"""Forecast geometry must describe regional sampling without fabricating global cells."""
from datetime import datetime, timezone
import unittest
from unittest.mock import AsyncMock, patch

from app.core.regions import REGIONS
from app.services.forecast_service import ForecastService, grid_points


REGION_IDS = ["india", "brazil", "china", "south-africa"]


class ForecastGridTests(unittest.IsolatedAsyncioTestCase):
    def assert_regional_grid(self, payload, node):
        metadata = payload["grid"]
        self.assertEqual(metadata["type"], "regional-grids")
        self.assertNotIn("nx", metadata)
        self.assertNotIn("bbox", metadata)
        self.assertEqual(metadata["row_order"], "north-to-south")
        self.assertEqual(metadata["column_order"], "west-to-east")
        region_ids = REGION_IDS if node == "all" else [node]
        self.assertEqual([grid["id"] for grid in metadata["grids"]], region_ids)
        points = grid_points(node)
        for index, grid in enumerate(metadata["grids"]):
            self.assertEqual((grid["nx"], grid["ny"]), (5, 5))
            self.assertEqual(grid["point_offset"], index * 25)
            self.assertEqual(grid["point_count"], 25)
            self.assertEqual(grid["bbox"], REGIONS[grid["id"]]["bbox"])
            west, south, east, north = grid["bbox"]
            actual = points[grid["point_offset"]:grid["point_offset"] + grid["point_count"]]
            expected = [(round(north - row * (north - south) / 4, 4),
                         round(west + column * (east - west) / 4, 4))
                        for row in range(5) for column in range(5)]
            self.assertEqual(actual, expected)
        self.assertEqual(len(points), len(region_ids) * 25)
        self.assertEqual(payload["wind"]["units"], "m/s")
        self.assertEqual(payload["wind"]["direction_convention"], "meteorological-from")
        self.assertEqual(payload["wind"]["direction_units"], "degrees clockwise from north")
        self.assertEqual(payload["wind"]["vector_components"], {"u": "eastward", "v": "northward"})

    async def test_cached_legacy_geometry_is_corrected_without_changing_frames(self):
        for node in ["all", "india"]:
            with self.subTest(node=node):
                service = ForecastService()
                frames = [{"valid_at": "2026-09-29T06:00:00+00:00", "wind": [{"wind_speed_10m": 0}]}]
                saved = {"node": node, "status": "available", "fetched_at": datetime.now(timezone.utc).isoformat(),
                         "frames": frames, "wind": {"source": "NOAA GFS via Open-Meteo", "units": "m/s", "status": "available"},
                         "grid": {"nx": 20 if node == "all" else 5, "ny": 5, "bbox": REGIONS[node]["bbox"]}}
                service.memory[node] = saved
                result = await service.get(node)
                self.assert_regional_grid(result, node)
                self.assertIs(result["frames"], frames)
                self.assertEqual(result["wind"]["source"], saved["wind"]["source"])
                self.assertFalse(result["stale"])
                self.assertFalse(result["refreshing"])
                self.assertNotIn("direction_convention", saved["wind"])
                self.assertIn("nx", saved["grid"])

    async def test_persisted_legacy_geometry_is_corrected_before_serving(self):
        service = ForecastService()
        saved = {"node": "all", "status": "available", "fetched_at": datetime.now(timezone.utc).isoformat(),
                 "frames": [], "wind": {"status": "unavailable", "error": "Provider unavailable"},
                 "grid": {"nx": 20, "ny": 5, "bbox": [-180, -90, 180, 90]}}
        with patch("app.services.forecast_service.load_snapshot", return_value=saved):
            result = await service.get("all")
        self.assert_regional_grid(result, "all")
        self.assertEqual(result["wind"]["status"], "unavailable")
        self.assertEqual(result["wind"]["error"], "Provider unavailable")

    async def test_refresh_persists_the_same_regional_contract_and_ms_request(self):
        for node in ["all", "brazil"]:
            with self.subTest(node=node):
                service = ForecastService()
                valid_at = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0).isoformat()
                weather = [{"lat": lat, "lon": lon,
                            "hours": {valid_at: {"wind_speed_10m": 7, "wind_direction_10m": 270}}}
                           for lat, lon in grid_points(node)]
                fetch = AsyncMock(side_effect=[(weather, None), ([], "Unavailable")])
                with patch.object(service, "fetch_series", fetch), patch("app.services.forecast_service.save_snapshot") as save:
                    await service.refresh(node)
                payload = service.memory[node]
                self.assert_regional_grid(payload, node)
                self.assertEqual(fetch.call_args_list[0].args[1]["wind_speed_unit"], "ms")
                self.assertEqual(len(payload["frames"][0]["wind"]), len(grid_points(node)))
                self.assertEqual([(item["lat"], item["lon"]) for item in payload["frames"][0]["wind"]], grid_points(node))
                self.assertEqual(save.call_args_list[-1].args, (node, payload))


if __name__ == "__main__":
    unittest.main()
