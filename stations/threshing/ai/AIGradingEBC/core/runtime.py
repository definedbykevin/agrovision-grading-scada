from __future__ import annotations

import json
import logging
import os
import threading
import time
from pathlib import Path

import cv2
import numpy as np

from config.settings import Settings, classification_config_store
from core.decision_engine import majority_engine
from database.repository import classification_repository


logger = logging.getLogger(__name__)
os.environ.setdefault("OPENCV_FFMPEG_CAPTURE_OPTIONS", "rtsp_transport;tcp|fflags;nobuffer|flags;low_delay")


def _status_jpeg(title, message):
    image = np.full((720, 1280, 3), (246, 248, 251), dtype=np.uint8)
    cv2.rectangle(image, (18, 18), (1262, 702), (210, 220, 232), 3)
    cv2.putText(image, title.upper(), (60, 92), cv2.FONT_HERSHEY_SIMPLEX, 1.15, (28, 39, 57), 3)
    cv2.putText(image, message, (60, 365), cv2.FONT_HERSHEY_SIMPLEX, 0.85, (102, 117, 139), 2)
    ok, encoded = cv2.imencode(".jpg", image, [cv2.IMWRITE_JPEG_QUALITY, 86])
    return encoded.tobytes() if ok else b""


class EbcDetector:
    def __init__(self):
        self.model = None
        self.model_version = "model-not-loaded"
        self.error = None

    @property
    def ready(self):
        return self.model is not None

    def load(self):
        path = Path(Settings.MODEL_PATH)
        if not path.exists():
            self.error = f"Model weights not found: {path.name}"
            logger.warning(self.error)
            return
        try:
            from ultralytics import YOLO
            self.model = YOLO(str(path))
            self.model_version = path.stem
            self.error = None
            logger.info("EBC model loaded: %s", path.name)
        except Exception as error:
            self.model = None
            self.error = str(error)
            logger.exception("Unable to load EBC model")

    def detect(self, frame, config):
        if not self.model:
            return []
        aliases, thresholds = {}, {}
        for category, details in config["categories"].items():
            thresholds[category] = float(details["minimum_confidence"])
            for label in details["model_labels"]:
                aliases[self._normalize(label)] = category
        detections = []
        results = self.model.predict(source=frame, imgsz=int(config["inference"]["image_size"]), device=Settings.MODEL_DEVICE, verbose=False)
        for result in results:
            for box in result.boxes:
                confidence = float(box.conf.item())
                category = aliases.get(self._normalize(result.names[int(box.cls.item())]))
                if not category or confidence < thresholds[category]:
                    continue
                x1, y1, x2, y2 = [round(float(value), 2) for value in box.xyxy[0].tolist()]
                detections.append({"category": category, "confidence": confidence, "bounding_box": {"x1": x1, "y1": y1, "x2": x2, "y2": y2}})
        return detections

    @staticmethod
    def _normalize(value):
        return value.strip().lower().replace("-", "_").replace(" ", "_")


class CameraWorker:
    def __init__(self, line_no, name, url):
        self.line_no, self.name, self.url = line_no, name, url
        self.lock = threading.RLock()
        self.frame = None
        self.jpeg = _status_jpeg(name, "Camera is initializing")
        self.connected, self.last_frame_at, self.error = False, None, None
        self.stop_event, self.restart_event = threading.Event(), threading.Event()
        threading.Thread(target=self._loop, daemon=True, name=f"ebc-camera-{line_no}").start()

    def reconfigure(self, name, url):
        with self.lock:
            changed = name != self.name or url != self.url
            self.name, self.url = name, url
        if changed:
            self.restart_event.set()

    def stop(self):
        self.stop_event.set()
        self.restart_event.set()

    def latest_frame(self):
        with self.lock:
            return self.frame.copy() if self.frame is not None else None

    def publish_frame(self, frame, detections, categories):
        output = frame.copy()
        for detection in detections:
            box, category = detection["bounding_box"], detection["category"]
            details = categories[category]
            color = tuple(int(value) for value in details.get("color_bgr", [0, 180, 120]))
            x1, y1, x2, y2 = (int(box[key]) for key in ("x1", "y1", "x2", "y2"))
            cv2.rectangle(output, (x1, y1), (x2, y2), color, 2)
            cv2.putText(output, f"{details['display_name']} {detection['confidence'] * 100:.0f}%", (x1, max(20, y1 - 7)), cv2.FONT_HERSHEY_SIMPLEX, 0.55, color, 2)
        ok, encoded = cv2.imencode(".jpg", output, [cv2.IMWRITE_JPEG_QUALITY, 88])
        if ok:
            with self.lock:
                self.jpeg = encoded.tobytes()

    def status(self):
        with self.lock:
            return {"connected": self.connected, "last_frame_at": self.last_frame_at, "error": self.error}

    def _offline(self, error):
        with self.lock:
            self.connected, self.error, self.frame = False, error, None
            self.jpeg = _status_jpeg(self.name, error)

    def _loop(self):
        while not self.stop_event.is_set():
            with self.lock:
                url = self.url
            if not url:
                self._offline("RTSP URL is not configured")
                self.restart_event.wait(2); self.restart_event.clear(); continue
            capture = cv2.VideoCapture(url, cv2.CAP_FFMPEG)
            capture.set(cv2.CAP_PROP_BUFFERSIZE, 1)
            if not capture.isOpened():
                self._offline("Unable to open RTSP camera")
                capture.release(); self.restart_event.wait(3); self.restart_event.clear(); continue
            self.restart_event.clear()
            while not self.stop_event.is_set() and not self.restart_event.is_set():
                ok, frame = capture.read()
                if not ok or frame is None:
                    self._offline("Frame read failed; reconnecting"); break
                with self.lock:
                    self.frame, self.connected, self.last_frame_at, self.error = frame, True, time.time(), None
                time.sleep(0.005)
            capture.release(); time.sleep(0.5)


class CameraRegistry:
    def __init__(self):
        self.workers, self.lock = {}, threading.RLock()

    def sync(self, config):
        active = {int(line["line_no"]): line for line in config["lines"] if line.get("enabled")}
        with self.lock:
            for number in set(self.workers) - set(active):
                self.workers.pop(number).stop()
            for number, line in active.items():
                camera = line["camera"]
                if number not in self.workers:
                    self.workers[number] = CameraWorker(number, camera["camera_name"], camera["rtsp_url"])
                else:
                    self.workers[number].reconfigure(camera["camera_name"], camera["rtsp_url"])

    def get(self, line_no):
        with self.lock:
            return self.workers.get(line_no)

    def statuses(self):
        with self.lock:
            return {number: worker.status() for number, worker in self.workers.items()}

    def generate_mjpeg(self, line_no):
        while True:
            worker = self.get(line_no)
            jpeg = worker.jpeg if worker else _status_jpeg(f"EBC Line {line_no}", "Camera is disabled")
            yield b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + jpeg + b"\r\n"
            time.sleep(1 / 15)


class EventPublisher:
    def __init__(self):
        self.client = None

    def publish(self, payload):
        if not Settings.REDIS_URL:
            return
        try:
            if self.client is None:
                import redis
                self.client = redis.Redis.from_url(Settings.REDIS_URL, decode_responses=True)
            self.client.publish(Settings.REDIS_CHANNEL, json.dumps(payload, default=str))
        except Exception as error:
            logger.warning("Unable to publish EBC event: %s", error)
            self.client = None


detector, camera_registry, event_publisher = EbcDetector(), CameraRegistry(), EventPublisher()


class ClassificationRuntime:
    def __init__(self):
        self.config_data = classification_config_store.load()
        self.lock, self.stop_event = threading.RLock(), threading.Event()
        self.thread, self.last_publish = None, {}

    def start(self):
        if self.thread and self.thread.is_alive():
            return
        detector.load()
        camera_registry.sync(self.config_data)
        self.thread = threading.Thread(target=self._loop, daemon=True, name="ebc-classification-runtime")
        self.thread.start()

    def config(self):
        with self.lock:
            return self.config_data

    def reload_config(self, config):
        with self.lock:
            self.config_data = config
            camera_registry.sync(config)

    def status(self):
        return {"runtime_running": bool(self.thread and self.thread.is_alive()), "model_ready": detector.ready,
                "model_version": detector.model_version, "model_error": detector.error,
                "database_ready": classification_repository.health(), "cameras": camera_registry.statuses()}

    def _loop(self):
        while not self.stop_event.is_set():
            with self.lock:
                config = self.config_data
            started = time.monotonic()
            for line in config["lines"]:
                if line.get("enabled"):
                    self._process(line, config)
            fps = max(0.2, float(config["inference"]["target_fps"]))
            self.stop_event.wait(max(0.01, (1 / fps) - (time.monotonic() - started)))

    def _process(self, line, config):
        number, code = int(line["line_no"]), line["camera"]["camera_code"]
        worker = camera_registry.get(number)
        frame = worker.latest_frame() if worker else None
        if frame is None:
            self._unavailable(number, code, "CAMERA_OFFLINE", config); return
        if not detector.ready:
            worker.publish_frame(frame, [], config["categories"])
            self._unavailable(number, code, "MODEL_OFFLINE", config); return
        try:
            detections = detector.detect(frame, config)
            worker.publish_frame(frame, detections, config["categories"])
            majority_engine.add(number, detections)
            classification_repository.insert_detections(number, code, detections, detector.model_version)
            now = time.monotonic()
            if now - self.last_publish.get(number, 0) < float(config["decision"]["publish_interval_seconds"]):
                return
            decision = majority_engine.decide(number, code, config, detector.model_version)
            classification_repository.publish_decision(decision)
            event_publisher.publish({"event": "ebc_classification_decision", **decision})
            self.last_publish[number] = now
        except Exception:
            logger.exception("EBC classification loop failed for line %s", number)

    def _unavailable(self, number, code, status, config):
        now = time.monotonic()
        if now - self.last_publish.get(number, 0) < float(config["decision"]["publish_interval_seconds"]):
            return
        try:
            classification_repository.publish_runtime_status(number, code, status, detector.model_version)
            self.last_publish[number] = now
        except Exception:
            logger.exception("Unable to publish %s for EBC line %s", status, number)


classification_runtime = ClassificationRuntime()
