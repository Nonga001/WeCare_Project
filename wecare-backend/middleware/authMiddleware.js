import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const protect = async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      // For superadmin token that may not exist in DB (fixed login)
      if (decoded && decoded.id === "superadmin-fixed-id" && decoded.role === "superadmin") {
        req.user = { _id: decoded.id, role: "superadmin", name: "Super Admin" };
        return next();
      }

      req.user = await User.findById(decoded.id).select("-password");
      next();
    } catch (err) {
      res.status(401).json({ message: "Not authorized, token failed" });
    }
  }

  if (!token) {
    res.status(401).json({ message: "Not authorized, no token" });
  }
};

// Require approved users for protected actions (admins and students)
export const requireApproved = (req, res, next) => {
  // Superadmin bypass
  if (req.user && req.user.role === "superadmin") return next();
  if (!req.user) return res.status(401).json({ message: "Not authorized" });
  if ((req.user.role === "admin" || req.user.role === "student") && !req.user.isApproved) {
    return res.status(403).json({ message: "Account not approved yet" });
  }
  return next();
};
