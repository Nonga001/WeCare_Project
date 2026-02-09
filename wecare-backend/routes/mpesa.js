import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { startStkPush, handleMpesaCallback, queryStkPush } from "../controllers/mpesaController.js";

const router = express.Router();

router.post("/stk-push", protect, startStkPush);
router.post("/stk-query/:checkoutRequestId", protect, queryStkPush);
router.post("/callback", handleMpesaCallback);

export default router;
