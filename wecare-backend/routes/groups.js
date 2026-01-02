import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { listGroups, getGroup, createGroup, joinGroup, leaveGroup, renameGroup, removeMember, deleteGroup, postMessage, deleteMessage } from "../controllers/groupController.js";

const router = express.Router();

router.use(protect);

router.get("/", listGroups);
router.get("/:id", getGroup);
router.post("/", createGroup);
router.post("/:id/join", joinGroup);
router.post("/:id/leave", leaveGroup);
router.patch("/:id/rename", renameGroup);
router.delete("/:id/members/:userId", removeMember);
router.delete("/:id", deleteGroup);
router.post("/:id/messages", postMessage);
router.delete("/:id/messages/:messageId", deleteMessage);
router.post("/:id/ai-response", async (req, res) => {
  // Manual trigger for testing AI responses
  try {
    const { id } = req.params;
    const Group = (await import("../models/Group.js")).default;
    const { generateGroupResponse } = await import("../services/groqService.js");
    const { io } = await import("../server.js");
    
    const group = await Group.findById(id).populate("messages.sender", "name");
    if (!group) return res.status(404).json({ message: "Group not found" });
    
    const formattedMessages = group.messages.slice(-20).map(msg => ({
      senderName: msg.sender?.name || "User",
      text: msg.text,
      createdAt: msg.createdAt
    }));
    
    const aiResponse = await generateGroupResponse(formattedMessages, group.name);
    
    group.messages.push({
      sender: req.user._id,
      text: `🤖 AI Assistant: ${aiResponse}`,
      isAIGenerated: true
    });
    group.lastAIResponseAt = new Date();
    await group.save();
    
    if (io) {
      io.to(`group:${id}`).emit("group:message", {
        groupId: id,
        message: {
          _id: group.messages[group.messages.length - 1]._id,
          sender: null,
          senderName: "AI Assistant",
          text: `🤖 ${aiResponse}`,
          isAIGenerated: true,
          createdAt: new Date()
        }
      });
    }
    
    res.json({ message: "AI response generated", text: aiResponse });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

export default router;


