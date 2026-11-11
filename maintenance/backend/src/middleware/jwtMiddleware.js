import jwt from 'jsonwebtoken';
const JWT_SECRET = process.env.JWT_SECRET || 'jwt_change_me_in_production';

export function requireAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1] || req.cookies?.kip_token;
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

export function authorize(roles = []) {
  const allowed = (typeof roles === 'string' ? [roles] : roles).map(r => r.toLowerCase());
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    const role = (req.user.userRole || '').toLowerCase();
    if (role === 'developer' || allowed.includes(role)) return next();
    return res.status(403).json({ message: 'Forbidden' });
  };
}

export function authorizePermission(permission) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    if ((req.user.userRole || '').toLowerCase() === 'developer') return next();
    if (!(req.user.permissions || []).includes(permission))
      return res.status(403).json({ message: 'Forbidden: Missing permission' });
    next();
  };
}
