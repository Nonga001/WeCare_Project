import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

// 🔑 Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
};

// Password strength validator
const isStrongPassword = (password) => {
  if (typeof password !== "string") return false;
  const lengthOk = password.length >= 8;
  const upperOk = /[A-Z]/.test(password);
  const lowerOk = /[a-z]/.test(password);
  const numberOk = /[0-9]/.test(password);
  const specialOk = /[^A-Za-z0-9]/.test(password);
  return lengthOk && upperOk && lowerOk && numberOk && specialOk;
};

// ---------------- REGISTER ----------------

// Register Student
export const registerStudent = async (req, res) => {
  try {
    const { name, university, phone, email, password } = req.body;

    if (!name || !university || !phone || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({
        message:
          "Password must be at least 8 chars and include uppercase, lowercase, number, and special character",
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "Email already registered" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      university,
      phone,
      email,
      password: hashedPassword,
      role: "student",
    });

    await newUser.save();
    res.status(201).json({ message: "Student registered successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Register Donor
export const registerDonor = async (req, res) => {
  try {
    const { name, organization, phone, email, password } = req.body;

    if (!name || !organization || !phone || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({
        message:
          "Password must be at least 8 chars and include uppercase, lowercase, number, and special character",
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "Email already registered" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      organization,
      phone,
      email,
      password: hashedPassword,
      role: "donor",
    });

    await newUser.save();
    res.status(201).json({ message: "Donor registered successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Register Admin
export const registerAdmin = async (req, res) => {
  try {
    const { name, email, password, university } = req.body;

    if (!name || !email || !password || !university) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({
        message:
          "Password must be at least 8 chars and include uppercase, lowercase, number, and special character",
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "Email already registered" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      university,
      email,
      password: hashedPassword,
      role: "admin",
    });

    await newUser.save();
    res.status(201).json({ message: "Admin registered successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ---------------- UNIFIED LOGIN ----------------
export const login = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ message: "Email, password, and role are required" });
    }

    // Super Admin: Check for custom password first, then default
    if (email === "wecare@admin.com" && role === "superadmin") {
      let isValid = false;
      
      // Try to load custom password from database
      try {
        const SuperAdminConfig = await import("../models/SuperAdminConfig.js").then(m => m.default);
        const config = await SuperAdminConfig.findOne({ key: "password" });
        
        if (config && config.value) {
          // Custom password exists, verify against it
          isValid = await bcrypt.compare(password, config.value);
        } else {
          // No custom password, use default
          isValid = password === "admin1234";
        }
      } catch (err) {
        // Fallback to default if model doesn't exist or error
        isValid = password === "admin1234";
      }

      if (isValid) {
        const superAdminUser = {
          _id: "superadmin-fixed-id",
          name: "Super Admin",
          email: "wecare@admin.com",
          role: "superadmin",
        };
        const token = generateToken(superAdminUser);
        return res.json({
          message: "superadmin login successful",
          token,
          user: {
            id: superAdminUser._id,
            name: superAdminUser.name,
            email: superAdminUser.email,
            role: superAdminUser.role,
          },
        });
      } else {
        return res.status(401).json({ message: "Invalid credentials" });
      }
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    // Check if role matches (except superadmin handled above)
    if (user.role !== role) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    // Suspension check for all roles except superadmin
    if (user.isSuspended) {
      return res.status(403).json({ message: "Account suspended. Contact support." });
    }

    // Approval checks: admins approved by superadmin; students by their admin
    if ((user.role === "admin" || user.role === "student") && !user.isApproved) {
      const pendingBy = user.role === "admin" ? "Super Admin" : "Your University Admin";
      // Allow login but indicate pending status in response; frontend will gate features
      const token = generateToken(user);
      return res.json({
        message: `Login successful, awaiting approval by ${pendingBy}`,
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isApproved: user.isApproved,
          university: user.university,
          department: user.department,
          organization: user.organization,
          phone: user.phone,
          donorType: user.donorType,
          donorPreference: user.donorPreference,
          contactPerson: user.contactPerson,
          csrFocus: user.csrFocus,
        },
      });
    }

    // Update lastActive and generate JWT
    user.lastActive = new Date();
    await user.save();
    const token = generateToken(user);

    res.json({
      message: `${role} login successful`,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isApproved: user.isApproved,
        university: user.university,
        department: user.department,
        organization: user.organization,
        phone: user.phone,
        donorType: user.donorType,
        donorPreference: user.donorPreference,
        contactPerson: user.contactPerson,
        csrFocus: user.csrFocus,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ---------------- SUPER ADMIN PASSWORD MANAGEMENT ----------------

// Change Super Admin Password
export const changeSuperAdminPassword = async (req, res) => {
  try {
    if (req.user.role !== "superadmin") {
      return res.status(403).json({ message: "Only super admin can change this password" });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current and new passwords are required" });
    }

    // Check current password
    let isCurrentPasswordValid = false;
    
    try {
      const SuperAdminConfig = await import("../models/SuperAdminConfig.js").then(m => m.default);
      const config = await SuperAdminConfig.findOne({ key: "password" });
      
      if (config && config.value) {
        // Custom password exists, verify against it
        isCurrentPasswordValid = await bcrypt.compare(currentPassword, config.value);
      } else {
        // No custom password, check against default
        isCurrentPasswordValid = currentPassword === "admin1234";
      }
    } catch (err) {
      // Fallback to default if model doesn't exist
      isCurrentPasswordValid = currentPassword === "admin1234";
    }

    if (!isCurrentPasswordValid) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    // Validate new password strength
    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({
        message: "Password must be at least 8 chars and include uppercase, lowercase, number, and special character",
      });
    }

    // Hash and store new password in database
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    const SuperAdminConfig = await import("../models/SuperAdminConfig.js").then(m => m.default);
    await SuperAdminConfig.findOneAndUpdate(
      { key: "password" },
      { key: "password", value: hashedPassword },
      { upsert: true }
    );

    res.json({ message: "Password changed successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Get System Information
export const getSystemInfo = async (req, res) => {
  try {
    if (req.user.role !== "superadmin") {
      return res.status(403).json({ message: "Only super admin can view system info" });
    }

    const info = {
      currentSession: new Date().toLocaleString(),
      databaseStatus: "Connected",
      lastBackup: "Not configured",
      serverUptime: process.uptime(),
      nodeVersion: process.version,
    };

    res.json(info);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
