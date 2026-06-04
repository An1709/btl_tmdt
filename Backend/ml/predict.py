#!/usr/bin/env python3
"""Pet Vision local inference script.

Modes:
  CLI  (default): reads --image, prints one JSON object to stdout, exits.
  Server (--serve): loads model once at startup, optionally warms up with a
                    dummy prediction, then serves HTTP POST /predict requests.

The Node backend expects a single JSON object on stdout (CLI mode) or a JSON
HTTP response body (server mode).  Any diagnostic logging must go to stderr.
"""

from __future__ import annotations

import argparse
import io
import json
import os
import sys
import time
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from typing import Any

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")


ML_DIR = Path(__file__).resolve().parent
DEFAULT_MODEL_PATH = ML_DIR / "models" / "pet_breed_model.keras"
DEFAULT_LABELS_PATH = ML_DIR / "labels.json"
INPUT_SIZE = (224, 224)
PREFIX_SPECIES = {
    "cho": "Chó",
    "meo": "Mèo",
    "tho": "Thỏ",
    "hamster": "Hamster",
    "vet": "Vẹt",
    "ca": "Cá",
}

SCRIPT_STARTED_AT = time.perf_counter()

# ---------------------------------------------------------------------------
# Module-level singletons (populated once in server mode)
# ---------------------------------------------------------------------------
_model = None
_labels: list[dict[str, Any]] | None = None
_np = None
_tf = None


# ---------------------------------------------------------------------------
# Timing / logging helpers
# ---------------------------------------------------------------------------

def log_timing(event: str, started_at: float | None = None, **extra: Any) -> float:
    now = time.perf_counter()
    payload: dict[str, Any] = {
        "event": event,
        "elapsedMs": round((now - SCRIPT_STARTED_AT) * 1000, 2),
    }
    if started_at is not None:
        payload["durationMs"] = round((now - started_at) * 1000, 2)
    payload.update(extra)
    print(f"[PetVision:python] {json.dumps(payload, ensure_ascii=False)}", file=sys.stderr, flush=True)
    return now


def write_json(payload: dict[str, Any]) -> None:
    print(json.dumps(payload, ensure_ascii=False))
    log_timing("result JSON emitted")


# ---------------------------------------------------------------------------
# Label helpers
# ---------------------------------------------------------------------------

def prettify_words(value: str) -> str:
    return " ".join(word[:1].upper() + word[1:] for word in value.replace("_", " ").split())


def normalize_label_item(item: Any, index: int) -> dict[str, Any]:
    if isinstance(item, str):
        label = item
        display_name = ""
        species = ""
        breed = ""
        item_index = index
    elif isinstance(item, dict):
        label = item.get("label")
        display_name = item.get("displayName") or ""
        species = item.get("species") or ""
        breed = item.get("breed") or ""
        item_index = int(item.get("index", index))
    else:
        raise ValueError("INVALID_LABELS")

    if not label:
        raise ValueError("INVALID_LABELS")

    normalized_label = " ".join(label.strip().split())
    prefix, _, remainder = normalized_label.partition(" ")
    inferred_species = PREFIX_SPECIES.get(prefix.lower())

    if inferred_species:
        species = species or inferred_species
        breed = breed or prettify_words(remainder)
        display_name = display_name or f"{species} {breed}".strip()
    else:
        breed = breed or prettify_words(normalized_label)
        species = species or breed
        display_name = display_name or breed

    return {
        "index": item_index,
        "label": normalized_label,
        "displayName": display_name,
        "species": species,
        "breed": breed,
    }


def load_labels(labels_path: Path) -> list[dict[str, Any]]:
    if not labels_path.exists():
        raise FileNotFoundError("LABELS_NOT_FOUND")

    data = json.loads(labels_path.read_text(encoding="utf-8"))
    classes = data.get("classes") if isinstance(data, dict) else data

    if classes is None and isinstance(data, dict):
        numeric_keys = sorted((key for key in data.keys() if str(key).isdigit()), key=lambda key: int(key))
        classes = [data[key] for key in numeric_keys]

    if not isinstance(classes, list) or not classes:
        raise ValueError("INVALID_LABELS")

    normalized = [normalize_label_item(item, index) for index, item in enumerate(classes)]
    return sorted(normalized, key=lambda item: item["index"])


# ---------------------------------------------------------------------------
# Image pre-processing
# ---------------------------------------------------------------------------

def preprocess_image_path(image_path: Path, np, tf):
    """Load image from disk, resize to INPUT_SIZE, return a batch tensor."""
    image_started_at = log_timing("image loading started", imagePath=str(image_path))
    # target_size ensures the image is always resized to INPUT_SIZE (224x224)
    image = tf.keras.utils.load_img(image_path, target_size=INPUT_SIZE)
    log_timing("image loading completed", image_started_at, imagePath=str(image_path))

    preprocess_started_at = log_timing("preprocessing started")
    array = tf.keras.utils.img_to_array(image)
    batch = np.expand_dims(array, axis=0)
    log_timing("preprocessing completed", preprocess_started_at)
    return batch


def preprocess_image_bytes(image_bytes: bytes, np, tf):
    """Load image from raw bytes, resize to INPUT_SIZE, return a batch tensor."""
    from PIL import Image as PilImage
    preprocess_started_at = log_timing("preprocessing started (bytes)")
    pil_img = PilImage.open(io.BytesIO(image_bytes)).convert("RGB")
    # Resize to model input size
    pil_img = pil_img.resize(INPUT_SIZE, PilImage.LANCZOS)
    array = tf.keras.utils.img_to_array(pil_img)
    batch = np.expand_dims(array, axis=0)
    log_timing("preprocessing completed (bytes)", preprocess_started_at)
    return batch


# ---------------------------------------------------------------------------
# Core prediction logic (shared by CLI and server modes)
# ---------------------------------------------------------------------------

def _run_prediction_on_batch(batch, model, labels) -> dict[str, Any]:
    """Run model.predict on a preprocessed batch and return structured result."""
    prediction_started_at = log_timing("prediction started")
    probabilities = model.predict(batch, verbose=0)[0]
    log_timing("prediction completed", prediction_started_at)

    top_indices = probabilities.argsort()[-3:][::-1]
    top_k = []
    for index in top_indices:
        label_info = labels[int(index)] if int(index) < len(labels) else {
            "label": str(index),
            "displayName": str(index),
            "species": str(index),
            "breed": "",
        }
        top_k.append({
            "label": label_info["label"],
            "displayName": label_info.get("displayName", label_info["label"]),
            "species": label_info["species"],
            "breed": label_info.get("breed", ""),
            "confidence": float(probabilities[int(index)]),
        })

    best = top_k[0]
    return {
        "success": True,
        "prediction": {
            "label": best["label"],
            "displayName": best.get("displayName", best["label"]),
            "species": best["species"],
            "breed": best.get("breed", ""),
            "confidence": best["confidence"],
            "topK": top_k,
        },
    }


# ---------------------------------------------------------------------------
# CLI mode (original behaviour)
# ---------------------------------------------------------------------------

def predict(image_path: Path, model_path: Path, labels_path: Path) -> dict[str, Any]:
    log_timing("script started")

    if not model_path.exists():
        return {"success": False, "message": "MODEL_NOT_FOUND"}

    if not image_path.exists():
        return {"success": False, "message": "IMAGE_NOT_FOUND"}

    try:
        tensorflow_started_at = log_timing("TensorFlow import started")
        import tensorflow as tf  # noqa: PLC0415
        log_timing("TensorFlow import completed", tensorflow_started_at)
    except ImportError as error:
        dependency_name = getattr(error, "name", None) or "tensorflow"
        print(f"Pet Vision dependency import failed: {dependency_name}: {error}", file=sys.stderr)
        return {"success": False, "message": "TENSORFLOW_NOT_INSTALLED"}

    try:
        numpy_started_at = log_timing("NumPy import started")
        import numpy as np  # noqa: PLC0415
        log_timing("NumPy import completed", numpy_started_at)
    except ImportError as error:
        dependency_name = getattr(error, "name", None) or "python_dependency"
        print(f"Pet Vision dependency import failed: {dependency_name}: {error}", file=sys.stderr)
        return {"success": False, "message": "PYTHON_DEPENDENCY_MISSING"}

    try:
        labels_started_at = log_timing("labels loading started", labelsPath=str(labels_path))
        labels = load_labels(labels_path)
        log_timing("labels loading completed", labels_started_at, labelsPath=str(labels_path), classCount=len(labels))
    except Exception as error:
        print(f"Labels loading failed: {error}", file=sys.stderr, flush=True)
        return {"success": False, "message": str(error) or "INVALID_LABELS"}

    try:
        model_started_at = log_timing("model loading started", modelPath=str(model_path))
        model = tf.keras.models.load_model(model_path)
        log_timing("model loading completed", model_started_at, modelPath=str(model_path))
    except Exception as error:
        print(f"Model loading failed: {error}", file=sys.stderr, flush=True)
        return {"success": False, "message": "MODEL_LOAD_FAILED"}

    try:
        # Resize to INPUT_SIZE (224x224) happens inside preprocess_image_path
        batch = preprocess_image_path(image_path, np, tf)
    except Exception as error:
        print(f"Image preprocessing failed: {error}", file=sys.stderr, flush=True)
        return {"success": False, "message": "IMAGE_PREPROCESS_FAILED"}

    try:
        return _run_prediction_on_batch(batch, model, labels)
    except Exception as error:
        print(f"Prediction failed: {error}", file=sys.stderr, flush=True)
        return {"success": False, "message": "PREDICTION_FAILED"}


# ---------------------------------------------------------------------------
# Server mode: load once, serve many
# ---------------------------------------------------------------------------

def _load_globals(model_path: Path, labels_path: Path) -> None:
    """Load TF, numpy, labels, and model into module-level singletons."""
    global _model, _labels, _np, _tf  # noqa: PLW0603

    log_timing("server: TensorFlow import started")
    import tensorflow as tf  # noqa: PLC0415
    _tf = tf
    log_timing("server: TensorFlow import completed")

    log_timing("server: NumPy import started")
    import numpy as np  # noqa: PLC0415
    _np = np
    log_timing("server: NumPy import completed")

    labels_started_at = log_timing("server: labels loading started", labelsPath=str(labels_path))
    _labels = load_labels(labels_path)
    log_timing("server: labels loading completed", labels_started_at, classCount=len(_labels))

    model_started_at = log_timing("server: model loading started", modelPath=str(model_path))
    _model = tf.keras.models.load_model(model_path)
    log_timing("server: model loading completed", model_started_at)


def _warmup() -> None:
    """Run a single dummy prediction to JIT-compile the model graph."""
    global _model, _np, _tf  # noqa: PLW0603
    if _model is None or _np is None or _tf is None:
        return
    warmup_started_at = log_timing("server: warmup started")
    dummy = _np.zeros((1, INPUT_SIZE[0], INPUT_SIZE[1], 3), dtype="float32")
    _model.predict(dummy, verbose=0)
    log_timing("server: warmup completed", warmup_started_at)


class _PredictHandler(BaseHTTPRequestHandler):
    """Minimal HTTP handler — POST /predict with image bytes in body, or
    POST /predict with JSON body {"imagePath": "..."}.
    GET /health returns {"status": "ok"}.
    """

    def log_message(self, fmt, *args):  # noqa: N802  # suppress default access log
        pass

    def _send_json(self, status: int, payload: dict[str, Any]) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):  # noqa: N802
        if self.path == "/health":
            ready = _model is not None and _labels is not None
            self._send_json(200 if ready else 503, {"status": "ok" if ready else "loading"})
        else:
            self._send_json(404, {"error": "NOT_FOUND"})

    def do_POST(self):  # noqa: N802
        if self.path != "/predict":
            self._send_json(404, {"error": "NOT_FOUND"})
            return

        if _model is None or _labels is None or _np is None or _tf is None:
            self._send_json(503, {"success": False, "message": "MODEL_NOT_READY"})
            return

        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length) if content_length > 0 else b""

        content_type = self.headers.get("Content-Type", "")

        try:
            if "application/json" in content_type:
                # Accept {"imagePath": "/absolute/path/to/image.jpg"}
                request_data = json.loads(body.decode("utf-8"))
                image_path_str = request_data.get("imagePath")
                if not image_path_str:
                    self._send_json(400, {"success": False, "message": "MISSING_IMAGE_PATH"})
                    return
                image_path = Path(image_path_str)
                if not image_path.exists():
                    self._send_json(400, {"success": False, "message": "IMAGE_NOT_FOUND"})
                    return
                # Resize to INPUT_SIZE (224x224) happens inside preprocess_image_path
                batch = preprocess_image_path(image_path, _np, _tf)
            else:
                # Raw image bytes posted directly
                if not body:
                    self._send_json(400, {"success": False, "message": "EMPTY_BODY"})
                    return
                # Resize to INPUT_SIZE (224x224) happens inside preprocess_image_bytes
                batch = preprocess_image_bytes(body, _np, _tf)

            result = _run_prediction_on_batch(batch, _model, _labels)
            self._send_json(200, result)

        except Exception as error:
            print(f"[PetVision:server] Request handler error: {error}", file=sys.stderr, flush=True)
            self._send_json(500, {"success": False, "message": "PREDICTION_FAILED"})


def serve(
    model_path: Path,
    labels_path: Path,
    host: str = "127.0.0.1",
    port: int = 5002,
    warmup: bool = True,
) -> None:
    """Start the long-running inference HTTP server."""
    if not model_path.exists():
        print(json.dumps({"event": "startup_failed", "reason": "MODEL_NOT_FOUND"}, ensure_ascii=False), file=sys.stderr, flush=True)
        sys.exit(1)

    if not labels_path.exists():
        print(json.dumps({"event": "startup_failed", "reason": "LABELS_NOT_FOUND"}, ensure_ascii=False), file=sys.stderr, flush=True)
        sys.exit(1)

    try:
        _load_globals(model_path, labels_path)
    except Exception as error:
        print(f"[PetVision:server] Failed to load model: {error}", file=sys.stderr, flush=True)
        sys.exit(1)

    if warmup:
        try:
            _warmup()
        except Exception as error:
            print(f"[PetVision:server] Warmup failed (non-fatal): {error}", file=sys.stderr, flush=True)

    httpd = HTTPServer((host, port), _PredictHandler)
    # Signal readiness to Node via a single JSON line on stdout
    ready_msg = json.dumps({
        "event": "server_ready",
        "host": host,
        "port": port,
        "classCount": len(_labels) if _labels else 0,
    }, ensure_ascii=False)
    print(ready_msg, flush=True)
    log_timing("server: ready, listening", host=host, port=port)

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        httpd.server_close()
        log_timing("server: shut down")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(description="Run Pet Vision breed prediction.")
    parser.add_argument("--image", help="Path to an input pet image (CLI mode).")
    parser.add_argument("--model", default=str(DEFAULT_MODEL_PATH), help="Path to .keras model file.")
    parser.add_argument("--labels", default=str(DEFAULT_LABELS_PATH), help="Path to labels.json.")
    parser.add_argument("--serve", action="store_true", help="Run as a long-lived HTTP inference server.")
    parser.add_argument("--host", default="127.0.0.1", help="Host for server mode (default: 127.0.0.1).")
    parser.add_argument("--port", type=int, default=5002, help="Port for server mode (default: 5002).")
    parser.add_argument("--no-warmup", dest="warmup", action="store_false", help="Skip warmup prediction in server mode.")
    parser.set_defaults(warmup=True)
    args = parser.parse_args()

    if args.serve:
        serve(
            model_path=Path(args.model),
            labels_path=Path(args.labels),
            host=args.host,
            port=args.port,
            warmup=args.warmup,
        )
        return

    # CLI mode (original behaviour)
    if not args.image:
        parser.error("--image is required in CLI mode.")

    try:
        payload = predict(Path(args.image), Path(args.model), Path(args.labels))
    except FileNotFoundError as error:
        payload = {"success": False, "message": str(error)}
    except ValueError as error:
        payload = {"success": False, "message": str(error)}
    except Exception as error:
        print(f"Prediction failed: {error}", file=sys.stderr)
        payload = {"success": False, "message": "PREDICTION_FAILED"}

    write_json(payload)


if __name__ == "__main__":
    main()
