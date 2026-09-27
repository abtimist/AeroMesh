"""Dated GIBS WMTS imagery; never substitute a different date or stock image."""
import asyncio
from datetime import datetime, timezone
from io import BytesIO
import math
import httpx
from PIL import Image
from app.core.cache import ResponseCache

LAYER = "MODIS_Terra_CorrectedReflectance_TrueColor"
ZOOM = 8
cache = ResponseCache(ttl=3600, capacity=48)
pending = {}

def pixel_position(lat, lon):
    n = 256 * 2 ** ZOOM
    lat = min(85.0, max(-85.0, lat))
    return (lon + 180) / 360 * n, (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n

def image_bounds(lat, lon):
    x, y = pixel_position(lat, lon)
    n = 256 * 2 ** ZOOM
    def longitude(px):
        return px / n * 360 - 180
    def latitude(py):
        return math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * py / n))))
    return [longitude(x - 256), latitude(y + 256), longitude(x + 256), latitude(y - 256)]

def metadata(event):
    day = event.detected_at.date().isoformat()
    return {"source": "NASA GIBS / Terra MODIS", "layer": LAYER, "date": day,
            "kind": "observation", "acquired_at": None,
            "acquisition_note": "Daily imagery; exact overpass time is not supplied by this browse layer. Clouds may obscure smoke.",
            "bbox": image_bounds(event.lat, event.lon), "status": "not_loaded",
            "image_url": f"/api/evidence/{event.id}/satellite.png"}

async def fetch_image(lat, lon, day):
    if day > datetime.now(timezone.utc).date().isoformat():
        return None
    key = (lat, lon, day)
    with cache.lock:
        from time import monotonic
        entry = cache.entries.get(key)
        if entry and entry[0] > monotonic():
            return entry[1]
    if key not in pending:
        pending[key] = asyncio.create_task(render_image(lat, lon, day))
    try:
        content = await asyncio.shield(pending[key])
        cache.get_or_create(key, lambda: content)
        return content
    finally:
        if key in pending and pending[key].done():
            pending.pop(key, None)

async def render_image(lat, lon, day):
    x, y = pixel_position(lat, lon)
    tx, ty = math.floor(x / 256), math.floor(y / 256)
    tiles = [(dx, dy) for dy in (-1, 0, 1) for dx in (-1, 0, 1)]
    semaphore = asyncio.Semaphore(3)
    async with httpx.AsyncClient(timeout=12) as client:
        async def tile(dx, dy):
            if not 0 <= ty + dy < 2 ** ZOOM:
                return None
            url = f"https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/{LAYER}/default/{day}/GoogleMapsCompatible_Level9/{ZOOM}/{ty + dy}/{(tx + dx) % (2 ** ZOOM)}.jpg"
            try:
                async with semaphore:
                    response = await client.get(url)
                response.raise_for_status()
                if not response.headers.get("content-type", "").startswith("image/"):
                    return None
                return response.content
            except httpx.HTTPError:
                return None
        raw = await asyncio.gather(*(tile(dx, dy) for dx, dy in tiles))
    return await asyncio.to_thread(compose, raw, tiles, x - tx * 256, y - ty * 256)

def compose(raw, tiles, px, py):
    mosaic = Image.new("RGBA", (768, 768))
    for data, (dx, dy) in zip(raw, tiles):
        if not data:
            continue
        try:
            with Image.open(BytesIO(data)) as source:
                if source.size != (256, 256):
                    continue
                tile = source.convert("RGBA")
                # GIBS true-colour no-data is black. Preserve a visible gap.
                valid = tile.convert("RGB").convert("L").point(lambda v: 255 if v > 3 else 0)
                tile.putalpha(valid)
                mosaic.paste(tile, ((dx + 1) * 256, (dy + 1) * 256))
        except (OSError, ValueError):
            continue
    crop = mosaic.crop((round(px), round(py), round(px) + 512, round(py) + 512))
    if crop.getchannel("A").getbbox() is None:
        return None
    output = BytesIO()
    crop.save(output, format="PNG")
    return output.getvalue()
