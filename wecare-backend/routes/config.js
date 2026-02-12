import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { getSystemConfig, updateSystemConfig } from "../controllers/configController.js";

const router = express.Router();

// Public route - check maintenance mode
router.get("/system", getSystemConfig);

// Protected route - update system config (super admin only)
router.put("/system", protect, updateSystemConfig);

export default router;
