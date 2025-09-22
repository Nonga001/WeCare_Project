import mongoose from "mongoose";

const donationSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["financial", "essentials"], required: true },
    amount: { type: Number }, // For financial donations
    items: [{ 
      name: String, 
      quantity: Number 
    }], // For essentials donations
    paymentMethod: { 
      type: String, 
      enum: ["mpesa", "bank_transfer", "card"], 
      required: true 
    },
    donor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    organization: { type: String }, // For corporate donors
    mothersSupported: { type: Number, default: 1 }, // Number of mothers this donation supports
    status: { 
      type: String, 
      enum: ["pending", "confirmed", "disbursed", "partially_disbursed"], 
      default: "pending" 
    },
    disbursedAmount: { type: Number, default: 0 }, // For financial donations
    disbursedItems: [{ name: String, quantity: Number }], // For essentials donations
    disbursedTo: [{ 
      aidRequestId: { type: mongoose.Schema.Types.ObjectId, ref: "AidRequest" },
      amount: { type: Number },
      items: [{ name: String, quantity: Number }],
      disbursedAt: { type: Date }
    }],
    transactionId: { type: String }, // Payment transaction reference
    notes: { type: String },
    disbursedAt: { type: Date },
    disbursedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model("Donation", donationSchema);
