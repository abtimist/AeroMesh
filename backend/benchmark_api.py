"""Measure existing API routes without external network/proxy dependencies."""
import argparse
import json
import time
import httpx

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", default="http://127.0.0.1:8000")
    parser.add_argument("--regional", action="store_true")
    args = parser.parse_args()
    with httpx.Client(base_url=args.base, timeout=30, trust_env=False) as client:
        for route in ("sensors", "events"):
            path = f"/api/data/{route}" + ("?node=india" if args.regional else "")
            for run in range(3):
                start = time.perf_counter()
                response = client.get(path)
                response.raise_for_status()
                print(json.dumps({"route": path, "run": run + 1,
                    "ms": round((time.perf_counter() - start) * 1000, 2),
                    "bytes": len(response.content), "records": len(response.json())}), flush=True)
