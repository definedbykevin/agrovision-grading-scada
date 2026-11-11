import { Router } from 'express';
import { dbPool } from '../config/db.js';
import { requireAuth, authorizePermission } from '../middleware/jwtMiddleware.js';

const router = Router();
router.use(requireAuth);

// GET /api/{station}/logsheet
router.get('/', async (req, res) => {
  const { date, shift } = req.query;
  const params = [];
  let sql = 'SELECT * FROM logsheet_entries WHERE 1=1';
  if (date)  { sql += ' AND log_date=?'; params.push(date); }
  if (shift) { sql += ' AND shift=?';    params.push(shift); }
  sql += ' ORDER BY log_date DESC, created_at DESC LIMIT 100';

  try {
    const [rows] = await dbPool.query(sql, params);
    // Parse JSON data for frontend convenience
    const parsedRows = rows.map(r => ({
      ...r,
      data_json: typeof r.data_json === 'string' ? JSON.parse(r.data_json) : r.data_json
    }));
    res.json({ success: true, data: parsedRows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/{station}/logsheet
router.post('/', authorizePermission('logsheet_input'), async (req, res) => {
  const { shift, log_date, data_json, notes } = req.body;
  try {
    const [r] = await dbPool.query(
      'INSERT INTO logsheet_entries (shift,log_date,operator_id,operator_name,data_json,notes) VALUES (?,?,?,?,?,?)',
      [shift, log_date, req.user.userId, req.user.username, JSON.stringify(data_json), notes]
    );
    res.json({ success: true, id: r.insertId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/{station}/logsheet/:id
router.put('/:id', authorizePermission('logsheet_input'), async (req, res) => {
  const { data_json, notes } = req.body;
  try {
    await dbPool.query(
      'UPDATE logsheet_entries SET data_json=?, notes=? WHERE id=?',
      [JSON.stringify(data_json), notes, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
// GET /api/{station}/logsheet/event-logs — Logsheet otomatis (perubahan PLC)
router.get('/event-logs', async (req, res) => {
  const { startDate, endDate, from, to, shift, severity, search, limit = 500 } = req.query;
  const params = [];
  let sql = 'SELECT * FROM station_event_logs WHERE 1=1';

  const filterFrom = startDate || from;
  const filterTo = endDate || to;

  if (filterFrom) { sql += ' AND timestamp >= ?'; params.push(filterFrom); }
  if (filterTo)   { sql += ' AND timestamp <= ?'; params.push(filterTo); }
  if (shift)      { sql += ' AND shift=?';        params.push(shift); }
  if (severity)   { sql += ' AND severity=?';     params.push(severity); }
  if (search) {
    sql += ' AND (tag_name LIKE ? OR new_value LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  sql += ' ORDER BY timestamp DESC LIMIT ?';
  params.push(parseInt(limit));

  try {
    const [rows] = await dbPool.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, data: [], error: err.message });
  }
});

export default router;
