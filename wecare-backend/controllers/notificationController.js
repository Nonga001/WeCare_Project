import Notification from "../models/Notification.js";
import User from "../models/User.js";

// Get notifications for a user
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    const role = req.user.role;

    const roleWideTypes = [];
    if (role === "student") roleWideTypes.push("all_students");
    if (role === "admin") roleWideTypes.push("all_admins");
    if (role === "donor") roleWideTypes.push("all_donors");

    const notifications = await Notification.find({
      $or: [
        { recipients: userId },
        { recipientType: "everyone", sender: { $ne: userId } },
        { recipientType: { $in: roleWideTypes }, sender: { $ne: userId } },
        { recipientType: "university_students", university: req.user.university, sender: { $ne: userId } }
      ],
      isDeleted: { $not: { $elemMatch: { user: userId } } }
    })
    .populate("sender", "name email role")
    .sort({ createdAt: -1 })
    .limit(50);

    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Send notification (admin only)
export const sendNotification = async (req, res) => {
  try {
    const senderRole = req.user.role;
    if (!["admin", "superadmin", "donor"].includes(senderRole)) {
      return res.status(403).json({ message: "Not allowed to send notifications" });
    }

    const { title, message, recipientType, recipientId, university } = req.body;

    if (!title || !message || !recipientType) {
      return res.status(400).json({ message: "Title, message, and recipient type are required" });
    }

    let recipients = [];
    let notificationUniversity = university;

    // Determine recipients based on type
    switch (recipientType) {
      case "everyone":
        if (senderRole !== "superadmin") return res.status(403).json({ message: "Only superadmin can notify everyone" });
        recipients = await User.find({}).select("_id");
        break;
      case "all_students":
        if (senderRole !== "superadmin") return res.status(403).json({ message: "Only superadmin can notify all students" });
        recipients = await User.find({ role: "student" }).select("_id");
        break;
      case "all_donors":
        if (senderRole !== "superadmin") return res.status(403).json({ message: "Only superadmin can notify all donors" });
        recipients = await User.find({ role: "donor" }).select("_id");
        break;
      case "all_admins":
        if (senderRole !== "superadmin" && senderRole !== "donor") return res.status(403).json({ message: "Only superadmin/donor can notify all admins" });
        recipients = await User.find({ role: "admin" }).select("_id");
        break;
      case "university_students":
        if (senderRole !== "admin") return res.status(403).json({ message: "Only admin can notify their university students" });
        if (!university) {
          return res.status(400).json({ message: "University required for university_students type" });
        }
        recipients = await User.find({ role: "student", university }).select("_id");
        notificationUniversity = university;
        break;
      case "single_student":
        if (senderRole !== "admin") return res.status(403).json({ message: "Only admin can notify a single student" });
        if (!recipientId) {
          return res.status(400).json({ message: "Recipient ID required for single_student type" });
        }
        const student = await User.findById(recipientId);
        if (!student || student.role !== "student") {
          return res.status(404).json({ message: "Student not found" });
        }
        recipients = [student._id];
        notificationUniversity = student.university;
        break;
      case "single_admin":
        if (!recipientId) return res.status(400).json({ message: "Recipient ID required for single_admin" });
        if (!(["superadmin", "donor"].includes(senderRole))) return res.status(403).json({ message: "Only superadmin/donor can notify an admin" });
        const admin = await User.findById(recipientId);
        if (!admin || admin.role !== "admin") return res.status(404).json({ message: "Admin not found" });
        recipients = [admin._id];
        break;
      case "single_donor":
        if (senderRole !== "superadmin") return res.status(403).json({ message: "Only superadmin can notify a donor" });
        if (!recipientId) return res.status(400).json({ message: "Recipient ID required for single_donor" });
        const donor = await User.findById(recipientId);
        if (!donor || donor.role !== "donor") return res.status(404).json({ message: "Donor not found" });
        recipients = [donor._id];
        break;
      case "superadmin":
        // Send to superadmin(s)
        recipients = await User.find({ role: "superadmin" }).select("_id");
        break;
      default:
        return res.status(400).json({ message: "Invalid recipient type" });
    }

    const notification = new Notification({
      title,
      message,
      sender: req.user._id,
      recipients: recipients.map(r => r._id ?? r),
      recipientType,
      university: notificationUniversity
    });

    await notification.save();
    res.status(201).json({ message: "Notification sent successfully", notification });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Mark notification as read
export const markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findById(notificationId);
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    // Check if already read
    const alreadyRead = notification.isRead.some(read => read.user.toString() === userId.toString());
    if (!alreadyRead) {
      notification.isRead.push({ user: userId });
      await notification.save();
    }

    res.json({ message: "Notification marked as read" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Delete notification (user can only delete their own notifications)
export const deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findById(notificationId);
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    // Check if user is sender (can delete) or recipient (can hide)
    const isSender = notification.sender.toString() === userId.toString();
    const isRecipient = notification.recipients.some(r => r.toString() === userId.toString());

    if (!isSender && !isRecipient) {
      return res.status(403).json({ message: "Not authorized to delete this notification" });
    }

    if (isSender) {
      // Sender can delete the notification completely
      await notification.deleteOne();
      res.json({ message: "Notification deleted" });
    } else {
      // Recipient can only hide it from their view
      notification.isDeleted.push({ user: userId });
      await notification.save();
      res.json({ message: "Notification hidden" });
    }
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Edit notification (sender only)
export const editNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const { title, message } = req.body;
    const userId = req.user._id;

    if (!title || !message) {
      return res.status(400).json({ message: "Title and message are required" });
    }

    const notification = await Notification.findById(notificationId);
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    // Only sender can edit
    if (notification.sender.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Only sender can edit notification" });
    }

    notification.title = title;
    notification.message = message;
    await notification.save();

    res.json({ message: "Notification updated", notification });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Get students for notification dropdown (admin's university only)
export const getStudentsForNotification = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Only admins can access student list" });
    }

    const students = await User.find({ 
      role: "student", 
      university: req.user.university 
    }).select("name email");

    res.json(students);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Get admins for targeting (superadmin/donor)
export const getAdminsForNotification = async (req, res) => {
  try {
    if (!["superadmin", "donor"].includes(req.user.role)) {
      return res.status(403).json({ message: "Not allowed" });
    }

    const admins = await User.find({ role: "admin" }).select("name email");
    res.json(admins);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Get donors for targeting (superadmin only)
export const getDonorsForNotification = async (req, res) => {
  try {
    if (req.user.role !== "superadmin") {
      return res.status(403).json({ message: "Not allowed" });
    }

    const donors = await User.find({ role: "donor" }).select("name email");
    res.json(donors);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};