"""Isolated report lifecycle and dispatch allocation regressions (no live DB writes)."""
from io import BytesIO
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient
from PIL import Image
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.endpoints import operations, analysis, ingestion, data
from app.core.cache import observations_cache
from app.core.config import settings
from app.db.base_class import Base
from app.db.session import get_db
from app.models.event import PollutionEvent
from app.models.operations import PhotoReport, ResponseResource, ResourceAssignment


def photo_bytes():
    output = BytesIO()
    Image.new('RGB', (24, 24), 'red').save(output, format='PNG')
    return output.getvalue()


class OperationsTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine('sqlite://', poolclass=StaticPool, connect_args={'check_same_thread': False})
        Base.metadata.create_all(self.engine)
        self.factory = sessionmaker(bind=self.engine)
        self.folder = tempfile.TemporaryDirectory()
        self.addCleanup(self.folder.cleanup)
        self.addCleanup(self.engine.dispose)
        self.addCleanup(observations_cache.clear)
        app = FastAPI()
        app.include_router(operations.router, prefix='/api/citizen')
        app.include_router(analysis.router, prefix='/api/analysis')
        app.include_router(ingestion.router, prefix='/api/ingestion')

        def db():
            with self.factory() as session:
                yield session

        app.dependency_overrides[get_db] = db
        self.client = TestClient(app)
        self.addCleanup(self.client.close)
        for target, value in [('RUNTIME_DIR', Path(self.folder.name)), ('SessionLocal', self.factory)]:
            self.enterContext(patch.object(operations, target, value))
        self.enterContext(patch.object(settings, 'MODEL_OPERATOR_TOKEN', 'test-only-token'))
        self.enterContext(patch.object(settings, 'APP_ENV', 'development'))
        self.headers = {'X-Operator-Token': 'test-only-token'}
        with self.factory() as db:
            for ident in (1, 2):
                db.add(PollutionEvent(id=ident, lat=28, lon=77, origin_country='UNK',
                    event_type='test_fixture', severity='LOW', confidence_score=0,
                    detected_at=operations.now(), status='ACTIVE'))
            db.commit()

    def resource(self, name='Near', **kw):
        response = self.client.post('/api/citizen/resources', headers=self.headers, json={
            'name': name, 'lat': 28.01, 'lon': 77, 'service_radius_km': 50, **kw})
        self.assertEqual(response.status_code, 201, response.text)
        return response.json()

    def allocate(self, event_id=1, path='/api/citizen/events/{}/assignments'):
        return self.client.post(path.format(event_id), headers=self.headers,
            json={'capability': 'inspection', 'note': 'Isolated test allocation'})

    def test_nearest_eligible_selection_and_no_duplicate_reservation(self):
        self.resource('Wrong capability', lat=28, capability='fire_response')
        self.resource('Disabled', lat=28, enabled=False)
        self.resource('Outside radius', lat=29, service_radius_km=1)
        near = self.resource()
        far = self.resource('Far', lat=28.1)
        first = self.allocate()
        self.assertEqual(first.status_code, 201, first.text)
        self.assertEqual(first.json()['resource_id'], near['id'])
        self.assertFalse(first.json()['external_agency_contacted'])
        self.assertEqual(self.allocate().status_code, 409)
        # Failed duplicate event assignment rolls back its attempted resource claim.
        second = self.allocate(2)
        self.assertEqual(second.status_code, 201, second.text)
        self.assertEqual(second.json()['resource_id'], far['id'])
        with self.factory() as db:
            self.assertEqual(db.query(ResourceAssignment).count(), 2)

    def test_transition_audit_and_release_survive_new_sessions(self):
        resource = self.resource()
        assignment = self.allocate().json()
        url = f"/api/citizen/assignments/{assignment['id']}/status"
        def change(status):
            return self.client.post(url, headers=self.headers, json={'status': status, 'note': 'Operator recorded test update'})
        self.assertEqual(change('completed').status_code, 409)
        self.assertEqual(self.client.put(f"/api/citizen/resources/{resource['id']}", headers=self.headers,
            json={'name': 'Changed', 'lat': 28, 'lon': 77}).status_code, 409)
        for status in ('en_route', 'on_scene', 'completed'):
            response = change(status)
            self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(len(response.json()['audit']), 4)
        self.assertEqual(change('en_route').status_code, 409)
        with self.factory() as db:
            self.assertIsNone(db.get(ResponseResource, resource['id']).busy_assignment_id)
            self.assertIsNone(db.get(ResourceAssignment, assignment['id']).active_event_id)
        self.assertEqual(self.allocate().status_code, 201)

    def test_auth_invalid_inputs_empty_pool_and_legacy_dispatch(self):
        self.assertEqual(self.client.get('/api/citizen/resources').status_code, 403)
        self.assertEqual(self.allocate().status_code, 409)
        self.assertEqual(self.allocate(999).status_code, 404)
        invalid = self.client.post('/api/citizen/resources', headers=self.headers,
            json={'name': 'Invalid', 'lat': 91, 'lon': 77})
        self.assertEqual(invalid.status_code, 422)
        self.resource()
        result = self.allocate(path='/api/analysis/dispatch/{}')
        self.assertEqual(result.status_code, 201, result.text)
        self.assertEqual(result.json()['status'], 'assigned')

    def submit(self, raw=None, path='/api/citizen/reports', **fields):
        return self.client.post(path, data={'lat': '0', 'lon': '0', 'location_source': 'manual', **fields},
            files={'photo': ('photo.png', photo_bytes() if raw is None else raw, 'image/png')})

    def test_photo_validation_rejects_invalid_image_location_and_missing_model(self):
        with patch.object(operations.citizen_vision, 'ready', return_value=False):
            self.assertEqual(self.submit().status_code, 503)
        with patch.object(operations.citizen_vision, 'ready', return_value=True):
            self.assertEqual(self.submit(raw=b'not an image').status_code, 422)
            self.assertEqual(self.submit(raw=b'').status_code, 413)
            self.assertEqual(self.submit(lat='nan').status_code, 422)
            self.assertEqual(self.submit(location_source='default').status_code, 422)
        with self.factory() as db:
            self.assertEqual(db.query(PhotoReport).count(), 0)

    def test_report_queue_processing_evidence_and_restart_recovery(self):
        result = {'label': 'smoke', 'score': .82, 'scores': {'smoke': .82, 'normal': .1, 'fire': .08},
                  'model': 'isolated-test-double', 'review_required': True}
        with patch.object(operations.citizen_vision, 'ready', return_value=True):
            response = self.submit(path='/api/ingestion/report', description='Isolated test image')
        self.assertEqual(response.status_code, 202, response.text)
        ident = response.json()['id']
        with self.factory() as db:
            row = db.get(PhotoReport, ident)
            self.assertEqual((row.lat, row.lon), (0, 0))
            with Image.open(row.image_path) as image:
                self.assertEqual(image.format, 'JPEG')
                self.assertFalse(image.getexif())
            row.status = 'processing'
            db.commit()
        operations.ReportWorker.recover()
        with patch.object(operations.citizen_vision, 'classify', return_value=result) as classify:
            operations.ReportWorker.process_next()
            operations.ReportWorker.process_next()
            self.assertEqual(classify.call_count, 1)
        saved = self.client.get(f'/api/citizen/reports/{ident}').json()
        self.assertEqual(saved['status'], 'completed')
        self.assertEqual(saved['result'], result)
        self.assertTrue(saved['event_id'])
        with self.factory() as db:
            event = db.get(PollutionEvent, saved['event_id'])
            self.assertEqual(event.event_type, 'citizen_smoke_unverified')
            self.assertEqual(event.confidence_score, 82)
            record = next(e for e in data.event_records(db) if e['id'] == event.id)
            self.assertIn('Citizen photo', record['source'])
            self.assertEqual(record['provenance_status'], 'unverified')
        self.assertEqual(self.client.get(saved['image_url']).status_code, 200)

    def test_model_failure_is_persisted_without_invented_result(self):
        with patch.object(operations.citizen_vision, 'ready', return_value=True):
            ident = self.submit().json()['id']
        with patch.object(operations.citizen_vision, 'classify', side_effect=RuntimeError('test failure')):
            with self.assertLogs(operations.logger, level='ERROR'):
                operations.ReportWorker.process_next()
        saved = self.client.get(f'/api/citizen/reports/{ident}').json()
        self.assertEqual(saved['status'], 'failed')
        self.assertIsNone(saved['result'])
        self.assertIsNone(saved['event_id'])


if __name__ == '__main__':
    unittest.main()
