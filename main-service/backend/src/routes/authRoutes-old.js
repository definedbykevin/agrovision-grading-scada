import { Router } from 'express';
import bcrypt from 'bcrypt';
import { dbPool } from '../config/db.js';
import { signToken, requireAuth } from '../middleware/jwtMiddleware.js';

const router = Router();

// POST /auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password required' });
  }

  try {
    const [[user]] = await dbPool.query(
      `SELECT u.*, r.name as role_name
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE u.username = ?`,
      [username]
    );

    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

    // Get permissions for user
    const [perms] = await dbPool.query(
      `SELECT p.slug FROM permissions p
       JOIN user_permissions up ON p.id = up.permission_id
       WHERE up.user_id = ?`,
      [user.id]
    );

    const permissions = perms.map(p => p.slug);
    const systemPermissions = mapMenuPermissionsToSystemPermissions(permissions);

    const tokenPayload = {
      userId:      user.id,
      username:    user.username,
      userRole:    user.role_name || 'operator',
      permissions: [...permissions, ...systemPermissions],
      positionTitle: user.position_title,
      companyName:   user.company_name,
      mustChangePassword: user.must_change_password === 1,
    };

    const token = signToken(tokenPayload);

    // Log activity
    await dbPool.query(
      `INSERT INTO activity_logs (user_id, username, activity_type, description, ip_address, user_agent)
       VALUES (?, ?, 'login', ?, ?, ?)`,
      [user.id, user.username, `User logged in from ${req.ip}`, req.ip, req.headers['user-agent']]
    ).catch((err) => {
	console.error('[AuthLog] Error:', err);	
    });

    res.json({
      success: true,
      token,
      user: tokenPayload,
    });
  } catch (err) {
    console.error('[auth] login error:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /auth/logout
router.post('/logout', (_req, res) => {
  res.json({ success: true, message: 'Logged out' });
});

// GET /auth/me
router.get('/me', requireAuth, (req, res) => {
  res.json({ success: true, user: req.user });
});

// GET /auth/verify
router.get('/verify', requireAuth, (req, res) => {
  res.json({ valid: true, user: req.user });
});

// POST /auth/fcm-token
router.post('/fcm-token', requireAuth, async (req, res) => {
  const { token, deviceInfo } = req.body;
  const userId = req.user.userId;
  if (!token) {
    return res.status(400).json({ message: 'Token is required' });
  }
  try {
    // Delete existing token if registered to avoid duplicate notifications
    await dbPool.query('DELETE FROM user_fcm_tokens WHERE token = ?', [token]);
    // Insert token record
    await dbPool.query(
      'INSERT INTO user_fcm_tokens (user_id, token, device_info) VALUES (?, ?, ?)',
      [userId, token, deviceInfo || null]
    );
    res.json({ success: true, message: 'FCM token registered successfully' });
  } catch (error) {
    console.error('[auth] fcm-token error:', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE /auth/fcm-token
router.delete('/fcm-token', requireAuth, async (req, res) => {
  const userId = req.user.userId;
  try {
    await dbPool.query('DELETE FROM user_fcm_tokens WHERE user_id = ?', [userId]);
    res.json({ success: true, message: 'FCM tokens deleted successfully' });
  } catch (error) {
    console.error('[auth] delete fcm-token error:', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /auth/profile
router.put('/profile', requireAuth, async (req, res) => {
  const { username, positionTitle, companyName, newPassword } = req.body;
  const userId = req.user.userId;

  try {
    const fields = [];
    const values = [];

    if (username) {
      fields.push('username=?');
      values.push(username);
    }
    if (positionTitle !== undefined) {
      fields.push('position_title=?');
      values.push(positionTitle);
    }
    if (companyName !== undefined) {
      fields.push('company_name=?');
      values.push(companyName);
    }
    if (newPassword) {
      const hash = await bcrypt.hash(newPassword, 10);
      fields.push('password_hash=?');
      values.push(hash);
      // Reset must_change_password when password is changed
      fields.push('must_change_password=?');
      values.push(0);
    }

    if (fields.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    values.push(userId);
    await dbPool.query(`UPDATE users SET ${fields.join(',')} WHERE id=?`, values);

    // Get fresh user data
    const [[user]] = await dbPool.query(
      `SELECT u.*, r.name as role_name
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE u.id = ?`,
      [userId]
    );

    const [perms] = await dbPool.query(
      `SELECT p.slug FROM permissions p
       JOIN user_permissions up ON p.id = up.permission_id
       WHERE up.user_id = ?`,
      [user.id]
    );

    const permissions = perms.map(p => p.slug);
    const systemPermissions = mapMenuPermissionsToSystemPermissions(permissions);

    const tokenPayload = {
      userId:      user.id,
      username:    user.username,
      userRole:    user.role_name || 'operator',
      permissions: [...permissions, ...systemPermissions],
      positionTitle: user.position_title,
      companyName:   user.company_name,
      mustChangePassword: user.must_change_password === 1,
    };

    const token = signToken(tokenPayload);

    res.json({
      success: true,
      token,
      user: tokenPayload
    });
  } catch (err) {
    console.error('[auth] profile update error:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Helper: map menu permissions to legacy/system permissions
function mapMenuPermissionsToSystemPermissions(menuPermissions) {
  const systemPerms = new Set();
  for (const perm of menuPermissions) {
    if (perm.startsWith('Logsheet:')) {
      systemPerms.add('logsheet_input');
    }
    if (perm === 'System:User Management') {
      systemPerms.add('manage_users');
    }
    if (perm.startsWith('Dashboard:')) {
      systemPerms.add('view_dashboard');
    }
    if (perm.startsWith('Maintenance:')) {
      systemPerms.add('maintenance_edit');
    }
    if (perm.startsWith('Report:')) {
      systemPerms.add('view_reports');
    }
    if (perm === 'System:System Configuration') {
      systemPerms.add('manage_settings');
    }
    if (perm.startsWith('Station View:')) {
      systemPerms.add('view_dashboard');
    }
  }
  return [...systemPerms];
}

export default router;
