import { Router } from 'express';
import pg from 'pg';
import { dbPool } from '../config/db.js';
import { requireAuth, authorizePermission } from '../middleware/jwtMiddleware.js';

const router = Router();
router.use(requireAuth);
router.use(authorizePermission('manage_users'));

// GET /api/activity/login
router.get('/login', async (req, res) => {
  const { from, to, limit = 100 } = req.query;
  try {
    let sql = `SELECT * FROM activity_logs WHERE activity_type='login'`;
    const params = [];
    if (from) { sql += ' AND created_at >= ?'; params.push(from); }
    if (to)   { sql += ' AND created_at <= ?'; params.push(to); }
    sql += ' ORDER BY created_at DESC LIMIT ?';
    params.push(parseInt(limit));
    const [rows] = await dbPool.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/activity/settings
router.get('/settings', async (req, res) => {
  const { from, to, limit = 100 } = req.query;
  try {
    const dbs = ['agrovision_main', 'agrovision_sterilizer', 'agrovision_kernel_plant', 'agrovision_press', 'agrovision_threshing'];
    const allLogs = [];

    const host = process.env.DB_HOST || 'localhost';
    const port = parseInt(process.env.DB_PORT || '5432', 10);
    const user = process.env.DB_USER_AUTH || process.env.DB_USER || 'postgres';
    const password = process.env.DB_PASSWORD_AUTH || process.env.DB_PASSWORD || 'admin123';

    for (const dbName of dbs) {
      let client;
      try {
        client = new pg.Client({ host, port, user, password, database: dbName });
        await client.connect();

        let sql = `SELECT id, user_id, username, activity_type, description, ip_address, user_agent, created_at FROM activity_logs WHERE activity_type='setting_change' AND username NOT IN ('dev', 'developer')`;
        const params = [];
        let pIdx = 1;
        if (from) { sql += ` AND created_at >= $${pIdx++}`; params.push(from); }
        if (to)   { sql += ` AND created_at <= $${pIdx++}`; params.push(to); }
        sql += ` ORDER BY created_at DESC LIMIT $${pIdx++}`;
        params.push(parseInt(limit));

        const result = await client.query(sql, params);
        if (result && Array.isArray(result.rows)) {
          allLogs.push(...result.rows);
        }
      } catch (e) {
        // Skip DB if unavailable or table doesn't exist
      } finally {
        if (client) {
          try { await client.end(); } catch (e) {}
        }
      }
    }

    // Deduplicate by username + description + timestamp
    const uniqueMap = new Map();
    allLogs.forEach(row => {
      const timeKey = Math.floor(new Date(row.created_at).getTime() / 1000);
      const key = `${row.username}_${row.description}_${timeKey}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, row);
      }
    });

    const merged = Array.from(uniqueMap.values());
    merged.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json({ success: true, data: merged.slice(0, parseInt(limit)) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
