import { Router } from 'express';
import multer from 'multer';
import xlsx from 'xlsx';
import { dbPoolPlc } from '../config/db.js';
import { requireAuth, authorize } from '../middleware/jwtMiddleware.js';
import { getOpcUaClient } from '../plcCollector.js';
import { liveDataCache } from './monitorRoutes.js';
const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

// Auto-create station_tag_mappings table if it doesn't exist
async function ensureMappingTable() {
  try {
    await dbPoolPlc.query(`
      CREATE TABLE IF NOT EXISTS station_tag_mappings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        station VARCHAR(50) NOT NULL,
        equipment VARCHAR(100) NOT NULL,
        signal_key VARCHAR(50) NOT NULL,
        tag_id INT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_station_mapping (station, equipment, signal_key),
        KEY idx_stm_station (station),
        KEY idx_stm_tag (tag_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  } catch (e) {
    /* ignore */
  }
}
ensureMappingTable();



// GET /api/{station}/plc-config/devices
router.get('/devices', async (_req, res) => {
  try {
    const [rows] = await dbPoolPlc.query('SELECT * FROM plc_devices ORDER BY name ASC');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/{station}/plc-config/devices
router.post('/devices', requireAuth, authorize(['developer', 'admin']), async (req, res) => {
  const { name, ip_address, rack, slot, enabled, protocol } = req.body;
  try {
    const [result] = await dbPoolPlc.query(
      `INSERT INTO plc_devices (name, ip_address, rack, slot, enabled, protocol)
       VALUES (?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE ip_address=?, rack=?, slot=?, enabled=?, protocol=?`,
      [name, ip_address, rack, slot, enabled, protocol || 'SNAP7', ip_address, rack, slot, enabled, protocol || 'SNAP7']
    );
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/{station}/plc-config/devices/:id
router.put('/devices/:id', requireAuth, authorize(['developer', 'admin']), async (req, res) => {
  const { name, ip_address, rack, slot, enabled, protocol } = req.body;
  try {
    await dbPoolPlc.query(
      `UPDATE plc_devices SET name=?, ip_address=?, rack=?, slot=?, enabled=?, protocol=? WHERE id=?`,
      [name, ip_address, rack, slot, enabled, protocol || 'SNAP7', req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/{station}/plc-config/devices/:id
router.delete('/devices/:id', requireAuth, authorize(['developer', 'admin']), async (req, res) => {
  try {
    await dbPoolPlc.query('DELETE FROM plc_devices WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/{station}/plc-config/tags-live
router.get('/tags-live', async (_req, res) => {
  try {
    res.json({ success: true, data: liveDataCache });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
router.get('/tags', async (_req, res) => {
  try {
    const [rows] = await dbPoolPlc.query(`
      SELECT t.*, d.name AS device_name, d.protocol
      FROM plc_tags t
      LEFT JOIN plc_devices d ON t.plc_id = d.id
      ORDER BY t.tag_name ASC
    `);
    console.log("GET /tags returning first tag node_id:", rows[0]?.node_id);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/{station}/plc-config/tags
router.post('/tags', requireAuth, authorize(['developer', 'admin']), async (req, res) => {
  console.log("POST /tags received payload:", req.body);
  const { plc_id, db_number, byte_offset, bit_offset, data_type, tag_name, access, enabled, node_id } = req.body;
  try {
    const [result] = await dbPoolPlc.query(
      `INSERT INTO plc_tags (plc_id, db_number, byte_offset, bit_offset, data_type, tag_name, access, enabled, node_id)
       VALUES (?,?,?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE db_number=?, byte_offset=?, bit_offset=?, data_type=?, access=?, enabled=?, node_id=?`,
      [plc_id, db_number, byte_offset, bit_offset, data_type, tag_name, access, enabled, node_id || null,
        db_number, byte_offset, bit_offset, data_type, access, enabled, node_id || null]
    );
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/{station}/plc-config/tags/:id
router.put('/tags/:id', requireAuth, authorize(['developer', 'admin']), async (req, res) => {
  console.log("PUT /tags/:id received payload:", req.body);
  const { plc_id, db_number, byte_offset, bit_offset, data_type, tag_name, access, enabled, node_id } = req.body;
  try {
    await dbPoolPlc.query(
      `UPDATE plc_tags SET plc_id=?, db_number=?, byte_offset=?, bit_offset=?, data_type=?, tag_name=?, access=?, enabled=?, node_id=? WHERE id=?`,
      [plc_id, db_number, byte_offset, bit_offset, data_type, tag_name, access, enabled, node_id || null, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/{station}/plc-config/tags/:id
router.delete('/tags/:id', requireAuth, authorize(['developer', 'admin']), async (req, res) => {
  try {
    await dbPoolPlc.query('DELETE FROM plc_tags WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
// POST /api/{station}/plc-config/tags/import – bulk Excel import
router.post('/tags/import', requireAuth, authorize(['developer', 'admin']), upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No file uploaded' });
  }
  try {
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
    // Expected columns: plc_id, db_number, byte_offset, bit_offset, data_type, tag_name, access, enabled
    const values = rows.map(r => [
      r.plc_id,
      r.db_number,
      r.byte_offset,
      r.bit_offset,
      r.data_type,
      r.tag_name,
      r.access,
      r.enabled ? 1 : 0,
    ]);
    if (values.length === 0) {
      return res.status(400).json({ success: false, error: 'Empty Excel data' });
    }
    const placeholders = values.map(() => '(?,?,?,?,?,?,?,?)').join(',');
    const sql = `INSERT INTO plc_tags (plc_id, db_number, byte_offset, bit_offset, data_type, tag_name, access, enabled) VALUES ${placeholders}
      ON DUPLICATE KEY UPDATE db_number=VALUES(db_number), byte_offset=VALUES(byte_offset), bit_offset=VALUES(bit_offset), data_type=VALUES(data_type), access=VALUES(access), enabled=VALUES(enabled)`;
    const flatValues = values.flat();
    await dbPoolPlc.query(sql, flatValues);
    res.json({ success: true, imported: values.length });
  } catch (err) {
    console.error('Excel import error', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/{station}/plc-config/station-mappings
router.get('/station-mappings', async (req, res) => {
  try {
    const [rows] = await dbPoolPlc.query(
      `SELECT m.*, t.tag_name, t.access, t.data_type
       FROM station_tag_mappings m
       JOIN plc_tags t ON m.tag_id = t.id
       ORDER BY m.equipment, m.signal_key`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    if (err.code === 'ER_NO_SUCH_TABLE') {
      return res.json({ success: true, data: [] });
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/{station}/plc-config/station-mappings
router.post('/station-mappings', async (req, res) => {
  try {
    const list = req.body.mappings || [req.body];
    let count = 0;
    for (const item of list) {
      const { station, equipment, signal_key, tag_id } = item;
      if (!station || !equipment || !signal_key) continue;
      
      if (tag_id === null || tag_id === undefined || tag_id === '') {
        await dbPoolPlc.query(
          `DELETE FROM station_tag_mappings 
           WHERE station = ? AND equipment = ? AND signal_key = ?`,
          [station, equipment, signal_key]
        );
      } else {
        await dbPoolPlc.query(
          `INSERT INTO station_tag_mappings (station, equipment, signal_key, tag_id)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE tag_id = VALUES(tag_id), updated_at = NOW()`,
          [station, equipment, signal_key, tag_id]
        );
      }
      count++;
    }
    res.json({ success: true, count });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/{station}/plc-config/station-mappings/:id
router.delete('/station-mappings/:id', async (req, res) => {
  try {
    await dbPoolPlc.query('DELETE FROM station_tag_mappings WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/{station}/plc-config/devices/:id/opcua-browse
router.get('/devices/:id/opcua-browse', async (req, res) => {
  try {
    const deviceId = req.params.id;
    const nodeId = req.query.nodeId || "RootFolder";

    const client = getOpcUaClient(deviceId);
    if (!client) {
      return res.status(400).json({ success: false, error: "OPC UA device is not connected or not active" });
    }

    const references = await client.browseNode(nodeId);
    res.json({ success: true, data: references });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

