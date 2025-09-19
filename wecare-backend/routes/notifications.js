import express from "express";
import { 
  getNotifications, 
  sendNotification, 
  markAsRead, 
  deleteNotification, 
  editNotification,
  getStudentsForNotification,
  getAdminsForNotification,
  getDonorsForNotification 
} from "../controllers/notificationController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get notifications for current user
router.get("/", getNotifications);

// Send notification (admin/superadmin only)
router.post("/send", sendNotification);

// Get students for notification dropdown (admin only)
router.get("/students", getStudentsForNotification);

// Get admins for notification dropdown (superadmin/donor)
router.get("/admins", getAdminsForNotification);

// Get donors for notification dropdown (superadmin)
router.get("/donors", getDonorsForNotification);

// Mark notification as read
router.patch("/:notificationId/read", markAsRead);

// Delete notification
router.delete("/:notificationId", deleteNotification);

// Edit notification
router.put("/:notificationId", editNotification);

export default router;
