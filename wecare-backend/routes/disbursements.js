import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  getAvailableDonations,
  disburseWithMatch,
  getDisbursementHistory,
  getAvailableBalances
} from "../controllers/disbursementController.js";

const router = express.Router();

router.use(protect);

// Admin routes
router.get("/available", getAvailableDonations);
router.post("/disburse", disburseWithMatch);
router.get("/history", getDisbursementHistory);
router.get("/balances", getAvailableBalances);

export default router;
