import { Router } from 'express';
import { dbPool } from '../config/db.js';
import { requireAuth, authorize } from '../middleware/jwtMiddleware.js';

const router = Router();

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.headers['x-real-ip'] || req.ip || req.socket?.remoteAddress || '127.0.0.1';
}

router.use(requireAuth);

// GET /api/{station}/settings/thresholds
router.get('/thresholds', async (_req, res) => {
  try {
    const [rows] = await dbPool.query('SELECT * FROM threshold_settings ORDER BY parameter_key ASC');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/{station}/settings/thresholds (Upsert single threshold)
router.post('/thresholds', authorize(['developer', 'admin']), async (req, res) => {
  const { parameter_key, lower_val, warning_val, danger_val, unit } = req.body;
  try {
    // 1. Fetch old value for diff
    const [oldRows] = await dbPool.query('SELECT * FROM threshold_settings WHERE parameter_key = ?', [parameter_key]);
    const oldR = oldRows[0];
    let changes = [];
    if (!oldR) {
      changes.push(`Added ${parameter_key}`);
    } else {
      if (String(oldR.lower_val) !== String(lower_val)) changes.push(`Lower ${oldR.lower_val}->${lower_val}`);
      if (String(oldR.warning_val) !== String(warning_val)) changes.push(`Warn ${oldR.warning_val}->${warning_val}`);
      if (String(oldR.danger_val) !== String(danger_val)) changes.push(`Danger ${oldR.danger_val}->${danger_val}`);
    }

    // 2. Save
    await dbPool.query(
      `INSERT INTO threshold_settings (parameter_key, lower_val, warning_val, danger_val, unit)
       VALUES (?,?,?,?,?)
       ON DUPLICATE KEY UPDATE lower_val=?, warning_val=?, danger_val=?, unit=?`,
      [parameter_key, lower_val, warning_val, danger_val, unit, lower_val, warning_val, danger_val, unit]
    );

    // 3. Log
    if (req.user && req.user.userRole !== 'developer' && changes.length > 0) {
      const desc = `Press Station threshold ${parameter_key}: ${changes.join(', ')}`;
      await dbPool.query(
        "INSERT INTO agrovision_auth.activity_logs (user_id, username, activity_type, description, ip_address, user_agent) VALUES (?, ?, 'setting_change', ?, ?, ?)",
        [req.user.userId, req.user.username, desc, getClientIp(req), req.headers['user-agent']]
      ).catch((err) => console.error('[SettingLog] Error:', err));
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
