import { Router } from "express";
import { dbPoolPlc } from "../config/db.js";
import { requireAuth } from "../middleware/jwtMiddleware.js";

const router = Router();
router.use(requireAuth);

// GET /api/efb-plant/plc-config/devices
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

// POST /api/efb-plant/plc-config/devices
router.post("/devices", async (req, res) => {
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

// GET /api/efb-plant/plc-config/tags
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

// GET /api/efb-plant/plc-config/tags-live — live values untuk PlcConfigView
router.get("/tags-live", async (_req, res) => {
  try {
    const [rows] = await dbPoolPlc.query(
      `SELECT lt.tag_id, lt.value, t.tag_name
       FROM plc_tag_latest lt
       JOIN plc_tags t ON lt.tag_id = t.id
       WHERE t.enabled = 1`,
    );
    // Format sebagai object { tagId: value } seperti yang diharapkan frontend
    const data = {};
    for (const row of rows) {
      data[row.tag_id] = row.value;
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

// POST /api/efb-plant/plc-config/tags
router.post("/tags", async (req, res) => {
  const {
    plc_id,
    db_number,
    byte_offset,
    bit_offset,
    data_type,
    tag_name,
    access,
    enabled,
  } = req.body;
  try {
    const [result] = await dbPoolPlc.query(
      `INSERT INTO plc_tags (plc_id, db_number, byte_offset, bit_offset, data_type, tag_name, access, enabled)
       VALUES (?,?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE db_number=?, byte_offset=?, bit_offset=?, data_type=?, access=?, enabled=?`,
      [
        plc_id,
        db_number,
        byte_offset,
        bit_offset,
        data_type,
        tag_name,
        access,
        enabled,
        db_number,
        byte_offset,
        bit_offset,
        data_type,
        access,
        enabled,
      ],
    );
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
