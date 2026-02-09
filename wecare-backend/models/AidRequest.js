import mongoose from "mongoose";

const aidRequestSchema = new mongoose.Schema(
  {
    requestId: { type: String, unique: true, index: true },
    aidCategory: { type: String, enum: ["food", "childcare", "transport", "emergency", "academic"] },
    amountRange: { type: String },
    amountRangeMin: { type: Number },
    amountRangeMax: { type: Number },
    explanation: { type: String },
    type: { type: String, enum: ["financial", "essentials"], required: true },
    amount: { type: Number },
    items: [{ name: String, quantity: Number }],
    reason: { type: String, required: true },
    status: {
      type: String,
      enum: [
        "pending",
        "approved",
        "rejected",
        "waiting",
        "disbursed",
        "pending_verification",
        "precheck_failed",
        "pending_admin",
        "clarification_required",
        "verified",
        "funds_reserved",
        "waiting_funds",
        "second_approval_pending"
      ],
      default: "pending_verification"
    },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    university: { type: String, required: true },
    shareWithDonors: { type: Boolean, default: false },
    precheckPassed: { type: Boolean, default: false },
    precheckReason: { type: String },
    precheckAt: { type: Date },
    emergencyOverrideRequired: { type: Boolean, default: false },
    emergencyOverrideApproved: { type: Boolean, default: false },
    emergencyOverrideBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    emergencyOverrideAt: { type: Date },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    verifiedAt: { type: Date },
    clarificationNote: { type: String },
    secondApprovedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    secondApprovedAt: { type: Date },
    rejectedReason: { type: String },
    reservedAmount: { type: Number },
    reservedAt: { type: Date },
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


