from __future__ import annotations

from collections import Counter, defaultdict, deque
from datetime import datetime, timedelta, timezone
from threading import RLock
from typing import Any


class MajorityDecisionEngine:
    def __init__(self) -> None:
        self._events: dict[int, deque] = defaultdict(deque)
        self._lock = RLock()

    def add(self, line_no: int, detections: list[dict[str, Any]], observed_at=None) -> None:
        timestamp = observed_at or datetime.now(timezone.utc)
        with self._lock:
            for detection in detections:
                self._events[line_no].append((timestamp, detection["category"]))

    def decide(self, line_no: int, camera_code: str, config: dict[str, Any], model_version: str, now=None) -> dict[str, Any]:
        current_time = now or datetime.now(timezone.utc)
        decision_config = config["decision"]
        window_start = current_time - timedelta(seconds=int(decision_config["window_seconds"]))
        with self._lock:
            events = self._events[line_no]
            while events and events[0][0] < window_start:
                events.popleft()
            raw_counts = Counter(category for _, category in events)
        counts = {category: int(raw_counts.get(category, 0)) for category in config["categories"]}
        total = sum(counts.values())
        if total < int(decision_config["minimum_detections"]):
            majority = "INSUFFICIENT_DATA"
            percentage = 0.0
            action = {}
            status = "INSUFFICIENT_DATA"
        else:
            priority = decision_config["tie_break_priority"]
            majority_key = max(priority, key=lambda key: (counts[key], -priority.index(key)))
            majority = majority_key.upper()
            percentage = round(counts[majority_key] / total * 100, 3)
            action = config["actions"][majority_key]
            status = "READY"
        return {
            "line_no": line_no,
            "camera_code": camera_code,
            "window_started_at": window_start.replace(tzinfo=None),
            "window_ended_at": current_time.replace(tzinfo=None),
            "category_counts": counts,
            "total_count": total,
            "majority_category": majority,
            "majority_percentage": percentage,
            "recommended_action_code": action.get("action_code"),
            "recommended_action_name": action.get("action_name"),
            "action_parameters": action.get("parameters"),
            "decision_status": status,
            "model_version": model_version,
        }


majority_engine = MajorityDecisionEngine()
