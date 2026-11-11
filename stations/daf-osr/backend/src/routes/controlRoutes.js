import { Router } from "express";
import { pool } from "../config/db.js";
import { requireAuth, authorize } from "../middleware/jwtMiddleware.js";

const router = Router();
router.use(requireAuth);

const adminSuper = authorize(["developer", "admin", "supervisor"]);

// GET /api/daf-osr/control/status
router.get("/status", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT t.tag_name, l.value 
       FROM plc_tag_latest l 
       JOIN plc_tags t ON l.tag_id = t.id 
       WHERE t.tag_name LIKE '%DAF%'`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.json({ success: true, data: [] });
  }
});

export default router;
