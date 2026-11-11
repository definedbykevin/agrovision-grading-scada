import jwt from "jsonwebtoken";

export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : req.cookies?.kip_token;

  if (!token) {
    return res.status(401).json({ message: "Unauthorized: No token provided" });
  }

  try {
    const secret = process.env.JWT_SECRET || "jwt_change_me_in_production";
    const decoded = jwt.verify(token, secret);
    req.user = decoded; // { userId, username, userRole, permissions }
    next();
  } catch {
    return res.status(401).json({ message: "Unauthorized: Invalid or expired token" });
  }
}

const authorizedManagementRoles = [
  "developer",
  "admin",
  "general_manager",
  "mill manager",
  "mill_manager",
  "asisten automation",
  "head electrical",
  "asisten elektrical",
  "asisten electrical",
  "operator"
];

export function authorize(roles = []) {
  const allowed = (typeof roles === "string" ? [roles] : roles).map((r) =>
    r.toLowerCase(),
  );
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    const userRole = (req.user.userRole || "").toLowerCase();
    if (authorizedManagementRoles.includes(userRole) || allowed.includes(userRole)) {
      return next();
    }
    const perms = req.user.permissions || [];
    if (perms.some((p) => p.toLowerCase().includes("setting:"))) {
      return next();
    }
    return res.status(403).json({ message: "Forbidden: Insufficient role or permission" });
  };
}

export function authorizePermission(permission) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    const userRole = (req.user.userRole || "").toLowerCase();
    if (authorizedManagementRoles.includes(userRole)) return next();
    const perms = req.user.permissions || [];
    if (!perms.includes(permission)) {
      return res.status(403).json({ message: "Forbidden: Missing permission [" + permission + "]" });
    }
    next();
  };
}

export function authorizeRolesOrPermission(roles = [], permission = "") {
  const allowed = (typeof roles === "string" ? [roles] : roles).map((r) =>
    r.toLowerCase(),
  );
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    const userRole = (req.user.userRole || "").toLowerCase();
    if (authorizedManagementRoles.includes(userRole) || allowed.includes(userRole)) return next();
    const perms = req.user.permissions || [];
    if (permission && perms.includes(permission)) return next();
    if (perms.some((p) => p.toLowerCase().includes("setting:"))) return next();
    return res.status(403).json({ message: "Forbidden: Insufficient role or permission" });
  };
}
