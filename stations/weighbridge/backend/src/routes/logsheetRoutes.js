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

export default router;
