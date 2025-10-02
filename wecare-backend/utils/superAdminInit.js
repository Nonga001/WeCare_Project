import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import crypto from "crypto";

/**
 * Secure SuperAdmin Initialization System
 * This replaces the hardcoded credentials with a secure initialization process
 */

// Generate secure superadmin credentials on first run
export const initializeSuperAdmin = async () => {
  try {
    // Check if superadmin already exists
    const existingSuperAdmin = await User.findOne({ role: "superadmin" });
    
    if (existingSuperAdmin) {
      console.log("✅ SuperAdmin already exists");
      return null;
    }

    // Generate secure random credentials
    const tempPassword = crypto.randomBytes(16).toString('hex');
    const superAdminEmail = process.env.SUPERADMIN_EMAIL || "superadmin@wecare.system";
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(tempPassword, 12);
    
    // Create superadmin user
    const superAdmin = new User({
      name: "System Administrator",
      email: superAdminEmail,
      password: hashedPassword,
      role: "superadmin",
      isApproved: true, // Auto-approve superadmin
      lastActive: new Date()
    });
    
    await superAdmin.save();
    
    console.log("🔐 SuperAdmin Created Successfully!");
    console.log("📧 Email:", superAdminEmail);
    console.log("🔑 Temporary Password:", tempPassword);
    console.log("⚠️  IMPORTANT: Change password immediately after first login!");
    console.log("📝 Save these credentials securely and delete this log.");
    
    return {
      email: superAdminEmail,
      password: tempPassword,
      message: "SuperAdmin initialized. Change password immediately!"
    };
    
  } catch (error) {
    console.error("❌ Failed to initialize SuperAdmin:", error.message);
    throw error;
  }
};

// Secure superadmin login with database validation
export const authenticateSuperAdmin = async (email, password) => {
  try {
    // Find superadmin in database
    const superAdmin = await User.findOne({ 
      email: email, 
      role: "superadmin" 
    }).select("+password");
    
    if (!superAdmin) {
      return null; // No superadmin found
    }
    
    // Verify password
    const isValidPassword = await bcrypt.compare(password, superAdmin.password);
    
    if (!isValidPassword) {
      return null; // Invalid password
    }
    
    // Update last active
    superAdmin.lastActive = new Date();
    await superAdmin.save();
    
    return {
      _id: superAdmin._id,
      name: superAdmin.name,
      email: superAdmin.email,
      role: superAdmin.role,
    };
    
  } catch (error) {
    console.error("SuperAdmin authentication error:", error.message);
    return null;
  }
};

// Generate JWT token for superadmin
export const generateSuperAdminToken = (superAdmin) => {
  return jwt.sign(
    { 
      id: superAdmin._id, 
      role: superAdmin.role,
      email: superAdmin.email 
    },
    process.env.JWT_SECRET,
    { expiresIn: "8h" } // Shorter expiry for superadmin
  );
};