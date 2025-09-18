import User from "../models/User.js";

// Example user profile route
export const getProfile = async (req, res) => {
  try {
    res.json(req.user);
  } catch (err) {
    res.status(500).json({ message: "Something went wrong" });
  }
};

// Superadmin approves admin
export const approveAdmin = async (req, res) => {
  try {
    if (req.user.role !== "superadmin") {
      return res.status(403).json({ message: "Only superadmin can approve admins" });
    }
    const { adminId } = req.params;
    const admin = await User.findById(adminId);
    if (!admin || admin.role !== "admin") {
      return res.status(404).json({ message: "Admin not found" });
    }
    admin.isApproved = true;
    await admin.save();
    res.json({ message: "Admin approved" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Admin approves student from same university
export const approveStudent = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Only admins can approve students" });
    }
    if (!req.user.isApproved) {
      return res.status(403).json({ message: "Admin account must be approved by superadmin first" });
    }
    const { studentId } = req.params;
    const student = await User.findById(studentId);
    if (!student || student.role !== "student") {
      return res.status(404).json({ message: "Student not found" });
    }
    if (!req.user.university || req.user.university !== student.university) {
      return res.status(403).json({ message: "Admin can only approve students from their university" });
    }
    student.isApproved = true;
    await student.save();
    res.json({ message: "Student approved" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// List users (superadmin only)
export const listUsers = async (req, res) => {
  try {
    if (req.user.role !== "superadmin") {
      return res.status(403).json({ message: "Only superadmin can list users" });
    }
    const users = await User.find({}, "name email role university isApproved isSuspended").sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Suspend/Unsuspend user (superadmin only)
export const setSuspended = async (req, res) => {
  try {
    if (req.user.role !== "superadmin") {
      return res.status(403).json({ message: "Only superadmin can modify suspension" });
    }
    const { userId } = req.params;
    const { suspended } = req.body; // boolean
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    user.isSuspended = Boolean(suspended);
    await user.save();
    res.json({ message: user.isSuspended ? "User suspended" : "User unsuspended" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
