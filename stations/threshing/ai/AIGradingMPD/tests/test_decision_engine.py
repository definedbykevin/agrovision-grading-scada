import unittest
from datetime import datetime, timezone

from core.decision_engine import MajorityDecisionEngine


CONFIG = {
    "categories": {"normal_cook": {}, "under_cook": {}, "over_cook": {}},
    "decision": {
        "window_seconds": 60,
        "minimum_detections": 3,
        "tie_break_priority": ["under_cook", "over_cook", "normal_cook"],
    },
    "actions": {
        "normal_cook": {"action_code": "NORMAL", "action_name": "Normal", "parameters": {}},
        "under_cook": {"action_code": "UNDER", "action_name": "Under", "parameters": {}},
        "over_cook": {"action_code": "OVER", "action_name": "Over", "parameters": {}},
    },
}


class MajorityDecisionEngineTest(unittest.TestCase):
    def test_selects_real_majority(self):
        engine = MajorityDecisionEngine()
        now = datetime.now(timezone.utc)
        engine.add(1, [{"category": "under_cook"}, {"category": "normal_cook"}, {"category": "under_cook"}], now)
        result = engine.decide(1, "MPD-CAM", CONFIG, "test", now)
        self.assertEqual(result["majority_category"], "UNDER_COOK")
        self.assertEqual(result["recommended_action_code"], "UNDER")
        self.assertEqual(result["decision_status"], "READY")

    def test_rejects_incomplete_window(self):
        engine = MajorityDecisionEngine()
        now = datetime.now(timezone.utc)
        engine.add(1, [{"category": "normal_cook"}], now)
        result = engine.decide(1, "MPD-CAM", CONFIG, "test", now)
        self.assertEqual(result["majority_category"], "INSUFFICIENT_DATA")
        self.assertIsNone(result["recommended_action_code"])


if __name__ == "__main__":
    unittest.main()
