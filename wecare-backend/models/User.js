import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    university: { type: String }, // for students/admins
    department: { type: String, enum: ["welfare", "gender", "health"], default: undefined }, // for admins
    organization: { type: String }, // for corporate donors
    donorType: { type: String, enum: ["individual", "corporate"], default: "individual" }, // donor type
    donorPreference: { type: String, enum: ["monthly", "occasional"], default: "monthly" }, // donation frequency for individual
    contactPerson: { type: String }, // contact person for corporate donors
    csrFocus: { type: String }, // CSR focus area for corporate donors
    phone: { type: String },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["student", "donor", "admin", "superadmin"],
      required: true,
    },
    isApproved: { type: Boolean, default: false }, // superadmin approves admins; admins approve students
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedAt: { type: Date },
    isSuspended: { type: Boolean, default: false },
    
    // Student profile fields
    studentId: { type: String },
    studentEmail: { type: String },
    course: { type: String },
    yearOfStudy: { type: String },
    childDetails: { type: String },
    studentMom: { type: Boolean, default: false },
    documents: { type: String }, // file path or URL for uploaded documents
    profileSubmitted: { type: Boolean, default: false },
    profileSubmittedAt: { type: Date },
    profileApproved: { type: Boolean, default: false }, // Admin approves the submitted profile
    profileApprovedAt: { type: Date },
    profileApprovedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    // Activity tracking
    lastActive: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
