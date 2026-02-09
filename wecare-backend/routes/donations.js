import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  createDonation,
  getMyDonations,
  deleteMyDonations,
  queryDonationStatus,
  getGlobalAidRequests,
  getDonorStats,
  getAllDonations,
  getGlobalStats,
  getSuperAnalytics
} from "../controllers/donationController.js";

const router = express.Router();

router.use(protect);

// Donor routes
router.post("/", createDonation);
router.get("/mine", getMyDonations);
router.delete("/mine", deleteMyDonations);
router.get("/:donationId/status", queryDonationStatus);
router.get("/global-requests", getGlobalAidRequests);
router.get("/stats", getDonorStats);

// Super admin routes
router.get("/all", getAllDonations);
router.get("/global-stats", getGlobalStats);
router.get("/super-analytics", getSuperAnalytics);

export default router;
