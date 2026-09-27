"""Serve bundled, provenance-preserving HYSPLIT output without external services."""
from functools import lru_cache
import gzip
import json
from pathlib import Path

DEMO_DIR = Path(__file__).resolve().parents[2] / "data" / "hysplit_demo"

@lru_cache(maxsize=1)
def demo_metadata():
    return json.loads((DEMO_DIR / "metadata.json").read_text(encoding="utf-8"))

@lru_cache(maxsize=24)
def demo_frame(index):
    if not 0 <= index < demo_metadata()["frame_count"]:
        raise IndexError("Demo frame outside available intervals")
    return gzip.decompress((DEMO_DIR / f"frame-{index:02d}.geojson.gz").read_bytes())
