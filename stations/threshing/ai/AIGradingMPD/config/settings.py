from __future__ import annotations

import json
import os
import threading
from copy import deepcopy
from pathlib import Path
from typing import Any

from dotenv import load_dotenv


AI_ROOT = Path(__file__).resolve().parents[1]
load_dotenv(AI_ROOT / ".env")


class Settings:
    PORT = int(os.getenv("PORT", "4106"))
    FLASK_ENV = os.getenv("FLASK_ENV", "production")
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*")
    DB_HOST = os.getenv("DB_HOST", "127.0.0.1")
    DB_PORT = int(os.getenv("DB_PORT", "3306"))
    DB_USER = os.getenv("DB_USER", "root")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "")
    DB_NAME = os.getenv("DB_NAME", "agrovision_threshing_ai_mpd")
    MODEL_PATH = str((AI_ROOT / os.getenv("MODEL_PATH", "models/mpd_cooking.pt")).resolve())
    MODEL_DEVICE = os.getenv("MODEL_DEVICE", "cpu")
    REDIS_URL = os.getenv("REDIS_URL", "")
    REDIS_CHANNEL = os.getenv("REDIS_CHANNEL", "agrovision:threshing:mpd:classification")


class ClassificationConfigStore:
    required_categories = {"normal_cook", "under_cook", "over_cook"}

    def __init__(self) -> None:
        self._default_path = AI_ROOT / "config" / "classification_config.json"
        self._runtime_path = AI_ROOT / "config" / "classification_config.runtime.json"
        self._lock = threading.RLock()

    def load(self) -> dict[str, Any]:
        with self._lock:
            source = self._runtime_path if self._runtime_path.exists() else self._default_path
            with source.open("r", encoding="utf-8") as handle:
                config = json.load(handle)
            self.validate(config)
            return config

    def save(self, config: dict[str, Any]) -> dict[str, Any]:
        self.validate(config)
        with self._lock:
            temporary = self._runtime_path.with_suffix(".tmp")
            with temporary.open("w", encoding="utf-8") as handle:
                json.dump(config, handle, indent=2, ensure_ascii=False)
            temporary.replace(self._runtime_path)
        return deepcopy(config)

    def validate(self, config: dict[str, Any]) -> None:
        if set(config.get("categories", {})) != self.required_categories:
            raise ValueError("MPD categories must be exactly normal_cook, under_cook, and over_cook")
        if set(config.get("actions", {})) != self.required_categories:
            raise ValueError("MPD actions must cover exactly the three MPD categories")
        lines = config.get("lines")
        if not isinstance(lines, list) or not lines:
            raise ValueError("At least one MPD camera line is required")
        numbers = set()
        for line in lines:
            line_no = int(line.get("line_no", 0))
            if line_no < 1 or line_no in numbers:
                raise ValueError("line_no must be unique and greater than zero")
            numbers.add(line_no)
            camera = line.get("camera", {})
            if not camera.get("camera_code") or not camera.get("camera_name"):
                raise ValueError(f"Line {line_no} requires camera_code and camera_name")
            if line.get("enabled") and not camera.get("rtsp_url"):
                raise ValueError(f"Enabled line {line_no} requires camera.rtsp_url")
        decision = config.get("decision", {})
        if int(decision.get("window_seconds", 0)) < 1:
            raise ValueError("decision.window_seconds must be greater than zero")
        if int(decision.get("minimum_detections", 0)) < 1:
            raise ValueError("decision.minimum_detections must be greater than zero")
        priority = decision.get("tie_break_priority", [])
        if set(priority) != self.required_categories or len(priority) != 3:
            raise ValueError("decision.tie_break_priority must contain each MPD category once")


classification_config_store = ClassificationConfigStore()
