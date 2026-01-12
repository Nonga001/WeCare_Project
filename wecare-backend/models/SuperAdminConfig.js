import mongoose from "mongoose";

const SuperAdminConfigSchema = new mongoose.Schema(
  {
    key: { 
      type: String, 
      required: true, 
      unique: true 
    },
    value: { 
      type: String, 
      required: true 
    },
  },
  { timestamps: true }
);

export default mongoose.model("SuperAdminConfig", SuperAdminConfigSchema);
