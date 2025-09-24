import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    message: { type: String, required: true },
    sender: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: false 
    },
    senderRole: { type: String },
    senderName: { type: String },
    recipients: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }],
    recipientType: {
      type: String,
      enum: [
        "everyone",
        "all_students",
        "all_donors",
        "all_admins",
        "university_students",
        "single_student",
        "single_admin",
        "single_donor",
        "superadmin"
      ],
      required: true
    },
    university: { type: String }, // for university_students type
    isRead: [{ 
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      readAt: { type: Date, default: Date.now }
    }],
    isDeleted: [{ 
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      deletedAt: { type: Date, default: Date.now }
    }]
  },
  { timestamps: true }
);

export default mongoose.model("Notification", notificationSchema);

// Indexes for performance
notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ sender: 1, createdAt: -1 });
notificationSchema.index({ recipientType: 1, createdAt: -1 });
notificationSchema.index({ university: 1, createdAt: -1 });
notificationSchema.index({ recipients: 1, createdAt: -1 });