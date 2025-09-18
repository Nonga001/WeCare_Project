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
