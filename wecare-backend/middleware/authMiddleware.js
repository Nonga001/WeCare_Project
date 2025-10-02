import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { extractToken, verifyToken, refreshAccessToken } from "../utils/secureAuth.js";

export const protect = async (req, res, next) => {
  try {
    // Extract token from secure cookies or Authorization header
    const { token, source } = extractToken(req);
    
    if (!token) {
      return res.status(401).json({ message: "Not authorized, no token provided" });
    }
    
    // Verify the token
    let decoded = verifyToken(token);
    
    // If token is invalid and came from cookie, try refresh
    if (!decoded && source === 'cookie') {
      console.log('🔄 Access token invalid, attempting refresh...');
      decoded = refreshAccessToken(req, res);
    }
    
    if (!decoded) {
      return res.status(401).json({ message: "Not authorized, invalid token" });
    }
    
    // Find user in database (including superadmin)
    req.user = await User.findById(decoded.id).select("-password");
    
    if (!req.user) {
      return res.status(401).json({ message: "User not found, token invalid" });
    }
    
    // Update last active timestamp
    req.user.lastActive = new Date();
    await req.user.save();
    
    next();
    
  } catch (err) {
    console.error('Auth middleware error:', err.message);
    res.status(401).json({ message: "Not authorized, authentication failed" });
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

export const verifySocketToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return { id: decoded.id, role: decoded.role };
  } catch {
    return null;
  }
};
