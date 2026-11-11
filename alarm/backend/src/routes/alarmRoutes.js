import { Router } from 'express';
import { dbPool } from '../config/db.js';
import { requireAuth, authorize } from '../middleware/jwtMiddleware.js';

const router = Router();
router.use(requireAuth);
const adminOnly = authorize(['developer', 'admin']);

// GET /api/alarm - Get all alarms
router.get('/', async (req, res) => {
  try {
    const [rows] = await dbPool.query('SELECT * FROM alarm_events ORDER BY status ASC, severity ASC, timestamp DESC');
    // Group by category to match what the frontend expects
    const grouped = {};
    rows.forEach(row => {
      if (!grouped[row.category]) {
        grouped[row.category] = [];
      }
      grouped[row.category].push({
        id: row.id,
        code: row.code,
        category: row.category,
        station: row.station,
        description: row.description,
        severity: row.severity,
        status: row.status,
        timestamp: row.timestamp,
        acknowledgedAt: row.acknowledged_at,
        acknowledgedBy: row.acknowledged_by,
        resolvedAt: row.resolved_at,
        occurrenceCount: row.occurrence_count
      });
    });
    res.json({ success: true, data: grouped });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/alarm/ack - Acknowledge an alarm
router.post('/ack', async (req, res) => {
  const { id } = req.body;
  const username = req.user?.username || 'operator';
  try {
    await dbPool.query(
      'UPDATE alarm_events SET status = "Acknowledged", acknowledged_at = NOW(), acknowledged_by = ? WHERE id = ?',
      [username, id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/alarm/resolve - Resolve an alarm
router.post('/resolve', async (req, res) => {
  const { id } = req.body;
  try {
    await dbPool.query(
      'UPDATE alarm_events SET status = "Resolved", resolved_at = NOW() WHERE id = ?',
      [id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/alarm/ack-all - Acknowledge all active alarms
router.post('/ack-all', async (req, res) => {
  const username = req.user?.username || 'operator';
  const { category } = req.body; // optional category filter
  try {
    let query = 'UPDATE alarm_events SET status = "Acknowledged", acknowledged_at = NOW(), acknowledged_by = ? WHERE status = "Active"';
    const params = [username];
    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }
    await dbPool.query(query, params);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/alarm/notifications/config - Get notification settings
router.get('/notifications/config', adminOnly, async (req, res) => {
  try {
    const [rows] = await dbPool.query('SELECT * FROM notification_settings');
    const config = {};
    rows.forEach(r => {
      config[r.setting_key] = r.setting_value;
    });
    res.json({ success: true, data: config });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/alarm/notifications/config - Update notification settings
router.post('/notifications/config', adminOnly, async (req, res) => {
  const config = req.body; // e.g. { notif_enabled: '1', notif_telegram_token: '...' }
  try {
    for (const [key, value] of Object.entries(config)) {
      await dbPool.query(
        'INSERT INTO notification_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
        [key, String(value), String(value)]
      );
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
