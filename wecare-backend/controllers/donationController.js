import Donation from "../models/Donation.js";
import crypto from "crypto";
import AidRequest from "../models/AidRequest.js";
import User from "../models/User.js";
import { initiateSTKPush, querySTKPushStatus } from "../services/mpesaService.js";

// Donor: create donation
export const createDonation = async (req, res) => {
  try {
    if (req.user.role !== "donor") {
      return res.status(403).json({ message: "Only donors can make donations" });
    }

    const { type, amount, items, paymentMethod, organization, notes, phoneNumber } = req.body;
    
    // Validation
    if (!type || !paymentMethod) {
      return res.status(400).json({ message: "Type and payment method are required" });
    }

    if (type === "financial") {
      if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
        return res.status(400).json({ message: "Valid amount required for financial donations" });
      }
      if (!phoneNumber) {
        return res.status(400).json({ message: "Phone number is required for M-Pesa payments" });
      }
    }

    if (type === "essentials") {
      if (!items || items.length === 0) {
        return res.status(400).json({ message: "At least one item required for essentials donations" });
      }
      for (const item of items) {
        if (!item.name || !item.quantity || isNaN(Number(item.quantity)) || Number(item.quantity) <= 0) {
          return res.status(400).json({ message: "Valid item name and quantity required" });
        }
      }
    }

    const referenceId = `WeCare-${Date.now().toString(36).toUpperCase()}-${crypto
      .randomBytes(3)
      .toString("hex")
      .toUpperCase()}`;

    const donation = await Donation.create({
      type,
      amount: type === "financial" ? Number(amount) : undefined,
      items: type === "essentials" ? items.map(item => ({ 
        name: item.name.trim(), 
        quantity: Number(item.quantity) 
      })) : [],
      paymentMethod,
      donor: req.user._id,
      organization: organization || undefined,
      notes: notes || undefined,
      mothersSupported: 1, // Each donation supports 1 mother by default
      status: "pending",
      mpesaPhoneNumber: phoneNumber,
      accountReference: referenceId,
      transactionId: referenceId,
    });

    let mpesaResponse = null;
    if (type === "financial" && paymentMethod === "mpesa") {
      try {
        mpesaResponse = await initiateSTKPush(
          phoneNumber,
          Number(amount),
          donation.accountReference,
          "WeCare Donation"
        );
        donation.mpesaMerchantRequestId = mpesaResponse.MerchantRequestID;
        donation.mpesaCheckoutRequestId = mpesaResponse.CheckoutRequestID;
        donation.mpesaResultCode = Number(mpesaResponse.ResponseCode || 0);
        donation.mpesaResultDesc = mpesaResponse.ResponseDescription;
        await donation.save();
      } catch (err) {
        donation.status = "failed";
        donation.mpesaResultDesc = err.message;
        await donation.save();

        const statusCode = err.code === "MPESA_CONFIG_MISSING" ? 400 : 502;
        return res.status(statusCode).json({ message: err.message });
      }
    }
    res.status(201).json({ donation, mpesa: mpesaResponse });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Donor: get own donations
export const getMyDonations = async (req, res) => {
  try {
    if (req.user.role !== "donor") {
      return res.status(403).json({ message: "Only donors can view their donations" });
    }

    const donations = await Donation.find({ donor: req.user._id })
      .sort({ createdAt: -1 });
    
    res.json(donations);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Donor: delete own donations
export const deleteMyDonations = async (req, res) => {
  try {
    if (req.user.role !== "donor") {
      return res.status(403).json({ message: "Only donors can clear their donations" });
    }

    const result = await Donation.deleteMany({ donor: req.user._id });
    res.json({ deletedCount: result.deletedCount || 0 });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Donor: query and update M-Pesa status for a donation
export const queryDonationStatus = async (req, res) => {
  try {
    if (req.user.role !== "donor") {
      return res.status(403).json({ message: "Only donors can query payment status" });
    }

    const { donationId } = req.params;
    const force = req.query.force === "true";  // Allow forced refresh to bypass timeout checks
    const donation = await Donation.findOne({ _id: donationId, donor: req.user._id });
    if (!donation) {
      return res.status(404).json({ message: "Donation not found" });
    }

    if (donation.paymentMethod !== "mpesa") {
      return res.status(400).json({ message: "Only M-Pesa donations can be queried" });
    }

    if (!donation.mpesaCheckoutRequestId) {
      return res.status(400).json({ message: "Missing M-Pesa checkout request ID" });
    }

    if (donation.status === "confirmed") {
      return res.json({ donation, mpesa: null });
    }

    // Skip timeout checks if force=true (manual refresh requested)
    if (!force) {
      if (donation.status === "pending") {
        const createdAt = donation.createdAt ? new Date(donation.createdAt).getTime() : 0;
        const pendingLimitMs = 3 * 60 * 1000;  // Give M-Pesa 3 minutes to respond (user might be slow entering PIN)
        if (createdAt && Date.now() - createdAt > pendingLimitMs) {
          // Only mark as failed if we've been waiting more than 3 minutes with no response from M-Pesa
          donation.status = "failed";
          donation.mpesaResultDesc = "No response from M-Pesa after 3 minutes. Please try again.";
          await donation.save();
          return res.json({ donation, mpesa: null });
        }
      }

      if (donation.status === "failed") {
        const updatedAt = donation.updatedAt ? new Date(donation.updatedAt).getTime() : 0;
        const graceWindowMs = 1 * 60 * 1000;  // 1 minute instead of 2
        if (Date.now() - updatedAt > graceWindowMs) {
          return res.json({ donation, mpesa: null });
        }
      }
    }

    try {
      const response = await querySTKPushStatus(donation.mpesaCheckoutRequestId);
      const resultCode = Number(response?.ResultCode ?? response?.ResponseCode ?? NaN);
      const resultDesc = response?.ResultDesc || response?.ResponseDescription;

      if (!Number.isNaN(resultCode)) {
        donation.mpesaResultCode = resultCode;
        donation.mpesaResultDesc = resultDesc || donation.mpesaResultDesc;

        if (resultCode === 0) {
          donation.status = "confirmed";
        } else if (resultCode === 1001 || resultCode === 1002) {
          // 1001 = User cancelled prompt, 1002 = Timed out
          donation.status = "failed";
          if (resultCode === 1001 && !donation.mpesaResultDesc?.includes("cancelled")) {
            donation.mpesaResultDesc = "User cancelled the payment prompt";
          }
        } else {
          donation.status = "failed";
        }

        await donation.save();
        console.log("[M-Pesa] Status query response:", {
          id: donation._id.toString(),
          status: donation.status,
          resultCode: donation.mpesaResultCode,
          resultDesc: donation.mpesaResultDesc,
        });
      }

      res.json({ donation, mpesa: response });
    } catch (mpesaErr) {
      console.error("[M-Pesa] Query failed:", mpesaErr.message);
      // Return donation with last known status instead of throwing 500
      res.json({ donation, mpesa: null, note: "Could not reach M-Pesa service" });
    }
  } catch (err) {
    res.status(500).json({ message: err?.message || "Failed to query payment" });
  }
};

// Get global aid requests (all universities)
export const getGlobalAidRequests = async (req, res) => {
  try {
    if (req.user.role !== "donor") {
      return res.status(403).json({ message: "Only donors can view global requests" });
    }

    const { type, minAmount } = req.query;
    
    let query = { status: { $in: ["pending", "pending_admin", "approved"] }, shareWithDonors: true };
    
    if (type === "financial") {
      query.type = "financial";
      if (minAmount) {
        query.amount = { $gte: Number(minAmount) };
      }
    } else if (type === "essentials") {
      query.type = "essentials";
    }

    const requests = await AidRequest.find(query)
      .select("type amount items createdAt status")
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Get donor stats
export const getDonorStats = async (req, res) => {
  try {
    if (req.user.role !== "donor") {
      return res.status(403).json({ message: "Only donors can view stats" });
    }

    const period = String(req.query.period || "month").toLowerCase();
    const now = new Date();

    const getPeriodStart = (p, base) => {
      const d = new Date(base);
      if (p === "day") return new Date(d.getFullYear(), d.getMonth(), d.getDate());
      if (p === "week") {
        const day = d.getDay();
        const diff = (day + 6) % 7; // Monday start
        d.setDate(d.getDate() - diff);
        return new Date(d.getFullYear(), d.getMonth(), d.getDate());
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
    } else if (period === "year") {
      previousStart = new Date(currentStart.getFullYear() - 1, 0, 1);
    } else {
      previousStart = new Date(currentStart.getFullYear(), currentStart.getMonth() - 1, 1);
    }

    const successfulStatuses = ["confirmed", "disbursed", "partially_disbursed"];

    const buildStats = async (start, end) => {
      const match = { donor: req.user._id, createdAt: { $gte: start, $lt: end } };
      const disbursedMatch = { donor: req.user._id };
      const disbursedWindow = { $gte: start, $lt: end };

      const [donationsCount, mothersSupported, financialDonated, essentialsDonated] = await Promise.all([
        Donation.countDocuments({ ...match, status: { $in: successfulStatuses } }),
        Donation.aggregate([
          { $match: disbursedMatch },
          { $unwind: "$disbursedTo" },
          { $match: { "disbursedTo.disbursedAt": disbursedWindow } },
          { $lookup: { from: "aidrequests", localField: "disbursedTo.aidRequestId", foreignField: "_id", as: "ar" } },
          { $unwind: "$ar" },
          { $group: { _id: "$ar.student" } },
          { $count: "total" }
        ]),
        Donation.aggregate([
          { $match: { ...match, type: "financial", status: { $in: ["confirmed", "pending"] } } },
          { $group: { _id: null, total: { $sum: { $ifNull: ["$amount", 0] } } } }
        ]),
        Donation.aggregate([
          { $match: { ...match, type: "essentials", status: { $in: ["confirmed", "pending"] } } },
          { $unwind: { path: "$items", preserveNullAndEmptyArrays: true } },
          { $group: { _id: null, total: { $sum: { $ifNull: ["$items.quantity", 0] } } } }
        ])
      ]);

      return {
        donationsCount,
        mothersSupported: mothersSupported[0]?.total || 0,
        financialDonated: financialDonated[0]?.total || 0,
        essentialsDonated: essentialsDonated[0]?.total || 0,
      };
    };

    const buildAllTime = async () => {
      const match = { donor: req.user._id };
      const [donationsCount, mothersSupported, financialDonated, essentialsDonated] = await Promise.all([
        Donation.countDocuments({ ...match, status: { $in: successfulStatuses } }),
        Donation.aggregate([
          { $match: match },
          { $unwind: "$disbursedTo" },
          { $lookup: { from: "aidrequests", localField: "disbursedTo.aidRequestId", foreignField: "_id", as: "ar" } },
          { $unwind: "$ar" },
          { $group: { _id: "$ar.student" } },
          { $count: "total" }
        ]),
        Donation.aggregate([
          { $match: { ...match, type: "financial", status: { $in: ["confirmed", "pending"] } } },
          { $group: { _id: null, total: { $sum: { $ifNull: ["$amount", 0] } } } }
        ]),
        Donation.aggregate([
          { $match: { ...match, type: "essentials", status: { $in: ["confirmed", "pending"] } } },
          { $unwind: { path: "$items", preserveNullAndEmptyArrays: true } },
          { $group: { _id: null, total: { $sum: { $ifNull: ["$items.quantity", 0] } } } }
        ])
      ]);

      return {
        donationsCount,
        mothersSupported: mothersSupported[0]?.total || 0,
        financialDonated: financialDonated[0]?.total || 0,
        essentialsDonated: essentialsDonated[0]?.total || 0,
      };
    };

    const [current, previous, allTime] = await Promise.all([
      buildStats(currentStart, now),
      buildStats(previousStart, previousEnd),
      buildAllTime()
    ]);

    return res.json({
      period,
      current,
      previous,
      allTime,
      window: {
        currentStart,
        currentEnd: now,
        previousStart,
        previousEnd
      }
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Super admin: get all donations
export const getAllDonations = async (req, res) => {
  try {
    if (req.user.role !== "superadmin") {
      return res.status(403).json({ message: "Only superadmin can view all donations" });
    }

    const donations = await Donation.find()
      .populate("donor", "name email organization")
      .sort({ createdAt: -1 });

    res.json(donations);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Super admin: get global stats
export const getGlobalStats = async (req, res) => {
  try {
    if (req.user.role !== "superadmin") {
      return res.status(403).json({ message: "Only superadmin can view global stats" });
    }

    const [totalStudents, totalAdmins, totalDonors, totalRequests, totalDonations, totalFulfilled] = await Promise.all([
      User.countDocuments({ role: "student" }),
      User.countDocuments({ role: "admin" }),
      User.countDocuments({ role: "donor" }),
      AidRequest.countDocuments(),
      Donation.countDocuments(),
      AidRequest.countDocuments({ status: "disbursed" })
    ]);

    // Get university breakdown (normalize variations of same university)
    const universityBreakdown = await User.aggregate([
      { $match: { role: "student" } },
      {
        $addFields: {
          normalizedUniversity: {
            $switch: {
              branches: [
                { case: { $regexMatch: { input: { $toLower: "$university" }, regex: "dedan.*kimathi|dekut" } }, then: "Dedan Kimathi University (DeKUT)" },
                { case: { $regexMatch: { input: { $toLower: "$university" }, regex: "nairobi|uon" } }, then: "University of Nairobi (UoN)" },
                { case: { $regexMatch: { input: { $toLower: "$university" }, regex: "kenyatta|\\bku\\b" } }, then: "Kenyatta University (KU)" },
                { case: { $regexMatch: { input: { $toLower: "$university" }, regex: "kirinyaga" } }, then: "Kirinyaga University" },
                { case: { $regexMatch: { input: { $toLower: "$university" }, regex: "karatina" } }, then: "Karatina University" }
              ],
              default: "$university"
            }
          }
        }
      },
      { $group: { 
        _id: "$normalizedUniversity", 
        count: { $sum: 1 },
        verifiedMoms: { $sum: { $cond: [{ $and: [{ $eq: ["$isApproved", true] }, { $eq: ["$profileSubmitted", true] }, { $eq: ["$profileApproved", true] }] }, 1, 0] } }
      }},
      { $sort: { count: -1 } }
    ]);

    // Get weekly stats
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const [weeklyUsers, weeklyDonations, weeklyRequests, weeklyFulfilled] = await Promise.all([
      User.countDocuments({ createdAt: { $gte: oneWeekAgo } }),
      Donation.countDocuments({ createdAt: { $gte: oneWeekAgo } }),
      AidRequest.countDocuments({ createdAt: { $gte: oneWeekAgo } }),
      AidRequest.countDocuments({ status: "disbursed", disbursedAt: { $gte: oneWeekAgo } })
    ]);

    // Active users last 24 hours by role (tracked via lastActive)
    const since = new Date();
    since.setDate(since.getDate() - 1);
    const activeByRoleAgg = await User.aggregate([
      { $match: { lastActive: { $gte: since } } },
      { $group: { _id: "$role", count: { $sum: 1 } } }
    ]);
    const activeMap = new Map(activeByRoleAgg.map(a => [a._id, a.count]));
    const activeByRole = {
      student: activeMap.get("student") || 0,
      admin: activeMap.get("admin") || 0,
      donor: activeMap.get("donor") || 0,
      superadmin: activeMap.get("superadmin") || 0,
    };
    const activeTotal = Object.values(activeByRole).reduce((a, b) => a + b, 0);

    res.json({
      totalStudents,
      totalAdmins,
      totalDonors,
      totalRequests,
      totalDonations,
      totalFulfilled,
      universityBreakdown,
      weeklyStats: {
        users: weeklyUsers,
        donations: weeklyDonations,
        requests: weeklyRequests,
        fulfilled: weeklyFulfilled
      },
      activeUsers: { total: activeTotal, byRole: activeByRole }
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Super admin: comprehensive analytics with balances and weekly/monthly comparisons
export const getSuperAnalytics = async (req, res) => {
  try {
    if (req.user.role !== "superadmin") {
      return res.status(403).json({ message: "Only superadmin can view analytics" });
    }

    // Totals
    const [
      totalUsers,
      totalRequests,
      totalFulfilled
    ] = await Promise.all([
      User.countDocuments(),
      AidRequest.countDocuments(),
      AidRequest.countDocuments({ status: "disbursed" })
    ]);

    // Donation totals and balances (only successful donations)
    const financialAgg = await Donation.aggregate([
      { $match: { type: "financial", status: { $in: ["confirmed", "disbursed", "partially_disbursed"] } } },
      { $group: { _id: null, amount: { $sum: { $ifNull: ["$amount", 0] } }, disbursed: { $sum: { $ifNull: ["$disbursedAmount", 0] } } } }
    ]);

    const essentialsAgg = await Donation.aggregate([
      { $match: { type: "essentials", status: { $in: ["confirmed", "disbursed", "partially_disbursed"] } } },
      { $unwind: { path: "$items", preserveNullAndEmptyArrays: true } },
      { $group: { _id: null, itemsTotal: { $sum: { $ifNull: ["$items.quantity", 0] } } } }
    ]);

    const essentialsDisbursedAgg = await Donation.aggregate([
      { $match: { type: "essentials", status: { $in: ["confirmed", "disbursed", "partially_disbursed"] } } },
      { $unwind: { path: "$disbursedItems", preserveNullAndEmptyArrays: true } },
      { $group: { _id: null, itemsDisbursed: { $sum: { $ifNull: ["$disbursedItems.quantity", 0] } } } }
    ]);

    const totalFinancialDonations = financialAgg[0]?.amount || 0;
    const totalFinancialDisbursed = financialAgg[0]?.disbursed || 0;
    const financialBalance = totalFinancialDonations - totalFinancialDisbursed;

    const totalEssentialsItems = essentialsAgg[0]?.itemsTotal || 0;
    const totalEssentialsItemsDisbursed = essentialsDisbursedAgg[0]?.itemsDisbursed || 0;
    const essentialsBalanceItems = totalEssentialsItems - totalEssentialsItemsDisbursed;

    // Weekly vs Monthly stats (last vs previous windows)
    const now = new Date();
    const last7 = new Date(now);
    last7.setDate(now.getDate() - 7);
    const prev7Start = new Date(now);
    prev7Start.setDate(now.getDate() - 14);

    const last30 = new Date(now);
    last30.setDate(now.getDate() - 30);
    const prev30Start = new Date(now);
    prev30Start.setDate(now.getDate() - 60);

    const windowStats = async (start, end) => {
      const [users, donationsCount, donationsAmount, requests, fulfilled] = await Promise.all([
        User.countDocuments({ createdAt: { $gte: start, $lt: end || now } }),
        Donation.countDocuments({ status: { $in: ["confirmed", "disbursed", "partially_disbursed"] }, createdAt: { $gte: start, $lt: end || now } }),
        Donation.aggregate([
          { $match: { createdAt: { $gte: start, $lt: end || now }, type: "financial", status: { $in: ["confirmed", "disbursed", "partially_disbursed"] } } },
          { $group: { _id: null, total: { $sum: { $ifNull: ["$amount", 0] } } } }
        ]),
        AidRequest.countDocuments({ createdAt: { $gte: start, $lt: end || now } }),
        AidRequest.countDocuments({ status: "disbursed", disbursedAt: { $gte: start, $lt: end || now } })
      ]);
      return {
        users,
        donationsCount,
        donationsAmount: donationsAmount[0]?.total || 0,
        requests,
        fulfilled
      };
    };

    const [weeklyCurrent, weeklyPrevious, monthlyCurrent, monthlyPrevious] = await Promise.all([
      windowStats(last7),
      windowStats(prev7Start, last7),
      windowStats(last30),
      windowStats(prev30Start, last30)
    ]);

    const flowWindow = async (start, end) => {
      const [inflowAgg, outflowAgg] = await Promise.all([
        Donation.aggregate([
          { $match: { type: "financial", status: { $in: ["confirmed", "disbursed", "partially_disbursed"] }, createdAt: { $gte: start, $lt: end || now } } },
          { $group: { _id: null, total: { $sum: { $ifNull: ["$amount", 0] } } } }
        ]),
        Donation.aggregate([
          { $match: { type: "financial", status: { $in: ["confirmed", "disbursed", "partially_disbursed"] }, disbursedAt: { $gte: start, $lt: end || now } } },
          { $group: { _id: null, total: { $sum: { $ifNull: ["$disbursedAmount", 0] } } } }
        ])
      ]);
      return {
        inflow: inflowAgg[0]?.total || 0,
        outflow: outflowAgg[0]?.total || 0
      };
    };

    const [weeklyFlow, prevWeeklyFlow, monthlyFlow, prevMonthlyFlow] = await Promise.all([
      flowWindow(last7),
      flowWindow(prev7Start, last7),
      flowWindow(last30),
      flowWindow(prev30Start, last30)
    ]);

    const statusBreakdownAgg = await AidRequest.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);

    const requestsByCategoryAgg = await AidRequest.aggregate([
      {
        $group: {
          _id: "$aidCategory",
          requests: { $sum: 1 },
          avgAmount: { $avg: { $ifNull: ["$amount", 0] } }
        }
      }
    ]);

    const disbursedByCategoryAgg = await AidRequest.aggregate([
      {
        $addFields: {
          disbursedAmountCalc: {
            $sum: {
              $map: {
                input: { $ifNull: ["$disbursementMatches", []] },
                as: "m",
                in: { $ifNull: ["$$m.amount", 0] }
              }
            }
          },
          disbursedItemsCalc: {
            $sum: {
              $map: {
                input: { $ifNull: ["$disbursementMatches", []] },
                as: "m",
                in: {
                  $sum: {
                    $map: {
                      input: { $ifNull: ["$$m.items", []] },
                      as: "it",
                      in: { $ifNull: ["$$it.quantity", 0] }
                    }
                  }
                }
              }
            }
          }
        }
      },
      {
        $group: {
          _id: "$aidCategory",
          disbursedAmount: { $sum: "$disbursedAmountCalc" },
          disbursedItems: { $sum: "$disbursedItemsCalc" }
        }
      }
    ]);

    const normalizeUniversityExpr = {
      $switch: {
        branches: [
          { case: { $regexMatch: { input: { $toLower: "$university" }, regex: "dedan.*kimathi|dekut" } }, then: "Dedan Kimathi University (DeKUT)" },
          { case: { $regexMatch: { input: { $toLower: "$university" }, regex: "nairobi|uon" } }, then: "University of Nairobi (UoN)" },
          { case: { $regexMatch: { input: { $toLower: "$university" }, regex: "kenyatta|\\bku\\b" } }, then: "Kenyatta University (KU)" },
          { case: { $regexMatch: { input: { $toLower: "$university" }, regex: "kirinyaga" } }, then: "Kirinyaga University" },
          { case: { $regexMatch: { input: { $toLower: "$university" }, regex: "karatina" } }, then: "Karatina University" }
        ],
        default: "$university"
      }
    };

    const universityDistributionAgg = await AidRequest.aggregate([
      {
        $addFields: {
          normalizedUniversity: normalizeUniversityExpr,
          disbursedAmountCalc: {
            $sum: {
              $map: {
                input: { $ifNull: ["$disbursementMatches", []] },
                as: "m",
                in: { $ifNull: ["$$m.amount", 0] }
              }
            }
          },
          disbursedItemsCalc: {
            $sum: {
              $map: {
                input: { $ifNull: ["$disbursementMatches", []] },
                as: "m",
                in: {
                  $sum: {
                    $map: {
                      input: { $ifNull: ["$$m.items", []] },
                      as: "it",
                      in: { $ifNull: ["$$it.quantity", 0] }
                    }
                  }
                }
              }
            }
          }
        }
      },
      {
        $group: {
          _id: "$normalizedUniversity",
          totalRequests: { $sum: 1 },
          approvedCount: {
            $sum: { $cond: [{ $ne: ["$approvedAt", null] }, 1, 0] }
          },
          disbursedAmount: { $sum: "$disbursedAmountCalc" },
          disbursedItems: { $sum: "$disbursedItemsCalc" }
        }
      },
      { $sort: { totalRequests: -1 } }
    ]);

    const categoryByUniversityAgg = await AidRequest.aggregate([
      {
        $addFields: {
          normalizedUniversity: normalizeUniversityExpr,
          disbursedAmountCalc: {
            $sum: {
              $map: {
                input: { $ifNull: ["$disbursementMatches", []] },
                as: "m",
                in: { $ifNull: ["$$m.amount", 0] }
              }
            }
          },
          disbursedItemsCalc: {
            $sum: {
              $map: {
                input: { $ifNull: ["$disbursementMatches", []] },
                as: "m",
                in: {
                  $sum: {
                    $map: {
                      input: { $ifNull: ["$$m.items", []] },
                      as: "it",
                      in: { $ifNull: ["$$it.quantity", 0] }
                    }
                  }
                }
              }
            }
          }
        }
      },
      {
        $group: {
          _id: { university: "$normalizedUniversity", category: "$aidCategory" },
          requests: { $sum: 1 },
          avgAmount: { $avg: { $ifNull: ["$amount", 0] } },
          disbursedAmount: { $sum: "$disbursedAmountCalc" },
          disbursedItems: { $sum: "$disbursedItemsCalc" }
        }
      }
    ]);

    const donationStatusAgg = await Donation.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);

    const failureReasonsAgg = await Donation.aggregate([
      { $match: { status: "failed" } },
      { $group: { _id: { $ifNull: ["$mpesaResultDesc", "Unknown"] }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    // University breakdown: verified moms and donations sent to uni (normalize variations)
    const verifiedByUni = await User.aggregate([
      { $match: { role: "student" } },
      {
        $addFields: {
          normalizedUniversity: {
            $switch: {
              branches: [
                { case: { $regexMatch: { input: { $toLower: "$university" }, regex: "dedan.*kimathi|dekut" } }, then: "Dedan Kimathi University (DeKUT)" },
                { case: { $regexMatch: { input: { $toLower: "$university" }, regex: "nairobi|uon" } }, then: "University of Nairobi (UoN)" },
                { case: { $regexMatch: { input: { $toLower: "$university" }, regex: "kenyatta|\\bku\\b" } }, then: "Kenyatta University (KU)" },
                { case: { $regexMatch: { input: { $toLower: "$university" }, regex: "kirinyaga" } }, then: "Kirinyaga University" },
                { case: { $regexMatch: { input: { $toLower: "$university" }, regex: "karatina" } }, then: "Karatina University" }
              ],
              default: "$university"
            }
          }
        }
      },
      { $group: { 
        _id: "$normalizedUniversity",
        verifiedMoms: { $sum: { $cond: [{ $and: [{ $eq: ["$isApproved", true] }, { $eq: ["$profileSubmitted", true] }, { $eq: ["$profileApproved", true] }] }, 1, 0] } },
        totalStudents: { $sum: 1 }
      } },
      { $sort: { totalStudents: -1 } }
    ]);

    // Donations to universities via disbursedTo -> aidRequest.university (normalize)
    const donationsToUni = await Donation.aggregate([
      { $unwind: "$disbursedTo" },
      { $lookup: { from: "aidrequests", localField: "disbursedTo.aidRequestId", foreignField: "_id", as: "ar" } },
      { $unwind: "$ar" },
      {
        $addFields: {
          normalizedUniversity: {
            $switch: {
              branches: [
                { case: { $regexMatch: { input: { $toLower: "$ar.university" }, regex: "dedan.*kimathi|dekut" } }, then: "Dedan Kimathi University (DeKUT)" },
                { case: { $regexMatch: { input: { $toLower: "$ar.university" }, regex: "nairobi|uon" } }, then: "University of Nairobi (UoN)" },
                { case: { $regexMatch: { input: { $toLower: "$ar.university" }, regex: "kenyatta|\\bku\\b" } }, then: "Kenyatta University (KU)" },
                { case: { $regexMatch: { input: { $toLower: "$ar.university" }, regex: "kirinyaga" } }, then: "Kirinyaga University" },
                { case: { $regexMatch: { input: { $toLower: "$ar.university" }, regex: "karatina" } }, then: "Karatina University" }
              ],
              default: "$ar.university"
            }
          }
        }
      },
      { $group: {
        _id: "$normalizedUniversity",
        financialAmount: { $sum: { $ifNull: ["$disbursedTo.amount", 0] } },
        essentialsItems: { $sum: { $sum: { $map: { input: { $ifNull: ["$disbursedTo.items", []] }, as: "it", in: { $ifNull: ["$$it.quantity", 0] } } } } }
      } }
    ]);

    const donationsByUniMap = new Map();
    donationsToUni.forEach(d => donationsByUniMap.set(d._id, d));

    const categoryByUniversityMap = new Map();
    categoryByUniversityAgg.forEach((row) => {
      const uni = row._id?.university || "Unknown";
      if (!categoryByUniversityMap.has(uni)) categoryByUniversityMap.set(uni, []);
      categoryByUniversityMap.get(uni).push({
        category: row._id?.category || "unknown",
        requests: row.requests || 0,
        avgAmount: Math.round(row.avgAmount || 0),
        disbursedAmount: row.disbursedAmount || 0,
        disbursedItems: row.disbursedItems || 0
      });
    });

    const disbursedByCategoryMap = new Map();
    disbursedByCategoryAgg.forEach((row) => disbursedByCategoryMap.set(row._id, row));

    const aidCategoryBreakdown = requestsByCategoryAgg.map((row) => ({
      category: row._id || "unknown",
      requests: row.requests || 0,
      avgAmount: Math.round(row.avgAmount || 0),
      disbursedAmount: disbursedByCategoryMap.get(row._id)?.disbursedAmount || 0,
      disbursedItems: disbursedByCategoryMap.get(row._id)?.disbursedItems || 0
    }));

    const universityDistribution = universityDistributionAgg.map((row) => ({
      university: row._id || "Unknown",
      totalRequests: row.totalRequests || 0,
      approvedCount: row.approvedCount || 0,
      approvalRate: row.totalRequests ? Math.round((row.approvedCount / row.totalRequests) * 100) : 0,
      disbursedAmount: row.disbursedAmount || 0,
      disbursedItems: row.disbursedItems || 0,
      categories: categoryByUniversityMap.get(row._id) || []
    }));

    const statusBreakdown = statusBreakdownAgg.map((row) => ({
      status: row._id,
      count: row.count || 0
    }));

    const donationStatusMap = new Map(donationStatusAgg.map((row) => [row._id, row.count]));
    const successCount = (donationStatusMap.get("disbursed") || 0) + (donationStatusMap.get("partially_disbursed") || 0);
    const failedCount = donationStatusMap.get("failed") || 0;
    const totalDonationCount = Array.from(donationStatusMap.values()).reduce((sum, v) => sum + v, 0);
    const successRate = totalDonationCount > 0 ? Math.round((successCount / totalDonationCount) * 100) : 0;

    const universityBreakdown = verifiedByUni.map(u => ({
      university: u._id || "Unknown",
      verifiedMoms: u.verifiedMoms || 0,
      donationsToUniversity: {
        financialAmount: donationsByUniMap.get(u._id)?.financialAmount || 0,
        essentialsItems: donationsByUniMap.get(u._id)?.essentialsItems || 0
      }
    }));

    // Essentials inventory (global)
    const essentialsByItemTotal = await Donation.aggregate([
      { $match: { type: "essentials" } },
      { $unwind: { path: "$items", preserveNullAndEmptyArrays: true } },
      { $group: { _id: "$items.name", total: { $sum: { $ifNull: ["$items.quantity", 0] } } } }
    ]);
    const essentialsByItemDisbursed = await Donation.aggregate([
      { $match: { type: "essentials" } },
      { $unwind: { path: "$disbursedItems", preserveNullAndEmptyArrays: true } },
      { $group: { _id: "$disbursedItems.name", total: { $sum: { $ifNull: ["$disbursedItems.quantity", 0] } } } }
    ]);
    const disbMap = new Map(essentialsByItemDisbursed.map(e => [e._id, e.total]));
    const essentialsInventory = essentialsByItemTotal.map(e => ({ name: e._id, available: Math.max(0, (e.total || 0) - (disbMap.get(e._id) || 0)) })).filter(e => e.name);

    res.json({
      totals: {
        users: totalUsers,
        requests: totalRequests,
        fulfilled: totalFulfilled,
        donations: {
          financialAmount: totalFinancialDonations,
          essentialsItems: totalEssentialsItems,
          count: successCount
        }
      },
      funding: {
        totalReceived: totalFinancialDonations,
        totalDisbursed: totalFinancialDisbursed,
        remainingBalance: financialBalance,
        weeklyFlow,
        monthlyFlow,
        weeklyTrend: {
          inflowDelta: weeklyFlow.inflow - prevWeeklyFlow.inflow,
          outflowDelta: weeklyFlow.outflow - prevWeeklyFlow.outflow
        },
        monthlyTrend: {
          inflowDelta: monthlyFlow.inflow - prevMonthlyFlow.inflow,
          outflowDelta: monthlyFlow.outflow - prevMonthlyFlow.outflow
        }
      },
      demandSupply: {
        weeklyRequests: weeklyCurrent.requests,
        monthlyRequests: monthlyCurrent.requests,
        statusBreakdown,
        inflowOutflow: {
          inflow: totalFinancialDonations,
          outflow: totalFinancialDisbursed,
          net: financialBalance
        }
      },
      aidCategoryBreakdown,
      universityDistribution,
      disbursementHealth: {
        successRate,
        successCount,
        failedCount,
        failureReasons: failureReasonsAgg.map((row) => ({
          reason: row._id || "Unknown",
          count: row.count || 0
        }))
      },
      balances: {
        financialAmount: financialBalance,
        essentialsItems: essentialsBalanceItems,
        essentialsInventory
      },
      weekly: { current: weeklyCurrent, previous: weeklyPrevious },
      monthly: { current: monthlyCurrent, previous: monthlyPrevious },
      universityBreakdown
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
