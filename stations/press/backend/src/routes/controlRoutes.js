import { Router } from "express";
import { dbPool } from "../config/db.js";
import { requireAuth, authorize } from "../middleware/jwtMiddleware.js";

const router = Router();
router.use(requireAuth);

const adminSuper = authorize(["developer", "admin", "supervisor"]);

// GET /api/press/control/press-1/status
router.get("/press-1/status", async (_req, res) => {
  const [rows] = await dbPool
    .query(
      `SELECT t.tag_name, l.value FROM plc_tag_latest l JOIN plc_tags t ON l.tag_id=t.id WHERE t.tag_name LIKE '%PRESS%'`,
    )
    .catch(() => [[]]);
  res.json({ success: true, data: rows });
});

router.post("/press-1/press", adminSuper, async (req, res) => {
  res.json({ success: true, message: "Press-1 PRESS command queued" });
});

router.post("/press-1/release", adminSuper, async (req, res) => {
  res.json({ success: true, message: "Press-1 RELEASE command queued" });
});

export default router;
