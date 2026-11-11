import { Router } from 'express';
import { dbPool } from '../config/db.js';
import { requireAuth } from '../middleware/jwtMiddleware.js';
const router = Router();
router.use(requireAuth);

router.get('/events', async (req, res) => {
  const { station, from, to, severity, limit = 200 } = req.query;
  let sql = 'SELECT * FROM station_event_logs WHERE 1=1';
  const params = [];
  if (station)  { sql += ' AND station_name=?';  params.push(station); }
  if (from)     { sql += ' AND timestamp >= ?';   params.push(from); }
  if (to)       { sql += ' AND timestamp <= ?';   params.push(to); }
  if (severity) { sql += ' AND severity=?';       params.push(severity); }
  sql += ' ORDER BY timestamp DESC LIMIT ?';
  params.push(parseInt(limit));
  const [rows] = await dbPool.query(sql, params).catch(() => [[]]);
  res.json({ success: true, data: rows });
});

router.get('/alarms', async (req, res) => {
  const { severity = 'ALARM', limit = 100 } = req.query;
  const [rows] = await dbPool.query(
    'SELECT * FROM station_event_logs WHERE severity=? ORDER BY timestamp DESC LIMIT ?',
    [severity, parseInt(limit)]
  ).catch(() => [[]]);
  res.json({ success: true, data: rows });
});

export default router;
