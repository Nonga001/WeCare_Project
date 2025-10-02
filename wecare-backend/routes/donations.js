import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  createDonation,
  getMyDonations,
  getGlobalAidRequests,
  getDonorStats,
  getDonorReports,
  getAllDonations,
  getGlobalStats,
  getSuperAnalytics
} from "../controllers/donationController.js";

const router = express.Router();

router.use(protect);

// Donor routes
router.post("/", createDonation);
router.get("/mine", getMyDonations);
router.get("/global-requests", getGlobalAidRequests);
router.get("/stats", getDonorStats);
router.get("/reports", getDonorReports);

// Super admin routes
router.get("/all", getAllDonations);
router.get("/global-stats", getGlobalStats);
router.get("/super-analytics", getSuperAnalytics);

export default router;
