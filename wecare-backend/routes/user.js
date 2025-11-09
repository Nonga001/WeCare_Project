import express from "express";
import multer from "multer";
import { getProfile, approveAdmin, approveStudent, listUsers, setSuspended, listStudentsForAdmin, rejectStudent, getAdminStats, updateStudentProfile, submitProfileForApproval, getProfileCompletion, updateAdminProfile, changePassword } from "../controllers/userController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// configure multer to store in backend/uploads
const upload = multer({ dest: 'uploads/' });

router.get("/profile", protect, getProfile);
router.patch("/profile/admin", protect, updateAdminProfile);
router.post("/password/change", protect, changePassword);

// Approvals
router.post("/approve/admin/:adminId", protect, approveAdmin);
router.post("/approve/student/:studentId", protect, approveStudent);
router.post("/reject/student/:studentId", protect, rejectStudent);
router.get("/students", protect, listStudentsForAdmin);

// Superadmin user management
router.get("/", protect, listUsers);
router.patch("/:userId/suspend", protect, setSuspended);

// Admin stats
router.get("/admin/stats", protect, getAdminStats);

// Student profile management
// Accept optional file upload named 'documents' when updating profile
router.patch("/profile", protect, upload.single('documents'), updateStudentProfile);
router.post("/profile/submit", protect, submitProfileForApproval);
router.get("/profile/completion", protect, getProfileCompletion);

export default router;
