import User from "../models/User.js";
import bcrypt from "bcryptjs";

// Example user profile route
export const getProfile = async (req, res) => {
  try {
    res.json(req.user);
  } catch (err) {
    res.status(500).json({ message: "Something went wrong" });
  }
};

// Update admin details (department only)
export const updateAdminProfile = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Only admins can update their profile" });
    }
    const { department } = req.body;
    if (!department || !["welfare", "gender", "health"].includes(department)) {
      return res.status(400).json({ message: "Department must be one of welfare, gender, or health" });
    }
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });
    user.department = department;
    await user.save();
    res.json({ message: "Department updated", user });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Change password (all roles)
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current and new password are required" });
    }
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });
    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) return res.status(400).json({ message: "Current password is incorrect" });
    const lengthOk = newPassword.length >= 8;
    const upperOk = /[A-Z]/.test(newPassword);
    const lowerOk = /[a-z]/.test(newPassword);
    const numberOk = /[0-9]/.test(newPassword);
    const specialOk = /[^A-Za-z0-9]/.test(newPassword);
    if (!(lengthOk && upperOk && lowerOk && numberOk && specialOk)) {
      return res.status(400).json({ message: "Password must be at least 8 chars and include uppercase, lowercase, number, and special character" });
    }
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ message: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
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
    
    // If student has submitted profile, approve the profile
    if (student.profileSubmitted && !student.profileApproved) {
      student.profileApproved = true;
      student.profileApprovedAt = new Date();
    } else {
      // Otherwise, just approve the student registration
      student.isApproved = true;
    }
    
    await student.save();
    res.json({ message: "Student approved" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Reject student (admin of same university)
export const rejectStudent = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Only admins can reject students" });
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
      return res.status(403).json({ message: "Admin can only reject students from their university" });
    }
    await student.deleteOne();
    res.json({ message: "Student registration rejected and removed" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// List students by admin's university
export const listStudentsForAdmin = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Only admins can list students" });
    }
    const university = req.user.university;
    const students = await User.find({ role: "student", university }, "name email isApproved university createdAt profileSubmitted profileApproved phone studentId studentEmail course yearOfStudy childDetails documents").sort({ createdAt: -1 });
    res.json(students);
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

// Set user suspended (superadmin only)
export const setSuspended = async (req, res) => {
  try {
    if (req.user.role !== "superadmin") {
      return res.status(403).json({ message: "Only superadmin can suspend users" });
    }

    const { userId } = req.params;
    const { suspended } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.isSuspended = Boolean(suspended);
    await user.save();

    res.json({ message: user.isSuspended ? "User suspended" : "User unsuspended" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Update student profile
export const updateStudentProfile = async (req, res) => {
  try {
    if (req.user.role !== "student") {
      return res.status(403).json({ message: "Only students can update their profile" });
    }
    // If a file was uploaded via multer, it will be available as req.file
    // We'll prioritize uploaded file over documents in body
    let { phone, studentId, studentEmail, course, yearOfStudy, childDetails, documents } = req.body;
    if (req.file) {
      // store the filename so frontend can preview at /uploads/<filename>
      documents = req.file.filename;
    }
    
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update allowed fields
    if (phone !== undefined) user.phone = phone;
    if (studentId !== undefined) user.studentId = studentId;
    if (studentEmail !== undefined) user.studentEmail = studentEmail;
    if (course !== undefined) user.course = course;
    if (yearOfStudy !== undefined) user.yearOfStudy = yearOfStudy;
    if (childDetails !== undefined) user.childDetails = childDetails;
  if (documents !== undefined) user.documents = documents;

    // Check if profile is now 100% complete and auto-submit if so
    const requiredFields = ['phone', 'studentId', 'studentEmail', 'course', 'yearOfStudy', 'childDetails', 'documents'];
    const completedFields = requiredFields.filter(field => user[field]);
    const completionPercent = Math.round((completedFields.length / requiredFields.length) * 100);
    const isComplete = completionPercent === 100;

    // If profile is 100% complete and not already submitted, auto-submit
    if (isComplete && !user.profileSubmitted) {
      user.profileSubmitted = true;
      user.profileSubmittedAt = new Date();
    }

    await user.save();
    
    res.json({ 
      message: isComplete && !user.profileSubmitted ? "Profile updated and automatically submitted for approval" : "Profile updated successfully", 
      user,
      autoSubmitted: isComplete && !user.profileSubmitted
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Submit profile for approval
export const submitProfileForApproval = async (req, res) => {
  try {
    if (req.user.role !== "student") {
      return res.status(403).json({ message: "Only students can submit profiles" });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if profile is complete
    const requiredFields = ['phone', 'studentId', 'studentEmail', 'course', 'yearOfStudy', 'childDetails', 'documents'];
    const missingFields = requiredFields.filter(field => !user[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        message: "Profile incomplete", 
        missingFields,
        completionPercent: Math.round(((requiredFields.length - missingFields.length) / requiredFields.length) * 100)
      });
    }

    // Mark as submitted for approval
    user.profileSubmitted = true;
    user.profileSubmittedAt = new Date();
    await user.save();

    res.json({ message: "Profile submitted for approval", user });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Get student profile completion status
export const getProfileCompletion = async (req, res) => {
  try {
    if (req.user.role !== "student") {
      return res.status(403).json({ message: "Only students can check profile completion" });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const requiredFields = ['phone', 'studentId', 'studentEmail', 'course', 'yearOfStudy', 'childDetails', 'documents'];
    const completedFields = requiredFields.filter(field => user[field]);
    const completionPercent = Math.round((completedFields.length / requiredFields.length) * 100);
    const isComplete = completionPercent === 100;

    res.json({
      completionPercent,
      isComplete,
      completedFields,
      missingFields: requiredFields.filter(field => !user[field]),
      profileSubmitted: user.profileSubmitted || false,
      profileApproved: user.profileApproved || false,
      isApproved: user.isApproved || false
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Get admin dashboard stats
export const getAdminStats = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Only admins can access stats" });
    }

    const university = req.user.university;
    
    // Count students by verification status
    const pendingRegistration = await User.countDocuments({ 
      role: "student", 
      university, 
      isApproved: false,
      profileSubmitted: false
    });
    
    const awaitingProfileVerification = await User.countDocuments({ 
      role: "student", 
      university, 
      isApproved: true,
      profileSubmitted: true,
      profileApproved: false
    });
    
    // Verified Students: All students from university who are not pending verification
    const verifiedStudents = await User.countDocuments({ 
      role: "student", 
      university, 
      isApproved: true
    });
    
    // Approved Student Moms: Students whose profile has been approved by admin
    const approvedStudentMoms = await User.countDocuments({ 
      role: "student", 
      university, 
      isApproved: true,
      profileSubmitted: true,
      profileApproved: true
    });

    // Get aid stats
    const AidRequest = (await import("../models/AidRequest.js")).default;
    const [aidPending, aidApproved, aidWaiting, aidDistributed] = await Promise.all([
      AidRequest.countDocuments({ university, status: "pending" }),
      AidRequest.countDocuments({ university, status: "approved" }),
      AidRequest.countDocuments({ university, status: "waiting" }),
      AidRequest.countDocuments({ university, status: "disbursed" })
    ]);

    res.json({
      pendingRegistration,
      awaitingProfileVerification,
      verifiedStudents,
      approvedStudentMoms,
      aidPending,
      aidApproved,
      aidWaiting,
      aidDistributed
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
