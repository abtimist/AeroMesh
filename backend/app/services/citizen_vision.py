"""Pinned local fire/normal/smoke inference; scores are not calibrated truth."""
import hashlib
from pathlib import Path
import threading
import time

MODEL_ID = "prithivMLmods/Fire-Detection-Siglip2"
REVISION = "d7e0a2ca07ff6ad21fad2d0e5bfbef5aa8a45295"
WEIGHTS_SHA256 = "3864c1889833e422ba729ec7c73886806e8964e13d324921f6da3227e31210b3"
MODEL_DIR = Path(__file__).resolve().parents[2] / "runtime" / "fire-classifier"
_lock = threading.Lock()
_model = None
_processor = None


def ready():
    return all((MODEL_DIR / name).is_file() for name in ("config.json", "preprocessor_config.json", "model.safetensors"))


def classify(path):
    global _model, _processor
    with _lock:
        if not ready():
            raise RuntimeError("Local classifier is not installed. Run python -m scripts.setup_citizen_model.")
        import torch
        from PIL import Image
        from transformers import AutoImageProcessor, SiglipForImageClassification
        torch.set_num_threads(2)
        if _model is None:
            with (MODEL_DIR / "model.safetensors").open("rb") as weights:
                if hashlib.file_digest(weights, "sha256").hexdigest() != WEIGHTS_SHA256:
                    raise RuntimeError("Classifier weight checksum mismatch; reinstall the pinned model.")
            _processor = AutoImageProcessor.from_pretrained(str(MODEL_DIR), local_files_only=True, trust_remote_code=False)
            _model = SiglipForImageClassification.from_pretrained(str(MODEL_DIR), local_files_only=True, use_safetensors=True, trust_remote_code=False).eval()
            if {str(v).lower() for v in _model.config.id2label.values()} != {"fire", "smoke", "normal"}:
                _model = None
                raise RuntimeError("Unexpected classifier labels")
        started = time.perf_counter()
        with Image.open(path) as image, torch.inference_mode():
            inputs = _processor(images=image.convert("RGB"), return_tensors="pt")
            probs = _model(**inputs).logits.softmax(dim=-1)[0].tolist()
        scores = {str(_model.config.id2label[i]).lower(): float(p) for i, p in enumerate(probs)}
        label = max(scores, key=scores.get)
        return {"model": MODEL_ID, "revision": REVISION, "weights_sha256": WEIGHTS_SHA256,
                "label": label, "scores": scores, "score": scores[label],
                "inference_ms": round((time.perf_counter() - started) * 1000),
                "review_required": True, "interpretation": "Uncalibrated classifier scores, not verified smoke or fire. Human review is required."}
