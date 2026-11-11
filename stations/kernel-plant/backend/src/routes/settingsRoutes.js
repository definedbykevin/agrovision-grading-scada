import { Router } from 'express';
import { dbPool } from '../config/db.js';
import { requireAuth, authorize } from '../middleware/jwtMiddleware.js';

const router = Router();

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.headers['x-real-ip'] || req.ip || req.socket?.remoteAddress || '127.0.0.1';
}
router.use(requireAuth);

// GET /api/{station}/settings/thresholds
router.get('/thresholds', async (_req, res) => {
  try {
    const [rows] = await dbPool.query('SELECT * FROM threshold_settings ORDER BY parameter_key ASC');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/{station}/settings/thresholds (Upsert single threshold)
router.post('/thresholds', authorize(['developer', 'admin']), async (req, res) => {
  const { parameter_key, lower_val, warning_val, danger_val, unit } = req.body;
  try {
    // 1. Fetch old value for diff
    const [oldRows] = await dbPool.query('SELECT * FROM threshold_settings WHERE parameter_key = ?', [parameter_key]);
    const oldR = oldRows[0];
    let changes = [];
    if (!oldR) {
      changes.push(`Added ${parameter_key}`);
    } else {
      if (String(oldR.lower_val) !== String(lower_val)) changes.push(`Lower ${oldR.lower_val}->${lower_val}`);
      if (String(oldR.warning_val) !== String(warning_val)) changes.push(`Warn ${oldR.warning_val}->${warning_val}`);
      if (String(oldR.danger_val) !== String(danger_val)) changes.push(`Danger ${oldR.danger_val}->${danger_val}`);
    }

    // 2. Save
    await dbPool.query(
      `INSERT INTO threshold_settings (parameter_key, lower_val, warning_val, danger_val, unit)
       VALUES (?,?,?,?,?)
       ON DUPLICATE KEY UPDATE lower_val=?, warning_val=?, danger_val=?, unit=?`,
      [parameter_key, lower_val, warning_val, danger_val, unit, lower_val, warning_val, danger_val, unit]
    );

    // 3. Log
    if (req.user && req.user.userRole !== 'developer' && changes.length > 0) {
      const desc = `Kernel Plant threshold ${parameter_key}: ${changes.join(', ')}`;
      await dbPool.query(
        "INSERT INTO agrovision_auth.activity_logs (user_id, username, activity_type, description, ip_address, user_agent) VALUES (?, ?, 'setting_change', ?, ?, ?)",
        [req.user.userId, req.user.username, desc, getClientIp(req), req.headers['user-agent']]
      ).catch((err) => console.error('[SettingLog] Error:', err));
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/{station}/settings/recipe (Write to PLC)
router.post('/recipe', authorize(['developer', 'admin', 'operator']), async (req, res) => {
  const { commands } = req.body;
  if (!Array.isArray(commands)) {
    return res.status(400).json({ success: false, error: "Invalid payload format" });
  }

  const connection = await dbPool.getConnection();
  try {
    await connection.beginTransaction();

    let insertedCmds = [];
    for (const cmd of commands) {
      let tagRows = [];
      if (cmd.tagId) {
        [tagRows] = await connection.query("SELECT * FROM plc_tags WHERE id = ?", [cmd.tagId]);
      } else if (cmd.tagName) {
        [tagRows] = await connection.query("SELECT * FROM plc_tags WHERE tag_name = ?", [cmd.tagName]);
      }
      
      if (tagRows.length === 0) continue;
      
      const tag = tagRows[0];
      const val = String(cmd.value);

      const [result] = await connection.query(
        "INSERT INTO plc_commands (plc_id, tag_id, command_value, status, priority, requested_by) VALUES (?, ?, ?, 'PENDING', 1, ?)",
        [tag.plc_id, tag.id, val, req.user ? req.user.username : 'SYSTEM']
      );
      
      insertedCmds.push({
        cmdId: result.insertId,
        tagId: tag.id,
        tagName: tag.tag_name,
        value: val
      });
    }

    await connection.commit();
    connection.release();

    if (req.user && req.user.userRole !== 'developer' && insertedCmds.length > 0) {
      const summary = insertedCmds.map(c => `${c.tagName}=${c.value}`).join(', ');
      await dbPool.query(
        "INSERT INTO agrovision_auth.activity_logs (user_id, username, activity_type, description, ip_address, user_agent) VALUES (?, ?, 'setting_change', ?, ?, ?)",
        [req.user.userId, req.user.username, `Updated Kernel Plant Recipe: ${summary}`, getClientIp(req), req.headers['user-agent']]
      ).catch(e => console.error(e));
    }

    // Publish ke redis agar plcCollector langsung execute (optional tapi direkomendasikan)
    try {
      const { createClient } = await import('redis');
      const pub = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
      await pub.connect();
      for (const c of insertedCmds) {
        await pub.publish(process.env.COMMAND_CHANNEL || 'kip:plc:command', JSON.stringify({
          stationSlug: 'kernel-plant',
          cmdId: c.cmdId,
          tagId: c.tagId,
          value: c.value
        }));
      }
      await pub.disconnect();
    } catch(err) {
      console.warn("Failed to publish command to redis:", err);
    }

    res.json({ success: true, commands: insertedCmds });
  } catch (err) {
    await connection.rollback();
    connection.release();
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
