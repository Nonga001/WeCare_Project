import Group from "../models/Group.js";
import User from "../models/User.js";
import { generateGroupResponse, shouldTriggerAIResponse } from "../services/groqService.js";
import { io } from "../server.js";

const canModerate = (user, group) => {
  if (!user || !group) return false;
  if (user.role === "superadmin") return true;
  // Admin can moderate: their university groups; and for global group only member management, enforced in handlers
  if (user.role === "admin" && (!group.isGlobal && group.university === user.university)) return true;
  if (group.moderators?.some(m => String(m) === String(user._id))) return true;
  return false;
};

export const listGroups = async (req, res) => {
  try {
    const { scope } = req.query; // 'uni' | 'global' | 'all'
    const query = {};
    if (scope === "uni") {
      query.isGlobal = false; query.university = req.user.university;
    } else if (scope === "global") {
      query.isGlobal = true;
    }
    const groups = await Group.find(query).select("name isGlobal university members moderators createdAt");
    const data = groups.map(g => ({
      _id: g._id,
      name: g.name,
      isGlobal: g.isGlobal,
      university: g.university,
      membersCount: g.members.length,
      isMember: g.members.some(m => String(m.user) === String(req.user._id))
    }));
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

export const getGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const group = await Group.findById(id).populate("members.user", "name email role university").populate("messages.sender", "name role university");
    if (!group) return res.status(404).json({ message: "Group not found" });
    res.json({
      _id: group._id,
      name: group.name,
      isGlobal: group.isGlobal,
      university: group.university,
      createdBy: group.createdBy,
      moderators: group.moderators,
      members: group.members.map(m => ({
        user: m.user?._id || m.user,
        name: m.isAnonymous ? (m.alias || "Anonymous") : (m.user?.name || "Member"),
        isAnonymous: m.isAnonymous,
        alias: m.alias,
        joinedAt: m.joinedAt,
      })),
      messages: (group.messages || []).map(msg => {
        const senderId = msg.sender?._id || msg.sender;
        const membership = group.members.find(m => String(m.user?._id || m.user) === String(senderId));
        const senderName = membership?.isAnonymous ? (membership.alias || "Anonymous") : (msg.sender?.name || "");
        return {
          _id: msg._id,
          sender: senderId,
          senderName: msg.isAIGenerated ? "AI Assistant" : senderName,
          text: msg.text,
          isAIGenerated: msg.isAIGenerated || false,
          createdAt: msg.createdAt,
        };
      }),
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

export const createGroup = async (req, res) => {
  try {
    if (!["admin", "superadmin"].includes(req.user.role)) {
      return res.status(403).json({ message: "Only admins or superadmins can create groups" });
    }
    const { name } = req.body;
    if (!name || name.trim() === "") return res.status(400).json({ message: "Name required" });
    const group = await Group.create({
      name: name.trim(),
      isGlobal: false,
      university: req.user.university,
      createdBy: req.user._id,
      moderators: req.user.role === "admin" ? [req.user._id] : []
    });
    res.status(201).json(group);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

export const joinGroup = async (req, res) => {
  try {
    if (req.user.role !== "student") return res.status(403).json({ message: "Only students can join groups" });
    const { id } = req.params; // group id
    const { anonymous } = req.body;
    const group = await Group.findById(id);
    if (!group) return res.status(404).json({ message: "Group not found" });
    if (group.members.some(m => String(m.user) === String(req.user._id))) {
      return res.status(400).json({ message: "Already a member" });
    }
    const alias = anonymous ? `User-${Math.random().toString(36).slice(2, 8)}` : undefined;
    group.members.push({ user: req.user._id, isAnonymous: Boolean(anonymous), alias });
    await group.save();
    res.json({ message: "Joined", groupId: group._id, alias });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// removed private-group join request handlers

export const leaveGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const group = await Group.findById(id);
    if (!group) return res.status(404).json({ message: "Group not found" });
    group.members = group.members.filter(m => String(m.user) !== String(req.user._id));
    await group.save();
    res.json({ message: "Left group" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

export const renameGroup = async (req, res) => {
  try {
    const { id } = req.params; const { name } = req.body;
    const group = await Group.findById(id);
    if (!group) return res.status(404).json({ message: "Group not found" });
    if (group.isGlobal) return res.status(403).json({ message: "Global group name cannot be changed" });
    if (!canModerate(req.user, group)) return res.status(403).json({ message: "Not allowed" });
    if (!name || name.trim() === "") return res.status(400).json({ message: "Name required" });
    group.name = name.trim();
    await group.save();
    res.json(group);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

export const removeMember = async (req, res) => {
  try {
    const { id, userId } = req.params;
    const group = await Group.findById(id);
    if (!group) return res.status(404).json({ message: "Group not found" });
    if (!canModerate(req.user, group)) return res.status(403).json({ message: "Not allowed" });
    group.members = group.members.filter(m => String(m.user) !== String(userId));
    await group.save();
    res.json({ message: "Removed" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

export const deleteGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const group = await Group.findById(id);
    if (!group) return res.status(404).json({ message: "Group not found" });
    if (group.isGlobal) return res.status(403).json({ message: "Global group cannot be deleted" });
    // Admin can delete only their university groups they created; superadmin can delete global
    if (req.user.role === "admin") {
      if (group.isGlobal || group.university !== req.user.university || String(group.createdBy) !== String(req.user._id)) {
        return res.status(403).json({ message: "Admins can delete only their own university groups" });
      }
    } else if (req.user.role !== "superadmin") {
      return res.status(403).json({ message: "Not allowed" });
    }
    await group.deleteOne();
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

export const postMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    if (!text || text.trim() === "") return res.status(400).json({ message: "Message text required" });
    const group = await Group.findById(id);
    if (!group) return res.status(404).json({ message: "Group not found" });
    // Must be member or moderator to post
    const isMember = group.members.some(m => String(m.user) === String(req.user._id));
    const isMod = canModerate(req.user, group) || group.moderators?.some(m => String(m) === String(req.user._id));
    if (!isMember && !isMod) return res.status(403).json({ message: "Join or moderate the group to post messages" });
    group.messages.push({ sender: req.user._id, text: text.trim() });
    await group.save();
    
    // Check if message is from admin (group creator)
    const isAdmin = String(req.user._id) === String(group.createdBy);
    
    // Emit new message via socket
    if (io) {
      io.to(`group:${id}`).emit("group:message", {
        groupId: id,
        message: {
          _id: group.messages[group.messages.length - 1]._id,
          sender: req.user._id,
          senderName: req.user.name,
          text: text.trim(),
          isAIGenerated: false,
          createdAt: new Date()
        }
      });
    }
    
    // AI reinforcement for admin messages after 10 seconds
    if (isAdmin) {
      setTimeout(async () => {
        try {
          const freshGroup = await Group.findById(id);
          if (!freshGroup) return;
          
          const adminMessage = text.trim().toLowerCase();
          let aiResponse = "";
          
          // Simple greeting reinforcement
          if (adminMessage.match(/^(hi|hello|hey|greetings|good morning|good afternoon|good evening)/)) {
            aiResponse = adminMessage.charAt(0).toUpperCase() + adminMessage.slice(1) + "!";
          } 
          // Questions or meaningful content
          else if (adminMessage.includes("?") || adminMessage.split(" ").length > 5) {
            aiResponse = "Noted.";
          }
          // Short statements
          else {
            aiResponse = "Acknowledged.";
          }
          
          // Post AI reinforcement
          freshGroup.messages.push({
            sender: req.user._id,
            text: aiResponse,
            isAIGenerated: true
          });
          freshGroup.lastAIResponseAt = new Date();
          await freshGroup.save();
          
          // Emit AI message
          if (io) {
            io.to(`group:${id}`).emit("group:message", {
              groupId: id,
              message: {
                _id: freshGroup.messages[freshGroup.messages.length - 1]._id,
                sender: req.user._id,
                senderName: "AI Assistant",
                text: aiResponse,
                isAIGenerated: true,
                createdAt: new Date()
              }
            });
          }
        } catch (err) {
          console.error("AI reinforcement error:", err.message);
        }
      }, 10 * 1000); // 10 seconds
    }
    
    // Check if AI should respond (no activity for 3 minutes, with at least 2 messages)
    const messageCount = group.messages.length;
    if (messageCount >= 2 && !isAdmin) {
      setTimeout(async () => {
        try {
          const freshGroup = await Group.findById(id).populate("messages.sender", "name");
          if (!freshGroup || freshGroup.messages.length === 0) return;
          
          const lastMessage = freshGroup.messages[freshGroup.messages.length - 1];
          if (!lastMessage || lastMessage.isAIGenerated) return; // Don't respond to AI messages
          
          const timeSinceLastMsg = Date.now() - new Date(lastMessage.createdAt).getTime();
          const minutesSinceLastMsg = timeSinceLastMsg / (1000 * 60);
          
          if (minutesSinceLastMsg >= 3) {
            // Format messages for AI (last 20)
            const formattedMessages = freshGroup.messages.slice(-20).map(msg => ({
              senderName: msg.sender?.name || "User",
              text: msg.text,
              createdAt: msg.createdAt
            }));
            
            const aiResponse = await generateGroupResponse(formattedMessages, freshGroup.name);
            
            // Post AI response as system user
            freshGroup.messages.push({
              sender: req.user._id,
              text: `🤖 AI Assistant: ${aiResponse}`,
              isAIGenerated: true
            });
            freshGroup.lastAIResponseAt = new Date();
            await freshGroup.save();
            
            // Emit AI message
            if (io) {
              io.to(`group:${id}`).emit("group:message", {
                groupId: id,
                message: {
                  _id: freshGroup.messages[freshGroup.messages.length - 1]._id,
                  sender: null,
                  senderName: "AI Assistant",
                  text: `🤖 ${aiResponse}`,
                  isAIGenerated: true,
                  createdAt: new Date()
                }
              });
            }
          }
        } catch (err) {
          console.error("AI response error:", err.message);
        }
      }, 3 * 60 * 1000); // 3 minutes
    }
    
    res.status(201).json({ message: "Posted" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const { id, messageId } = req.params;
    const group = await Group.findById(id);
    if (!group) return res.status(404).json({ message: "Group not found" });
    const msg = group.messages.id(messageId);
    if (!msg) return res.status(404).json({ message: "Message not found" });
    // Allow sender to delete, or moderators to manage
    const isSender = String(msg.sender) === String(req.user._id);
    const isModerator = canModerate(req.user, group) || group.moderators?.some(m => String(m) === String(req.user._id));
    // In global group, only sender can delete (admins cannot delete messages)
    if (group.isGlobal) {
      if (!isSender) return res.status(403).json({ message: "Only the sender can delete this message" });
    } else {
      if (!isSender && !isModerator) return res.status(403).json({ message: "Not allowed" });
    }
    msg.deleteOne();
    await group.save();
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

export const editMessage = async (req, res) => {
  try {
    const { id, messageId } = req.params;
    const { text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ message: "Message text required" });

    const group = await Group.findById(id);
    if (!group) return res.status(404).json({ message: "Group not found" });
    const msg = group.messages.id(messageId);
    if (!msg) return res.status(404).json({ message: "Message not found" });

    const isSender = String(msg.sender) === String(req.user._id);
    const isModerator = canModerate(req.user, group) || group.moderators?.some(m => String(m) === String(req.user._id));
    // In global group, only sender can edit
    if (group.isGlobal) {
      if (!isSender) return res.status(403).json({ message: "Only the sender can edit this message" });
    } else {
      if (!isSender && !isModerator) return res.status(403).json({ message: "Not allowed" });
    }

    msg.text = String(text).trim();
    msg.isEdited = true;
    msg.editedAt = new Date();
    await group.save();

    res.json({ message: "Updated", data: { _id: msg._id, text: msg.text, isEdited: msg.isEdited, editedAt: msg.editedAt } });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};


