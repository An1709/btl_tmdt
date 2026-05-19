#!/usr/bin/env python3
"""Local Pet Vision training script.

Run this locally, not inside the production web service.
"""

from __future__ import annotations

import argparse
import json
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ML_DIR = Path(__file__).resolve().parent
DEFAULT_DATA_DIR = ML_DIR / "dataset"
DEFAULT_MODEL_PATH = ML_DIR / "models" / "pet_breed_model.keras"
DEFAULT_LABELS_PATH = ML_DIR / "labels.json"
DEFAULT_METRICS_PATH = ML_DIR / "outputs" / "metrics.json"
DEFAULT_STATUS_PATH = ML_DIR / "model-status.json"
INPUT_SIZE = (224, 224)
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}

PREFIX_SPECIES = {
    "cho": "Chó",
    "meo": "Mèo",
    "tho": "Thỏ",
    "hamster": "Hamster",
    "vet": "Vẹt",
    "ca": "Cá",
}


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def prettify_words(value: str) -> str:
    return " ".join(word[:1].upper() + word[1:] for word in value.replace("_", " ").split())


def parse_class_label(label: str, index: int) -> dict[str, Any]:
    normalized = " ".join(label.strip().split())
    prefix, _, remainder = normalized.partition(" ")
    species = PREFIX_SPECIES.get(prefix.lower())

    if species and remainder:
        breed = prettify_words(remainder)
        display_name = f"{species} {breed}"
    elif species:
        breed = ""
        display_name = species
    else:
        breed = prettify_words(normalized)
        display_name = breed
        species = breed

    return {
        "index": index,
        "label": normalized,
        "displayName": display_name,
        "species": species,
        "breed": breed,
    }


def count_images(directory: Path) -> int:
    if not directory.exists():
        return 0
    return sum(1 for path in directory.rglob("*") if path.suffix.lower() in IMAGE_EXTENSIONS)


def split_raw_dataset(data_dir: Path, validation_split: float) -> None:
    raw_dir = data_dir / "raw"
    train_dir = data_dir / "train"
    val_dir = data_dir / "val"

    if not raw_dir.exists():
        raise FileNotFoundError(
            "Dataset split not found. Create train/val folders or provide dataset/raw/<class_name>/."
        )

    train_dir.mkdir(parents=True, exist_ok=True)
    val_dir.mkdir(parents=True, exist_ok=True)

    for class_dir in sorted(path for path in raw_dir.iterdir() if path.is_dir()):
        images = sorted(path for path in class_dir.iterdir() if path.suffix.lower() in IMAGE_EXTENSIONS)
        if not images:
            continue

        split_index = max(1, int(len(images) * (1 - validation_split)))
        target_sets = (
            (train_dir / class_dir.name, images[:split_index]),
            (val_dir / class_dir.name, images[split_index:]),
        )

        for target_dir, paths in target_sets:
            target_dir.mkdir(parents=True, exist_ok=True)
            for source in paths:
                target = target_dir / source.name
                if not target.exists():
                    shutil.copy2(source, target)


def ensure_dataset(data_dir: Path, validation_split: float) -> tuple[Path, Path]:
    train_dir = data_dir / "train"
    val_dir = data_dir / "val"

    if not train_dir.exists() or not val_dir.exists():
        split_raw_dataset(data_dir, validation_split)

    if count_images(train_dir) == 0 or count_images(val_dir) == 0:
        raise ValueError("Dataset must contain images in both train and val folders.")

    return train_dir, val_dir


def create_base_model(model_name: str):
    import tensorflow as tf

    if model_name == "efficientnetb0":
        base_model = tf.keras.applications.EfficientNetB0(
            include_top=False,
            weights="imagenet",
            input_shape=(*INPUT_SIZE, 3),
        )
        preprocess = tf.keras.applications.efficientnet.preprocess_input
        return base_model, preprocess

    base_model = tf.keras.applications.MobileNetV2(
        include_top=False,
        weights="imagenet",
        input_shape=(*INPUT_SIZE, 3),
    )
    preprocess = tf.keras.applications.mobilenet_v2.preprocess_input
    return base_model, preprocess


def build_model(class_count: int, model_name: str):
    import tensorflow as tf

    base_model, preprocess = create_base_model(model_name)
    base_model.trainable = False

    inputs = tf.keras.Input(shape=(*INPUT_SIZE, 3))
    x = tf.keras.layers.RandomFlip("horizontal")(inputs)
    x = tf.keras.layers.RandomRotation(0.08)(x)
    x = tf.keras.layers.RandomZoom(0.1)(x)
    x = preprocess(x)
    x = base_model(x, training=False)
    x = tf.keras.layers.GlobalAveragePooling2D()(x)
    x = tf.keras.layers.Dropout(0.25)(x)
    outputs = tf.keras.layers.Dense(class_count, activation="softmax")(x)

    model = tf.keras.Model(inputs, outputs)
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )
    return model


def save_labels(class_names: list[str], labels_path: Path) -> list[dict[str, Any]]:
    classes = [parse_class_label(class_name, index) for index, class_name in enumerate(class_names)]
    payload: dict[str, Any] = {
        "inputSize": list(INPUT_SIZE),
        "classes": classes,
        "updatedAt": utc_now(),
    }

    for item in classes:
        payload[str(item["index"])] = {
            "label": item["label"],
            "displayName": item["displayName"],
            "species": item["species"],
            "breed": item["breed"],
        }

    write_json(labels_path, payload)
    return classes


def update_model_status(status_path: Path, metrics: dict[str, Any], labels: list[dict[str, Any]], model_path: Path) -> None:
    payload = {
        "enabled": True,
        "mode": "trained",
        "modelVersion": f"local-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}",
        "classCount": len(labels),
        "labels": [item["displayName"] for item in labels],
        "classes": labels,
        "lastTrainedAt": metrics["trainedAt"],
        "accuracy": metrics["validationAccuracy"],
        "dataset": "Backend/ml/dataset",
        "status": "ready",
        "modelFile": model_path.name,
    }
    write_json(status_path, payload)


def train(args: argparse.Namespace) -> None:
    import tensorflow as tf

    data_dir = Path(args.data)
    train_dir, val_dir = ensure_dataset(data_dir, args.validation_split)

    train_ds = tf.keras.utils.image_dataset_from_directory(
        train_dir,
        image_size=INPUT_SIZE,
        batch_size=args.batch_size,
        shuffle=True,
    )
    val_ds = tf.keras.utils.image_dataset_from_directory(
        val_dir,
        image_size=INPUT_SIZE,
        batch_size=args.batch_size,
        shuffle=False,
    )

    class_names = train_ds.class_names
    if len(class_names) < 2:
        raise ValueError("Training requires at least two classes.")

    autotune = tf.data.AUTOTUNE
    train_ds = train_ds.prefetch(autotune)
    val_ds = val_ds.prefetch(autotune)

    model = build_model(len(class_names), args.model)
    history = model.fit(train_ds, validation_data=val_ds, epochs=args.epochs)

    model_path = Path(args.output_model)
    labels_path = Path(args.labels)
    metrics_path = Path(args.metrics)
    status_path = Path(args.status)

    model_path.parent.mkdir(parents=True, exist_ok=True)
    model.save(model_path)

    labels = save_labels(class_names, labels_path)
    metrics = {
        "trainAccuracy": float(history.history["accuracy"][-1]),
        "validationAccuracy": float(history.history["val_accuracy"][-1]),
        "loss": float(history.history["loss"][-1]),
        "validationLoss": float(history.history["val_loss"][-1]),
        "classCount": len(class_names),
        "imageCount": {
            "train": count_images(train_dir),
            "val": count_images(val_dir),
            "total": count_images(train_dir) + count_images(val_dir),
        },
        "classes": [item["displayName"] for item in labels],
        "rawClasses": class_names,
        "model": args.model,
        "trainedAt": utc_now(),
    }
    write_json(metrics_path, metrics)
    update_model_status(status_path, metrics, labels, model_path)

    print(json.dumps({
        "success": True,
        "modelPath": str(model_path),
        "labelsPath": str(labels_path),
        "metricsPath": str(metrics_path),
    }, ensure_ascii=False))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train Pet Vision dog/cat breed classifier locally.")
    parser.add_argument("--data", default=str(DEFAULT_DATA_DIR), help="Dataset root containing train/val or raw folders.")
    parser.add_argument("--epochs", type=int, default=10)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--model", choices=["mobilenetv2", "efficientnetb0"], default="mobilenetv2")
    parser.add_argument("--validation-split", type=float, default=0.2)
    parser.add_argument("--output-model", default=str(DEFAULT_MODEL_PATH))
    parser.add_argument("--labels", default=str(DEFAULT_LABELS_PATH))
    parser.add_argument("--metrics", default=str(DEFAULT_METRICS_PATH))
    parser.add_argument("--status", default=str(DEFAULT_STATUS_PATH))
    return parser.parse_args()


if __name__ == "__main__":
    train(parse_args())
