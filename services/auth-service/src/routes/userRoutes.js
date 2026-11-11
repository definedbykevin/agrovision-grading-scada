import { Router } from 'express';
import bcrypt from 'bcrypt';
import { dbPool } from '../config/db.js';
import { requireAuth, authorizePermission, authorize } from '../middleware/jwtMiddleware.js';

const router = Router();
router.use(requireAuth);

// GET /api/admin/users
router.get('/users', authorizePermission('manage_users'), async (_req, res) => {
  try {
    const [rows] = await dbPool.query(
      `SELECT u.id, u.username, u.position_title, u.company_name,
              u.role_id, r.name as role_name, u.created_at
       FROM users u LEFT JOIN roles r ON u.role_id = r.id
       ORDER BY u.id ASC`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/users
router.post('/users', authorizePermission('manage_users'), async (req, res) => {
  const { username, password, position_title, company_name, role_id } = req.body;
  try {
    const hash = await bcrypt.hash(password, 10);
    const [result] = await dbPool.query(
      'INSERT INTO users (username, password_hash, position_title, company_name, role_id) VALUES (?,?,?,?,?)',
      [username, hash, position_title, company_name, role_id]
    );
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/admin/users/:id
router.put('/users/:id', authorizePermission('manage_users'), async (req, res) => {
  const { id } = req.params;
  const { username, password, position_title, company_name, role_id } = req.body;
  try {
    const fields = ['username=?', 'position_title=?', 'company_name=?', 'role_id=?'];
    const values = [username, position_title, company_name, role_id];
    if (password) {
      fields.push('password_hash=?');
      values.push(await bcrypt.hash(password, 10));
    }
    values.push(id);
    await dbPool.query(`UPDATE users SET ${fields.join(',')} WHERE id=?`, values);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', authorizePermission('manage_users'), async (req, res) => {
  try {
    await dbPool.query('DELETE FROM users WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/admin/roles
router.get('/roles', authorizePermission('manage_users'), async (_req, res) => {
  try {
    const [rows] = await dbPool.query('SELECT * FROM roles ORDER BY id');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/roles
router.post('/roles', authorize(['developer', 'admin']), async (req, res) => {
  const { name, description } = req.body;
  try {
    const [result] = await dbPool.query('INSERT INTO roles (name, description) VALUES (?,?)', [name, description]);
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/admin/roles/:id
router.put('/roles/:id', authorize(['developer', 'admin']), async (req, res) => {
  const { name, description } = req.body;
  try {
    await dbPool.query('UPDATE roles SET name=?, description=? WHERE id=?', [name, description, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/admin/roles/:id
router.delete('/roles/:id', authorize(['developer', 'admin']), async (req, res) => {
  try {
    await dbPool.query('DELETE FROM roles WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/admin/permissions
router.get('/permissions', authorizePermission('manage_users'), async (_req, res) => {
  try {
    const [rows] = await dbPool.query('SELECT * FROM permissions ORDER BY id');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/permissions
router.post('/permissions', authorize(['developer', 'admin']), async (req, res) => {
  const { role_id, permission_id } = req.body;
  try {
    await dbPool.query(
      'INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?,?)',
      [role_id, permission_id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
