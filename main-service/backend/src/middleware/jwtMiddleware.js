import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'jwt_change_me_in_production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

/**
 * Middleware: validates JWT from Authorization header or cookie
 */
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : req.cookies?.kip_token;

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded; // { userId, username, userRole, permissions }
    console.log(`[Diagnostic] Decoded User for ${req.url}:`, {
      username: decoded.username,
      userRole: decoded.userRole,
      permsCount: decoded.permissions?.length,
      hasManageUsers: decoded.permissions?.includes('manage_users')
    });
    next();
  } catch {
    return res.status(401).json({ message: 'Unauthorized: Invalid or expired token' });
  }
}

/**
 * Middleware: check role
 */
export function authorize(roles = []) {
  const allowed = (typeof roles === 'string' ? [roles] : roles).map(r => r.toLowerCase());
  const authorizedManagementRoles = [
    'developer', 
    'admin', 
    'general_manager', 
    'mill manager', 
    'mill_manager', 
    'asisten automation', 
    'head electrical', 
    'asisten elektrical', 
    'asisten electrical',
    'operator'
  ];
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    const userRole = (req.user.userRole || '').toLowerCase();
    if (authorizedManagementRoles.includes(userRole) || allowed.includes(userRole)) {
      return next();
    }
    const perms = req.user.permissions || [];
    if (perms.some(p => p.toLowerCase().includes('setting:'))) {
      return next();
    }
    return res.status(403).json({ message: 'Forbidden: Insufficient role or permission' });
  };
}

/**
 * Middleware: check permission
 */
export function authorizePermission(permission) {
  const authorizedManagementRoles = [
    'developer', 
    'admin', 
    'general_manager', 
    'mill manager', 
    'mill_manager', 
    'asisten automation', 
    'head electrical', 
    'asisten elektrical', 
    'asisten electrical'
  ];
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    const userRole = (req.user.userRole || '').toLowerCase();
    if (authorizedManagementRoles.includes(userRole)) return next();
    const perms = req.user.permissions || [];
    if (!perms.includes(permission)) {
      return res.status(403).json({ message: `Forbidden: Missing permission [${permission}]` });
    }
    next();
  };
}
