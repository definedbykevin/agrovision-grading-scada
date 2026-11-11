import { Router } from "express";
import { dbPoolConfig as dbPool } from "../config/db.js";
import { requireAuth, authorize } from "../middleware/jwtMiddleware.js";

const router = Router();

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.headers['x-real-ip'] || req.ip || req.socket?.remoteAddress || '127.0.0.1';
}

// Public endpoint — tidak perlu login
router.get("/stations", async (_req, res) => {
  try {
    const [rows] = await dbPool.query(
      "SELECT slug, title, is_active, sort_order FROM station_registry ORDER BY sort_order",
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.use(requireAuth);

router.get("/system/all", async (_req, res) => {
  const [rows] = await dbPool
    .query("SELECT setting_key, setting_value FROM system_settings")
    .catch(() => [[]]);
  const settings = {};
  rows.forEach((r) => {
    if (r.setting_key === "shift_config") {
      try {
        settings[r.setting_key] = JSON.parse(r.setting_value);
      } catch {
        settings[r.setting_key] = r.setting_value;
      }
    } else {
      settings[r.setting_key] = r.setting_value;
    }
  });
  res.json({ success: true, data: settings });
});

router.post(
  "/system/update",
  authorize(["developer", "admin"]),
  async (req, res) => {
    const updates = req.body;
    try {
      for (const [key, val] of Object.entries(updates)) {
        const finalVal =
          typeof val === "object" ? JSON.stringify(val) : String(val);
        await dbPool.query(
          "INSERT INTO system_settings (setting_key,setting_value) VALUES (?,?) ON DUPLICATE KEY UPDATE setting_value=?",
          [key, finalVal, finalVal],
        );
      }
      
      // Log activity for all accounts changing settings
      if (req.user) {
        const keys = Object.keys(updates).join(', ');
        await dbPool.query(
          "INSERT INTO activity_logs (user_id, username, activity_type, description, ip_address, user_agent) VALUES (?, ?, 'setting_change', ?, ?, ?)",
          [req.user.userId || 0, req.user.username, `Updated system settings: ${keys}`, getClientIp(req), req.headers['user-agent']]
        ).catch((err) => console.error('[SettingLog] Error:', err));
      }
      
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },
);

// POST /api/config/stations/toggle — lock/unlock satu stasiun (admin only)
router.post(
  "/stations/toggle",
  authorize(["developer", "admin"]),
  async (req, res) => {
    const { slug, is_active } = req.body;
    if (!slug || typeof is_active !== "number") {
      return res.status(400).json({
        success: false,
        error: "slug (string) and is_active (0|1) required",
      });
    }
    try {
      await dbPool.query(
        "UPDATE station_registry SET is_active = ? WHERE slug = ?",
        [is_active, slug],
      );
      
      // Log activity
      if (req.user && req.user.userRole !== 'developer') {
        await dbPool.query(
          "INSERT INTO activity_logs (user_id, username, activity_type, description, ip_address, user_agent) VALUES (?, ?, 'setting_change', ?, ?, ?)",
          [req.user.userId, req.user.username, `Toggled station ${slug} to ${is_active ? 'unlocked' : 'locked'}`, getClientIp(req), req.headers['user-agent']]
        ).catch((err) => console.error('[SettingLog] Error:', err));
      }
      
      res.json({
        success: true,
        message: `Station ${slug} ${is_active ? "unlocked" : "locked"}`,
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },
);

export default router;
