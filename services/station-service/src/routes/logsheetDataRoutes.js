import { Router } from 'express';
import { dbPool } from '../config/db.js';
import { requireAuth } from '../middleware/jwtMiddleware.js';
const router = Router();
router.use(requireAuth);

router.get('/chart/:station', async (req, res) => {
  const { from, to } = req.query;
  const params = [req.params.station];
  let sql = 'SELECT tag_name, new_value as value, timestamp FROM station_event_logs WHERE station_name=?';
  if (from) { sql += ' AND timestamp >= ?'; params.push(from); }
  if (to)   { sql += ' AND timestamp <= ?'; params.push(to); }
  sql += ' ORDER BY timestamp ASC LIMIT 1000';
  const [rows] = await dbPool.query(sql, params).catch(() => [[]]);
  res.json({ success: true, data: rows });
});

router.get('/:station', async (req, res) => {
  const { from, to, shift, limit = 500 } = req.query;
  const params = [req.params.station];
  let sql = 'SELECT * FROM station_event_logs WHERE station_name=?';
  if (from)  { sql += ' AND timestamp >= ?'; params.push(from); }
  if (to)    { sql += ' AND timestamp <= ?'; params.push(to); }
  if (shift) { sql += ' AND shift=?';        params.push(shift); }
  sql += ' ORDER BY timestamp DESC LIMIT ?';
  params.push(parseInt(limit));
  const [rows] = await dbPool.query(sql, params).catch(() => [[]]);
  res.json({ success: true, data: rows });
});

export default router;
