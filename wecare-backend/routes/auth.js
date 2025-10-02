import express from "express";
import {
  registerStudent,
  registerDonor,
  registerAdmin,
  login,
  logout,
  changeSuperAdminPassword,
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";
import { validateUserRegistration, validateLogin } from "../middleware/validation.js";

const router = express.Router();

// Registration routes with validation
router.post("/register/student", validateUserRegistration, registerStudent);
router.post("/register/donor", validateUserRegistration, registerDonor);
router.post("/register/admin", validateUserRegistration, registerAdmin);

// Unified login route with validation
router.post("/login", validateLogin, login);

// Secure logout route
router.post("/logout", logout);

// SuperAdmin password change route
router.post("/superadmin/change-password", protect, changeSuperAdminPassword);

export default router;
