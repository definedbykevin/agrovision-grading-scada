import { Router } from "express";
import { dbPoolPlc } from "../config/db.js";
import { writeTagDirect } from "../plcCollector.js";

// Bypass authentication temporarily (Naked State) for testing
const requireAuth = (req, res, next) => next();
const authorize = () => (req, res, next) => next();

const router = Router();
router.use(requireAuth);

// Auto-create station_tag_mappings table jika belum ada
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
router.get("/devices", async (_req, res) => {
  try {
    const [rows] = await dbPoolPlc.query(
      "SELECT * FROM plc_devices ORDER BY name ASC",
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/{station}/plc-config/devices
router.post("/devices", authorize("developer"), async (req, res) => {
  const { name, ip_address, rack, slot, enabled } = req.body;
  try {
    const [result] = await dbPoolPlc.query(
      `INSERT INTO plc_devices (name, ip_address, rack, slot, enabled)
       VALUES (?,?,?,?,?)
       ON DUPLICATE KEY UPDATE ip_address=?, rack=?, slot=?, enabled=?`,
      [name, ip_address, rack, slot, enabled, ip_address, rack, slot, enabled],
    );
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/{station}/plc-config/tags
router.get("/tags", async (_req, res) => {
  try {
    const [rows] = await dbPoolPlc.query(
      "SELECT * FROM plc_tags ORDER BY tag_name ASC",
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/{station}/plc-config/tags-live — live values untuk PlcConfigView
router.get("/tags-live", async (_req, res) => {
  try {
    const [rows] = await dbPoolPlc.query(
      `SELECT lt.tag_id, lt.value, lt.updated_at, t.tag_name,
              IFNULL(TIMESTAMPDIFF(SECOND, lt.updated_at, NOW()), 0) AS age_seconds
       FROM plc_tag_latest lt
       JOIN plc_tags t ON lt.tag_id = t.id
       WHERE t.enabled = 1`,
    );
    // Format sebagai object { tagId: { value, age_seconds, stale } } seperti yang diharapkan frontend
    const data = {};
    for (const row of rows) {
      const age = row.age_seconds || 0;
      data[row.tag_id] = {
        value: row.value,
        age_seconds: age,
        stale: age > 15
      };
    }
    res.json({ success: true, data });
  } catch (err) {
    // Jika table plc_tag_latest belum ada, return empty
    if (err.code === "ER_NO_SUCH_TABLE") {
      return res.json({ success: true, data: {} });
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/{station}/plc-config/devices/:id
router.delete("/devices/:id", authorize("developer"), async (req, res) => {
  try {
    await dbPoolPlc.query("DELETE FROM plc_devices WHERE id = ?", [
      req.params.id,
    ]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/{station}/plc-config/tags/:id
router.delete("/tags/:id", authorize("developer"), async (req, res) => {
  try {
    await dbPoolPlc.query("DELETE FROM plc_tags WHERE id = ?", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/{station}/plc-config/station-mappings/:station
router.get("/station-mappings/:station", async (req, res) => {
  try {
    const [rows] = await dbPoolPlc.query(
      `SELECT m.*, t.tag_name, t.access, t.data_type
       FROM station_tag_mappings m
       JOIN plc_tags t ON m.tag_id = t.id
       WHERE LOWER(m.station) = LOWER(?)
       ORDER BY m.equipment, m.signal_key`,
      [req.params.station],
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    if (err.code === "ER_NO_SUCH_TABLE") {
      return res.json({ success: true, data: [] });
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/{station}/plc-config/station-mappings (supports single object OR { mappings: [...] })
router.post("/station-mappings", authorize("developer"), async (req, res) => {
  try {
    const list = req.body.mappings || [req.body];
    let count = 0;
    for (const item of list) {
      const { station, equipment, signal_key, tag_id } = item;
      if (!station || !equipment || !signal_key) continue;

      if (tag_id !== null && tag_id !== undefined && tag_id !== "" && Number(tag_id) > 0) {
        await dbPoolPlc.query(
          `INSERT INTO station_tag_mappings (station, equipment, signal_key, tag_id)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE tag_id = VALUES(tag_id), updated_at = NOW()`,
          [station, equipment, signal_key, Number(tag_id)],
        );
      } else {
        await dbPoolPlc.query(
          `DELETE FROM station_tag_mappings WHERE LOWER(station) = LOWER(?) AND equipment = ? AND signal_key = ?`,
          [station, equipment, signal_key],
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
router.delete("/station-mappings/:id", authorize("developer"), async (req, res) => {
  try {
    await dbPoolPlc.query("DELETE FROM station_tag_mappings WHERE id = ?", [
      req.params.id,
    ]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/{station}/plc-config/tags
router.post("/tags", authorize("developer"), async (req, res) => {
  const {
    plc_id,
    db_number,
    byte_offset,
    bit_offset,
    data_type,
    tag_name,
    access,
    enabled,
    node_id,
  } = req.body;
  try {
    const [result] = await dbPoolPlc.query(
      `INSERT INTO plc_tags (plc_id, db_number, byte_offset, bit_offset, data_type, tag_name, access, enabled, node_id)
       VALUES (?,?,?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE db_number=?, byte_offset=?, bit_offset=?, data_type=?, access=?, enabled=?, node_id=?`,
      [
        plc_id,
        db_number,
        byte_offset,
        bit_offset,
        data_type,
        tag_name,
        access,
        enabled,
        node_id || null,
        db_number,
        byte_offset,
        bit_offset,
        data_type,
        access,
        enabled,
        node_id || null,
      ],
    );
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/{station}/plc-config/write — Penulisan tag langsung via HTTP REST API
router.post("/write", authorize("developer"), async (req, res) => {
  const { tagId, tag_id, tag_name, value } = req.body;
  const targetId = tagId || tag_id || tag_name;
  if (!targetId || value === undefined) {
    return res.status(400).json({ success: false, error: "Missing tagId or value" });
  }
  try {
    const result = await writeTagDirect(targetId, value);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
