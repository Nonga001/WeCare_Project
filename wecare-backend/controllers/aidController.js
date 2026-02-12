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

const ADMIN_CATEGORY_ACCESS = {
  welfare: null,
  health: ["emergency"],
  gender: ["childcare"],
};

const canAccessCategory = (department, aidCategory) => {
  if (!department) return false;
  if (department === "welfare") return true;
  const allowed = ADMIN_CATEGORY_ACCESS[department] || [];
  return allowed.includes(aidCategory);
};

const assertCategoryAccess = (req, aidCategory) => {
  if (req.user?.role !== "admin") return true;
  if (req.user?.role === "admin" && req.user?.department === "welfare") return true;
  if (!canAccessCategory(req.user?.department, aidCategory)) {
    return false;
  }
  return true;
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
  // Credit student wallet for financial disbursement
  try {
    const { creditWallet } = await import("./walletController.js");
    await creditWallet(
      reqDoc.student,
      target,
      reqDoc._id,
      matches[0]?.donationId,
      `Disbursement for ${reqDoc.aidCategory} aid request`
    );
  } catch (err) {
    console.error("Failed to credit wallet on auto disbursement:", err?.message || err);
  }
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
    const { aidCategory, amount, explanation, shareWithDonors } = req.body;

    if (!aidCategory || !Object.prototype.hasOwnProperty.call(CATEGORY_RULES, aidCategory)) {
      return res.status(400).json({ message: "Valid aid category is required" });
    }
    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      return res.status(400).json({ message: "Amount must be greater than 0" });
    }
    const rule = CATEGORY_RULES[aidCategory];
    if (parsedAmount > rule.maxAmountPerPeriod) {
      return res.status(400).json({ message: `Amount cannot exceed ${rule.maxAmountPerPeriod} KES for ${aidCategory}` });
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

    if (!student.profileSubmitted || !student.profileApproved) {
      precheckPassed = false;
      precheckReason = "Student profile not verified by admin";
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
      if ((totalAmount + parsedAmount) > rule.maxAmountPerPeriod) {
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
      amountRange: `${parsedAmount}`,
      amountRangeMin: parsedAmount,
      amountRangeMax: parsedAmount,
      explanation: trimmedExplanation || undefined,
      type: "financial",
      amount: parsedAmount,
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
        message: `Request ${doc.requestId} requires verification (${aidCategory}, ${parsedAmount} KES).${overrideRequired ? " Emergency override needed." : ""}`,
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
    const query = { university: req.user.university };
    if (req.user.department && req.user.department !== "welfare") {
      const allowed = ADMIN_CATEGORY_ACCESS[req.user.department] || [];
      query.aidCategory = { $in: allowed };
    }
    const list = await AidRequest.find(query).populate("student", "name email").sort({ createdAt: -1 });
    if (req.user.department && req.user.department !== "welfare") {
      const sanitized = list.map((doc) => {
        const clone = doc.toObject();
        delete clone.amount;
        delete clone.amountRange;
        delete clone.amountRangeMin;
        delete clone.amountRangeMax;
        delete clone.reservedAmount;
        delete clone.reservedAt;
        delete clone.disbursementMatches;
        delete clone.disbursedAt;
        delete clone.disbursedBy;
        return clone;
      });
      return res.json(sanitized);
    }
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
    if (!assertCategoryAccess(req, doc.aidCategory)) {
      return res.status(403).json({ message: "Not allowed for this aid category" });
    }

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
    if (!assertCategoryAccess(req, doc.aidCategory)) {
      return res.status(403).json({ message: "Not allowed for this aid category" });
    }
    if (req.user.department !== "welfare") {
      return res.status(403).json({ message: "Only welfare admins can finalize approvals and disburse" });
    }
    if (doc.status !== "second_approval_pending") return res.status(400).json({ message: "Request not ready for second approval" });
    // Allow welfare admin to perform second approval even if they verified the request.
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
    if (!assertCategoryAccess(req, doc.aidCategory)) {
      return res.status(403).json({ message: "Not allowed for this aid category" });
    }
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
    if (req.user.department !== "welfare") {
      return res.status(403).json({ message: "Only welfare admins can disburse aid" });
    }
    const { id } = req.params;
    const reqDoc = await AidRequest.findById(id);
    if (!reqDoc || reqDoc.university !== req.user.university) return res.status(404).json({ message: "Request not found" });
    if (!assertCategoryAccess(req, reqDoc.aidCategory)) {
      return res.status(403).json({ message: "Not allowed for this aid category" });
    }
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

    // Credit student wallet if financial aid
    if (reqDoc.type === "financial") {
      const { creditWallet } = await import("./walletController.js");
      await creditWallet(
        reqDoc.student,
        reqDoc.amount,
        reqDoc._id,
        matchedDonation._id,
        `Disbursement for ${reqDoc.aidCategory} aid request`
      );
    }

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
    if (req.user.department !== "welfare") {
      return res.status(403).json({ message: "Only welfare admins can move requests to waiting" });
    }
    const { id } = req.params;
    const doc = await AidRequest.findById(id);
    if (!doc || doc.university !== req.user.university) return res.status(404).json({ message: "Request not found" });
    if (!assertCategoryAccess(req, doc.aidCategory)) {
      return res.status(403).json({ message: "Not allowed for this aid category" });
    }
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
      const base = { university: req.user.university };
      if (req.user.department && req.user.department !== "welfare") {
        const allowed = ADMIN_CATEGORY_ACCESS[req.user.department] || [];
        base.aidCategory = { $in: allowed };
      }
      const [pending, approved, waiting, disbursed] = await Promise.all([
        AidRequest.countDocuments({ ...base, status: { $in: ["pending_admin", "clarification_required", "pending_verification"] } }),
        AidRequest.countDocuments({ ...base, status: { $in: ["verified", "second_approval_pending", "approved"] } }),
        AidRequest.countDocuments({ ...base, status: "waiting_funds" }),
        AidRequest.countDocuments({ ...base, status: "disbursed" })
      ]);
      return res.json({ pending, approved, waiting, disbursed });
    }
    if (role === "donor") {
      const [financialOpen, essentialsOpen] = await Promise.all([
        AidRequest.countDocuments({ type: "financial", status: { $in: ["pending_admin", "clarification_required", "verified", "second_approval_pending", "approved", "waiting_funds"] } }),
        AidRequest.countDocuments({ type: "essentials", status: { $in: ["pending_admin", "clarification_required", "verified", "second_approval_pending", "approved", "waiting_funds"] } })
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

    // Funds received by university = donations disbursed to university's aid requests
    const fundsReceivedAgg = await Donation.aggregate([
      { $unwind: "$disbursedTo" },
      { $lookup: { from: "aidrequests", localField: "disbursedTo.aidRequestId", foreignField: "_id", as: "ar" } },
      { $unwind: "$ar" },
      { $match: { 
        "ar.university": university,
        "ar.type": "financial"
      } },
      { $group: { _id: null, total: { $sum: { $ifNull: ["$disbursedTo.amount", 0] } } } }
    ]);

    // Funds disbursed = wallet credits linked to aid requests at this university
    const { default: Wallet } = await import("../models/Wallet.js");
    const universityStudents = await User.find({ university, role: "student" }).select("_id");
    const studentIds = universityStudents.map(s => s._id);
    
    const walletDisbursedAgg = await Wallet.aggregate([
      { $match: { student: { $in: studentIds } } },
      { $unwind: "$transactions" },
      { $match: { 
        "transactions.type": "credit",
        "transactions.aidRequestId": { $exists: true, $ne: null }
      } },
      { $lookup: { from: "aidrequests", localField: "transactions.aidRequestId", foreignField: "_id", as: "ar" } },
      { $unwind: "$ar" },
      { $match: { "ar.type": "financial" } },
      { $group: { _id: null, total: { $sum: "$transactions.amount" } } }
    ]);

    const essentialsDisbursedAllAgg = await Donation.aggregate([
      { $unwind: "$disbursedTo" },
      { $lookup: { from: "aidrequests", localField: "disbursedTo.aidRequestId", foreignField: "_id", as: "ar" } },
      { $unwind: "$ar" },
      { $match: { "ar.university": university } },
      { $unwind: { path: "$disbursedTo.items", preserveNullAndEmptyArrays: true } },
      { $group: { _id: null, total: { $sum: { $ifNull: ["$disbursedTo.items.quantity", 0] } } } }
    ]);

    const totalFundsReceived = fundsReceivedAgg[0]?.total || 0;
    const totalFundsDisbursed = walletDisbursedAgg[0]?.total || 0;
    const totalFinancialRequested = financialRequestedAgg[0]?.total || 0;
    const remainingBalance = Math.max(0, totalFundsReceived - totalFundsDisbursed);

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

    const studentApprovals = await User.find({
      role: "student",
      university,
      $or: [
        { approvedAt: { $ne: null } },
        { profileApprovedAt: { $ne: null } }
      ]
    })
      .select("name email approvedBy approvedAt profileApprovedBy profileApprovedAt")
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
    studentApprovals.forEach((s) => {
      if (s.approvedAt) auditLog.push({
        type: "student_approved",
        requestId: s.email || s.name || "student",
        aidCategory: "student",
        adminId: s.approvedBy,
        timestamp: s.approvedAt
      });
      if (s.profileApprovedAt) auditLog.push({
        type: "profile_approved",
        requestId: s.email || s.name || "student",
        aidCategory: "student",
        adminId: s.profileApprovedBy || s.approvedBy,
        timestamp: s.profileApprovedAt
      });
    });
    auditLog.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const adminIds = Array.from(
      new Set(auditLog.map((e) => e.adminId).filter(Boolean).map((id) => String(id)))
    );
    const adminDocs = await User.find({ _id: { $in: adminIds } })
      .select("name email")
      .lean();
    const adminMap = new Map(adminDocs.map((a) => [String(a._id), a]));
    auditLog.forEach((e) => {
      if (!e.adminId) return;
      const admin = adminMap.get(String(e.adminId));
      e.adminName = admin?.name || admin?.email || "Admin";
    });

    const payload = {
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
    };

    if (req.user.role === "admin" && req.user.department !== "welfare") {
      payload.financialAid = { currentPeriod: 0, previousPeriod: 0 };
      payload.aidDisbursementSummary.totalFundsReceived = 0;
      payload.aidDisbursementSummary.totalFundsDisbursed = 0;
      payload.aidDisbursementSummary.remainingBalance = 0;
      const scrubBreakdown = (obj) => {
        const next = { financial: {}, essentials: obj?.essentials || {} };
        Object.keys(obj?.financial || {}).forEach((k) => { next.financial[k] = 0; });
        return next;
      };
      payload.aidDisbursementSummary.breakdown = {
        week: scrubBreakdown(payload.aidDisbursementSummary.breakdown.week),
        month: scrubBreakdown(payload.aidDisbursementSummary.breakdown.month),
        semester: scrubBreakdown(payload.aidDisbursementSummary.breakdown.semester)
      };
      payload.beneficiaryActivity.avgAidPerStudent = 0;
      payload.disbursementMethod.byPaymentMethod = payload.disbursementMethod.byPaymentMethod.map((m) => ({
        ...m,
        totalAmount: 0
      }));
      payload.auditCompliance.recentEvents = payload.auditCompliance.recentEvents.map((e) => ({
        ...e,
        transactionId: null
      }));
    }

    res.json(payload);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Student: respond to clarification request
export const respondToClarification = async (req, res) => {
  try {
    if (req.user.role !== "student") {
      return res.status(403).json({ message: "Only students can respond to clarifications" });
    }
    const { id } = req.params;
    const { response } = req.body;

    if (!response || String(response).trim().length === 0) {
      return res.status(400).json({ message: "Response cannot be empty" });
    }

    const doc = await AidRequest.findById(id);
    if (!doc) return res.status(404).json({ message: "Request not found" });
    if (String(doc.student) !== String(req.user._id)) {
      return res.status(403).json({ message: "Can only respond to your own requests" });
    }
    if (doc.status !== "clarification_required") {
      return res.status(400).json({ message: "Request is not awaiting clarification" });
    }

    doc.clarificationResponse = String(response).trim();
    doc.clarificationResponseAt = new Date();
    doc.status = "pending_admin";
    await doc.save();

    // Populate student info for socket emission
    await doc.populate("student", "name email");

    // Emit socket event to notify admins of new clarification response
    io.to(`role:admin`).emit("clarification:response:new", {
      _id: doc._id,
      requestId: doc.requestId,
      student: { name: doc.student?.name, email: doc.student?.email },
      aidCategory: doc.aidCategory,
      clarificationNote: doc.clarificationNote,
      clarificationResponse: doc.clarificationResponse,
      clarificationResponseAt: doc.clarificationResponseAt
    });

    // Notify admins of response
    await notifyUsers({
      title: "Student responded to clarification",
      message: `Request ${doc.requestId || doc._id} received a response to clarification from ${doc.student?.name || "a student"}`,
      recipientType: "all_admins",
      university: doc.university
    });

    res.json({ message: "Response submitted successfully", doc });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Admin: get recent clarification responses
export const getRecentClarificationResponses = async (req, res) => {
  try {
    if (!["admin", "superadmin"].includes(req.user.role)) {
      return res.status(403).json({ message: "Only admins can view clarification responses" });
    }

    const baseQuery = { 
      clarificationResponse: { $exists: true, $ne: null },
      university: req.user.role === "admin" ? req.user.university : undefined
    };

    if (req.user.role === "admin" && !req.user.university) {
      return res.status(400).json({ message: "Admin must have a university assigned" });
    }

    // Remove undefined university for superadmin
    if (req.user.role === "superadmin") {
      delete baseQuery.university;
    }

    const responses = await AidRequest.find(baseQuery)
      .populate("student", "name email university")
      .sort({ clarificationResponseAt: -1 })
      .limit(2)
      .select("requestId aidCategory clarificationNote clarificationResponse clarificationResponseAt student");

    res.json(responses);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Student: cancel an aid request
export const cancelAidRequest = async (req, res) => {
  try {
    if (req.user.role !== "student") {
      return res.status(403).json({ message: "Only students can cancel their aid requests" });
    }

    const { id } = req.params;
    const { reason } = req.body;

    const doc = await AidRequest.findById(id).populate("student", "name email");
    if (!doc) return res.status(404).json({ message: "Request not found" });

    // Verify ownership
    if (String(doc.student._id) !== String(req.user._id)) {
      return res.status(403).json({ message: "Can only cancel your own requests" });
    }

    // Only allow cancellation for certain statuses
    const cancellableStatuses = ["pending_admin", "approved", "waiting", "waiting_funds", "funds_reserved", "second_approval_pending"];
    if (!cancellableStatuses.includes(doc.status)) {
      return res.status(400).json({ 
        message: `Cannot cancel request with status '${doc.status}'. You can only cancel requests that are pending, approved, or waiting.` 
      });
    }

    // Update request status to cancelled
    doc.status = "cancelled";
    doc.cancelledBy = req.user._id;
    doc.cancelledAt = new Date();
    doc.cancelledReason = (reason || "").trim() || "Student cancelled the request";
    await doc.save();

    // Notify admins
    await notifyUsers({
      title: "Cancelled: " + (doc.requestId || doc._id),
      message: `${doc.student.name} cancelled their ${doc.aidCategory} aid request for KES ${doc.amount || doc.amountRange}. Reason: ${doc.cancelledReason}`,
      recipientType: "all_admins",
      university: doc.university
    });

    // Emit socket notification to admins
    if (io) {
      io.to(`role:admin`).emit("aid:request:cancelled", {
        requestId: doc.requestId,
        studentName: doc.student.name,
        aidCategory: doc.aidCategory,
        amount: doc.amount,
        cancelledReason: doc.cancelledReason
      });
    }

    res.json({ message: "Request cancelled successfully", doc });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};


