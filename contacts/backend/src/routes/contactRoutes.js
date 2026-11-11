import { Router } from 'express';
import { dbPool } from '../config/db.js';
import { requireAuth, authorize } from '../middleware/jwtMiddleware.js';

const router = Router();
router.use(requireAuth);
const adminOnly = authorize(['developer', 'admin']);

// GET /api/contacts - List all contacts
router.get('/', async (req, res) => {
  try {
    const [rows] = await dbPool.query('SELECT * FROM contacts ORDER BY name ASC');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/contacts - Add contact
router.post('/', adminOnly, async (req, res) => {
  const { name, role, phone, email, station } = req.body;
  try {
    const [r] = await dbPool.query(
      'INSERT INTO contacts (name, role, phone, email, station) VALUES (?, ?, ?, ?, ?)',
      [name, role, phone || null, email || null, station || 'ALL']
    );
    res.json({ success: true, id: r.insertId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/contacts/:id - Update contact
router.put('/:id', adminOnly, async (req, res) => {
  const { name, role, phone, email, station } = req.body;
  try {
    await dbPool.query(
      'UPDATE contacts SET name = ?, role = ?, phone = ?, email = ?, station = ? WHERE id = ?',
      [name, role, phone || null, email || null, station || 'ALL', req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/contacts/:id - Delete contact
router.delete('/:id', adminOnly, async (req, res) => {
  try {
    await dbPool.query('DELETE FROM contacts WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
