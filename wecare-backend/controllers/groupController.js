import Group from "../models/Group.js";
import User from "../models/User.js";

const canModerate = (user, group) => {
  if (!user || !group) return false;
  if (user.role === "superadmin") return true;
  if (user.role === "admin" && !group.isGlobal && group.university === user.university) return true;
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
    const group = await Group.findById(id).populate("members.user", "name email role university");
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
    const { name, isGlobal } = req.body;
    if (!name || name.trim() === "") return res.status(400).json({ message: "Name required" });
    const group = await Group.create({
      name: name.trim(),
      isGlobal: Boolean(isGlobal),
      university: isGlobal ? undefined : req.user.university,
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


