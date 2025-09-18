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

    // Super Admin: fixed credentials can log in from any page
    if (email === "wecare@admin.com" && password === "admin1234") {
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
        },
      });
    }

    // Generate JWT
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
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
