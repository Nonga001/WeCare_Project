import express from "express";
import { getProfile, approveAdmin, approveStudent } from "../controllers/userController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/profile", protect, getProfile);

// Approvals
router.post("/approve/admin/:adminId", protect, approveAdmin);
router.post("/approve/student/:studentId", protect, approveStudent);

export default router;
