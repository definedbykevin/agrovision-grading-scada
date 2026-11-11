from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

from config.settings import Settings


logger = logging.getLogger(__name__)


class MpdDetector:
    """Ultralytics adapter that remains safely offline until trained weights exist."""

    def __init__(self) -> None:
        self._model = None
        self._model_version = "model-not-loaded"
        self._load_error: str | None = None

    @property
    def ready(self) -> bool:
        return self._model is not None

    @property
    def model_version(self) -> str:
        return self._model_version

    @property
    def error(self) -> str | None:
        return self._load_error

    def load(self) -> None:
        model_path = Path(Settings.MODEL_PATH)
        if not model_path.exists():
            self._load_error = f"Model weights not found: {model_path.name}"
            logger.warning(self._load_error)
            return
        try:
            from ultralytics import YOLO

            self._model = YOLO(str(model_path))
            self._model_version = model_path.stem
            self._load_error = None
            logger.info("MPD classification model loaded: %s", model_path.name)
        except Exception as error:
            self._model = None
            self._load_error = str(error)
            logger.exception("Unable to load MPD classification model")

    def detect(self, frame, config: dict[str, Any]) -> list[dict[str, Any]]:
        if self._model is None:
            return []
        aliases: dict[str, str] = {}
        thresholds: dict[str, float] = {}
        for category, details in config["categories"].items():
            thresholds[category] = float(details["minimum_confidence"])
            for label in details["model_labels"]:
                aliases[self._normalize(label)] = category
        results = self._model.predict(
            source=frame,
            imgsz=int(config["inference"]["image_size"]),
            device=Settings.MODEL_DEVICE,
            verbose=False,
        )
        detections = []
        for result in results:
            for box in result.boxes:
                confidence = float(box.conf.item())
                label = self._normalize(result.names[int(box.cls.item())])
                category = aliases.get(label)
                if category is None or confidence < thresholds[category]:
                    continue
                x1, y1, x2, y2 = [round(float(value), 2) for value in box.xyxy[0].tolist()]
                detections.append({
                    "category": category,
                    "confidence": confidence,
                    "bounding_box": {"x1": x1, "y1": y1, "x2": x2, "y2": y2},
                })
        return detections

    @staticmethod
    def _normalize(value: str) -> str:
        return value.strip().lower().replace("-", "_").replace(" ", "_")


mpd_detector = MpdDetector()
