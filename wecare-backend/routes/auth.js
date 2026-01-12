import express from "express";
import {
  registerStudent,
  registerDonor,
  registerAdmin,
  login,
  changeSuperAdminPassword,
  getSystemInfo,
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Registration routes
router.post("/register/student", registerStudent);
router.post("/register/donor", registerDonor);
router.post("/register/admin", registerAdmin);

// Unified login route
router.post("/login", login);

// Super Admin specific routes
router.post("/change-superadmin-password", protect, changeSuperAdminPassword);
router.get("/system-info", protect, getSystemInfo);

export default router;
