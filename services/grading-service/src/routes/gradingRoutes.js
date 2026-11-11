import { Router } from 'express';
import { dbPool } from '../config/db.js';
import { requireAuth } from '../middleware/jwtMiddleware.js';
const router = Router();
router.use(requireAuth);

router.get('/stats', async (_req, res) => {
  const [rows] = await dbPool.query('SELECT category, COUNT(*) as count, AVG(confidence) as avg_conf FROM grading_ai GROUP BY category').catch(() => [[]]);
  res.json({ success: true, data: rows });
});

router.get('/recent', async (req, res) => {
  const { limit = 20 } = req.query;
  const [rows] = await dbPool.query('SELECT * FROM grading_ai ORDER BY created_at DESC LIMIT ?', [parseInt(limit)]).catch(() => [[]]);
  res.json({ success: true, data: rows });
});

router.get('/trend', async (req, res) => {
  const { from, to } = req.query;
  let sql = 'SELECT DATE(created_at) as date, category, COUNT(*) as count FROM grading_ai WHERE 1=1';
  const params = [];
  if (from) { sql += ' AND created_at >= ?'; params.push(from); }
  if (to)   { sql += ' AND created_at <= ?'; params.push(to); }
  sql += ' GROUP BY DATE(created_at), category ORDER BY date ASC';
  const [rows] = await dbPool.query(sql, params).catch(() => [[]]);
  res.json({ success: true, data: rows });
});

router.put('/detections/:id', async (req, res) => {
  const { category, confidence } = req.body;
  try {
    await dbPool.query('UPDATE grading_ai SET category=?,confidence=? WHERE id=?', [category, confidence, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/mock', async (req, res) => {
  const categories = ['ripe','unripe','overripe','underripe'];
  const cat = categories[Math.floor(Math.random() * categories.length)];
  const conf = (Math.random() * 30 + 70).toFixed(2);
  try {
    const [r] = await dbPool.query('INSERT INTO grading_ai (category,confidence) VALUES (?,?)', [cat, conf]);
    res.json({ success: true, id: r.insertId, category: cat, confidence: parseFloat(conf) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

export default router;
