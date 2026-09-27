"""Convert NOAA's time-stamped KML concentration contours to GeoJSON.

Only polygons with explicit time bounds are accepted. Source KML values are
retained as labels; generic READY releases are relative dispersion, not PM2.5.
"""
from datetime import datetime, timezone
from io import BytesIO
import math
import zipfile
from xml.etree import ElementTree as ET

MAX_BYTES = 30 * 1024 * 1024
NS = {"k": "http://www.opengis.net/kml/2.2"}

def timestamp(value):
    parsed = datetime.fromisoformat(value.strip().replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        raise ValueError("Contour times must include a UTC offset")
    return parsed.astimezone(timezone.utc).isoformat()

def ring(element):
    if element is None or not element.text:
        raise ValueError("Missing contour coordinates")
    points = []
    for token in element.text.split():
        lon, lat = map(float, token.split(",")[:2])
        if not math.isfinite(lon) or not math.isfinite(lat) or not -180 <= lon <= 180 or not -90 <= lat <= 90:
            raise ValueError("Invalid contour coordinate")
        points.append([lon, lat])
    if len(points) < 4 or points[0] != points[-1]:
        raise ValueError("Contour ring must be closed")
    return points

def parse_kml(content):
    if len(content) > MAX_BYTES or b"<!DOCTYPE" in content.upper() or b"<!ENTITY" in content.upper():
        raise ValueError("Unsafe or oversized KML")
    root = ET.fromstring(content)
    parents = {child: parent for parent in root.iter() for child in parent}
    features = []
    for placemark in root.findall(".//k:Placemark", NS):
        polygons = placemark.findall(".//k:Polygon", NS)
        if not polygons:
            continue
        owner = placemark
        span = None
        while owner is not None and span is None:
            span = owner.find("k:TimeSpan", NS)
            owner = parents.get(owner)
        if span is None:
            raise ValueError("HYSPLIT contours have no sampling interval")
        start = timestamp(span.findtext("k:begin", namespaces=NS) or "")
        end = timestamp(span.findtext("k:end", namespaces=NS) or "")
        if end <= start:
            raise ValueError("Invalid sampling interval")
        for polygon in polygons:
            outer = ring(polygon.find("k:outerBoundaryIs/k:LinearRing/k:coordinates", NS))
            holes = [ring(p) for p in polygon.findall("k:innerBoundaryIs/k:LinearRing/k:coordinates", NS)]
            features.append({"type": "Feature", "geometry": {"type": "Polygon", "coordinates": [outer, *holes]},
                "properties": {"source": "NOAA HYSPLIT / READY", "kind": "forecast",
                    "valid_from": start, "valid_to": end, "quantity": "relative_dispersion",
                    "units": "relative concentration (unit release)",
                    "contour_label": placemark.findtext("k:name", default="Model contour", namespaces=NS)}})
    return features

def parse_archive(content):
    if len(content) > MAX_BYTES:
        raise ValueError("Model archive exceeds size limit")
    features = []
    remaining = MAX_BYTES
    def read_archive(data, depth=0):
        nonlocal remaining
        if depth > 1:
            raise ValueError("Unexpected nested archive")
        with zipfile.ZipFile(BytesIO(data)) as archive:
            if len(archive.infolist()) > 500:
                raise ValueError("Too many model output files")
            for info in archive.infolist():
                name = info.filename.lower()
                if not name.endswith((".kml", ".kmz")):
                    continue
                remaining -= info.file_size
                if remaining < 0:
                    raise ValueError("Expanded model output exceeds size limit")
                raw = archive.read(info)
                if name.endswith(".kmz"):
                    read_archive(raw, depth + 1)
                else:
                    features.extend(parse_kml(raw))
    read_archive(content)
    if not features:
        raise ValueError("NOAA output did not contain concentration KML")
    return {"type": "FeatureCollection", "features": features}
