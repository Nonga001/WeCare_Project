import mongoose from "mongoose";

const aidRequestSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["financial", "essentials"], required: true },
    amount: { type: Number },
    items: [{ name: String, quantity: Number }],
    reason: { type: String, required: true },
    status: { type: String, enum: ["pending", "approved", "rejected", "disbursed"], default: "pending" },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    university: { type: String, required: true },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    disbursedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    disbursedAt: { type: Date }
  },
  { timestamps: true }
);

export default mongoose.model("AidRequest", aidRequestSchema);


