import mongoose from "mongoose";

const donationSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["financial", "essentials"], required: true },
    amount: { type: Number, min: [1, "Amount must be at least 1"] }, // For financial donations
    items: [{ 
      name: { type: String }, 
      quantity: { type: Number, min: [1, "Quantity must be at least 1"] }
    }], // For essentials donations
    paymentMethod: { 
      type: String, 
      enum: ["mpesa", "bank_transfer", "card"], 
      required: true 
    },
    donor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    organization: { type: String }, // For corporate donors
    mothersSupported: { type: Number, default: 1, min: [1, "Must support at least 1"] }, // Number of mothers this donation supports
    status: { 
      type: String, 
      enum: ["pending", "confirmed", "disbursed", "partially_disbursed"], 
      default: "pending" 
    },
    disbursedAmount: { type: Number, default: 0, min: [0, "Disbursed cannot be negative"] }, // For financial donations
    disbursedItems: [{ name: String, quantity: { type: Number, min: [0, "Quantity cannot be negative"] } }], // For essentials donations
    disbursedTo: [{ 
      aidRequestId: { type: mongoose.Schema.Types.ObjectId, ref: "AidRequest" },
      amount: { type: Number, min: [0, "Amount cannot be negative"] },
      items: [{ name: String, quantity: { type: Number, min: [0, "Quantity cannot be negative"] } }],
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
