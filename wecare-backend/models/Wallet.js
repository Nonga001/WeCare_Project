import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema({
  type: { type: String, enum: ["credit", "debit"], required: true },
  amount: { type: Number, required: true },
  description: { type: String, required: true },
  aidRequestId: { type: mongoose.Schema.Types.ObjectId, ref: "AidRequest" },
  donationId: { type: mongoose.Schema.Types.ObjectId, ref: "Donation" },
  withdrawalRefId: { type: String }, // M-Pesa reference
  status: { type: String, enum: ["success", "pending", "failed"], default: "success" },
  createdAt: { type: Date, default: Date.now }
});

const walletSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    balance: { type: Number, default: 0 },
    totalReceived: { type: Number, default: 0 },
    totalWithdrawn: { type: Number, default: 0 },
    transactions: [transactionSchema],
    lastWithdrawalAt: { type: Date }
  },
  { timestamps: true }
);

export default mongoose.model("Wallet", walletSchema);
