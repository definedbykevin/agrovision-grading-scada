from __future__ import annotations

import logging
import threading
import time

from config.settings import classification_config_store
from core.decision_engine import majority_engine
from core.detector import mpd_detector
from core.event_publisher import event_publisher
from core.rtsp_streamer import rtsp_registry
from database.repository import classification_repository


logger = logging.getLogger(__name__)


class ClassificationRuntime:
    def __init__(self) -> None:
        self._stop = threading.Event()
        self._thread = None
        self._last_publish: dict[int, float] = {}
        self._config = classification_config_store.load()
        self._config_lock = threading.RLock()

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return
        mpd_detector.load()
        rtsp_registry.sync(self._config)
        self._thread = threading.Thread(target=self._run, daemon=True, name="mpd-classification-runtime")
        self._thread.start()

    def config(self) -> dict:
        with self._config_lock:
            return self._config

    def reload_config(self, config: dict) -> None:
        with self._config_lock:
            self._config = config
            rtsp_registry.sync(config)

    def status(self) -> dict:
        return {
            "runtime_running": bool(self._thread and self._thread.is_alive()),
            "model_ready": mpd_detector.ready,
            "model_version": mpd_detector.model_version,
            "model_error": mpd_detector.error,
            "database_ready": classification_repository.health(),
            "cameras": rtsp_registry.statuses(),
        }

    def _run(self) -> None:
        while not self._stop.is_set():
            with self._config_lock:
                config = self._config
            target_fps = max(0.2, float(config["inference"]["target_fps"]))
            started = time.monotonic()
            for line in config["lines"]:
                if line.get("enabled"):
                    self._process_line(line, config)
            self._stop.wait(max(0.01, (1 / target_fps) - (time.monotonic() - started)))

    def _process_line(self, line: dict, config: dict) -> None:
        line_no = int(line["line_no"])
        camera_code = line["camera"]["camera_code"]
        worker = rtsp_registry.get(line_no)
        frame = worker.latest_frame() if worker else None
        if frame is None:
            self._publish_unavailable(line_no, camera_code, "CAMERA_OFFLINE", config)
            return
        if not mpd_detector.ready:
            worker.publish_frame(frame, [], config["categories"])
            self._publish_unavailable(line_no, camera_code, "MODEL_OFFLINE", config)
            return
        try:
            detections = mpd_detector.detect(frame, config)
            worker.publish_frame(frame, detections, config["categories"])
            majority_engine.add(line_no, detections)
            classification_repository.insert_detections(
                line_no, camera_code, detections, mpd_detector.model_version
            )
            now = time.monotonic()
            if now - self._last_publish.get(line_no, 0) < float(config["decision"]["publish_interval_seconds"]):
                return
            decision = majority_engine.decide(line_no, camera_code, config, mpd_detector.model_version)
            classification_repository.publish_decision(decision)
            event_publisher.publish({"event": "mpd_classification_decision", **decision})
            self._last_publish[line_no] = now
        except Exception:
            logger.exception("MPD classification loop failed for line %s", line_no)

    def _publish_unavailable(self, line_no: int, camera_code: str, status: str, config: dict) -> None:
        now = time.monotonic()
        if now - self._last_publish.get(line_no, 0) < float(config["decision"]["publish_interval_seconds"]):
            return
        try:
            classification_repository.publish_runtime_status(
                line_no, camera_code, status, mpd_detector.model_version
            )
            self._last_publish[line_no] = now
        except Exception:
            logger.exception("Unable to publish %s for MPD line %s", status, line_no)


classification_runtime = ClassificationRuntime()
