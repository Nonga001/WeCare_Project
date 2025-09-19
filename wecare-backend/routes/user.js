import express from "express";
import { getProfile, approveAdmin, approveStudent, listUsers, setSuspended, listStudentsForAdmin, rejectStudent, getAdminStats } from "../controllers/userController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/profile", protect, getProfile);

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

export default router;
