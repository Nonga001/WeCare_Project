import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    university: { type: String }, // for students/admins
    organization: { type: String }, // for donors
    phone: { type: String },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["student", "donor", "admin", "superadmin"],
      required: true,
    },
    isApproved: { type: Boolean, default: false }, // superadmin approves admins; admins approve students
    isSuspended: { type: Boolean, default: false },
    
    // Student profile fields
    studentId: { type: String },
    studentEmail: { type: String },
    course: { type: String },
    yearOfStudy: { type: String },
    childDetails: { type: String },
    documents: { type: String }, // file path or URL for uploaded documents
    profileSubmitted: { type: Boolean, default: false },
    profileSubmittedAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
