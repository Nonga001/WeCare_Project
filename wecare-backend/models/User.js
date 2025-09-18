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
      enum: ["student", "donor", "admin"],
      required: true,
    },
    isApproved: { type: Boolean, default: false }, // superadmin approves admins; admins approve students
    isSuspended: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
