import express from "express";
import { protect, requireAdminDepartment } from "../middleware/authMiddleware.js";
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

// Admin - require department assignment
router.get("/university", requireAdminDepartment, listUniversityAidRequests);
router.patch("/:id/status", requireAdminDepartment, setAidStatus);
router.patch("/:id/waiting", requireAdminDepartment, moveToWaiting);
router.post("/:id/disburse", requireAdminDepartment, disburseAid);

// Stats - require admin department
router.get("/stats", requireAdminDepartment, getAidStats);
router.get("/reports", requireAdminDepartment, getAdminReports);

export default router;


