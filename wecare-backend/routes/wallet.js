import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  getWalletBalance,
  getTransactionHistory,
  withdrawToMpesa
} from "../controllers/walletController.js";

const router = express.Router();

router.use(protect);

// Student wallet
router.get("/balance", getWalletBalance);
router.get("/transactions", getTransactionHistory);
router.post("/withdraw", withdrawToMpesa);

export default router;
