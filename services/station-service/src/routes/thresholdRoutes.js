import { Router } from 'express';
import { dbPool } from '../config/db.js';
import { requireAuth, authorize } from '../middleware/jwtMiddleware.js';
const router = Router();
router.use(requireAuth);

router.get('/:station', async (req, res) => {
  const [rows] = await dbPool.query('SELECT * FROM threshold_settings WHERE station=?', [req.params.station]).catch(() => [[]]);
  res.json({ success: true, data: rows });
});

router.post('/:station', authorize(['developer', 'admin']), async (req, res) => {
  const { settings } = req.body;
  try {
    for (const [key, val] of Object.entries(settings)) {
      await dbPool.query(
        'INSERT INTO threshold_settings (station,parameter_key,lower_val,warning_val,danger_val,unit) VALUES (?,?,?,?,?,?) ON DUPLICATE KEY UPDATE lower_val=VALUES(lower_val),warning_val=VALUES(warning_val),danger_val=VALUES(danger_val),unit=VALUES(unit)',
        [req.params.station, key, val.lower||0, val.warning||50, val.danger||80, val.unit||'']
      );
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

export default router;
