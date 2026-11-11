import { Router } from 'express';
import { dbPool } from '../config/db.js';
import { requireAuth, authorize } from '../middleware/jwtMiddleware.js';

const router = Router();
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
    await dbPool.query(
      `INSERT INTO threshold_settings (parameter_key, lower_val, warning_val, danger_val, unit)
       VALUES (?,?,?,?,?)
       ON DUPLICATE KEY UPDATE lower_val=?, warning_val=?, danger_val=?, unit=?`,
      [parameter_key, lower_val, warning_val, danger_val, unit, lower_val, warning_val, danger_val, unit]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
