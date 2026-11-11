import { Router } from 'express';
import bcrypt from 'bcrypt';
import { dbPool } from '../config/db.js';
import { requireAuth, authorizePermission, authorize } from '../middleware/jwtMiddleware.js';

const router = Router();
router.use(requireAuth);

// GET /api/admin/users
router.get('/users', authorizePermission('manage_users'), async (_req, res) => {
  try {
    const [users] = await dbPool.query(
      `SELECT u.id, u.username, u.position_title, u.company_name,
              u.role_id, r.name as role_name, u.created_at
       FROM users u LEFT JOIN roles r ON u.role_id = r.id
       ORDER BY u.id ASC`
    );

    const [userPerms] = await dbPool.query(
      `SELECT up.user_id, p.id, p.name, p.slug 
       FROM user_permissions up
       JOIN permissions p ON up.permission_id = p.id`
    );

    const usersWithPerms = users.map(u => {
      const perms = userPerms.filter(up => up.user_id === u.id);
      return {
        ...u,
        permissions: perms.map(p => ({ id: p.id, name: p.name, slug: p.slug }))
      };
    });

    res.json({ success: true, data: usersWithPerms });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/users
router.post('/users', authorizePermission('manage_users'), async (req, res) => {
  const { username, password, position_title, company_name, role_id, permissionIds } = req.body;
  const connection = await dbPool.getConnection();
  try {
    await connection.beginTransaction();

    const currentUserRole = (req.user.userRole || '').toLowerCase();
    if (currentUserRole === 'mill_manager' && role_id) {
      const [[targetRole]] = await connection.query('SELECT name FROM roles WHERE id = ?', [role_id]);
      const targetRoleName = (targetRole?.name || '').toLowerCase();
      if (['admin', 'developer', 'electrical_automation'].includes(targetRoleName)) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: Mill Manager tidak diperbolehkan membuat akun dengan peran tersebut'
        });
      }
    }

    const hash = await bcrypt.hash(password, 10);
    const [result] = await connection.query(
      'INSERT INTO users (username, password_hash, position_title, company_name, role_id, must_change_password) VALUES (?,?,?,?,?,1)',
      [username, hash, position_title, company_name, role_id]
    );
    const newUserId = result.insertId;

    if (Array.isArray(permissionIds) && permissionIds.length > 0) {
      const values = permissionIds.map(pid => [newUserId, pid]);
      await connection.query('INSERT INTO user_permissions (user_id, permission_id) VALUES ?', [values]);
    }

    await connection.commit();
    res.json({ success: true, id: newUserId, debug: req.body });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ success: false, error: err.message });
  } finally {
    connection.release();
  }
});

// PUT /api/admin/users/:id
router.put('/users/:id', authorizePermission('manage_users'), async (req, res) => {
  const { id } = req.params;
  const { username, password, position_title, company_name, role_id, permissionIds } = req.body;
  const connection = await dbPool.getConnection();
  try {
    await connection.beginTransaction();

    // Fetch target user's role name
    const [[targetUser]] = await connection.query(
      `SELECT u.username, r.name as role_name 
       FROM users u 
       LEFT JOIN roles r ON u.role_id = r.id 
       WHERE u.id = ?`,
      [id]
    );

    if (!targetUser) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const currentUserRole = (req.user.userRole || '').toLowerCase();
    const targetUserRole = (targetUser.role_name || '').toLowerCase();

    if (currentUserRole === 'mill_manager') {
      // 1. Cannot edit Admin, Developer, or Electrical Automation
      if (['admin', 'developer', 'electrical_automation'].includes(targetUserRole)) {
        return res.status(403).json({ 
          success: false, 
          error: 'Forbidden: Mill Manager tidak diperbolehkan mengedit akun ini' 
        });
      }

      // 2. Cannot elevate someone to Admin or Developer
      if (role_id) {
        const [[targetRole]] = await connection.query('SELECT name FROM roles WHERE id = ?', [role_id]);
        const targetRoleName = (targetRole?.name || '').toLowerCase();
        if (['admin', 'developer', 'electrical_automation'].includes(targetRoleName)) {
          return res.status(403).json({
            success: false,
            error: 'Forbidden: Mill Manager tidak diperbolehkan memberikan akses peranan tersebut'
          });
        }
      }
    }

    const fields = ['username=?', 'position_title=?', 'company_name=?', 'role_id=?'];
    const values = [username, position_title, company_name, role_id];
    if (password) {
      fields.push('password_hash=?');
      values.push(await bcrypt.hash(password, 10));
      fields.push('must_change_password=?');
      values.push(1);
    }
    values.push(id);
    await connection.query(`UPDATE users SET ${fields.join(',')} WHERE id=?`, values);

    // Save user permissions
    if (Array.isArray(permissionIds)) {
      await connection.query('DELETE FROM user_permissions WHERE user_id=?', [id]);
      if (permissionIds.length > 0) {
        const insertVals = permissionIds.map(pid => [id, pid]);
        await connection.query('INSERT INTO user_permissions (user_id, permission_id) VALUES ?', [insertVals]);
      }
    }

    await connection.commit();
    res.json({ success: true });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ success: false, error: err.message });
  } finally {
    connection.release();
  }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', authorizePermission('manage_users'), async (req, res) => {
  try {
    // Fetch target user's role name
    const [[targetUser]] = await dbPool.query(
      `SELECT u.username, r.name as role_name 
       FROM users u 
       LEFT JOIN roles r ON u.role_id = r.id 
       WHERE u.id = ?`,
      [req.params.id]
    );

    if (!targetUser) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const currentUserRole = (req.user.userRole || '').toLowerCase();
    const targetUserRole = (targetUser.role_name || '').toLowerCase();

    // Mill Manager cannot delete Admin, Developer, or Electrical Automation
    if (currentUserRole === 'mill_manager' && ['admin', 'developer', 'electrical_automation'].includes(targetUserRole)) {
      return res.status(403).json({ 
        success: false, 
        error: 'Forbidden: Mill Manager tidak diperbolehkan menghapus akun ini' 
      });
    }

    await dbPool.query('DELETE FROM users WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/admin/roles
router.get('/roles', authorizePermission('manage_users'), async (_req, res) => {
  try {
    const [roles] = await dbPool.query('SELECT * FROM roles ORDER BY id');
    
    // Fetch permissions for all roles
    const [rolePerms] = await dbPool.query(
      `SELECT rp.role_id, p.id, p.name, p.slug, p.description 
       FROM role_permissions rp 
       JOIN permissions p ON rp.permission_id = p.id`
    );

    // Group permissions by role
    const rolesWithPerms = roles.map(role => {
      const perms = rolePerms.filter(rp => rp.role_id === role.id);
      return {
        ...role,
        permissions: perms.map(p => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          description: p.description
        }))
      };
    });

    res.json({ success: true, data: rolesWithPerms });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/roles
router.post('/roles', authorize(['developer', 'admin', 'mill_manager']), async (req, res) => {
  const { name, description } = req.body;
  try {
    const currentUserRole = (req.user.userRole || '').toLowerCase();
    if (currentUserRole === 'mill_manager' && ['admin', 'developer'].includes((name || '').toLowerCase())) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Mill Manager tidak diperbolehkan membuat peranan Admin atau Developer'
      });
    }

    const [result] = await dbPool.query('INSERT INTO roles (name, description) VALUES (?,?)', [name, description]);
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/admin/roles/:id
router.put('/roles/:id', authorize(['developer', 'admin', 'mill_manager']), async (req, res) => {
  const { name, description, permissionIds } = req.body;
  const connection = await dbPool.getConnection();
  try {
    await connection.beginTransaction();
    if (name !== undefined) {
      await connection.query('UPDATE roles SET name=?, description=? WHERE id=?', [name, description, req.params.id]);
    }
    
    if (Array.isArray(permissionIds)) {
      // Delete existing role permissions
      await connection.query('DELETE FROM role_permissions WHERE role_id=?', [req.params.id]);
      
      // Insert new permissions
      if (permissionIds.length > 0) {
        const values = permissionIds.map(pid => [req.params.id, pid]);
        await connection.query('INSERT INTO role_permissions (role_id, permission_id) VALUES ?', [values]);
      }
    }
    
    await connection.commit();
    res.json({ success: true });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ success: false, error: err.message });
  } finally {
    connection.release();
  }
});

// DELETE /api/admin/roles/:id
router.delete('/roles/:id', authorize(['developer', 'admin', 'mill_manager']), async (req, res) => {
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
router.post('/permissions', authorize(['developer', 'admin', 'mill_manager']), async (req, res) => {
  const { name, slug, description } = req.body;
  try {
    const [result] = await dbPool.query(
      'INSERT INTO permissions (name, slug, description) VALUES (?,?,?)',
      [name, slug, description]
    );
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
