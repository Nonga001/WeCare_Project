import mongoose from "mongoose";

const aidRequestSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["financial", "essentials"], required: true },
    amount: { type: Number },
    items: [{ name: String, quantity: Number }],
    reason: { type: String, required: true },
    status: { type: String, enum: ["pending", "approved", "rejected", "waiting", "disbursed"], default: "pending" },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    university: { type: String, required: true },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedAt: { type: Date },
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    rejectedAt: { type: Date },
    disbursedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    disbursedAt: { type: Date },
    disbursementMatches: [{ 
      donationId: { type: mongoose.Schema.Types.ObjectId, ref: "Donation" },
      amount: { type: Number }, // For financial disbursements
      items: [{ name: String, quantity: Number }], // For essentials disbursements
      disbursedAt: { type: Date, default: Date.now }
    }]
  },
  { timestamps: true }
);

export default mongoose.model("AidRequest", aidRequestSchema);


