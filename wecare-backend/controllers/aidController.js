import AidRequest from "../models/AidRequest.js";
import User from "../models/User.js";
import Donation from "../models/Donation.js";
import Notification from "../models/Notification.js";
import EthicalFeedback from "../models/EthicalFeedback.js";
import { io } from "../server.js";

const CATEGORY_RULES = {
  food: {
    ranges: [
      { label: "1-250", min: 1, max: 250 },
      { label: "251-500", min: 251, max: 500 },
      { label: "501-999", min: 501, max: 999 },
      { label: "1000-1500", min: 1000, max: 1500 }
    ],
    period: "month",
    maxAmountPerPeriod: 3000,
    maxRequestsPerPeriod: 2
  },
  transport: {
    ranges: [
      { label: "1-200", min: 1, max: 200 },
      { label: "201-500", min: 201, max: 500 },
      { label: "501-1000", min: 501, max: 1000 }
    ],
    period: "month",
    maxAmountPerPeriod: 2000,
    maxRequestsPerPeriod: 3
  },
  childcare: {
    ranges: [
      { label: "1-1000", min: 1, max: 1000 },
      { label: "1001-2000", min: 1001, max: 2000 },
      { label: "2001-3000", min: 2001, max: 3000 }
    ],
    period: "month",
    maxAmountPerPeriod: 6000,
    maxRequestsPerPeriod: 2
  },
  academic: {
    ranges: [
      { label: "1-300", min: 1, max: 300 },
      { label: "301-1000", min: 301, max: 1000 },
      { label: "1001-2000", min: 1001, max: 2000 }
    ],
    period: "semester",
    maxAmountPerPeriod: 4000,
    maxRequestsPerPeriod: 2
  },
  emergency: {
    ranges: [
      { label: "1-1200", min: 1, max: 1200 },
      { label: "1201-3000", min: 1201, max: 3000 },
      { label: "3001-6000", min: 3001, max: 6000 },
      { label: "6001-10000", min: 6001, max: 10000 }
    ],
    period: "semester",
    maxAmountPerPeriod: 10000,
    maxRequestsPerPeriod: 1,
    requiresOverride: true
  }
};
const DUPLICATE_WINDOW_DAYS = 14;
const SEMESTER_MONTHS = 4;
const EXPLANATION_MAX = 240;

const getPeriodStart = (period) => {
  const d = new Date();
  const months = period === "month" ? 1 : SEMESTER_MONTHS;
  d.setMonth(d.getMonth() - months);
  return d;
};

const getPeriodEnd = () => new Date();

const generateRequestId = () => {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `AR-${stamp}-${rand}`;
};

const notifyUsers = async ({ title, message, recipients, recipientType, university }) => {
  const doc = {
    title: String(title || "").trim(),
    message: String(message || "").trim(),
    recipientType: recipientType || "single_student",
    university: university || undefined,
    recipients: recipients && recipients.length ? recipients : undefined
  };
  const notification = await Notification.create(doc);
  const populated = await Notification.findById(notification._id)
    .populate("sender", "name email role")
    .populate("recipients", "name email role");
  const rooms = new Set();
  if (recipients && recipients.length) {
    recipients.forEach((id) => rooms.add(`user:${id}`));
  } else if (doc.recipientType === "all_admins") {
    rooms.add("role:admin");
  } else if (doc.recipientType === "all_students") {
    rooms.add("role:student");
  } else if (doc.recipientType === "university_students") {
    rooms.add("role:student");
  }
  rooms.forEach((room) => io.to(room).emit("notification:new", populated));
};

const getUniversityAdminIds = async (university) => {
  if (!university) return [];
  const admins = await User.find({ role: "admin", university }).select("_id");
  return admins.map(a => a._id);
};

const getAvailableFinancialBalance = async () => {
  const donations = await Donation.find({ status: { $in: ["confirmed", "partially_disbursed"] }, type: "financial" });
  const available = donations.reduce((sum, d) => sum + ((d.amount || 0) - (d.disbursedAmount || 0)), 0);
  return available;
};

const getReservedAmount = async () => {
  const reserved = await AidRequest.aggregate([
    { $match: { status: { $in: ["funds_reserved", "second_approval_pending"] } } },
    { $group: { _id: null, total: { $sum: "$reservedAmount" } } }
  ]);
  return reserved[0]?.total || 0;
};

const reserveFundsForRequest = async (reqDoc) => {
  const requested = reqDoc.amountRangeMax || reqDoc.amount || 0;
  const available = await getAvailableFinancialBalance();
  const reserved = await getReservedAmount();
  if ((available - reserved) < requested) return { ok: false, requested, available, reserved };
  reqDoc.reservedAmount = requested;
  reqDoc.reservedAt = new Date();
  reqDoc.status = "second_approval_pending";
  await reqDoc.save();
  return { ok: true, requested, available, reserved };
};

const autoDisburseFinancial = async (reqDoc, actorId) => {
  const target = reqDoc.reservedAmount || reqDoc.amount || 0;
  if (!target || target <= 0) {
    return { ok: false, message: "Invalid reserved amount" };
  }
  const donations = await Donation.find({ status: { $in: ["confirmed", "partially_disbursed"] }, type: "financial" })
    .sort({ createdAt: 1 });

  let remaining = target;
  const matches = [];

  for (const d of donations) {
    const available = (d.amount || 0) - (d.disbursedAmount || 0);
    if (available <= 0) continue;
    const take = Math.min(available, remaining);
    d.disbursedAmount = (d.disbursedAmount || 0) + take;
    d.disbursedTo.push({ aidRequestId: reqDoc._id, amount: take, disbursedAt: new Date() });
    d.status = d.disbursedAmount >= (d.amount || 0) ? "disbursed" : "partially_disbursed";
    matches.push({ donationId: d._id, amount: take, disbursedAt: new Date() });
    remaining -= take;
    await d.save();
    if (remaining <= 0) break;
  }

  if (remaining > 0) {
    return { ok: false, message: "Insufficient funds to disburse" };
  }

  reqDoc.status = "disbursed";
  reqDoc.disbursedBy = actorId;
  reqDoc.disbursedAt = new Date();
  reqDoc.disbursementMatches.push(...matches);
  await reqDoc.save();
  return { ok: true };
};

const buildLimitSummary = async (studentId) => {
  const categories = Object.keys(CATEGORY_RULES);
  const summaries = [];
  for (const category of categories) {
    const rule = CATEGORY_RULES[category];
    const periodStart = getPeriodStart(rule.period);
    const usedRequests = await AidRequest.countDocuments({
      student: studentId,
      aidCategory: category,
      createdAt: { $gte: periodStart },
      status: { $nin: ["rejected", "precheck_failed"] }
    });
    const usedAmountAgg = await AidRequest.aggregate([
      { $match: {
        student: studentId,
        aidCategory: category,
        createdAt: { $gte: periodStart },
        status: { $nin: ["rejected", "precheck_failed"] }
      }},
      { $group: { _id: null, total: { $sum: "$amountRangeMax" } } }
    ]);
    const usedAmount = usedAmountAgg[0]?.total || 0;
    const remainingRequests = Math.max(0, rule.maxRequestsPerPeriod - usedRequests);
    const remainingAmount = Math.max(0, rule.maxAmountPerPeriod - usedAmount);
    summaries.push({
      category,
      period: rule.period,
      rangeLabels: rule.ranges.map(r => r.label),
      maxRequestsPerPeriod: rule.maxRequestsPerPeriod,
      maxAmountPerPeriod: rule.maxAmountPerPeriod,
      usedRequests,
      usedAmount,
      remainingRequests,
      remainingAmount,
      periodStart,
      periodEnd: getPeriodEnd(rule.period),
      requiresOverride: Boolean(rule.requiresOverride)
    });
  }
  return summaries;
};

// Student: create aid request
export const createAidRequest = async (req, res) => {
  try {
    if (req.user.role !== "student") return res.status(403).json({ message: "Only students can create requests" });
    const { aidCategory, amountRange, explanation, shareWithDonors } = req.body;

    if (!aidCategory || !Object.prototype.hasOwnProperty.call(CATEGORY_RULES, aidCategory)) {
      return res.status(400).json({ message: "Valid aid category is required" });
    }
    if (!amountRange) {
      return res.status(400).json({ message: "Amount range is required" });
    }
    const rule = CATEGORY_RULES[aidCategory];
    const range = rule.ranges.find(r => r.label === amountRange);
    if (!range) {
      return res.status(400).json({ message: "Invalid amount range" });
    }
    const trimmedExplanation = String(explanation || "").trim();
    if (trimmedExplanation.length > EXPLANATION_MAX) {
      return res.status(400).json({ message: `Explanation must be ${EXPLANATION_MAX} chars or less` });
    }

    const student = await User.findById(req.user._id);
    if (!student) return res.status(404).json({ message: "Student not found" });

    const requestId = generateRequestId();
    const now = new Date();
    const periodStart = getPeriodStart(rule.period);
    const duplicateWindowStart = new Date(Date.now() - (DUPLICATE_WINDOW_DAYS * 24 * 60 * 60 * 1000));

    let precheckPassed = true;
    let precheckReason = "";
    let limitFailed = false;

    if (!student.studentMom) {
      precheckPassed = false;
      precheckReason = "Student mom status not verified";
    }

    if (precheckPassed && !student.isApproved) {
      precheckPassed = false;
      precheckReason = "Student account not approved";
    }

    if (precheckPassed) {
      const perTypeCount = await AidRequest.countDocuments({
        student: req.user._id,
        aidCategory,
        createdAt: { $gte: periodStart },
        status: { $nin: ["rejected", "precheck_failed"] }
      });
      if (perTypeCount >= rule.maxRequestsPerPeriod) {
        precheckPassed = false;
        precheckReason = `${aidCategory} request limit reached for this period`;
        limitFailed = true;
      }
    }

    if (precheckPassed) {
      const totalAmountAgg = await AidRequest.aggregate([
        { $match: {
          student: req.user._id,
          aidCategory,
          createdAt: { $gte: periodStart },
          status: { $nin: ["rejected", "precheck_failed"] }
        }},
        { $group: { _id: null, total: { $sum: "$amountRangeMax" } } }
      ]);
      const totalAmount = totalAmountAgg[0]?.total || 0;
      if ((totalAmount + range.max) > rule.maxAmountPerPeriod) {
        precheckPassed = false;
        precheckReason = `${aidCategory} amount limit reached for this period`;
        limitFailed = true;
      }
    }

    if (precheckPassed) {
      const dup = await AidRequest.findOne({
        student: req.user._id,
        aidCategory,
        createdAt: { $gte: duplicateWindowStart },
        status: { $nin: ["rejected", "precheck_failed"] }
      });
      if (dup) {
        precheckPassed = false;
        precheckReason = "Duplicate request detected within the last 14 days";
      }
    }

    const overrideRequired = Boolean(rule.requiresOverride && !precheckPassed && limitFailed);
    if (overrideRequired) {
      precheckPassed = true;
      precheckReason = `Emergency override required (${precheckReason})`;
    }

    const doc = await AidRequest.create({
      requestId,
      aidCategory,
      amountRange: range.label,
      amountRangeMin: range.min,
      amountRangeMax: range.max,
      explanation: trimmedExplanation || undefined,
      type: "financial",
      amount: range.max,
      items: [],
      reason: trimmedExplanation || `Aid request: ${aidCategory}`,
      status: precheckPassed ? "pending_admin" : "precheck_failed",
      precheckPassed,
      precheckReason: precheckPassed ? (overrideRequired ? precheckReason : undefined) : precheckReason,
      precheckAt: now,
      emergencyOverrideRequired: overrideRequired,
      student: req.user._id,
      university: req.user.university,
      shareWithDonors: Boolean(shareWithDonors)
    });

    if (!precheckPassed) {
      await notifyUsers({
        title: "Aid request not accepted",
        message: `Your request ${doc.requestId} was declined during pre-checks: ${precheckReason}.`,
        recipients: [req.user._id],
        recipientType: "single_student",
        university: req.user.university
      });
      return res.status(201).json(doc);
    }

    const adminIds = await getUniversityAdminIds(req.user.university);
    if (adminIds.length) {
      await notifyUsers({
        title: "New aid request pending verification",
        message: `Request ${doc.requestId} requires verification (${aidCategory}, ${range.label}).${overrideRequired ? " Emergency override needed." : ""}`,
        recipients: adminIds,
        recipientType: "single_admin",
        university: req.user.university
      });
    }

    await notifyUsers({
      title: "Aid request submitted",
      message: `Your request ${doc.requestId} is pending verification.`,
      recipients: [req.user._id],
      recipientType: "single_student",
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
    const { status, reason, override } = req.body; // verified | clarification_required | rejected | approved (legacy)
    const allowed = ["verified", "clarification_required", "rejected", "approved"];
    if (!allowed.includes(status)) return res.status(400).json({ message: "Invalid status" });
    
    const doc = await AidRequest.findById(id);
    if (!doc || doc.university !== req.user.university) return res.status(404).json({ message: "Request not found" });

    if (status === "approved") {
      if (!["pending", "pending_admin"].includes(doc.status)) {
        return res.status(400).json({ message: "Only pending requests can be approved" });
      }
      doc.status = "approved";
      doc.approvedBy = req.user._id;
      doc.approvedAt = new Date();
      await doc.save();
      await notifyUsers({
        title: "Aid request approved",
        message: `Request ${doc.requestId || doc._id} was approved by your university admin.`,
        recipients: [doc.student],
        recipientType: "single_student",
        university: doc.university
      });
      return res.json(doc);
    }

    if (status === "clarification_required") {
      if (!["pending_admin", "clarification_required"].includes(doc.status)) {
        return res.status(400).json({ message: "Only pending requests can be flagged for clarification" });
      }
      doc.status = "clarification_required";
      doc.clarificationNote = String(reason || "Please provide clarification").trim();
      await doc.save();
      await notifyUsers({
        title: "Aid request needs clarification",
        message: `Request ${doc.requestId || doc._id} needs clarification: ${doc.clarificationNote}`,
        recipients: [doc.student],
        recipientType: "single_student",
        university: doc.university
      });
      return res.json(doc);
    }

    if (status === "rejected") {
      if (!["pending_admin", "clarification_required", "pending"].includes(doc.status)) {
        return res.status(400).json({ message: "Only pending requests can be rejected" });
      }
      doc.status = "rejected";
      doc.rejectedBy = req.user._id;
      doc.rejectedAt = new Date();
      doc.rejectedReason = String(reason || "Rejected by admin").trim();
      await doc.save();
      await notifyUsers({
        title: "Aid request rejected",
        message: `Request ${doc.requestId || doc._id} was rejected: ${doc.rejectedReason}`,
        recipients: [doc.student],
        recipientType: "single_student",
        university: doc.university
      });
      return res.json(doc);
    }

    if (status === "verified") {
      if (!["pending_admin", "clarification_required"].includes(doc.status)) {
        return res.status(400).json({ message: "Only pending requests can be verified" });
      }
      if (doc.emergencyOverrideRequired && !override) {
        return res.status(400).json({ message: "Emergency override required" });
      }
      if (doc.emergencyOverrideRequired && override) {
        doc.emergencyOverrideApproved = true;
        doc.emergencyOverrideBy = req.user._id;
        doc.emergencyOverrideAt = new Date();
      }
      doc.status = "verified";
      doc.verifiedBy = req.user._id;
      doc.verifiedAt = new Date();
      await doc.save();

      const reserve = await reserveFundsForRequest(doc);
      if (reserve.ok) {
        const adminIds = await getUniversityAdminIds(doc.university);
        await notifyUsers({
          title: "Final approval needed",
          message: `Funds reserved for request ${doc.requestId || doc._id}. Awaiting second approval.`,
          recipients: adminIds,
          recipientType: "single_admin",
          university: doc.university
        });
        await notifyUsers({
          title: "Funds reserved",
          message: `Funds have been reserved for request ${doc.requestId || doc._id}. Final approval in progress.`,
          recipients: [doc.student],
          recipientType: "single_student",
          university: doc.university
        });
      } else {
        doc.status = "waiting_funds";
        await doc.save();
        const adminIds = await getUniversityAdminIds(doc.university);
        await notifyUsers({
          title: "Waiting for funds",
          message: `Request ${doc.requestId || doc._id} is waiting for funds.`,
          recipients: adminIds,
          recipientType: "single_admin",
          university: doc.university
        });
        await notifyUsers({
          title: "Waiting for funds",
          message: `Your request ${doc.requestId || doc._id} is waiting for available funds.`,
          recipients: [doc.student],
          recipientType: "single_student",
          university: doc.university
        });
      }
      return res.json(doc);
    }
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Admin: second approval after funds reserved
export const secondApproveAid = async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ message: "Only admins" });
    const { id } = req.params;
    const doc = await AidRequest.findById(id);
    if (!doc || doc.university !== req.user.university) return res.status(404).json({ message: "Request not found" });
    if (doc.status !== "second_approval_pending") return res.status(400).json({ message: "Request not ready for second approval" });
    if (doc.verifiedBy && String(doc.verifiedBy) === String(req.user._id)) {
      return res.status(400).json({ message: "Second approval must be done by a different admin" });
    }
    if (doc.emergencyOverrideRequired && !doc.emergencyOverrideApproved) {
      return res.status(400).json({ message: "Emergency override must be approved before final approval" });
    }

    doc.secondApprovedBy = req.user._id;
    doc.secondApprovedAt = new Date();
    doc.status = "approved";
    doc.approvedBy = req.user._id;
    doc.approvedAt = new Date();
    await doc.save();

    const disburse = await autoDisburseFinancial(doc, req.user._id);
    if (!disburse.ok) {
      doc.status = "waiting_funds";
      await doc.save();
      await notifyUsers({
        title: "Disbursement delayed",
        message: `Request ${doc.requestId || doc._id} is waiting for funds before disbursement.`,
        recipients: [doc.student],
        recipientType: "single_student",
        university: doc.university
      });
      return res.json(doc);
    }

    await notifyUsers({
      title: "Aid disbursed",
      message: `Your request ${doc.requestId || doc._id} has been disbursed.`,
      recipients: [doc.student],
      recipientType: "single_student",
      university: doc.university
    });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Admin: recheck funds for waiting requests
export const recheckFunds = async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ message: "Only admins" });
    const { id } = req.params;
    const doc = await AidRequest.findById(id);
    if (!doc || doc.university !== req.user.university) return res.status(404).json({ message: "Request not found" });
    if (doc.status !== "waiting_funds") return res.status(400).json({ message: "Request not waiting for funds" });

    const reserve = await reserveFundsForRequest(doc);
    if (!reserve.ok) return res.status(400).json({ message: "Still insufficient funds" });

    const adminIds = await getUniversityAdminIds(doc.university);
    await notifyUsers({
      title: "Final approval needed",
      message: `Funds reserved for request ${doc.requestId || doc._id}. Awaiting second approval.`,
      recipients: adminIds,
      recipientType: "single_admin",
      university: doc.university
    });
    await notifyUsers({
      title: "Funds reserved",
      message: `Funds have been reserved for request ${doc.requestId || doc._id}. Final approval in progress.`,
      recipients: [doc.student],
      recipientType: "single_student",
      university: doc.university
    });

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
        AidRequest.countDocuments({ student: req.user._id, type: "financial", status: { $in: ["pending_admin", "clarification_required", "verified", "second_approval_pending", "waiting_funds", "pending_verification"] } }),
        AidRequest.countDocuments({ student: req.user._id, type: "essentials", status: { $in: ["pending_admin", "clarification_required", "verified", "second_approval_pending", "waiting_funds", "pending_verification"] } })
      ]);
      return res.json({ financialPending, essentialsPending });
    }
    if (role === "admin") {
      const [pending, approved, waiting, disbursed] = await Promise.all([
        AidRequest.countDocuments({ university: req.user.university, status: { $in: ["pending_admin", "clarification_required", "pending_verification"] } }),
        AidRequest.countDocuments({ university: req.user.university, status: { $in: ["verified", "second_approval_pending", "approved"] } }),
        AidRequest.countDocuments({ university: req.user.university, status: "waiting_funds" }),
        AidRequest.countDocuments({ university: req.user.university, status: "disbursed" })
      ]);
      return res.json({ pending, approved, waiting, disbursed });
    }
    if (role === "donor") {
      const [financialOpen, essentialsOpen] = await Promise.all([
        AidRequest.countDocuments({ type: "financial", status: { $in: ["pending_admin", "clarification_required", "verified", "second_approval_pending", "waiting_funds"] } }),
        AidRequest.countDocuments({ type: "essentials", status: { $in: ["pending_admin", "clarification_required", "verified", "second_approval_pending", "waiting_funds"] } })
      ]);
      return res.json({ financialOpen, essentialsOpen });
    }
    res.json({});
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Student: view limits and remaining usage
export const getAidLimitsForStudent = async (req, res) => {
  try {
    if (req.user.role !== "student") return res.status(403).json({ message: "Only students" });
    const summary = await buildLimitSummary(req.user._id);
    res.json(summary);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Admin: reports with month-over-month comparisons
export const getAdminReports = async (req, res) => {
  try {
    if (!["admin", "superadmin"].includes(req.user.role)) {
      return res.status(403).json({ message: "Only admins or superadmins" });
    }
    const university = req.user.role === "admin" ? req.user.university : (req.query.university || null);

    const period = String(req.query.period || "month").toLowerCase();
    const now = new Date();

    const getPeriodStart = (p, base) => {
      const d = new Date(base);
      if (p === "day") return new Date(d.getFullYear(), d.getMonth(), d.getDate());
      if (p === "week") {
        const day = d.getDay();
        const diff = (day + 6) % 7;
        d.setDate(d.getDate() - diff);
        return new Date(d.getFullYear(), d.getMonth(), d.getDate());
      }
      if (p === "semester") {
        const startMonth = d.getMonth() < 6 ? 0 : 6;
        return new Date(d.getFullYear(), startMonth, 1);
      }
      if (p === "year") return new Date(d.getFullYear(), 0, 1);
      return new Date(d.getFullYear(), d.getMonth(), 1);
    };

    const currentStart = getPeriodStart(period, now);
    const previousEnd = new Date(currentStart);
    let previousStart = new Date(currentStart);

    if (period === "day") {
      previousStart.setDate(previousStart.getDate() - 1);
    } else if (period === "week") {
      previousStart.setDate(previousStart.getDate() - 7);
    } else if (period === "semester") {
      const prevMonth = currentStart.getMonth() < 6 ? 6 : 0;
      const prevYear = currentStart.getMonth() < 6 ? currentStart.getFullYear() - 1 : currentStart.getFullYear();
      previousStart = new Date(prevYear, prevMonth, 1);
    } else if (period === "year") {
      previousStart = new Date(currentStart.getFullYear() - 1, 0, 1);
    } else {
      previousStart = new Date(currentStart.getFullYear(), currentStart.getMonth() - 1, 1);
    }

    const getWindow = (windowType) => {
      if (windowType === "week") {
        const start = new Date(now);
        start.setDate(start.getDate() - 7);
        return { start, end: now };
      }
      if (windowType === "month") {
        const start = new Date(now);
        start.setDate(start.getDate() - 30);
        return { start, end: now };
      }
      if (windowType === "semester") {
        const start = new Date(now);
        start.setDate(start.getDate() - 182);
        return { start, end: now };
      }
      return { start: currentStart, end: now };
    };

    // If superadmin did not specify a university, return zeroed metrics but 200 OK so frontend can render
    if (!university) {
      return res.json({
        verifiedMoms: { currentTotal: 0, currentPeriod: 0, previousPeriod: 0 },
        financialAid: { currentPeriod: 0, previousPeriod: 0 },
        essentialsDistributed: { currentPeriodItems: 0, previousPeriodItems: 0 },
        retention: 0,
        aidDisbursementSummary: { totalFundsReceived: 0, totalFundsDisbursed: 0, remainingBalance: 0, essentialsItemsDisbursed: 0, breakdown: { week: { financial: {}, essentials: {} }, month: { financial: {}, essentials: {} }, semester: { financial: {}, essentials: {} } } },
        beneficiaryActivity: { supportedStudents: 0, requestsPerStudent: 0, avgAidPerStudent: 0, repeatBeneficiaries: 0, newBeneficiaries: 0 },
        pendingRejected: { pendingReview: 0, waitingFunds: 0, rejectedCount: 0, rejectionReasons: [] },
        rateLimitOverride: { rateLimitBlocks: 0, overrideUsageCount: 0, overrideAdmins: [], overrideCategories: [] },
        disbursementMethod: { byPaymentMethod: [], successfulDisbursements: 0, failedDisbursements: 0, averageProcessingTimeHours: 0 },
        impactSnapshot: { retention: 0, semesterOutcomes: { current: { disbursedRequests: 0, financialDisbursed: 0, essentialsItems: 0 }, previous: { disbursedRequests: 0, financialDisbursed: 0, essentialsItems: 0 } }, feedbackStats: { count: 0, averageScore: 0 } },
        auditCompliance: { recentEvents: [] },
        period,
        window: { currentStart, currentEnd: now, previousStart, previousEnd }
      });
    }

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
      profileApprovedAt: { $gte: currentStart, $lt: now }
    });

    const verifiedPrevMonth = await User.countDocuments({
      role: "student",
      university,
      profileApproved: true,
      profileApprovedAt: { $gte: previousStart, $lt: previousEnd }
    });

    // Disbursed to this university (financial and essentials)
    const financialAgg = await Donation.aggregate([
      { $unwind: "$disbursedTo" },
      { $match: { "disbursedTo.disbursedAt": { $gte: currentStart, $lt: now } } },
      { $lookup: { from: "aidrequests", localField: "disbursedTo.aidRequestId", foreignField: "_id", as: "ar" } },
      { $unwind: "$ar" },
      { $match: { "ar.university": university } },
      { $group: { _id: null, total: { $sum: { $ifNull: ["$disbursedTo.amount", 0] } } } }
    ]);

    const financialAggPrev = await Donation.aggregate([
      { $unwind: "$disbursedTo" },
      { $match: { "disbursedTo.disbursedAt": { $gte: previousStart, $lt: previousEnd } } },
      { $lookup: { from: "aidrequests", localField: "disbursedTo.aidRequestId", foreignField: "_id", as: "ar" } },
      { $unwind: "$ar" },
      { $match: { "ar.university": university } },
      { $group: { _id: null, total: { $sum: { $ifNull: ["$disbursedTo.amount", 0] } } } }
    ]);

    const essentialsAgg = await Donation.aggregate([
      { $unwind: "$disbursedTo" },
      { $match: { "disbursedTo.disbursedAt": { $gte: currentStart, $lt: now } } },
      { $lookup: { from: "aidrequests", localField: "disbursedTo.aidRequestId", foreignField: "_id", as: "ar" } },
      { $unwind: "$ar" },
      { $match: { "ar.university": university } },
      { $unwind: { path: "$disbursedTo.items", preserveNullAndEmptyArrays: true } },
      { $group: { _id: null, total: { $sum: { $ifNull: ["$disbursedTo.items.quantity", 0] } } } }
    ]);

    const essentialsAggPrev = await Donation.aggregate([
      { $unwind: "$disbursedTo" },
      { $match: { "disbursedTo.disbursedAt": { $gte: previousStart, $lt: previousEnd } } },
      { $lookup: { from: "aidrequests", localField: "disbursedTo.aidRequestId", foreignField: "_id", as: "ar" } },
      { $unwind: "$ar" },
      { $match: { "ar.university": university } },
      { $unwind: { path: "$disbursedTo.items", preserveNullAndEmptyArrays: true } },
      { $group: { _id: null, total: { $sum: { $ifNull: ["$disbursedTo.items.quantity", 0] } } } }
    ]);

    // Retention: active verified moms in last 30 days / total verified
    const activeVerified = await AidRequest.distinct("student", { university, createdAt: { $gte: currentStart, $lt: now } });
    const retention = totalVerified > 0 ? Math.round((activeVerified.length / totalVerified) * 100) : 0;

    const financialRequestedAgg = await AidRequest.aggregate([
      { $match: { university, type: "financial", status: { $ne: "rejected" } } },
      { $group: { _id: null, total: { $sum: { $ifNull: ["$amount", 0] } } } }
    ]);

    const financialDisbursedAllAgg = await Donation.aggregate([
      { $unwind: "$disbursedTo" },
      { $lookup: { from: "aidrequests", localField: "disbursedTo.aidRequestId", foreignField: "_id", as: "ar" } },
      { $unwind: "$ar" },
      { $match: { "ar.university": university } },
      { $group: { _id: null, total: { $sum: { $ifNull: ["$disbursedTo.amount", 0] } } } }
    ]);

    const essentialsDisbursedAllAgg = await Donation.aggregate([
      { $unwind: "$disbursedTo" },
      { $lookup: { from: "aidrequests", localField: "disbursedTo.aidRequestId", foreignField: "_id", as: "ar" } },
      { $unwind: "$ar" },
      { $match: { "ar.university": university } },
      { $unwind: { path: "$disbursedTo.items", preserveNullAndEmptyArrays: true } },
      { $group: { _id: null, total: { $sum: { $ifNull: ["$disbursedTo.items.quantity", 0] } } } }
    ]);

    const totalFundsReceived = financialDisbursedAllAgg[0]?.total || 0;
    const totalFundsDisbursed = totalFundsReceived;
    const totalFinancialRequested = financialRequestedAgg[0]?.total || 0;
    const remainingBalance = Math.max(0, totalFinancialRequested - totalFundsDisbursed);

    const buildCategoryBreakdown = async (start, end) => {
      const rows = await Donation.aggregate([
        { $unwind: "$disbursedTo" },
        { $match: { "disbursedTo.disbursedAt": { $gte: start, $lt: end } } },
        { $lookup: { from: "aidrequests", localField: "disbursedTo.aidRequestId", foreignField: "_id", as: "ar" } },
        { $unwind: "$ar" },
        { $match: { "ar.university": university } },
        { $project: { aidCategory: "$ar.aidCategory", type: "$ar.type", amount: "$disbursedTo.amount", items: "$disbursedTo.items" } },
        { $unwind: { path: "$items", preserveNullAndEmptyArrays: true } },
        { $group: {
          _id: { category: "$aidCategory", type: "$type" },
          amount: { $sum: { $ifNull: ["$amount", 0] } },
          items: { $sum: { $ifNull: ["$items.quantity", 0] } }
        } }
      ]);

      const financial = {};
      const essentials = {};
      rows.forEach((row) => {
        const category = row._id?.category || "unknown";
        if (row._id?.type === "financial") financial[category] = row.amount || 0;
        if (row._id?.type === "essentials") essentials[category] = row.items || 0;
      });
      return { financial, essentials };
    };

    const weekWindow = getWindow("week");
    const monthWindow = getWindow("month");
    const semesterWindow = getWindow("semester");

    const [weekBreakdown, monthBreakdown, semesterBreakdown] = await Promise.all([
      buildCategoryBreakdown(weekWindow.start, weekWindow.end),
      buildCategoryBreakdown(monthWindow.start, monthWindow.end),
      buildCategoryBreakdown(semesterWindow.start, semesterWindow.end)
    ]);

    const supportedStudents = await AidRequest.distinct("student", {
      university,
      status: "disbursed",
      disbursedAt: { $gte: currentStart, $lt: now }
    });
    const totalRequestsPeriod = await AidRequest.countDocuments({ university, createdAt: { $gte: currentStart, $lt: now } });
    const studentsWithRequests = await AidRequest.distinct("student", { university, createdAt: { $gte: currentStart, $lt: now } });

    const disbursedPeriodAgg = await Donation.aggregate([
      { $unwind: "$disbursedTo" },
      { $match: { "disbursedTo.disbursedAt": { $gte: currentStart, $lt: now } } },
      { $lookup: { from: "aidrequests", localField: "disbursedTo.aidRequestId", foreignField: "_id", as: "ar" } },
      { $unwind: "$ar" },
      { $match: { "ar.university": university } },
      { $group: { _id: null, total: { $sum: { $ifNull: ["$disbursedTo.amount", 0] } } } }
    ]);
    const totalFinancialDisbursedPeriod = disbursedPeriodAgg[0]?.total || 0;
    const requestsPerStudent = studentsWithRequests.length > 0 ? Number((totalRequestsPeriod / studentsWithRequests.length).toFixed(2)) : 0;
    const avgAidPerStudent = supportedStudents.length > 0 ? Number((totalFinancialDisbursedPeriod / supportedStudents.length).toFixed(2)) : 0;

    const beneficiaryAgg = await AidRequest.aggregate([
      { $match: { university, status: "disbursed" } },
      { $group: { _id: "$student", first: { $min: "$disbursedAt" }, last: { $max: "$disbursedAt" } } },
      { $match: { last: { $gte: currentStart, $lt: now } } }
    ]);
    const newBeneficiaries = beneficiaryAgg.filter(b => b.first >= currentStart).length;
    const repeatBeneficiaries = beneficiaryAgg.filter(b => b.first < currentStart).length;

    const pendingReviewCount = await AidRequest.countDocuments({
      university,
      status: { $in: ["pending_admin", "pending_verification", "clarification_required"] }
    });
    const waitingFundsCount = await AidRequest.countDocuments({ university, status: "waiting_funds" });
    const rejectedCount = await AidRequest.countDocuments({ university, status: "rejected", rejectedAt: { $gte: currentStart, $lt: now } });
    const rejectedReasonsAgg = await AidRequest.aggregate([
      { $match: { university, status: "rejected", rejectedAt: { $gte: currentStart, $lt: now } } },
      { $group: { _id: { $ifNull: ["$rejectedReason", "Unspecified"] }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    const rateLimitBlocks = await AidRequest.countDocuments({
      university,
      status: "precheck_failed",
      createdAt: { $gte: currentStart, $lt: now }
    });
    const overrideUsageCount = await AidRequest.countDocuments({
      university,
      emergencyOverrideApproved: true,
      emergencyOverrideAt: { $gte: currentStart, $lt: now }
    });
    const overrideAdminsAgg = await AidRequest.aggregate([
      { $match: { university, emergencyOverrideApproved: true, emergencyOverrideAt: { $gte: currentStart, $lt: now } } },
      { $group: { _id: "$emergencyOverrideBy", count: { $sum: 1 } } },
      { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "admin" } },
      { $unwind: { path: "$admin", preserveNullAndEmptyArrays: true } },
      { $project: { _id: 0, adminId: "$_id", name: "$admin.name", count: 1 } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    const overrideCategoriesAgg = await AidRequest.aggregate([
      { $match: { university, emergencyOverrideApproved: true, emergencyOverrideAt: { $gte: currentStart, $lt: now } } },
      { $group: { _id: { $ifNull: ["$aidCategory", "unknown"] }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    const disbursementByMethodAgg = await Donation.aggregate([
      { $unwind: "$disbursedTo" },
      { $match: { "disbursedTo.disbursedAt": { $gte: currentStart, $lt: now } } },
      { $lookup: { from: "aidrequests", localField: "disbursedTo.aidRequestId", foreignField: "_id", as: "ar" } },
      { $unwind: "$ar" },
      { $match: { "ar.university": university } },
      { $group: {
        _id: "$paymentMethod",
        totalAmount: { $sum: { $ifNull: ["$disbursedTo.amount", 0] } },
        disbursementCount: { $sum: 1 }
      } },
      { $sort: { totalAmount: -1 } }
    ]);

    const successfulDisbursements = await AidRequest.countDocuments({
      university,
      status: "disbursed",
      disbursedAt: { $gte: currentStart, $lt: now }
    });
    const failedDisbursements = await AidRequest.countDocuments({
      university,
      status: "rejected",
      rejectedAt: { $gte: currentStart, $lt: now }
    });
    const avgProcessingAgg = await AidRequest.aggregate([
      { $match: { university, status: "disbursed", disbursedAt: { $gte: currentStart, $lt: now } } },
      { $project: { durationMs: { $subtract: ["$disbursedAt", "$createdAt"] } } },
      { $group: { _id: null, avgMs: { $avg: "$durationMs" } } }
    ]);
    const avgProcessingMs = avgProcessingAgg[0]?.avgMs || 0;

    const currentSemesterStart = getPeriodStart("semester", now);
    const previousSemesterEnd = new Date(currentSemesterStart);
    const previousSemesterStart = new Date(currentSemesterStart.getMonth() < 6 ? currentSemesterStart.getFullYear() - 1 : currentSemesterStart.getFullYear(), currentSemesterStart.getMonth() < 6 ? 6 : 0, 1);
    const buildSemesterSummary = async (start, end) => {
      const [disbursedCount, financialAggSemester, essentialsAggSemester] = await Promise.all([
        AidRequest.countDocuments({ university, status: "disbursed", disbursedAt: { $gte: start, $lt: end } }),
        Donation.aggregate([
          { $unwind: "$disbursedTo" },
          { $match: { "disbursedTo.disbursedAt": { $gte: start, $lt: end } } },
          { $lookup: { from: "aidrequests", localField: "disbursedTo.aidRequestId", foreignField: "_id", as: "ar" } },
          { $unwind: "$ar" },
          { $match: { "ar.university": university } },
          { $group: { _id: null, total: { $sum: { $ifNull: ["$disbursedTo.amount", 0] } } } }
        ]),
        Donation.aggregate([
          { $unwind: "$disbursedTo" },
          { $match: { "disbursedTo.disbursedAt": { $gte: start, $lt: end } } },
          { $lookup: { from: "aidrequests", localField: "disbursedTo.aidRequestId", foreignField: "_id", as: "ar" } },
          { $unwind: "$ar" },
          { $match: { "ar.university": university } },
          { $unwind: { path: "$disbursedTo.items", preserveNullAndEmptyArrays: true } },
          { $group: { _id: null, total: { $sum: { $ifNull: ["$disbursedTo.items.quantity", 0] } } } }
        ])
      ]);
      return {
        disbursedRequests: disbursedCount,
        financialDisbursed: financialAggSemester[0]?.total || 0,
        essentialsItems: essentialsAggSemester[0]?.total || 0
      };
    };

    const [currentSemesterSummary, previousSemesterSummary] = await Promise.all([
      buildSemesterSummary(currentSemesterStart, now),
      buildSemesterSummary(previousSemesterStart, previousSemesterEnd)
    ]);

    const feedbackAgg = await EthicalFeedback.aggregate([
      { $match: { createdAt: { $gte: currentStart, $lt: now } } },
      { $group: { _id: null, avgScore: { $avg: { $toDouble: "$averageScore" } }, count: { $sum: 1 } } }
    ]);
    const feedbackStats = {
      count: feedbackAgg[0]?.count || 0,
      averageScore: Number(feedbackAgg[0]?.avgScore || 0)
    };

    const auditRequests = await AidRequest.find({ university })
      .select("requestId aidCategory type amount items verifiedBy verifiedAt approvedBy approvedAt secondApprovedBy secondApprovedAt rejectedBy rejectedAt disbursedBy disbursedAt emergencyOverrideBy emergencyOverrideAt disbursementMatches")
      .sort({ updatedAt: -1 })
      .limit(200)
      .lean();

    const donationIds = new Set();
    auditRequests.forEach((r) => {
      (r.disbursementMatches || []).forEach((m) => {
        if (m.donationId) donationIds.add(String(m.donationId));
      });
    });
    const donationDocs = await Donation.find({ _id: { $in: Array.from(donationIds) } }).select("_id transactionId").lean();
    const donationMap = new Map(donationDocs.map(d => [String(d._id), d.transactionId]));

    const auditLog = [];
    auditRequests.forEach((r) => {
      if (r.verifiedAt) auditLog.push({
        type: "verified",
        requestId: r.requestId,
        aidCategory: r.aidCategory,
        adminId: r.verifiedBy,
        timestamp: r.verifiedAt
      });
      if (r.approvedAt) auditLog.push({
        type: "approved",
        requestId: r.requestId,
        aidCategory: r.aidCategory,
        adminId: r.approvedBy,
        timestamp: r.approvedAt
      });
      if (r.secondApprovedAt) auditLog.push({
        type: "second_approved",
        requestId: r.requestId,
        aidCategory: r.aidCategory,
        adminId: r.secondApprovedBy,
        timestamp: r.secondApprovedAt
      });
      if (r.rejectedAt) auditLog.push({
        type: "rejected",
        requestId: r.requestId,
        aidCategory: r.aidCategory,
        adminId: r.rejectedBy,
        timestamp: r.rejectedAt
      });
      if (r.disbursedAt) {
        const transactionId = (r.disbursementMatches || []).map(m => donationMap.get(String(m.donationId))).find(Boolean);
        auditLog.push({
          type: "disbursed",
          requestId: r.requestId,
          aidCategory: r.aidCategory,
          adminId: r.disbursedBy,
          timestamp: r.disbursedAt,
          transactionId
        });
      }
      if (r.emergencyOverrideAt) auditLog.push({
        type: "override_approved",
        requestId: r.requestId,
        aidCategory: r.aidCategory,
        adminId: r.emergencyOverrideBy,
        timestamp: r.emergencyOverrideAt
      });
    });
    auditLog.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({
      verifiedMoms: {
        currentTotal: totalVerified,
        currentPeriod: verifiedThisMonth,
        previousPeriod: verifiedPrevMonth
      },
      financialAid: {
        currentPeriod: financialAgg[0]?.total || 0,
        previousPeriod: financialAggPrev[0]?.total || 0
      },
      essentialsDistributed: {
        currentPeriodItems: essentialsAgg[0]?.total || 0,
        previousPeriodItems: essentialsAggPrev[0]?.total || 0
      },
      retention,
      aidDisbursementSummary: {
        totalFundsReceived,
        totalFundsDisbursed,
        remainingBalance,
        essentialsItemsDisbursed: essentialsDisbursedAllAgg[0]?.total || 0,
        breakdown: {
          week: weekBreakdown,
          month: monthBreakdown,
          semester: semesterBreakdown
        }
      },
      beneficiaryActivity: {
        supportedStudents: supportedStudents.length,
        requestsPerStudent,
        avgAidPerStudent,
        repeatBeneficiaries,
        newBeneficiaries
      },
      pendingRejected: {
        pendingReview: pendingReviewCount,
        waitingFunds: waitingFundsCount,
        rejectedCount,
        rejectionReasons: rejectedReasonsAgg.map(r => ({ reason: r._id, count: r.count }))
      },
      rateLimitOverride: {
        rateLimitBlocks,
        overrideUsageCount,
        overrideAdmins: overrideAdminsAgg,
        overrideCategories: overrideCategoriesAgg.map(r => ({ category: r._id, count: r.count }))
      },
      disbursementMethod: {
        byPaymentMethod: disbursementByMethodAgg.map(r => ({ method: r._id || "unknown", totalAmount: r.totalAmount, count: r.disbursementCount })),
        successfulDisbursements,
        failedDisbursements,
        averageProcessingTimeHours: Number((avgProcessingMs / (1000 * 60 * 60)).toFixed(2))
      },
      impactSnapshot: {
        retention,
        semesterOutcomes: {
          current: currentSemesterSummary,
          previous: previousSemesterSummary
        },
        feedbackStats
      },
      auditCompliance: {
        recentEvents: auditLog.slice(0, 100)
      },
      period,
      window: { currentStart, currentEnd: now, previousStart, previousEnd }
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};


