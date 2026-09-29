import test from 'node:test';
import assert from 'node:assert/strict';
import { MAX_PHOTO_BYTES, validatePhoto, reportLocation, loadReportIds, addReportId, shouldPollReport, nearbyRecords, haversineKm } from './citizenReports.js';

test('photo validation rejects unsupported, empty and oversize uploads', () => {
  assert.match(validatePhoto(null), /Choose a photo/);
  assert.match(validatePhoto({ type: 'image/svg+xml', size: 20 }), /JPEG/);
  assert.match(validatePhoto({ type: 'image/jpeg', size: 0 }), /empty/);
  assert.match(validatePhoto({ type: 'image/png', size: MAX_PHOTO_BYTES + 1 }), /10 MiB/);
  assert.equal(validatePhoto({ type: 'image/webp', size: MAX_PHOTO_BYTES }), null);
});

test('locations require explicit valid coordinates and preserve zero', () => {
  assert.throws(() => reportLocation({ source: 'gps', lat: '', lon: '' }), /Latitude/);
  assert.throws(() => reportLocation({ source: 'manual', lat: 91, lon: 0 }), /Latitude/);
  assert.throws(() => reportLocation({ source: 'manual', lat: 0, lon: Infinity }), /Longitude/);
  assert.throws(() => reportLocation({ lat: 0, lon: 0 }), /explicitly/);
  assert.deepEqual(reportLocation({ source: 'gps', lat: 0, lon: 0, accuracy_m: 0 }), { location_source: 'gps', lat: 0, lon: 0, accuracy_m: 0 });
  assert.deepEqual(reportLocation({ source: 'manual', lat: '-90', lon: '180', accuracy_m: 10 }), { location_source: 'manual', lat: -90, lon: 180 });
});

test('persisted report history tolerates corrupt or blocked storage and deduplicates IDs', () => {
  assert.deepEqual(loadReportIds({ getItem: () => '{bad' }), []);
  assert.deepEqual(loadReportIds({ getItem: () => { throw new Error('blocked'); } }), []);
  assert.deepEqual(loadReportIds({ getItem: () => '["abc-123", "abc-123", "../secret", null]' }), ['abc-123']);
  assert.deepEqual(addReportId(['second', 'first'], 'first'), ['first', 'second']);
});

test('reports resume polling until a persisted terminal result is fetched', () => {
  assert.equal(shouldPollReport(), true);
  assert.equal(shouldPollReport({ status: 'queued' }), true);
  assert.equal(shouldPollReport({ status: 'processing' }), true);
  assert.equal(shouldPollReport({ status: 'completed' }), false);
  assert.equal(shouldPollReport({ status: 'failed' }), false);
  assert.equal(shouldPollReport({ status: 'completed', fetchError: 'network unavailable' }), true);
});

test('nearby data uses spherical distance and crosses the antimeridian correctly', () => {
  assert.equal(haversineKm({ lat: 0, lon: 0 }, { lat: 0, lon: 0 }), 0);
  assert.ok(Math.abs(haversineKm({ lat: 0, lon: 179.9 }, { lat: 0, lon: -179.9 }) - 22.239) < 0.01);
  assert.deepEqual(nearbyRecords([{ id: 'invalid', lat: null, lon: 0 }, { id: 'far', lat: 3, lon: 0 }, { id: 'near', lat: 0.1, lon: 0 }], { lat: 0, lon: 0 }).map(record => record.id), ['near']);
  assert.deepEqual(nearbyRecords([{ lat: 0, lon: 0 }], null), []);
});
