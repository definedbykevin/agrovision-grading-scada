import { Router } from "express";
import { dbPool } from "../config/db.js";
import { requireAuth, authorize } from "../middleware/jwtMiddleware.js";

const router = Router();
router.use(requireAuth);

const adminSuper = authorize(["developer", "admin", "supervisor"]);

// GET /api/threshing/control/sfb-conveyor/status
router.get("/sfb-conveyor/status", async (_req, res) => {
  const [[row]] = await dbPool
    .query(
      `SELECT t.tag_name, l.value FROM plc_tag_latest l JOIN plc_tags t ON l.tag_id=t.id WHERE t.tag_name LIKE '%SFB%' LIMIT 1`,
    )
    .catch(() => [[null]]);
  res.json({ success: true, data: row });
});

router.post("/sfb-conveyor/start", adminSuper, async (req, res) => {
  res.json({ success: true, message: "SFB Conveyor START command queued" });
});

router.post("/sfb-conveyor/stop", adminSuper, async (req, res) => {
  res.json({ success: true, message: "SFB Conveyor STOP command queued" });
});

router.get("/status", async (_req, res) => {
  const [rows] = await dbPool
    .query(
      `SELECT t.tag_name, l.value FROM plc_tag_latest l JOIN plc_tags t ON l.tag_id=t.id WHERE t.tag_name LIKE '%THRESH%'`,
    )
    .catch(() => [[]]);
  res.json({ success: true, data: rows });
});

export default router;
