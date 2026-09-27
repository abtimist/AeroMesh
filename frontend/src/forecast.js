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

export function windVectors(frame, grid) {
  if (!frame || !grid || frame.wind.length !== grid.nx * grid.ny) return null;
  const [west, south, east, north] = grid.bbox;
  const u = [], v = [];
  for (const point of frame.wind) {
    const speed = point.wind_speed_10m, direction = point.wind_direction_10m;
    if (!Number.isFinite(speed) || speed < 0 || !Number.isFinite(direction)) return null;
    const radians = direction * Math.PI / 180;
    u.push(-speed * Math.sin(radians));
    v.push(-speed * Math.cos(radians));
  }
  const header = { parameterCategory: 2, parameterUnit: 'm.s-1', nx: grid.nx, ny: grid.ny,
    lo1: west, lo2: east, la1: north, la2: south,
    dx: (east - west) / (grid.nx - 1), dy: (north - south) / (grid.ny - 1),
    refTime: frame.valid_at, forecastTime: 0 };
  return [{ header: { ...header, parameterNumber: 2 }, data: u }, { header: { ...header, parameterNumber: 3 }, data: v }];
}
