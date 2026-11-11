import { Router } from 'express';
import bcrypt from 'bcrypt';
import { dbPool } from '../config/db.js';
import { signToken, requireAuth } from '../middleware/jwtMiddleware.js';

const router = Router();

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.headers['x-real-ip'] || req.ip || req.socket?.remoteAddress || '127.0.0.1';
}

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

    // Get permissions for role
    const [perms] = await dbPool.query(
      `SELECT p.slug FROM permissions p
       JOIN role_permissions rp ON p.id = rp.permission_id
       WHERE rp.role_id = ?`,
      [user.role_id]
    );

    const permissions = perms.map(p => p.slug);

    const tokenPayload = {
      userId:      user.id,
      username:    user.username,
      userRole:    user.role_name || 'operator',
      permissions,
      positionTitle: user.position_title,
      companyName:   user.company_name,
    };

    const token = signToken(tokenPayload);

    // Log activity (except for dev/developer accounts)
    const userRoleLower = (user.role_name || '').toLowerCase();
    if (user.username?.toLowerCase() !== 'dev' && userRoleLower !== 'developer') {
      const clientIp = getClientIp(req);
      await dbPool.query(
        `INSERT INTO activity_logs (user_id, username, activity_type, description, ip_address, user_agent)
         VALUES (?, ?, 'login', ?, ?, ?)`,
        [user.id, user.username, `User logged in from ${clientIp}`, clientIp, req.headers['user-agent']]
      ).catch(() => {});
    }

    res.json({
      success: true,
      token,
      user: tokenPayload,
    });
  } catch (err) {
    console.error('[auth] login error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /auth/logout
router.post('/logout', (_req, res) => {
  res.json({ success: true, message: 'Logged out' });
});

// PUT /auth/profile
router.put('/profile', requireAuth, async (req, res) => {
  const { username, positionTitle, companyName, newPassword } = req.body;
  // req.user is set by requireAuth middleware
  const userId = req.user.userId; 

  try {
    let updateQuery = 'UPDATE users SET username=?, position_title=?, company_name=?';
    let queryParams = [username, positionTitle, companyName];

    if (newPassword) {
      const hash = await bcrypt.hash(newPassword, 10);
      updateQuery += ', password_hash=?';
      queryParams.push(hash);
    }
    
    updateQuery += ' WHERE id=?';
    queryParams.push(userId);

    await dbPool.query(updateQuery, queryParams);

    // Get updated user data
    const [[updatedUser]] = await dbPool.query(
      `SELECT u.*, r.name as role_name
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE u.id = ?`,
      [userId]
    );

    // Get permissions for role
    const [perms] = await dbPool.query(
      `SELECT p.slug FROM permissions p
       JOIN role_permissions rp ON p.id = rp.permission_id
       WHERE rp.role_id = ?`,
      [updatedUser.role_id]
    );

    const permissions = perms.map(p => p.slug);

    const tokenPayload = {
      userId:      updatedUser.id,
      username:    updatedUser.username,
      userRole:    updatedUser.role_name || 'operator',
      permissions,
      positionTitle: updatedUser.position_title,
      companyName:   updatedUser.company_name,
    };

    res.json({ success: true, user: tokenPayload });
  } catch (err) {
    console.error('[auth] profile update error:', err.message);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /auth/me
router.get('/me', requireAuth, (req, res) => {
  res.json({ success: true, user: req.user });
});

// GET /auth/verify
router.get('/verify', requireAuth, (req, res) => {
  res.json({ valid: true, user: req.user });
});

export default router;
