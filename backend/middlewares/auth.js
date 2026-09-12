const jwt = require("jsonwebtoken");

// Verifies the Bearer token in the Authorization header and attaches the
// decoded payload (e.g. { id, role }) to req.auth. Must run before any
// role/ownership checks below.
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    req.auth = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

// Restricts access to one of the given roles. Use after `authenticate`.
const roleAliases = {
  admin: "super_admin",
  superadmin: "super_admin",
  movieteam: "movie_team",
};

const requireRole =
  (...roles) =>
  (req, res, next) => {
    const normalizedRole = roleAliases[req.auth?.role] || req.auth?.role;
    const normalizedRoles = roles.map((role) => roleAliases[role] || role);
    if (!req.auth || !normalizedRoles.includes(normalizedRole)) {
      return res
        .status(403)
        .json({ message: "You do not have permission to perform this action" });
    }
    next();
  };

// Allows access if the caller has one of `allowedRoles`, OR is acting on
// their own resource (their token id matches the id extracted from the
// request by `getId`). Use after `authenticate`.
const requireSelfOrRole =
  (getId, ...allowedRoles) =>
  (req, res, next) => {
    if (!req.auth) {
      return res.status(401).json({ message: "Authentication required" });
    }
    const targetId = getId(req);
    if (
      allowedRoles.includes(req.auth.role) ||
      (targetId && String(req.auth.id) === String(targetId))
    ) {
      return next();
    }
    return res
      .status(403)
      .json({ message: "You do not have permission to perform this action" });
  };

module.exports = { authenticate, requireRole, requireSelfOrRole };
