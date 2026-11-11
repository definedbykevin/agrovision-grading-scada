import unittest
from datetime import datetime, timezone
from core.decision_engine import MajorityDecisionEngine


CONFIG = {"categories": {"usb": {}, "psb": {}, "eb": {}},
          "decision": {"window_seconds": 60, "minimum_detections": 3, "tie_break_priority": ["usb", "psb", "eb"]},
          "actions": {key: {"action_code": key.upper(), "action_name": key, "parameters": {}} for key in ("usb", "psb", "eb")}}


class DecisionTest(unittest.TestCase):
    def test_usb_majority(self):
        engine, now = MajorityDecisionEngine(), datetime.now(timezone.utc)
        engine.add(1, [{"category": "usb"}, {"category": "usb"}, {"category": "eb"}], now)
        result = engine.decide(1, "EBC-CAM", CONFIG, "test", now)
        self.assertEqual(result["majority_category"], "USB")
        self.assertEqual(result["decision_status"], "READY")

    def test_insufficient_data(self):
        result = MajorityDecisionEngine().decide(1, "EBC-CAM", CONFIG, "test", datetime.now(timezone.utc))
        self.assertEqual(result["majority_category"], "INSUFFICIENT_DATA")
        self.assertIsNone(result["recommended_action_code"])


if __name__ == "__main__": unittest.main()
