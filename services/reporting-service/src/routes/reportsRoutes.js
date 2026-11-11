import { Router } from 'express';
import { stationDb, plcDb, maintenanceDb, logsheetDb, gradingDb } from '../config/db.js';
import { requireAuth } from '../middleware/jwtMiddleware.js';

const router = Router();
router.use(requireAuth);

// ── Running Hours (dari station event logs) ──
router.get('/running-hours', async (req, res) => {
  const { from, to } = req.query;
  const params = [];
  let sql = `SELECT station_name, tag_name,
               COUNT(*) as entries,
               MIN(timestamp) as first_seen,
               MAX(timestamp) as last_seen
             FROM station_event_logs WHERE severity='INFO'`;
  if (from) { sql += ' AND timestamp >= ?'; params.push(from); }
  if (to)   { sql += ' AND timestamp <= ?'; params.push(to); }
  sql += ' GROUP BY station_name, tag_name ORDER BY station_name';
  const [rows] = await stationDb.query(sql, params).catch(() => [[]]);
  res.json({ success: true, data: rows });
});

// ── Daily Abnormalities (alarm/warning) ──
router.get('/daily-abnormalities', async (req, res) => {
  const { date } = req.query;
  const target = date || new Date().toISOString().split('T')[0];
  const [rows] = await stationDb.query(
    `SELECT * FROM station_event_logs
     WHERE DATE(timestamp)=? AND severity IN ('WARNING','ALARM')
     ORDER BY timestamp DESC`,
    [target]
  ).catch(() => [[]]);
  res.json({ success: true, data: rows, date: target });
});

// ── Mill Stability (event count per day per severity) ──
router.get('/mill-stability', async (req, res) => {
  const { from, to } = req.query;
  const params = [];
  let sql = `SELECT DATE(timestamp) as date, severity, COUNT(*) as count
             FROM station_event_logs WHERE 1=1`;
  if (from) { sql += ' AND timestamp >= ?'; params.push(from); }
  if (to)   { sql += ' AND timestamp <= ?'; params.push(to); }
  sql += ' GROUP BY DATE(timestamp), severity ORDER BY date ASC';
  const [rows] = await stationDb.query(sql, params).catch(() => [[]]);
  res.json({ success: true, data: rows });
});

// ── PLC Time-Series Summary ──
router.get('/plc-summary', async (req, res) => {
  const { tagName, from, to } = req.query;
  const params = [];
  let sql = `SELECT t.tag_name, MIN(v.value+0) as min_val, MAX(v.value+0) as max_val,
               AVG(v.value+0) as avg_val, COUNT(*) as samples
             FROM plc_tag_values v
             JOIN plc_tags t ON v.tag_id = t.id WHERE 1=1`;
  if (tagName) { sql += ' AND t.tag_name=?'; params.push(tagName); }
  if (from)    { sql += ' AND v.timestamp >= ?'; params.push(from); }
  if (to)      { sql += ' AND v.timestamp <= ?'; params.push(to); }
  sql += ' GROUP BY t.tag_name ORDER BY t.tag_name';
  const [rows] = await plcDb.query(sql, params).catch(() => [[]]);
  res.json({ success: true, data: rows });
});

// ── Maintenance Summary ──
router.get('/maintenance-summary', async (req, res) => {
  const [rows] = await maintenanceDb.query(
    `SELECT mm.station_name, COUNT(ml.id) as total_work_orders,
       SUM(CASE WHEN ml.status='approved' THEN 1 ELSE 0 END) as approved,
       SUM(CASE WHEN ml.status='pending'  THEN 1 ELSE 0 END) as pending
     FROM maintenance_machines mm
     LEFT JOIN maintenance_logs ml ON mm.id = ml.machine_id
     GROUP BY mm.station_name ORDER BY mm.station_name`
  ).catch(() => [[]]);
  res.json({ success: true, data: rows });
});

// ── Logsheet Completion Rate ──
router.get('/logsheet-completion', async (req, res) => {
  const { from, to } = req.query;
  const params = [];
  let sql = `SELECT log_date, station, shift, operator_name FROM logsheet_entries WHERE 1=1`;
  if (from) { sql += ' AND log_date >= ?'; params.push(from); }
  if (to)   { sql += ' AND log_date <= ?'; params.push(to); }
  sql += ' ORDER BY log_date DESC, station, shift';
  const [rows] = await logsheetDb.query(sql, params).catch(() => [[]]);
  res.json({ success: true, data: rows });
});

// ── Grading Trend ──
router.get('/grading-trend', async (req, res) => {
  const { from, to } = req.query;
  const params = [];
  let sql = `SELECT DATE(created_at) as date, category, COUNT(*) as count,
               AVG(confidence) as avg_confidence
             FROM grading_ai WHERE 1=1`;
  if (from) { sql += ' AND created_at >= ?'; params.push(from); }
  if (to)   { sql += ' AND created_at <= ?'; params.push(to); }
  sql += ' GROUP BY DATE(created_at), category ORDER BY date ASC';
  const [rows] = await gradingDb.query(sql, params).catch(() => [[]]);
  res.json({ success: true, data: rows });
});

export default router;
