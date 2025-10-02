import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { authenticateSuperAdmin, generateSuperAdminToken } from "../utils/superAdminInit.js";
import { setAuthCookies, clearAuthCookies } from "../utils/secureAuth.js";
import { 
  validateEmail, 
  validatePassword, 
  validatePhone, 
  validateUniversity,
  sanitizeString 
} from "../middleware/validation.js";
import { securityLogger } from "../utils/securityLogger.js";

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

    // Validate and sanitize all inputs
    const nameValidation = { 
      isValid: name && typeof name === 'string' && name.trim().length >= 2,
      sanitized: sanitizeString(name, { maxLength: 100 }),
      error: !name ? 'Name is required' : 'Name must be at least 2 characters'
    };
    
    const emailValidation = validateEmail(email);
    const passwordValidation = validatePassword(password);
    const phoneValidation = validatePhone(phone);
    const universityValidation = validateUniversity(university);

    // Collect all validation errors
    const errors = [];
    if (!nameValidation.isValid) errors.push({ field: 'name', message: nameValidation.error });
    if (!emailValidation.isValid) errors.push({ field: 'email', message: emailValidation.error });
    if (!passwordValidation.isValid) errors.push({ field: 'password', message: passwordValidation.error });
    if (!phoneValidation.isValid) errors.push({ field: 'phone', message: phoneValidation.error });
    if (!universityValidation.isValid) errors.push({ field: 'university', message: universityValidation.error });

    if (errors.length > 0) {
      return res.status(400).json({ 
        message: "Validation failed", 
        errors 
      });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email: emailValidation.sanitized });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 12); // Increased from 10 to 12 rounds

    const newUser = new User({
      name: nameValidation.sanitized,
      university: universityValidation.sanitized,
      phone: phoneValidation.sanitized,
      email: emailValidation.sanitized,
      password: hashedPassword,
      role: "student",
    });

    await newUser.save();
    
    // Log successful registration
    securityLogger.registrationAttempt(req, emailValidation.sanitized, 'student', true);
    
    res.status(201).json({ message: "Student registered successfully" });
  } catch (err) {
    // Log failed registration
    securityLogger.registrationAttempt(req, email, 'student', false, err.message);
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

    // Super Admin: Secure database authentication
    if (role === "superadmin") {
      const superAdmin = await authenticateSuperAdmin(email, password);
      
      if (!superAdmin) {
        return res.status(401).json({ message: "Invalid superadmin credentials" });
      }
      
      // Set secure httpOnly cookies
      const { accessToken } = setAuthCookies(res, superAdmin);
      
      // Log successful superadmin login
      securityLogger.loginSuccess(req, superAdmin);
      securityLogger.superAdminActivity(req, 'Login', { loginMethod: 'secure_database' });
      
      return res.json({
        message: "SuperAdmin login successful",
        token: accessToken, // Still provide token for compatibility
        user: {
          id: superAdmin._id,
          name: superAdmin.name,
          email: superAdmin.email,
          role: superAdmin.role,
        },
        authMethod: 'secure_cookies'
      });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    // Check if role matches (except superadmin handled above)
    if (user.role !== role) {
      return res.status(403).json({ message: `This account is not a ${role}` });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid password" });

    // Suspension check for all roles except superadmin
    if (user.isSuspended) {
      return res.status(403).json({ message: "Account suspended. Contact support." });
    }

    // Approval checks: admins approved by superadmin; students by their admin
    if ((user.role === "admin" || user.role === "student") && !user.isApproved) {
      const pendingBy = user.role === "admin" ? "Super Admin" : "Your University Admin";
      
      // Set secure cookies even for pending users
      const { accessToken } = setAuthCookies(res, user);
      
      return res.json({
        message: `Login successful, awaiting approval by ${pendingBy}`,
        token: accessToken, // Compatibility token
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isApproved: user.isApproved,
        },
        authMethod: 'secure_cookies'
      });
    }

    // Update lastActive and set secure authentication
    user.lastActive = new Date();
    await user.save();
    
    // Set secure httpOnly cookies
    const { accessToken } = setAuthCookies(res, user);

    res.json({
      message: `${role} login successful`,
      token: accessToken, // Compatibility token
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isApproved: user.isApproved,
      },
      authMethod: 'secure_cookies'
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Secure logout function
export const logout = async (req, res) => {
  try {
    // Clear authentication cookies
    clearAuthCookies(res);
    
    res.json({ 
      message: "Logout successful",
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error("Logout error:", err.message);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Secure superadmin password change
export const changeSuperAdminPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current and new passwords are required" });
    }
    
    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({
        message: "New password must be at least 8 chars and include uppercase, lowercase, number, and special character",
      });
    }
    
    // Verify current password
    const superAdmin = await User.findById(req.user._id).select("+password");
    if (!superAdmin || superAdmin.role !== "superadmin") {
      return res.status(403).json({ message: "Access denied" });
    }
    
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, superAdmin.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }
    
    // Hash and update new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);
    superAdmin.password = hashedNewPassword;
    superAdmin.lastActive = new Date();
    
    await superAdmin.save();
    
    console.log(`🔐 SuperAdmin password changed for: ${superAdmin.email}`);
    
    res.json({ 
      message: "Password changed successfully",
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error("SuperAdmin password change error:", err.message);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
