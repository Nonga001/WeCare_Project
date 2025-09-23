import mongoose from "mongoose";

const memberSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  alias: { type: String },
  isAnonymous: { type: Boolean, default: false },
  joinedAt: { type: Date, default: Date.now }
});

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const groupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    isGlobal: { type: Boolean, default: false },
    university: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    moderators: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    members: [memberSchema],
    messages: [messageSchema]
  },
  { timestamps: true }
);

export default mongoose.model("Group", groupSchema);


