import User from "../models/User.js";
import bcrypt from "bcryptjs";
import EthicalFeedback from "../models/EthicalFeedback.js";

// Example user profile route
export const getProfile = async (req, res) => {
  try {
    // Fetch fresh user data from database to ensure all fields are included
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({
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
      // Student profile fields
      studentId: user.studentId,
      studentEmail: user.studentEmail,
      course: user.course,
      yearOfStudy: user.yearOfStudy,
      childDetails: user.childDetails,
      studentMom: user.studentMom,
      documents: user.documents,
      profileSubmitted: user.profileSubmitted,
      profileApproved: user.profileApproved,
    });
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
    
    // Check if another admin in the same university already has this department
    const duplicateAdmin = await User.findOne({
      role: "admin",
      university: user.university,
      department: department,
      _id: { $ne: user._id } // Exclude current user
    });
    
    if (duplicateAdmin) {
      return res.status(400).json({ 
        message: `Another admin in ${user.university} already manages the ${department} department` 
      });
    }
    
    user.department = department;
    await user.save();
    res.json({ message: "Department updated", user: { id: user._id, name: user.name, department: user.department, university: user.university } });
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

// Superadmin resets admin department assignment
export const resetAdminDepartment = async (req, res) => {
  try {
    if (req.user.role !== "superadmin") {
      return res.status(403).json({ message: "Only superadmin can reset admin departments" });
    }
    const { adminId } = req.params;
    const admin = await User.findById(adminId);
    if (!admin || admin.role !== "admin") {
      return res.status(404).json({ message: "Admin not found" });
    }
    
    const oldDepartment = admin.department;
    admin.department = undefined;
    await admin.save();
    
    res.json({ 
      message: "Admin department reset successfully", 
      admin: { 
        id: admin._id, 
        name: admin.name, 
        university: admin.university,
        department: admin.department,
        oldDepartment: oldDepartment
      } 
    });
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
    
    // If student has submitted profile, approve both profile and account
    if (student.profileSubmitted && !student.profileApproved) {
      student.profileApproved = true;
      student.profileApprovedAt = new Date();
      student.isApproved = true; // Also approve the account
    } else if (!student.isApproved) {
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
    const users = await User.find({}, "name email role university organization department phone isApproved isSuspended createdAt").sort({ createdAt: -1 });
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
    if (childDetails !== undefined) {
      user.childDetails = childDetails;
      user.studentMom = Boolean(String(childDetails || "").trim());
    }
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

// Update donor profile
export const updateDonorProfile = async (req, res) => {
  try {
    if (req.user.role !== "donor") {
      return res.status(403).json({ message: "Only donors can update their profile" });
    }
    const { phone, donorType, donorPreference, organization, contactPerson, csrFocus } = req.body;
    
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update allowed fields
    if (phone !== undefined) user.phone = phone;
    if (donorType !== undefined && ["individual", "corporate"].includes(donorType)) user.donorType = donorType;
    if (donorPreference !== undefined && ["monthly", "occasional"].includes(donorPreference)) user.donorPreference = donorPreference;
    if (organization !== undefined) user.organization = organization;
    if (contactPerson !== undefined) user.contactPerson = contactPerson;
    if (csrFocus !== undefined) user.csrFocus = csrFocus;

    await user.save();
    
    res.json({ 
      message: "Profile updated successfully", 
      user
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

// Submit ethical feedback
export const submitEthicalFeedback = async (req, res) => {
  try {
    const { ratings, openEnded } = req.body;
    
    if (!ratings || !openEnded) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (!openEnded.ethicalConcern?.trim() || !openEnded.realWorldTrust?.trim()) {
      return res.status(400).json({ message: "Please answer both open-ended questions" });
    }

    const feedback = new EthicalFeedback({
      userId: req.user._id,
      userRole: req.user.role,
      ratings,
      openEnded,
    });

    await feedback.save();

    res.status(201).json({
      message: "Ethical feedback submitted successfully",
      feedback,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to submit feedback", error: err.message });
  }
};

// Get ethical feedback stats (for superadmin/admin)
export const getEthicalFeedbackStats = async (req, res) => {
  try {
    if (!["admin", "superadmin"].includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const feedbacks = await EthicalFeedback.find().populate("userId", "name email role");
    
    if (feedbacks.length === 0) {
      return res.json({ message: "No feedback received yet", feedbacks: [] });
    }

    // Calculate category averages
    const categories = {
      dataPrivacy: [],
      transparency: [],
      fairness: [],
      accessibility: [],
      security: [],
      userControl: [],
      socialImpact: [],
    };

    feedbacks.forEach((f) => {
      categories.dataPrivacy.push((f.ratings.dataCollectionClarity + f.ratings.necessaryDataOnly) / 2);
      categories.transparency.push((f.ratings.dataStorageTransparency + f.ratings.informedConsent) / 2);
      categories.fairness.push((f.ratings.fairTreatment + f.ratings.noBias) / 2);
      categories.accessibility.push((f.ratings.easyToUse + f.ratings.considerDisabilities) / 2);
      categories.security.push((f.ratings.dataSecurityConfidence + f.ratings.preventMisuse) / 2);
      categories.userControl.push((f.ratings.userControl + f.ratings.noPressure) / 2);
      categories.socialImpact.push((f.ratings.addressesProblem + f.ratings.benefitsOutweighHarms) / 2);
    });

    const stats = {
      totalResponses: feedbacks.length,
      overallAverage: (feedbacks.reduce((sum, f) => sum + parseFloat(f.averageScore), 0) / feedbacks.length).toFixed(2),
      byCategory: {
        dataPrivacy: (categories.dataPrivacy.reduce((a, b) => a + b) / categories.dataPrivacy.length).toFixed(2),
        transparency: (categories.transparency.reduce((a, b) => a + b) / categories.transparency.length).toFixed(2),
        fairness: (categories.fairness.reduce((a, b) => a + b) / categories.fairness.length).toFixed(2),
        accessibility: (categories.accessibility.reduce((a, b) => a + b) / categories.accessibility.length).toFixed(2),
        security: (categories.security.reduce((a, b) => a + b) / categories.security.length).toFixed(2),
        userControl: (categories.userControl.reduce((a, b) => a + b) / categories.userControl.length).toFixed(2),
        socialImpact: (categories.socialImpact.reduce((a, b) => a + b) / categories.socialImpact.length).toFixed(2),
      },
      feedbacks,
    };

    res.json(stats);
  } catch (err) {
    res.status(500).json({ message: "Failed to get feedback stats", error: err.message });
  }
};
