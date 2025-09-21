import AidRequest from "../models/AidRequest.js";
import User from "../models/User.js";

// Student: create aid request
export const createAidRequest = async (req, res) => {
  try {
    if (req.user.role !== "student") return res.status(403).json({ message: "Only students can create requests" });
    const { type, amount, items, reason } = req.body;
    
    // Validation
    if (!type || !reason || reason.trim() === "") {
      return res.status(400).json({ message: "Type and reason are required" });
    }
    
    if (type === "financial") {
      if (amount == null || amount === "" || isNaN(Number(amount)) || Number(amount) <= 0) {
        return res.status(400).json({ message: "Valid numerical amount required for financial requests" });
      }
    }
    
    if (type === "essentials") {
      if (!items || items.length === 0) {
        return res.status(400).json({ message: "At least one item is required for essentials requests" });
      }
      for (const item of items) {
        if (!item.name || item.name.trim() === "" || !item.quantity || isNaN(Number(item.quantity)) || Number(item.quantity) <= 0) {
          return res.status(400).json({ message: "Valid item name and quantity required for essentials requests" });
        }
      }
    }
    
    const doc = await AidRequest.create({
      type,
      amount: type === "financial" ? Number(amount) : undefined,
      items: type === "essentials" ? items.map(item => ({ name: item.name.trim(), quantity: Number(item.quantity) })) : [],
      reason: reason.trim(),
      student: req.user._id,
      university: req.user.university
    });
    res.status(201).json(doc);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Student: list own requests
export const listMyAidRequests = async (req, res) => {
  try {
    if (req.user.role !== "student") return res.status(403).json({ message: "Only students" });
    const list = await AidRequest.find({ student: req.user._id }).sort({ createdAt: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Admin: list requests in university
export const listUniversityAidRequests = async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ message: "Only admins" });
    const list = await AidRequest.find({ university: req.user.university }).populate("student", "name email").sort({ createdAt: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Admin: approve or reject
export const setAidStatus = async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ message: "Only admins" });
    const { id } = req.params;
    const { status } = req.body; // approved | rejected
    if (!["approved", "rejected"].includes(status)) return res.status(400).json({ message: "Invalid status" });
    
    const doc = await AidRequest.findById(id);
    if (!doc || doc.university !== req.user.university) return res.status(404).json({ message: "Request not found" });
    
    // Only allow status change from pending
    if (doc.status !== "pending") {
      return res.status(400).json({ message: "Only pending requests can be approved or rejected" });
    }
    
    doc.status = status;
    if (status === "approved") {
      doc.approvedBy = req.user._id;
      doc.approvedAt = new Date();
    } else if (status === "rejected") {
      doc.rejectedBy = req.user._id;
      doc.rejectedAt = new Date();
    }
    
    await doc.save();
    res.json(doc);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Admin: disburse
export const disburseAid = async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ message: "Only admins" });
    const { id } = req.params;
    const doc = await AidRequest.findById(id);
    if (!doc || doc.university !== req.user.university) return res.status(404).json({ message: "Request not found" });
    if (doc.status !== "waiting") return res.status(400).json({ message: "Only waiting requests can be disbursed" });
    doc.status = "disbursed";
    doc.disbursedBy = req.user._id;
    doc.disbursedAt = new Date();
    await doc.save();
    res.json(doc);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Admin: move approved request to waiting status
export const moveToWaiting = async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ message: "Only admins" });
    const { id } = req.params;
    const doc = await AidRequest.findById(id);
    if (!doc || doc.university !== req.user.university) return res.status(404).json({ message: "Request not found" });
    if (doc.status !== "approved") return res.status(400).json({ message: "Only approved requests can be moved to waiting" });
    doc.status = "waiting";
    await doc.save();
    res.json(doc);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Stats for dashboards
export const getAidStats = async (req, res) => {
  try {
    const role = req.user.role;
    if (role === "student") {
      const [financialPending, essentialsPending] = await Promise.all([
        AidRequest.countDocuments({ student: req.user._id, type: "financial", status: { $in: ["pending", "approved"] } }),
        AidRequest.countDocuments({ student: req.user._id, type: "essentials", status: { $in: ["pending", "approved"] } })
      ]);
      return res.json({ financialPending, essentialsPending });
    }
    if (role === "admin") {
      const [pending, approved, waiting, disbursed] = await Promise.all([
        AidRequest.countDocuments({ university: req.user.university, status: "pending" }),
        AidRequest.countDocuments({ university: req.user.university, status: "approved" }),
        AidRequest.countDocuments({ university: req.user.university, status: "waiting" }),
        AidRequest.countDocuments({ university: req.user.university, status: "disbursed" })
      ]);
      return res.json({ pending, approved, waiting, disbursed });
    }
    if (role === "donor") {
      const [financialOpen, essentialsOpen] = await Promise.all([
        AidRequest.countDocuments({ type: "financial", status: { $in: ["pending", "approved"] } }),
        AidRequest.countDocuments({ type: "essentials", status: { $in: ["pending", "approved"] } })
      ]);
      return res.json({ financialOpen, essentialsOpen });
    }
    res.json({});
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};


