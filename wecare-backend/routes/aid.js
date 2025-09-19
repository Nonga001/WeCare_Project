import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  createAidRequest,
  listMyAidRequests,
  listUniversityAidRequests,
  setAidStatus,
  disburseAid,
  getAidStats
} from "../controllers/aidController.js";

const router = express.Router();

router.use(protect);

// Student
router.post("/", createAidRequest);
router.get("/mine", listMyAidRequests);

// Admin
router.get("/university", listUniversityAidRequests);
router.patch("/:id/status", setAidStatus);
router.post("/:id/disburse", disburseAid);

// Stats
router.get("/stats", getAidStats);

export default router;


