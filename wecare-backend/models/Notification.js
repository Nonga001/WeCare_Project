import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    message: { type: String, required: true },
    sender: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },
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