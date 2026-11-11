import { Router } from 'express';
import { pool } from '../config/db.js';
import { requireAuth, authorize } from '../middleware/jwtMiddleware.js';
import { liveDataCache } from './monitorRoutes.js';

const router = Router();

// Auto-create station_tag_mappings table if it doesn't exist
async function ensureMappingTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS station_tag_mappings (
        id SERIAL PRIMARY KEY,
        station VARCHAR(50) NOT NULL,
        equipment VARCHAR(100) NOT NULL,
        signal_key VARCHAR(50) NOT NULL,
        tag_id INT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uk_daf_station_mapping UNIQUE (station, equipment, signal_key)
      )
    `);
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'uk_daf_station_mapping'
        ) THEN
          ALTER TABLE station_tag_mappings ADD CONSTRAINT uk_daf_station_mapping UNIQUE (station, equipment, signal_key);
        END IF;
      END $$;
    `);
  } catch (e) {
    /* ignore */
  }
}
ensureMappingTable();

// GET /api/{station}/plc-config/devices
router.get('/devices', async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM plc_devices ORDER BY name ASC');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/{station}/plc-config/devices
router.post('/devices', requireAuth, authorize(['developer', 'admin']), async (req, res) => {
  const { name, ip_address, rack, slot, enabled, protocol } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO plc_devices (name, ip_address, rack, slot, enabled, protocol)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (name) DO UPDATE SET 
         ip_address = EXCLUDED.ip_address, 
         rack = EXCLUDED.rack, 
         slot = EXCLUDED.slot, 
         enabled = EXCLUDED.enabled, 
         protocol = EXCLUDED.protocol
       RETURNING id`,
      [name, ip_address, rack, slot, Boolean(enabled), protocol || 'SNAP7']
    );
    res.json({ success: true, id: rows[0]?.id });
  } catch (err) {
    console.error("POST /devices database error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/{station}/plc-config/devices/:id
router.put('/devices/:id', requireAuth, authorize(['developer', 'admin']), async (req, res) => {
  const { name, ip_address, rack, slot, enabled, protocol } = req.body;
  try {
    await pool.query(
      `UPDATE plc_devices 
       SET name = $1, ip_address = $2, rack = $3, slot = $4, enabled = $5, protocol = $6 
       WHERE id = $7`,
      [name, ip_address, rack, slot, Boolean(enabled), protocol || 'SNAP7', req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/{station}/plc-config/devices/:id
router.delete('/devices/:id', requireAuth, authorize(['developer', 'admin']), async (req, res) => {
  try {
    await pool.query('DELETE FROM plc_devices WHERE id = $1', [req.params.id]);
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

// GET /api/{station}/plc-config/tags
router.get('/tags', async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT t.*, d.name AS device_name, d.protocol
      FROM plc_tags t
      LEFT JOIN plc_devices d ON t.plc_id = d.id
      ORDER BY t.tag_name ASC
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/{station}/plc-config/tags
router.post('/tags', requireAuth, authorize(['developer', 'admin']), async (req, res) => {
  const { plc_id, db_number, byte_offset, bit_offset, data_type, tag_name, access, enabled, node_id } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO plc_tags (plc_id, db_number, byte_offset, bit_offset, data_type, tag_name, access, enabled, node_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (tag_name) DO UPDATE SET 
         db_number = EXCLUDED.db_number, 
         byte_offset = EXCLUDED.byte_offset, 
         bit_offset = EXCLUDED.bit_offset, 
         data_type = EXCLUDED.data_type, 
         access = EXCLUDED.access, 
         enabled = EXCLUDED.enabled, 
         node_id = EXCLUDED.node_id
       RETURNING id`,
      [plc_id, db_number, byte_offset, bit_offset, data_type, tag_name, access, Boolean(enabled), node_id || null]
    );
    res.json({ success: true, id: rows[0]?.id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/{station}/plc-config/tags/:id
router.put('/tags/:id', requireAuth, authorize(['developer', 'admin']), async (req, res) => {
  const { plc_id, db_number, byte_offset, bit_offset, data_type, tag_name, access, enabled, node_id } = req.body;
  try {
    await pool.query(
      `UPDATE plc_tags 
       SET plc_id = $1, db_number = $2, byte_offset = $3, bit_offset = $4, data_type = $5, tag_name = $6, access = $7, enabled = $8, node_id = $9 
       WHERE id = $10`,
      [plc_id, db_number, byte_offset, bit_offset, data_type, tag_name, access, Boolean(enabled), node_id || null, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/{station}/plc-config/tags/:id
router.delete('/tags/:id', requireAuth, authorize(['developer', 'admin']), async (req, res) => {
  try {
    await pool.query('DELETE FROM plc_tags WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/{station}/plc-config/station-mappings
router.get(['/station-mappings', '/station-mappings/:station'], async (req, res) => {
  try {
    const station = req.params.station || 'daf-osr';
    const { rows } = await pool.query(
      `SELECT m.*, t.tag_name, t.access, t.data_type
       FROM station_tag_mappings m
       JOIN plc_tags t ON m.tag_id = t.id
       WHERE LOWER(m.station) = LOWER($1)
       ORDER BY m.equipment, m.signal_key`,
      [station]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    if (err.code === '42P01') {
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
        await pool.query(
          `DELETE FROM station_tag_mappings 
           WHERE LOWER(station) = LOWER($1) AND LOWER(equipment) = LOWER($2) AND LOWER(signal_key) = LOWER($3)`,
          [station, equipment, signal_key]
        );
      } else {
        await pool.query(
          `INSERT INTO station_tag_mappings (station, equipment, signal_key, tag_id)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (station, equipment, signal_key) DO UPDATE SET 
             tag_id = EXCLUDED.tag_id, 
             updated_at = CURRENT_TIMESTAMP`,
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
    await pool.query('DELETE FROM station_tag_mappings WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
