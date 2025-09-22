import AidRequest from "../models/AidRequest.js";
import User from "../models/User.js";
import Donation from "../models/Donation.js";

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
    const reqDoc = await AidRequest.findById(id);
    if (!reqDoc || reqDoc.university !== req.user.university) return res.status(404).json({ message: "Request not found" });
    if (reqDoc.status !== "waiting") return res.status(400).json({ message: "Only waiting requests can be disbursed" });

    // Find eligible donations and auto-match (exact coverage required)
    const donations = await Donation.find({
      status: { $in: ["confirmed", "partially_disbursed"] },
      type: reqDoc.type
    }).sort({ createdAt: 1 }); // FCFS

    let matchedDonation = null;
    let disbursedItems = [];

    if (reqDoc.type === "financial") {
      for (const d of donations) {
        const availableAmount = (d.amount || 0) - (d.disbursedAmount || 0);
        if (availableAmount >= (reqDoc.amount || 0)) {
          matchedDonation = d;
          break;
        }
      }
      if (!matchedDonation) {
        return res.status(400).json({ message: "Insufficient available financial donations to cover this request" });
      }

      matchedDonation.disbursedAmount = (matchedDonation.disbursedAmount || 0) + (reqDoc.amount || 0);
      matchedDonation.disbursedTo.push({ aidRequestId: reqDoc._id, amount: reqDoc.amount, disbursedAt: new Date() });
      matchedDonation.status = matchedDonation.disbursedAmount >= (matchedDonation.amount || 0) ? "disbursed" : "partially_disbursed";

    } else if (reqDoc.type === "essentials") {
      // Compute availability per item
      const requiredItems = {};
      (reqDoc.items || []).forEach(it => { requiredItems[it.name] = (requiredItems[it.name] || 0) + it.quantity; });

      const canCover = (donation) => {
        const available = {};
        (donation.items || []).forEach(item => {
          const already = (donation.disbursedItems || []).find(di => di.name === item.name)?.quantity || 0;
          const avail = (item.quantity || 0) - already;
          if (avail > 0) available[item.name] = (available[item.name] || 0) + avail;
        });
        for (const [name, qty] of Object.entries(requiredItems)) {
          if ((available[name] || 0) < qty) return null;
        }
        const toDisburse = Object.entries(requiredItems).map(([name, qty]) => ({ name, quantity: qty }));
        return { available, toDisburse };
      };

      for (const d of donations) {
        const result = canCover(d);
        if (result) {
          matchedDonation = d;
          disbursedItems = result.toDisburse;
          break;
        }
      }
      if (!matchedDonation) {
        return res.status(400).json({ message: "Insufficient essentials items to cover this request" });
      }

      matchedDonation.disbursedItems.push(...disbursedItems);
      matchedDonation.disbursedTo.push({ aidRequestId: reqDoc._id, items: disbursedItems, disbursedAt: new Date() });

      // Check if fully disbursed
      let fully = true;
      for (const item of matchedDonation.items) {
        const totalDisbursed = (matchedDonation.disbursedItems || []).filter(di => di.name === item.name).reduce((s, di) => s + (di.quantity || 0), 0);
        if (totalDisbursed < (item.quantity || 0)) { fully = false; break; }
      }
      matchedDonation.status = fully ? "disbursed" : "partially_disbursed";
    }

    // Update request as disbursed and log match
    reqDoc.status = "disbursed";
    reqDoc.disbursedBy = req.user._id;
    reqDoc.disbursedAt = new Date();
    reqDoc.disbursementMatches.push({
      donationId: matchedDonation._id,
      amount: reqDoc.type === "financial" ? reqDoc.amount : undefined,
      items: reqDoc.type === "essentials" ? disbursedItems : undefined,
      disbursedAt: new Date()
    });

    await Promise.all([matchedDonation.save(), reqDoc.save()]);

    res.json({
      message: "Aid disbursed successfully",
      aidRequest: { _id: reqDoc._id, status: reqDoc.status, disbursedAt: reqDoc.disbursedAt },
      donation: {
        _id: matchedDonation._id,
        status: matchedDonation.status,
        disbursedAmount: matchedDonation.disbursedAmount,
        disbursedItems: matchedDonation.disbursedItems
      }
    });
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

// Admin: reports with month-over-month comparisons
export const getAdminReports = async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ message: "Only admins" });
    const university = req.user.university;

    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // Verified moms
    const totalVerified = await User.countDocuments({ 
      role: "student", 
      university, 
      isApproved: true, 
      profileSubmitted: true, 
      profileApproved: true 
    });

    const verifiedThisMonth = await User.countDocuments({
      role: "student",
      university,
      profileApproved: true,
      profileApprovedAt: { $gte: startOfCurrentMonth }
    });

    const verifiedPrevMonth = await User.countDocuments({
      role: "student",
      university,
      profileApproved: true,
      profileApprovedAt: { $gte: startOfPrevMonth, $lt: startOfCurrentMonth }
    });

    // Disbursed to this university (financial and essentials)
    const financialAgg = await Donation.aggregate([
      { $unwind: "$disbursedTo" },
      { $match: { "disbursedTo.disbursedAt": { $gte: startOfCurrentMonth } } },
      { $lookup: { from: "aidrequests", localField: "disbursedTo.aidRequestId", foreignField: "_id", as: "ar" } },
      { $unwind: "$ar" },
      { $match: { "ar.university": university } },
      { $group: { _id: null, total: { $sum: { $ifNull: ["$disbursedTo.amount", 0] } } } }
    ]);

    const financialAggPrev = await Donation.aggregate([
      { $unwind: "$disbursedTo" },
      { $match: { "disbursedTo.disbursedAt": { $gte: startOfPrevMonth, $lt: startOfCurrentMonth } } },
      { $lookup: { from: "aidrequests", localField: "disbursedTo.aidRequestId", foreignField: "_id", as: "ar" } },
      { $unwind: "$ar" },
      { $match: { "ar.university": university } },
      { $group: { _id: null, total: { $sum: { $ifNull: ["$disbursedTo.amount", 0] } } } }
    ]);

    const essentialsAgg = await Donation.aggregate([
      { $unwind: "$disbursedTo" },
      { $match: { "disbursedTo.disbursedAt": { $gte: startOfCurrentMonth } } },
      { $lookup: { from: "aidrequests", localField: "disbursedTo.aidRequestId", foreignField: "_id", as: "ar" } },
      { $unwind: "$ar" },
      { $match: { "ar.university": university } },
      { $unwind: { path: "$disbursedTo.items", preserveNullAndEmptyArrays: true } },
      { $group: { _id: null, total: { $sum: { $ifNull: ["$disbursedTo.items.quantity", 0] } } } }
    ]);

    const essentialsAggPrev = await Donation.aggregate([
      { $unwind: "$disbursedTo" },
      { $match: { "disbursedTo.disbursedAt": { $gte: startOfPrevMonth, $lt: startOfCurrentMonth } } },
      { $lookup: { from: "aidrequests", localField: "disbursedTo.aidRequestId", foreignField: "_id", as: "ar" } },
      { $unwind: "$ar" },
      { $match: { "ar.university": university } },
      { $unwind: { path: "$disbursedTo.items", preserveNullAndEmptyArrays: true } },
      { $group: { _id: null, total: { $sum: { $ifNull: ["$disbursedTo.items.quantity", 0] } } } }
    ]);

    // Retention: active verified moms in last 30 days / total verified
    const last30 = new Date(now);
    last30.setDate(now.getDate() - 30);
    const activeVerified = await AidRequest.distinct("student", { university, createdAt: { $gte: last30 } });
    const retention = totalVerified > 0 ? Math.round((activeVerified.length / totalVerified) * 100) : 0;

    res.json({
      verifiedMoms: {
        currentTotal: totalVerified,
        currentMonth: verifiedThisMonth,
        previousMonth: verifiedPrevMonth
      },
      financialAid: {
        currentMonth: financialAgg[0]?.total || 0,
        previousMonth: financialAggPrev[0]?.total || 0
      },
      essentialsDistributed: {
        currentMonthItems: essentialsAgg[0]?.total || 0,
        previousMonthItems: essentialsAggPrev[0]?.total || 0
      },
      retention
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};


