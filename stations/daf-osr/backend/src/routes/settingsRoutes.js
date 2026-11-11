import { Router } from 'express';
import { pool, mainPool } from '../config/db.js';
import { requireAuth, authorize } from '../middleware/jwtMiddleware.js';

const router = Router();
router.use(requireAuth);

// GET /api/{station}/settings/thresholds
router.get('/thresholds', async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM threshold_settings ORDER BY parameter_key ASC');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/{station}/settings/thresholds (Upsert single threshold - Native PostgreSQL)
router.post('/thresholds', authorize(['developer', 'admin']), async (req, res) => {
  const { parameter_key, lower_val, warning_val, danger_val, unit } = req.body;
  try {
    // 1. Fetch old value for diff log
    const { rows: oldRows } = await pool.query(
      'SELECT * FROM threshold_settings WHERE LOWER(parameter_key) = LOWER($1)',
      [parameter_key]
    );
    const oldR = oldRows[0];
    let changes = [];
    if (!oldR) {
      changes.push(`Added ${parameter_key}`);
    } else {
      if (String(oldR.lower_val) !== String(lower_val)) changes.push(`Lower ${oldR.lower_val}->${lower_val}`);
      if (String(oldR.warning_val) !== String(warning_val)) changes.push(`Warn ${oldR.warning_val}->${warning_val}`);
      if (String(oldR.danger_val) !== String(danger_val)) changes.push(`Danger ${oldR.danger_val}->${danger_val}`);
    }

    // 2. Save Native PostgreSQL (ON CONFLICT)
    await pool.query(
      `INSERT INTO threshold_settings (parameter_key, lower_val, warning_val, danger_val, unit)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (parameter_key) DO UPDATE
       SET lower_val = EXCLUDED.lower_val,
           warning_val = EXCLUDED.warning_val,
           danger_val = EXCLUDED.danger_val,
           unit = EXCLUDED.unit,
           updated_at = CURRENT_TIMESTAMP`,
      [parameter_key, lower_val, warning_val, danger_val, unit]
    );

    // 3. Log to agrovision_main.activity_logs
    if (req.user && req.user.userRole !== 'developer' && changes.length > 0) {
      const desc = `DAF / OSR Station threshold ${parameter_key}: ${changes.join(', ')}`;
      await mainPool.query(
        "INSERT INTO activity_logs (user_id, username, activity_type, description, ip_address, user_agent) VALUES ($1, $2, 'setting_change', $3, $4, $5)",
        [req.user.userId, req.user.username, desc, req.ip, req.headers['user-agent']]
      ).catch((err) => console.error('[SettingLog] Error:', err));
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
