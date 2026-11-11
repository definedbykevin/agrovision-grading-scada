import { Router } from 'express';
import { pool } from '../config/db.js';
import { requireAuth, authorizePermission } from '../middleware/jwtMiddleware.js';

const router = Router();
router.use(requireAuth);

// GET /api/{station}/logsheet
router.get('/', async (req, res) => {
  const { date, shift } = req.query;
  const params = [];
  let sql = 'SELECT * FROM logsheet_entries WHERE 1=1';
  let pIdx = 1;
  if (date)  { sql += ` AND log_date = $${pIdx++}`; params.push(date); }
  if (shift) { sql += ` AND shift = $${pIdx++}`;    params.push(shift); }
  sql += ' ORDER BY log_date DESC, created_at DESC LIMIT 100';

  try {
    const { rows } = await pool.query(sql, params);
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
    const { rows } = await pool.query(
      `INSERT INTO logsheet_entries (shift, log_date, operator_id, operator_name, data_json, notes) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id`,
      [shift, log_date, req.user?.userId || 0, req.user?.username || 'System', JSON.stringify(data_json), notes]
    );
    res.json({ success: true, id: rows[0]?.id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/{station}/logsheet/:id
router.put('/:id', authorizePermission('logsheet_input'), async (req, res) => {
  const { data_json, notes } = req.body;
  try {
    await pool.query(
      `UPDATE logsheet_entries 
       SET data_json = $1, notes = $2, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $3`,
      [JSON.stringify(data_json), notes, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
