import { Router } from 'express';
import { dbPool } from '../config/db.js';

const router = Router();

// GET /api/plc/realtime/:station/:equipment/:signal
router.get('/realtime/:station/:equipment/:signal', async (req, res) => {
  const { station, equipment, signal } = req.params;
  try {
    const [[row]] = await dbPool.query(
      `SELECT l.value, l.updated_at
       FROM plc_tag_latest l
       JOIN station_tag_mappings m ON l.tag_id = m.tag_id
       WHERE UPPER(m.station)=? AND UPPER(m.equipment)=? AND m.signal_key=?`,
      [station.toUpperCase(), equipment.toUpperCase(), signal.toLowerCase()]
    );
    res.json({ success: true, station, equipment, signal, value: row?.value ?? null });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// GET /api/plc/historical/:station/:equipment/:signal
router.get('/historical/:station/:equipment/:signal', async (req, res) => {
  const { station, equipment, signal } = req.params;
  const { from, to, limit = 500 } = req.query;
  try {
    let sql = `SELECT v.value, v.timestamp
               FROM plc_tag_values v
               JOIN station_tag_mappings m ON v.tag_id = m.tag_id
               WHERE UPPER(m.station)=? AND UPPER(m.equipment)=? AND m.signal_key=?`;
    const params = [station.toUpperCase(), equipment.toUpperCase(), signal.toLowerCase()];
    if (from) { sql += ' AND v.timestamp >= ?'; params.push(from); }
    if (to)   { sql += ' AND v.timestamp <= ?'; params.push(to); }
    sql += ' ORDER BY v.timestamp DESC LIMIT ?';
    params.push(parseInt(limit));
    const [rows] = await dbPool.query(sql, params);
    res.json({ success: true, station, equipment, signal, data: rows });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// GET /api/plc/historical/tag/:tagName
router.get('/historical/tag/:tagName', async (req, res) => {
  const { tagName } = req.params;
  const { limit = 500 } = req.query;
  try {
    const [rows] = await dbPool.query(
      `SELECT v.value, v.timestamp FROM plc_tag_values v
       JOIN plc_tags t ON v.tag_id = t.id
       WHERE t.tag_name=?
       ORDER BY v.timestamp DESC LIMIT ?`,
      [tagName, parseInt(limit)]
    );
    res.json({ success: true, tagName, data: rows });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
