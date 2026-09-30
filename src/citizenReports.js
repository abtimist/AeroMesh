export const REPORT_IDS_KEY = 'aeromesh.citizenReportIds.v1';
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export function validatePhoto(file) {
  if (!file) return 'Choose a photo before submitting.';
  if (!PHOTO_TYPES.has(file.type)) return 'Choose a JPEG, PNG, or WebP image.';
  if (file.size === 0) return 'The selected image is empty.';
  if (file.size > MAX_PHOTO_BYTES) return 'The image must be 10 MiB or smaller.';
  return null;
}

function coordinate(value, limit, name) {
  if (value == null || String(value).trim() === '') throw new Error(`Enter ${name}.`);
  const number = Number(value);
  if (!Number.isFinite(number) || Math.abs(number) > limit) throw new Error(`${name} must be between ${-limit} and ${limit}.`);
  return number;
}

export function reportLocation({ source, lat, lon, accuracy_m }) {
  if (!['gps', 'manual'].includes(source)) throw new Error('Use GPS or enter the report coordinates explicitly.');
  const result = { location_source: source, lat: coordinate(lat, 90, 'Latitude'), lon: coordinate(lon, 180, 'Longitude') };
  if (source === 'gps' && accuracy_m != null) {
    const accuracy = Number(accuracy_m);
    if (!Number.isFinite(accuracy) || accuracy < 0) throw new Error('GPS accuracy is invalid. Request your location again.');
    result.accuracy_m = accuracy;
  }
  return result;
}

export function loadReportIds(storage) {
  try {
    const value = JSON.parse(storage.getItem(REPORT_IDS_KEY) || '[]');
    return Array.isArray(value) ? [...new Set(value.filter(id => typeof id === 'string' && /^[a-zA-Z0-9-]{1,100}$/.test(id)))].slice(0, 100) : [];
  } catch { return []; }
}

export function addReportId(ids, id) {
  return [String(id), ...ids.filter(existing => existing !== String(id))].slice(0, 100);
}

export function shouldPollReport(report) {
  return !report || Boolean(report.fetchError) || !['completed', 'failed'].includes(report.status);
}

export function haversineKm(first, second) {
  const radians = value => value * Math.PI / 180;
  const latitude = radians(second.lat - first.lat);
  const longitude = radians(second.lon - first.lon);
  const a = Math.sin(latitude / 2) ** 2 + Math.cos(radians(first.lat)) * Math.cos(radians(second.lat)) * Math.sin(longitude / 2) ** 2;
  return 6371.0088 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, a))));
}

export function nearbyRecords(records, location, radiusKm = 50) {
  if (!location) return [];
  return records.filter(record => Number.isFinite(record.lat) && Math.abs(record.lat) <= 90 && Number.isFinite(record.lon) && Math.abs(record.lon) <= 180)
    .map(record => ({ ...record, distance_km: haversineKm(location, record) }))
    .filter(record => record.distance_km <= radiusKm)
    .sort((first, second) => first.distance_km - second.distance_km);
}
