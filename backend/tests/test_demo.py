import json
import unittest
from datetime import datetime
from fastapi import FastAPI
from fastapi.testclient import TestClient
from app.api.endpoints.dispersion import router
from app.services.demo import demo_metadata, demo_frame

class DemoTests(unittest.TestCase):
    def test_real_source_original_coordinates_and_pollutant_preserved(self):
        meta = demo_metadata()
        self.assertEqual(meta['frame_count'], 24)
        self.assertEqual(meta['pollutant_code'], 'I131')
        self.assertEqual(meta['mode'], 'precomputed_historical')
        self.assertAlmostEqual(meta['source_location']['lat'], -34.05, places=3)
        self.assertAlmostEqual(meta['source_location']['lon'], 150.98, places=3)
        self.assertEqual(len(meta['source_sha256']), 64)
        self.assertIn('5f91ceb498ebfcf2bc5409db06cf4e349d3623b0', meta['source_url'])

    def test_all_frames_have_real_distinct_intervals_and_closed_rings(self):
        previous = None
        fingerprints = set()
        for index in range(24):
            raw = demo_frame(index)
            frame = json.loads(raw)
            start, end = datetime.fromisoformat(frame['valid_from']), datetime.fromisoformat(frame['valid_to'])
            self.assertEqual((end - start).total_seconds(), 10800)
            if previous:
                self.assertEqual(start, previous)
            previous = end
            self.assertGreater(len(frame['features']), 0)
            for feature in frame['features']:
                self.assertEqual(feature['properties']['kind'], 'demonstration')
                self.assertEqual(feature['properties']['valid_to'], frame['valid_to'])
                for ring in feature['geometry']['coordinates']:
                    self.assertEqual(ring[0], ring[-1])
            fingerprints.add(raw)
        self.assertEqual(len(fingerprints), 24)

    def test_replay_routes_work_without_database_or_provider_keys(self):
        app = FastAPI()
        app.include_router(router)
        with TestClient(app) as client:
            self.assertEqual(client.get('/demo').status_code, 200)
            self.assertEqual(client.get('/demo/frames/0').status_code, 200)
            self.assertEqual(client.get('/demo/frames/23').status_code, 200)
            self.assertEqual(client.get('/demo/frames/-1').status_code, 404)
            self.assertEqual(client.get('/demo/frames/24').status_code, 404)
