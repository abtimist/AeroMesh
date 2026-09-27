import test from 'node:test';
import assert from 'node:assert/strict';
import { selectFrame, selectContours, windVectors } from './forecast.js';

test('missing forecast times remain unavailable', () => {
  assert.equal(selectFrame({ frames: [{ valid_at: '2026-09-27T06:00:00Z' }] }, '2026-09-27T07:00:00Z'), null);
});
test('model contours use their actual sampling intervals', () => {
  const feature = { properties: { valid_from: '2026-09-27T06:00:00Z', valid_to: '2026-09-27T07:00:00Z' } };
  const collection = { features: [feature] };
  assert.equal(selectContours(collection, '2026-09-27T07:00:00Z').features[0], feature);
  assert.equal(selectContours(collection, '2026-09-27T08:00:00Z').features.length, 0);
});
test('wind preserves calm and northerly values without invented speed', () => {
  const frame = { valid_at: '2026-09-27T06:00:00Z', wind: [{ wind_speed_10m: 0, wind_direction_10m: 0 }, { wind_speed_10m: 2, wind_direction_10m: 0 }, { wind_speed_10m: 2, wind_direction_10m: 90 }, { wind_speed_10m: 2, wind_direction_10m: 180 }] };
  const grid = { nx: 2, ny: 2, bbox: [70, 20, 80, 30] };
  const [u, v] = windVectors(frame, grid);
  assert.equal(Math.abs(u.data[0]), 0);
  assert.equal(v.data[1], -2);
  assert.equal(u.data[2], -2);
  frame.wind[0].wind_speed_10m = null;
  assert.equal(windVectors(frame, grid), null);
});
