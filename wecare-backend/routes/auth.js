import express from "express";
import {
  registerStudent,
  registerDonor,
  registerAdmin,
  login,
} from "../controllers/authController.js";

const router = express.Router();

// Registration routes
router.post("/register/student", registerStudent);
router.post("/register/donor", registerDonor);
router.post("/register/admin", registerAdmin);

// Unified login route
router.post("/login", login);

export default router;
