import { Router } from 'express';
import { dbPool } from '../config/db.js';
import { requireAuth } from '../middleware/jwtMiddleware.js';
const router = Router();
router.use(requireAuth);

router.get('/:station', async (req, res) => {
  const { date, shift } = req.query;
  const params = [req.params.station];
  let sql = 'SELECT * FROM logsheet_entries WHERE station=?';
  if (date)  { sql += ' AND log_date=?'; params.push(date); }
  if (shift) { sql += ' AND shift=?';    params.push(shift); }
  sql += ' ORDER BY log_date DESC, created_at DESC LIMIT 100';
  const [rows] = await dbPool.query(sql, params).catch(() => [[]]);
  res.json({ success: true, data: rows });
});

router.post('/:station', async (req, res) => {
  const { shift, log_date, data_json, notes } = req.body;
  try {
    const [r] = await dbPool.query(
      'INSERT INTO logsheet_entries (station,shift,log_date,operator_id,operator_name,data_json,notes) VALUES (?,?,?,?,?,?,?)',
      [req.params.station, shift, log_date, req.user.userId, req.user.username, JSON.stringify(data_json), notes]
    );
    res.json({ success: true, id: r.insertId });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.put('/:station/:id', async (req, res) => {
  const { data_json, notes } = req.body;
  try {
    await dbPool.query('UPDATE logsheet_entries SET data_json=?,notes=? WHERE id=? AND station=?',
      [JSON.stringify(data_json), notes, req.params.id, req.params.station]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

export default router;
