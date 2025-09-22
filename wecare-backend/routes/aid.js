import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  createAidRequest,
  listMyAidRequests,
  listUniversityAidRequests,
  setAidStatus,
  disburseAid,
  moveToWaiting,
  getAidStats,
  getAdminReports
} from "../controllers/aidController.js";

const router = express.Router();

router.use(protect);

// Student
router.post("/", createAidRequest);
router.get("/mine", listMyAidRequests);

// Admin
router.get("/university", listUniversityAidRequests);
router.patch("/:id/status", setAidStatus);
router.patch("/:id/waiting", moveToWaiting);
router.post("/:id/disburse", disburseAid);

// Stats
router.get("/stats", getAidStats);
router.get("/reports", getAdminReports);

export default router;


