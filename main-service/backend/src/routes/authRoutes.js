import { Router } from 'express';
import bcrypt from 'bcrypt';
import { dbPool } from '../config/db.js';
import { signToken, requireAuth } from '../middleware/jwtMiddleware.js';

const router = Router();

const lastLoggedAccess = new Map();

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.headers['x-real-ip'] || req.ip || req.socket?.remoteAddress || '127.0.0.1';
}

async function recordUserLog(req, userId, username, roleName, isExplicitLogin = false) {
  try {
    // Skip recording dev/developer account logins
    if (username?.toLowerCase() === 'dev' || roleName?.toLowerCase() === 'developer') {
      return;
    }
    const now = Date.now();
    const lastTime = lastLoggedAccess.get(userId) || 0;
    if (isExplicitLogin || (now - lastTime) > 900000) {
      lastLoggedAccess.set(userId, now);
      const clientIp = getClientIp(req);
      const userAgent = req.headers['user-agent'] || 'Unknown Browser';
      const desc = isExplicitLogin 
        ? `User ${username} (${roleName || 'user'}) logged in`
        : `User ${username} (${roleName || 'user'}) active session verified`;
      await dbPool.query(
        `INSERT INTO activity_logs (user_id, username, activity_type, description, ip_address, user_agent)
         VALUES (?, ?, 'login', ?, ?, ?)`,
        [userId, username, desc, clientIp, userAgent]
      );
    }
  } catch (err) {
    console.error('[auth] recordUserLog error:', err.message);
  }
}

// POST /auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password required' });
  }

  try {
    const [users] = await dbPool.query(
      `SELECT u.*, r.name as role_name
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE u.username = ?`,
      [username]
    );
    const user = users?.[0];

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

    const permissions = (perms || []).map(p => p.slug);

    const roleName = (user.role_name || user.role || 'operator').toLowerCase();

    const tokenPayload = {
      userId:        user.id,
      username:      user.username,
      userRole:      roleName,
      permissions:   permissions,
      positionTitle: user.position_title || '',
      companyName:   user.company_name || 'AGROVISION',
      mustChangePassword: user.must_change_password === 1,
    };

    const token = signToken(tokenPayload);

    // Log activity for all user logins
    await recordUserLog(req, user.id, user.username, roleName, true);

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
  if (req.user) {
    recordUserLog(req, req.user.userId, req.user.username, req.user.userRole, false);
  }
  res.json({ success: true, user: req.user });
});

// GET /auth/verify
router.get('/verify', requireAuth, (req, res) => {
  if (req.user) {
    recordUserLog(req, req.user.userId, req.user.username, req.user.userRole, false);
  }
  res.json({ valid: true, user: req.user });
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

// POST /auth/fcm-token
// Save or update FCM token from mobile app
router.post('/fcm-token', requireAuth, async (req, res) => {
  const userId = req.user.userId;
  const { token, device_info } = req.body;

  if (!token) {
    return res.status(400).json({ message: 'FCM Token is required' });
  }

  try {
    await dbPool.query(
      `INSERT INTO user_fcm_tokens (user_id, token, device_info) 
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE device_info = VALUES(device_info), updated_at = CURRENT_TIMESTAMP`,
      [userId, token, device_info || null]
    );

    res.json({ success: true, message: 'FCM token saved successfully' });
  } catch (err) {
    console.error('[auth] fcm-token save error:', err.message);
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

// Helper: expand system slugs to menu permissions for complete UI access
function expandPermissions(permissions) {
  const expanded = new Set(permissions);

  for (const p of permissions) {
    if (p === 'view_dashboard') {
      expanded.add('Dashboard:Production Dashboard');
      expanded.add('Overview:3D Plant View');
      expanded.add('Station View:Sterilizer Station');
      expanded.add('Station View:Threshing Station');
      expanded.add('Station View:Press Station');
      expanded.add('Station View:Kernel Plant Station');
      expanded.add('Station View:Boiler House Station');
      expanded.add('Station View:Engine Room Station');
      expanded.add('Station View:Water Treatment Station');
      expanded.add('Station View:Effluent Treatment Station');
      expanded.add('Station View:Dilution Station');
      expanded.add('Station View:Security Station');
      expanded.add('Station View:Weighbridge Station');
      expanded.add('Station View:Grading Ramp');
      expanded.add('Station View:Loading Ramp');
    }
    if (p === 'control_plc') {
      expanded.add('Station View:Sterilizer Station');
      expanded.add('Station View:Threshing Station');
      expanded.add('Station View:Press Station');
      expanded.add('Station View:Kernel Plant Station');
      expanded.add('Station View:Boiler House Station');
      expanded.add('Station View:Engine Room Station');
      expanded.add('Station View:Grading Ramp');
      expanded.add('Station View:Loading Ramp');
    }
    if (p === 'manage_users') {
      expanded.add('System:User Management');
    }
    if (p === 'manage_settings') {
      expanded.add('System:System Configuration');
      expanded.add('Setting:Sterilizer Station');
      expanded.add('Setting:Threshing Station');
      expanded.add('Setting:Press Station');
      expanded.add('Setting:Kernel Plant Station');
      expanded.add('Setting:Boiler House Station');
      expanded.add('Setting:Engine Room Station');
      expanded.add('Setting:Grading Ramp');
      expanded.add('Setting:Loading Ramp');
    }
    if (p === 'maintenance_edit') {
      expanded.add('Maintenance:Overview');
      expanded.add('Maintenance:Machinery List');
      expanded.add('Maintenance:Schedule');
      expanded.add('Maintenance:Work Orders');
    }
    if (p === 'view_reports') {
      expanded.add('Report:Production Summary');
      expanded.add('Report:Sterilization Report');
      expanded.add('Report:Grading Report');
      expanded.add('Report:Losses Report');
      expanded.add('Report:Maintenance Report');
      expanded.add('Report:Oil Quality Report');
      expanded.add('Report:Daily Logsheet');
    }
    if (p === 'logsheet_input') {
      expanded.add('Logsheet:Security Station');
      expanded.add('Logsheet:Weighbridge Station');
      expanded.add('Logsheet:Grading Station');
      expanded.add('Logsheet:Grading Ramp');
      expanded.add('Logsheet:Loading Ramp');
      expanded.add('Logsheet:Sterilizer Station');
      expanded.add('Logsheet:Threshing Station');
      expanded.add('Logsheet:Press Station');
      expanded.add('Logsheet:Kernel Plant Station');
      expanded.add('Logsheet:Boiler House Station');
      expanded.add('Logsheet:Engine Room Station');
      expanded.add('Logsheet:Water Treatment Station');
      expanded.add('Logsheet:Effluent Treatment Station');
    }
    if (p === 'grading_review') {
      expanded.add('Grading:AI Grading Review');
      expanded.add('Grading:Manual Grading');
      expanded.add('Station View:Grading Ramp');
      expanded.add('Station View:Loading Ramp');
    }
  }

  return [...expanded];
}

export default router;
