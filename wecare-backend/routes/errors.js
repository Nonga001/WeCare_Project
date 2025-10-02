import express from "express";
import { logClientError, getErrorStats } from "../controllers/errorController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Log client-side errors
router.post("/client", protect, logClientError);

// Get error statistics (superadmin only)
router.get("/stats", protect, getErrorStats);

export default router;