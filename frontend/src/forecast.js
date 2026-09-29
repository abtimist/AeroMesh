export function selectFrame(forecast, validAt) {
  return forecast?.frames?.find(frame => frame.valid_at === validAt) || null;
}

export function selectContours(collection, validAt) {
  const time = Date.parse(validAt);
  return { type: 'FeatureCollection', features: (collection?.features || []).filter(feature => {
    const p = feature.properties;
    // Hourly means are selected by their ending timestamp, not animated geometry.
    return Date.parse(p.valid_from) < time && time <= Date.parse(p.valid_to);
  }) };
}

// The API rounds requested sample coordinates to four decimal places.
const COORDINATE_TOLERANCE = 0.000051;

function regionalWindVectors(points, definition, index) {
  if (!definition) return null;
  const { nx, ny, bbox } = definition;
  const count = nx * ny;
  if (!Number.isInteger(nx) || nx < 2 || !Number.isInteger(ny) || ny < 2 ||
      !Number.isSafeInteger(count) || count > points.length ||
      !Array.isArray(bbox) || bbox.length !== 4 || !bbox.every(Number.isFinite) ||
      (definition.point_count !== undefined && definition.point_count !== count)) return null;
  const [west, south, east, north] = bbox;
  const dx = (east - west) / (nx - 1), dy = (north - south) / (ny - 1);
  if (west < -180 || east > 180 || south < -90 || north > 90 ||
      dx <= COORDINATE_TOLERANCE * 2 || dy <= COORDINATE_TOLERANCE * 2) return null;

  const u = new Float32Array(count), v = new Float32Array(count);
  const occupied = new Uint8Array(count);
  let filled = 0;
  for (const point of points) {
    if (!point || !Number.isFinite(point.lat) || !Number.isFinite(point.lon)) continue;
    const column = Math.round((point.lon - west) / dx);
    const row = Math.round((north - point.lat) / dy);
    if (column < 0 || column >= nx || row < 0 || row >= ny ||
        Math.abs(point.lon - (west + column * dx)) > COORDINATE_TOLERANCE ||
        Math.abs(point.lat - (north - row * dy)) > COORDINATE_TOLERANCE) continue;
    const cell = row * nx + column;
    const speed = point.wind_speed_10m, direction = point.wind_direction_10m;
    if (occupied[cell] || !Number.isFinite(speed) || speed < 0 ||
        !Number.isFinite(direction) || direction < 0 || direction > 360) return null;
    // Meteorological directions describe where wind comes FROM. U is eastward;
    // V is northward. Keep the data in m/s; projection belongs to the renderer.
    const radians = direction * Math.PI / 180;
    u[cell] = speed === 0 ? 0 : -speed * Math.sin(radians);
    v[cell] = speed === 0 ? 0 : -speed * Math.cos(radians);
    if (!Number.isFinite(u[cell]) || !Number.isFinite(v[cell])) return null;
    occupied[cell] = 1;
    filled += 1;
  }
  if (filled !== count) return null;
  return { id: definition.id ?? `grid-${index}`, nx, ny, bbox: [...bbox], u, v };
}

export function windVectors(frame, metadata) {
  if (!Array.isArray(frame?.wind) || !metadata) return null;
  let definitions;
  if (metadata.type === 'regional-grids') {
    if (!Array.isArray(metadata.grids)) return null;
    definitions = metadata.grids;
  } else {
    // Older single-region snapshots are usable only if their actual coordinates
    // form this lattice. In particular, the old nx=20 global metadata cannot
    // turn four disconnected 5x5 regions into one interpolated field.
    if (metadata.type || frame.wind.length !== metadata.nx * metadata.ny) return null;
    definitions = [metadata];
  }
  const grids = definitions.map((definition, index) => regionalWindVectors(frame.wind, definition, index)).filter(Boolean);
  return grids.length ? { validAt: frame.valid_at, grids } : null;
}
