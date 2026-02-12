import mongoose from "mongoose";

const deletionRequestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      sparse: true
    },
    userEmail: { type: String, required: true },
    userName: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "completed"],
      default: "pending"
    },
    reason: { type: String }, // Why user is deleting account
    requestedAt: { type: Date, default: Date.now },
    confirmedAt: { type: Date }, // When user confirmed the deletion
    scheduledDeletionDate: { type: Date }, // When deletion will happen (7 days after confirmation)
    cancelledAt: { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model("DeletionRequest", deletionRequestSchema);
