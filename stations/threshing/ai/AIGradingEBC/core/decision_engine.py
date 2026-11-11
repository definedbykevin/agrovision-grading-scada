from collections import Counter, defaultdict, deque
from datetime import datetime, timedelta, timezone
from threading import RLock


class MajorityDecisionEngine:
    def __init__(self) -> None:
        self._events = defaultdict(deque)
        self._lock = RLock()

    def add(self, line_no, detections, observed_at=None):
        timestamp = observed_at or datetime.now(timezone.utc)
        with self._lock:
            for detection in detections:
                self._events[line_no].append((timestamp, detection["category"]))

    def decide(self, line_no, camera_code, config, model_version, now=None):
        current = now or datetime.now(timezone.utc)
        start = current - timedelta(seconds=int(config["decision"]["window_seconds"]))
        with self._lock:
            events = self._events[line_no]
            while events and events[0][0] < start:
                events.popleft()
            raw = Counter(category for _, category in events)
        counts = {category: int(raw.get(category, 0)) for category in config["categories"]}
        total = sum(counts.values())
        if total < int(config["decision"]["minimum_detections"]):
            majority, percentage, action, status = "INSUFFICIENT_DATA", 0.0, {}, "INSUFFICIENT_DATA"
        else:
            priority = config["decision"]["tie_break_priority"]
            key = max(priority, key=lambda item: (counts[item], -priority.index(item)))
            majority, percentage = key.upper(), round(counts[key] / total * 100, 3)
            action, status = config["actions"][key], "READY"
        return {
            "line_no": line_no, "camera_code": camera_code,
            "window_started_at": start.replace(tzinfo=None), "window_ended_at": current.replace(tzinfo=None),
            "category_counts": counts, "total_count": total, "majority_category": majority,
            "majority_percentage": percentage, "recommended_action_code": action.get("action_code"),
            "recommended_action_name": action.get("action_name"), "action_parameters": action.get("parameters"),
            "decision_status": status, "model_version": model_version,
        }


majority_engine = MajorityDecisionEngine()
