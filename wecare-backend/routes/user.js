import express from "express";
import multer from "multer";
import path from "path";
import { getProfile, approveAdmin, approveAdminsBulk, approveStudent, listUsers, setSuspended, listStudentsForAdmin, rejectStudent, getAdminStats, updateStudentProfile, updateDonorProfile, submitProfileForApproval, getProfileCompletion, updateAdminProfile, changePassword, resetAdminDepartment, submitEthicalFeedback, getEthicalFeedbackStats } from "../controllers/userController.js";
import { protect, requireAdminDepartment } from "../middleware/authMiddleware.js";

const router = express.Router();

// configure multer to store in backend/uploads with original extension
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const safeExt = ext || (file.mimetype === "application/pdf" ? ".pdf" : "");
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${safeExt}`);
  },
});
const upload = multer({ storage });

router.get("/profile", protect, getProfile);
router.patch("/profile/admin", protect, updateAdminProfile);
router.post("/password/change", protect, changePassword);

// Approvals - require admin to have department assigned
router.post("/approve/admin/:adminId", protect, requireAdminDepartment, approveAdmin);
router.post("/approve/admins", protect, requireAdminDepartment, approveAdminsBulk);
router.post("/approve/student/:studentId", protect, requireAdminDepartment, approveStudent);
router.post("/reject/student/:studentId", protect, requireAdminDepartment, rejectStudent);
router.get("/students", protect, requireAdminDepartment, listStudentsForAdmin);

// Superadmin: reset admin department
router.post("/admin/:adminId/reset-department", protect, resetAdminDepartment);

// Superadmin user management
router.get("/", protect, listUsers);
router.patch("/:userId/suspend", protect, listUsers);

// Admin stats - require department for admins
router.get("/admin/stats", protect, requireAdminDepartment, getAdminStats);

// Student profile management
// Accept optional file upload named 'documents' when updating profile
router.patch("/profile", protect, upload.single('documents'), (req, res, next) => {
  if (req.user.role === 'donor') {
    return updateDonorProfile(req, res, next);
  }
  return updateStudentProfile(req, res, next);
});
router.post("/profile/submit", protect, submitProfileForApproval);
router.get("/profile/completion", protect, getProfileCompletion);

// Ethical feedback
router.post("/ethical-feedback", protect, submitEthicalFeedback);
router.get("/ethical-feedback/stats", protect, getEthicalFeedbackStats);

export default router;
