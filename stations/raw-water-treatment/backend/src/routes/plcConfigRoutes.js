import { Router } from 'express';
import { dbPoolPlc } from '../config/db.js';
import { requireAuth, authorize } from '../middleware/jwtMiddleware.js';

const router = Router();
router.use(requireAuth);

// GET /api/raw-water-treatment/plc-config/devices
router.get('/devices', async (_req, res) => {
  try {
    const [rows] = await dbPoolPlc.query(`
      SELECT d.*,
        CASE WHEN d.last_seen_at IS NULL THEN 'DISCONNECTED'
             WHEN TIMESTAMPDIFF(SECOND, d.last_seen_at, NOW()) > 60 THEN 'DISCONNECTED'
             ELSE 'CONNECTED' END AS status,
        CASE WHEN d.last_seen_at IS NULL THEN 1
             WHEN TIMESTAMPDIFF(SECOND, d.last_seen_at, NOW()) > 60 THEN 1
             ELSE 0 END AS stale
      FROM plc_devices d ORDER BY d.name ASC`);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/raw-water-treatment/plc-config/devices
router.post('/devices', authorize(['developer', 'admin']), async (req, res) => {
  const { name, ip_address, rack, slot, enabled } = req.body;
  try {
    const [result] = await dbPoolPlc.query(
      `INSERT INTO plc_devices (name, ip_address, rack, slot, enabled)
       VALUES (?,?,?,?,?)
       ON DUPLICATE KEY UPDATE ip_address=?, rack=?, slot=?, enabled=?`,
      [name, ip_address, rack, slot, enabled, ip_address, rack, slot, enabled]
    );
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/raw-water-treatment/plc-config/devices/:id
router.put('/devices/:id', authorize(['developer', 'admin']), async (req, res) => {
  const { name, ip_address, rack, slot, enabled } = req.body;
  try {
    await dbPoolPlc.query(
      `UPDATE plc_devices SET name=?, ip_address=?, rack=?, slot=?, enabled=? WHERE id=?`,
      [name, ip_address, rack, slot, enabled ? 1 : 0, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/raw-water-treatment/plc-config/devices/:id
router.delete('/devices/:id', authorize(['developer', 'admin']), async (req, res) => {
  try {
    await dbPoolPlc.query('DELETE FROM plc_tags WHERE plc_id=?', [req.params.id]);
    await dbPoolPlc.query('DELETE FROM plc_devices WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/raw-water-treatment/plc-config/tags
router.get('/tags', async (_req, res) => {
  try {
    const [rows] = await dbPoolPlc.query(`
      SELECT t.*, d.name AS device_name
      FROM plc_tags t
      LEFT JOIN plc_devices d ON t.plc_id = d.id
      ORDER BY t.tag_name ASC`);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/raw-water-treatment/plc-config/tags-live
router.get('/tags-live', async (_req, res) => {
  try {
    const [rows] = await dbPoolPlc.query(
      `SELECT lt.tag_id, lt.value,
              TIMESTAMPDIFF(SECOND, lt.updated_at, NOW()) AS age_seconds,
              CASE WHEN TIMESTAMPDIFF(SECOND, lt.updated_at, NOW()) > 30 THEN 1 ELSE 0 END AS stale,
              t.tag_name
       FROM plc_tag_latest lt
       JOIN plc_tags t ON lt.tag_id = t.id
       WHERE t.enabled = 1`
    );
    const data = {};
    for (const row of rows) {
      data[row.tag_id] = { value: row.value, age_seconds: row.age_seconds, stale: row.stale === 1 };
    }
    res.json({ success: true, data });
  } catch (err) {
    if (err.code === 'ER_NO_SUCH_TABLE') return res.json({ success: true, data: {} });
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/raw-water-treatment/plc-config/tags
router.post('/tags', authorize(['developer', 'admin']), async (req, res) => {
  const { plc_id, db_number, byte_offset, bit_offset, data_type, tag_name, access, enabled } = req.body;
  try {
    const [result] = await dbPoolPlc.query(
      `INSERT INTO plc_tags (plc_id, db_number, byte_offset, bit_offset, data_type, tag_name, access, enabled)
       VALUES (?,?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE db_number=?, byte_offset=?, bit_offset=?, data_type=?, access=?, enabled=?`,
      [plc_id, db_number, byte_offset, bit_offset, data_type, tag_name, access, enabled,
       db_number, byte_offset, bit_offset, data_type, access, enabled]
    );
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/raw-water-treatment/plc-config/tags/:id
router.put('/tags/:id', authorize(['developer', 'admin']), async (req, res) => {
  const { plc_id, db_number, byte_offset, bit_offset, data_type, tag_name, access, enabled } = req.body;
  try {
    await dbPoolPlc.query(
      `UPDATE plc_tags SET plc_id=?, db_number=?, byte_offset=?, bit_offset=?, data_type=?, tag_name=?, access=?, enabled=?
       WHERE id=?`,
      [plc_id, db_number, byte_offset, bit_offset, data_type, tag_name, access, enabled ? 1 : 0, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/raw-water-treatment/plc-config/tags/:id
router.delete('/tags/:id', authorize(['developer', 'admin']), async (req, res) => {
  try {
    await dbPoolPlc.query('DELETE FROM plc_tags WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
