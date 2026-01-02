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
  isAIGenerated: { type: Boolean, default: false },
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
    messages: [messageSchema],
    lastAIResponseAt: { type: Date }
  },
  { timestamps: true }
);

export default mongoose.model("Group", groupSchema);


