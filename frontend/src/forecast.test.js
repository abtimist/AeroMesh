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

const VALID_AT = '2026-09-27T06:00:00Z';
// Match backend/app/core/regions.py and its four independent 5x5 lattices.
const REGIONS = [
  { id: 'india', bbox: [68, 7, 97, 37] },
  { id: 'brazil', bbox: [-74, -34, -34, 6] },
  { id: 'china', bbox: [73, 18, 135, 54] },
  { id: 'south-africa', bbox: [16, -35, 33, -22] },
];

function pointsFor({ nx, ny, bbox }, start = 0) {
  const [west, south, east, north] = bbox;
  return Array.from({ length: nx * ny }, (_, index) => ({
    lat: Number((north - Math.floor(index / nx) * (north - south) / (ny - 1)).toFixed(4)),
    lon: Number((west + (index % nx) * (east - west) / (nx - 1)).toFixed(4)),
    wind_speed_10m: start + index + 1,
    wind_direction_10m: 90,
  }));
}

function regionalFixture() {
  const grids = REGIONS.map((region, index) => ({ ...region, nx: 5, ny: 5, point_offset: index * 25, point_count: 25 }));
  return {
    metadata: { type: 'regional-grids', grids },
    frame: { valid_at: VALID_AT, wind: grids.flatMap(grid => pointsFor(grid, grid.point_offset)) },
  };
}

function closeTo(actual, expected) {
  assert.ok(Math.abs(actual - expected) < 0.00001, `${actual} should be close to ${expected}`);
}

test('all-node wind exposes four complete independent regional grids, never one global field', () => {
  const { frame, metadata } = regionalFixture();
  const result = windVectors(frame, metadata);
  assert.equal(result.validAt, VALID_AT);
  assert.equal(result.grids.length, 4);
  for (const [index, grid] of result.grids.entries()) {
    assert.equal(grid.id, REGIONS[index].id);
    assert.equal(grid.nx, 5);
    assert.equal(grid.ny, 5);
    assert.deepEqual(grid.bbox, REGIONS[index].bbox);
    assert.ok(grid.u instanceof Float32Array);
    assert.ok(grid.v instanceof Float32Array);
    assert.equal(grid.u.length, 25);
    assert.deepEqual([...grid.u], Array.from({ length: 25 }, (_, cell) => -(index * 25 + cell + 1)));
  }
});

test('meteorological from directions map to eastward U and northward V and preserve true calm', () => {
  const metadata = { nx: 3, ny: 2, bbox: [70, 20, 80, 30] };
  const wind = pointsFor(metadata);
  const directions = [0, 90, 180, 270, 360, 45];
  wind.forEach((point, index) => Object.assign(point, { wind_direction_10m: directions[index], wind_speed_10m: index === 5 ? 0 : 2 }));
  const [grid] = windVectors({ valid_at: VALID_AT, wind }, metadata).grids;
  const expected = [[0, -2], [-2, 0], [0, 2], [2, 0], [0, -2], [0, 0]];
  expected.forEach(([u, v], index) => { closeTo(grid.u[index], u); closeTo(grid.v[index], v); });
  assert.equal(grid.u[5], 0);
  assert.equal(grid.v[5], 0);
});

test('coordinates restore north-to-south rows and west-to-east columns after a global shuffle', () => {
  const { frame, metadata } = regionalFixture();
  const expected = windVectors(frame, metadata);
  frame.wind = frame.wind.filter((_, index) => index % 2).reverse().concat(frame.wind.filter((_, index) => index % 2 === 0));
  const actual = windVectors(frame, metadata);
  assert.deepEqual(actual, expected);
  // These are the four corners a bilinear renderer will read, in geographic order.
  assert.deepEqual([actual.grids[0].u[0], actual.grids[0].u[4], actual.grids[0].u[20], actual.grids[0].u[24]], [-1, -5, -21, -25]);
});

test('four-decimal API sample rounding remains within the advertised lattice', () => {
  const metadata = { nx: 4, ny: 4, bbox: [70, 20, 71, 21] };
  const wind = pointsFor(metadata).reverse();
  const result = windVectors({ valid_at: VALID_AT, wind }, metadata);
  assert.deepEqual([...result.grids[0].u], Array.from({ length: 16 }, (_, index) => -(index + 1)));
});

test('legacy false nx20 global metadata cannot connect the four regional lattices', () => {
  const { frame } = regionalFixture();
  assert.equal(windVectors(frame, { nx: 20, ny: 5, bbox: [-180, -90, 180, 90] }), null);
});

test('a missing sample drops only its affected region, regardless of original point offsets', () => {
  const { frame, metadata } = regionalFixture();
  frame.wind.splice(7, 1);
  assert.deepEqual(windVectors(frame, metadata).grids.map(grid => grid.id), ['brazil', 'china', 'south-africa']);
});

test('a duplicate coordinate invalidates its regional grid even when the full lattice exists', () => {
  const { frame, metadata } = regionalFixture();
  frame.wind.push({ ...frame.wind[28] });
  assert.deepEqual(windVectors(frame, metadata).grids.map(grid => grid.id), ['india', 'china', 'south-africa']);
});

test('off-lattice and missing coordinates never silently fill an interpolation cell', () => {
  for (const changed of [{ lon: 69 }, { lat: null }, { lon: undefined }, { lat: NaN }]) {
    const { frame, metadata } = regionalFixture();
    Object.assign(frame.wind[0], changed);
    assert.deepEqual(windVectors(frame, metadata).grids.map(grid => grid.id), ['brazil', 'china', 'south-africa']);
  }
});

test('invalid weather drops its region without inventing calm values or affecting other grids', () => {
  for (const changed of [
    { wind_speed_10m: null }, { wind_speed_10m: -1 }, { wind_speed_10m: NaN },
    { wind_speed_10m: Infinity }, { wind_speed_10m: 1e100 }, { wind_speed_10m: '2' },
    { wind_direction_10m: null }, { wind_direction_10m: NaN }, { wind_direction_10m: Infinity },
    { wind_direction_10m: -1 }, { wind_direction_10m: 361 }, { wind_direction_10m: '90' },
    { wind_speed_10m: 0, wind_direction_10m: null },
  ]) {
    const { frame, metadata } = regionalFixture();
    Object.assign(frame.wind[50], changed);
    assert.deepEqual(windVectors(frame, metadata).grids.map(grid => grid.id), ['india', 'brazil', 'south-africa']);
  }
});

test('unavailable weather or metadata returns null without a bundled or synthetic fallback', () => {
  const { frame, metadata } = regionalFixture();
  for (const missingFrame of [null, undefined, {}, { wind: null }, { wind: [] }, { wind: {} }]) {
    assert.equal(windVectors(missingFrame, metadata), null);
  }
  for (const missingMetadata of [null, undefined, {}, { type: 'regional-grids' }, { type: 'regional-grids', grids: [] }, { type: 'unknown', ...metadata, grids: [] }]) {
    assert.equal(windVectors(frame, missingMetadata), null);
  }
});

test('malformed metadata cannot allocate a field or conceal incomplete dimensions', () => {
  const { frame, metadata } = regionalFixture();
  for (const changed of [
    { nx: 0 }, { nx: 1 }, { nx: 5.5 }, { ny: Infinity }, { nx: 1e12 },
    { bbox: null }, { bbox: [68, 7, NaN, 37] }, { bbox: [97, 7, 68, 37] },
    { bbox: [68, 37, 97, 7] }, { bbox: [-181, 7, 97, 37] },
    { bbox: [68, -91, 97, 37] }, { point_count: 24 },
  ]) {
    const changedMetadata = { ...metadata, grids: [{ ...metadata.grids[0], ...changed }] };
    assert.equal(windVectors(frame, changedMetadata), null);
  }
});
