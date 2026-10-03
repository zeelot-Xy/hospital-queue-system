const jwt = require("jsonwebtoken");
const { User } = require("../models");

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ message: "Access token required" });
  }

  try {
    const tokenUser = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(tokenUser.id, {
      attributes: ["id", "role", "status"],
    });

    if (!user || user.status !== "active" || user.role !== tokenUser.role) {
      return res.status(403).json({ message: "Invalid or inactive account" });
    }

    req.user = { id: user.id, role: user.role };
    next();
  } catch (_error) {
    return res.status(403).json({ message: "Invalid or expired token" });
  }
};

const authorizeRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ message: "Access denied: insufficient role" });
    }
    next();
  };
};

module.exports = { authenticateToken, authorizeRole };
