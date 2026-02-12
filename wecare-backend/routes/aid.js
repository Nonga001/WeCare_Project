import express from "express";
import { protect, requireAdminDepartment } from "../middleware/authMiddleware.js";
import {
  createAidRequest,
  listMyAidRequests,
  listUniversityAidRequests,
  setAidStatus,
  disburseAid,
  moveToWaiting,
  secondApproveAid,
  recheckFunds,
  getAidStats,
  getAidLimitsForStudent,
  getAdminReports,
  respondToClarification,
  getRecentClarificationResponses,
  cancelAidRequest
} from "../controllers/aidController.js";

const router = express.Router();

router.use(protect);

// Student
router.post("/", createAidRequest);
router.get("/mine", listMyAidRequests);
router.get("/limits/mine", getAidLimitsForStudent);
router.patch("/:id/clarification-response", respondToClarification);
router.patch("/:id/cancel", cancelAidRequest);

// Admin - require department assignment
router.get("/university", requireAdminDepartment, listUniversityAidRequests);
router.patch("/:id/status", requireAdminDepartment, setAidStatus);
router.patch("/:id/second-approve", requireAdminDepartment, secondApproveAid);
router.patch("/:id/recheck-funds", requireAdminDepartment, recheckFunds);
router.patch("/:id/waiting", requireAdminDepartment, moveToWaiting);
router.post("/:id/disburse", requireAdminDepartment, disburseAid);

// Stats - require admin department
router.get("/stats", requireAdminDepartment, getAidStats);
router.get("/reports", requireAdminDepartment, getAdminReports);
router.get("/clarifications/recent", requireAdminDepartment, getRecentClarificationResponses);

export default router;


