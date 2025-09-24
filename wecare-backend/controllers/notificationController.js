import Notification from "../models/Notification.js";
import User from "../models/User.js";
import { io } from "../server.js";

// Get notifications for a user
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    const role = req.user.role;

    const roleWideTypes = [];
    if (role === "student") roleWideTypes.push("all_students");
    if (role === "admin") roleWideTypes.push("all_admins");
    if (role === "donor") roleWideTypes.push("all_donors");

    const isValidObjectId = typeof userId === 'string' && /^[a-fA-F0-9]{24}$/.test(userId);

    let baseQuery;
    if (isValidObjectId) {
      baseQuery = {
        $or: [
          { recipients: userId },
          { recipientType: "everyone", sender: { $ne: userId } },
          { recipientType: { $in: roleWideTypes }, sender: { $ne: userId } },
          { recipientType: "university_students", university: req.user.university, sender: { $ne: userId } }
        ],
        isDeleted: { $not: { $elemMatch: { user: userId } } }
      };
    } else {
      baseQuery = {
        $or: [
          { recipientType: "everyone" },
          { recipientType: { $in: roleWideTypes } },
          { recipientType: "university_students", university: req.user.university }
        ]
      };
    }

    // New users only see notifications created after their account was created
    if (req.user.createdAt) {
      baseQuery.createdAt = { $gte: req.user.createdAt };
    }

    const { before, limit } = req.query;
    const pageLimit = Math.min(Number(limit) || 50, 100);
    const cursorFilter = before ? { _id: { $lt: before } } : {};
    const notifications = await Notification.find({ ...baseQuery, ...cursorFilter })
      .populate("sender", "name email role")
      .populate("recipients", "name email role")
      .sort({ createdAt: -1 })
      .limit(pageLimit);

    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
// Get notifications sent by current user
export const getSentNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    const isValidObjectId = typeof userId === 'string' && /^[a-fA-F0-9]{24}$/.test(userId);
    let query;
    if (isValidObjectId) {
      query = { sender: userId };
    } else {
      query = { senderRole: req.user.role };
      if (req.user.name) query.senderName = req.user.name;
    }
    const { before, limit } = req.query;
    const pageLimit = Math.min(Number(limit) || 100, 100);
    const cursorFilter = before ? { _id: { $lt: before } } : {};
    const notifications = await Notification.find({ ...query, ...cursorFilter })
      .sort({ createdAt: -1 })
      .limit(pageLimit);
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user._id;
    const role = req.user.role;
    const roleWideTypes = [];
    if (role === "student") roleWideTypes.push("all_students");
    if (role === "admin") roleWideTypes.push("all_admins");
    if (role === "donor") roleWideTypes.push("all_donors");
    const query = {
      $or: [
        { recipients: userId },
        { recipientType: "everyone", sender: { $ne: userId } },
        { recipientType: { $in: roleWideTypes }, sender: { $ne: userId } },
        { recipientType: "university_students", university: req.user.university, sender: { $ne: userId } }
      ],
      isDeleted: { $not: { $elemMatch: { user: userId } } },
      isRead: { $not: { $elemMatch: { user: userId } } }
    };
    const count = await Notification.countDocuments(query);
    res.json({ count });
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
        // For broadcasts we don't need to expand recipients; rely on recipientType in queries
        recipients = [];
        break;
      case "all_students":
        if (senderRole !== "superadmin") return res.status(403).json({ message: "Only superadmin can notify all students" });
        recipients = [];
        break;
      case "all_donors":
        if (senderRole !== "superadmin") return res.status(403).json({ message: "Only superadmin can notify all donors" });
        recipients = [];
        break;
      case "all_admins":
        if (senderRole !== "superadmin" && senderRole !== "donor") return res.status(403).json({ message: "Only superadmin/donor can notify all admins" });
        recipients = [];
        break;
      case "university_students":
        if (senderRole !== "admin") return res.status(403).json({ message: "Only admin can notify their university students" });
        {
          const adminUniversity = req.user.university || university;
          if (!adminUniversity) {
            return res.status(400).json({ message: "Admin does not have a university set" });
          }
          recipients = [];
          notificationUniversity = adminUniversity;
        }
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

    const doc = {
      title: String(title).trim(),
      message: String(message).trim(),
      recipientType,
      university: notificationUniversity || undefined,
    };
    if (req.user && req.user._id && /^[a-fA-F0-9]{24}$/.test(String(req.user._id))) {
      doc.sender = req.user._id;
    } else {
      doc.senderRole = req.user?.role;
      doc.senderName = req.user?.name;
    }
    if (recipients && recipients.length > 0) {
      doc.recipients = recipients.map(r => r._id ?? r);
    }

    const notification = await Notification.create(doc);
    // Populate minimal fields for broadcast
    const populated = await Notification.findById(notification._id)
      .populate("sender", "name email role")
      .populate("recipients", "name email role");
    // Targeted emit by audience
    const rooms = new Set();
    if (populated.recipients && populated.recipients.length > 0) {
      populated.recipients.forEach(r => rooms.add(`user:${r._id}`));
    } else {
      if (populated.recipientType === "everyone") {
        ["student","admin","donor","superadmin"].forEach(role => rooms.add(`role:${role}`));
      } else if (populated.recipientType === "all_students") rooms.add(`role:student`);
      else if (populated.recipientType === "all_admins") rooms.add(`role:admin`);
      else if (populated.recipientType === "all_donors") rooms.add(`role:donor`);
      else if (populated.recipientType === "university_students") rooms.add(`role:student`);
      else if (populated.recipientType === "superadmin") rooms.add(`role:superadmin`);
    }
    rooms.forEach(room => io.to(room).emit("notification:new", populated));
    res.status(201).json({ message: "Notification sent successfully", notification: populated });
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

    io.to(`user:${userId}`).emit("notification:read", { notificationId, userId });
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

    // If the current user is the sender, delete globally; otherwise hide for this user
    const isSender = (notification.sender?.toString?.() || "") === (userId?.toString?.() || "");
    if (isSender) {
      // Sender can delete the notification completely
      const id = notification._id.toString();
      await notification.deleteOne();
      io.to(`user:${userId}`).emit("notification:delete", { notificationId: id });
      res.json({ message: "Notification deleted" });
    } else {
      // Any viewer can hide it from their view (even for broadcast notifications)
      notification.isDeleted.push({ user: userId });
      await notification.save();
      io.to(`user:${userId}`).emit("notification:hide", { notificationId, userId });
      res.json({ message: "Notification hidden" });
    }
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Persist hide/unhide server-side
export const hideNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user._id;
    const notification = await Notification.findById(notificationId);
    if (!notification) return res.status(404).json({ message: "Notification not found" });
    const exists = notification.isDeleted.some(d => String(d.user) === String(userId));
    if (!exists) notification.isDeleted.push({ user: userId });
    await notification.save();
    io.to(`user:${userId}`).emit("notification:hide", { notificationId, userId });
    res.json({ message: "Notification hidden" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

export const unhideNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user._id;
    const notification = await Notification.findById(notificationId);
    if (!notification) return res.status(404).json({ message: "Notification not found" });
    notification.isDeleted = (notification.isDeleted || []).filter(d => String(d.user) !== String(userId));
    await notification.save();
    io.to(`user:${userId}`).emit("notification:unhide", { notificationId, userId });
    res.json({ message: "Notification unhidden" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

export const getHiddenNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    const list = await Notification.find({ isDeleted: { $elemMatch: { user: userId } } })
      .sort({ createdAt: -1 })
      .limit(100);
    res.json(list);
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
    if ((notification.sender?.toString?.() || "") !== (userId?.toString?.() || "")) {
      return res.status(403).json({ message: "Only sender can edit notification" });
    }

    notification.title = title;
    notification.message = message;
    await notification.save();
    const populated = await Notification.findById(notificationId)
      .populate("sender", "name email role")
      .populate("recipients", "name email role");
    const rooms2 = new Set();
    if (populated.recipients && populated.recipients.length > 0) {
      populated.recipients.forEach(r => rooms2.add(`user:${r._id}`));
    } else {
      if (populated.recipientType === "everyone") {
        ["student","admin","donor","superadmin"].forEach(role => rooms2.add(`role:${role}`));
      } else if (populated.recipientType === "all_students") rooms2.add(`role:student`);
      else if (populated.recipientType === "all_admins") rooms2.add(`role:admin`);
      else if (populated.recipientType === "all_donors") rooms2.add(`role:donor`);
      else if (populated.recipientType === "university_students") rooms2.add(`role:student`);
      else if (populated.recipientType === "superadmin") rooms2.add(`role:superadmin`);
    }
    rooms2.forEach(room => io.to(room).emit("notification:update", populated));
    res.json({ message: "Notification updated", notification: populated });
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