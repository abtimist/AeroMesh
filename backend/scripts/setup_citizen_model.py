"""Download only pinned JSON/safetensors; never execute remote model code."""
import hashlib
import httpx
from app.services.citizen_vision import MODEL_ID, REVISION, WEIGHTS_SHA256, MODEL_DIR


def main():
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    with httpx.Client(follow_redirects=True, timeout=120) as client:
        for name in ("config.json", "preprocessor_config.json", "model.safetensors"):
            path = MODEL_DIR / name
            if name == "model.safetensors" and path.is_file():
                with path.open("rb") as source:
                    if hashlib.file_digest(source, "sha256").hexdigest() == WEIGHTS_SHA256:
                        print("Verified cached weights", flush=True)
                        continue
            temporary = path.with_suffix(path.suffix + ".part")
            print("Downloading", name, flush=True)
            digest = hashlib.sha256()
            with client.stream("GET", f"https://huggingface.co/{MODEL_ID}/resolve/{REVISION}/{name}") as response:
                response.raise_for_status()
                with temporary.open("wb") as output:
                    for chunk in response.iter_bytes(1024 * 1024):
                        output.write(chunk)
                        digest.update(chunk)
            if name == "model.safetensors" and digest.hexdigest() != WEIGHTS_SHA256:
                raise RuntimeError("Downloaded weight checksum mismatch; refusing activation")
            temporary.replace(path)
    print("Pinned local classifier installed", REVISION, flush=True)


if __name__ == "__main__":
    main()
