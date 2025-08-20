const jwt = require("jsonwebtoken");
const User = require("../models/User");

// JWT authentication middleware
function auth(req, res, next) {
  const token = req.headers["authorization"]?.split(" ")[1];
  
  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: "Invalid token" });
    }

    try {
      // Optionally verify user still exists and is active
      const user = await User.findById(decoded.id).select("-password");
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      req.user = decoded;
      req.userDoc = user;
      next();
    } catch (error) {
      console.error("Auth middleware error:", error);
      return res.status(401).json({ error: "Authentication failed" });
    }
  });
}

// Role-based access control middleware
function requireRole(allowedRoles) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const userRole = req.user.role;
      
      // Role mapping for compatibility
      const roleMap = {
        manager: "gestionnaire",
        workshop: "atelier",
        admin: "admin",
        gestionnaire: "gestionnaire", 
        atelier: "atelier"
      };

      const mappedRole = roleMap[userRole] || userRole;
      
      // Check if user role is in allowed roles (check both original and mapped)
      if (!allowedRoles.includes(userRole) && !allowedRoles.includes(mappedRole)) {
        return res.status(403).json({ 
          error: "Insufficient permissions",
          required: allowedRoles,
          current: userRole
        });
      }

      next();
    } catch (error) {
      console.error("Role check error:", error);
      return res.status(500).json({ error: "Authorization check failed" });
    }
  };
}

// Admin-only middleware
function requireAdmin(req, res, next) {
  return requireRole(["admin"])(req, res, next);
}

// Workshop/Atelier access middleware
function requireWorkshop(req, res, next) {
  return requireRole(["workshop", "atelier", "admin"])(req, res, next);
}

// Manager access middleware  
function requireManager(req, res, next) {
  return requireRole(["manager", "gestionnaire", "admin"])(req, res, next);
}

module.exports = {
  auth,
  requireRole,
  requireAdmin,
  requireWorkshop,
  requireManager
};
