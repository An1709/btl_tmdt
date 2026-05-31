#!/usr/bin/env python3
"""Pet Vision local inference script.

This script is intentionally quiet on stdout: the Node backend expects a single
JSON object there. Any diagnostic logging should go to stderr.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path
from typing import Any

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")


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


def log_timing(event: str, started_at: float | None = None, **extra: Any) -> float:
    now = time.perf_counter()
    payload = {
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


def preprocess_image(image_path: Path, np, tf):
    image_started_at = log_timing("image loading started", imagePath=str(image_path))
    image = tf.keras.utils.load_img(image_path, target_size=INPUT_SIZE)
    log_timing("image loading completed", image_started_at, imagePath=str(image_path))

    preprocess_started_at = log_timing("preprocessing started")
    array = tf.keras.utils.img_to_array(image)
    batch = np.expand_dims(array, axis=0)
    log_timing("preprocessing completed", preprocess_started_at)
    return batch


def predict(image_path: Path, model_path: Path, labels_path: Path) -> dict[str, Any]:
    log_timing("script started")

    if not model_path.exists():
        return {"success": False, "message": "MODEL_NOT_FOUND"}

    if not image_path.exists():
        return {"success": False, "message": "IMAGE_NOT_FOUND"}

    try:
        tensorflow_started_at = log_timing("TensorFlow import started")
        import tensorflow as tf
        log_timing("TensorFlow import completed", tensorflow_started_at)
    except ImportError as error:
        dependency_name = getattr(error, "name", None) or "tensorflow"
        print(f"Pet Vision dependency import failed: {dependency_name}: {error}", file=sys.stderr)
        return {"success": False, "message": "TENSORFLOW_NOT_INSTALLED"}

    try:
        numpy_started_at = log_timing("NumPy import started")
        import numpy as np
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
        batch = preprocess_image(image_path, np, tf)
    except Exception as error:
        print(f"Image preprocessing failed: {error}", file=sys.stderr, flush=True)
        return {"success": False, "message": "IMAGE_PREPROCESS_FAILED"}

    try:
        prediction_started_at = log_timing("prediction started")
        probabilities = model.predict(batch, verbose=0)[0]
        log_timing("prediction completed", prediction_started_at)
    except Exception as error:
        print(f"Prediction failed: {error}", file=sys.stderr, flush=True)
        return {"success": False, "message": "PREDICTION_FAILED"}

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


def main() -> None:
    parser = argparse.ArgumentParser(description="Run Pet Vision breed prediction.")
    parser.add_argument("--image", required=True, help="Path to an input pet image.")
    parser.add_argument("--model", default=str(DEFAULT_MODEL_PATH), help="Path to .keras model file.")
    parser.add_argument("--labels", default=str(DEFAULT_LABELS_PATH), help="Path to labels.json.")
    args = parser.parse_args()

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
