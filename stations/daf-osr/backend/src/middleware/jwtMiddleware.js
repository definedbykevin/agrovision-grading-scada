import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'jwt_change_me_in_production';

export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : req.cookies?.kip_token;

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { userId, username, userRole, permissions }
    next();
  } catch {
    return res.status(401).json({ message: 'Unauthorized: Invalid or expired token' });
  }
}

export function authorize(roles = []) {
  const allowed = (typeof roles === 'string' ? [roles] : roles).map(r => r.toLowerCase());
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    const userRole = (req.user.userRole || '').toLowerCase();
    if (userRole === 'developer') return next();
    if (!allowed.includes(userRole)) {
      return res.status(403).json({ message: 'Forbidden: Insufficient role' });
    }
    next();
  };
}

export function authorizePermission(permission) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    const userRole = (req.user.userRole || '').toLowerCase();
    if (userRole === 'developer') return next();
    const perms = req.user.permissions || [];
    if (!perms.includes(permission)) {
      return res.status(403).json({ message: `Forbidden: Missing permission [${permission}]` });
    }
    next();
  };
}
