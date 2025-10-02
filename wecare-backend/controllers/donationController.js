import Donation from "../models/Donation.js";
import AidRequest from "../models/AidRequest.js";
import User from "../models/User.js";

// Donor: create donation
export const createDonation = async (req, res) => {
  try {
    if (req.user.role !== "donor") {
      return res.status(403).json({ message: "Only donors can make donations" });
    }

    const { type, amount, items, paymentMethod, organization, notes } = req.body;
    
    // Validation
    if (!type || !paymentMethod) {
      return res.status(400).json({ message: "Type and payment method are required" });
    }

    if (type === "financial") {
      if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
        return res.status(400).json({ message: "Valid amount required for financial donations" });
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
      status: "confirmed"
    });

    res.status(201).json(donation);
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

// Get global aid requests (all universities)
export const getGlobalAidRequests = async (req, res) => {
  try {
    if (req.user.role !== "donor") {
      return res.status(403).json({ message: "Only donors can view global requests" });
    }

    const { type, minAmount } = req.query;
    
    let query = { status: { $in: ["pending", "approved"] } };
    
    if (type === "financial") {
      query.type = "financial";
      if (minAmount) {
        query.amount = { $gte: Number(minAmount) };
      }
    } else if (type === "essentials") {
      query.type = "essentials";
    }

    const requests = await AidRequest.find(query)
      .populate("student", "name university")
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

    const [totalDonations, mothersSupported, financialDonated, essentialsDonated] = await Promise.all([
      Donation.countDocuments({ donor: req.user._id }),
      Donation.aggregate([
        { $match: { donor: req.user._id } },
        { $group: { _id: null, total: { $sum: "$mothersSupported" } } }
      ]),
      Donation.aggregate([
        { $match: { donor: req.user._id, type: "financial" } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]),
      Donation.aggregate([
        { $match: { donor: req.user._id, type: "essentials" } },
        { $unwind: "$items" },
        { $group: { _id: null, total: { $sum: "$items.quantity" } } }
      ])
    ]);

    res.json({
      totalDonations,
      mothersSupported: mothersSupported[0]?.total || 0,
      financialDonated: financialDonated[0]?.total || 0,
      essentialsDonated: essentialsDonated[0]?.total || 0
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

    // Get university breakdown
    const universityBreakdown = await User.aggregate([
      { $match: { role: "student" } },
      { $group: { 
        _id: "$university", 
        count: { $sum: 1 },
        verifiedMoms: { $sum: { $cond: [{ $and: ["$isApproved", "$profileSubmitted", "$profileApproved"] }, 1, 0] } }
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

    // Donation totals and balances
    const financialAgg = await Donation.aggregate([
      { $match: { type: "financial" } },
      { $group: { _id: null, amount: { $sum: { $ifNull: ["$amount", 0] } }, disbursed: { $sum: { $ifNull: ["$disbursedAmount", 0] } } } }
    ]);

    const essentialsAgg = await Donation.aggregate([
      { $match: { type: "essentials" } },
      { $unwind: { path: "$items", preserveNullAndEmptyArrays: true } },
      { $group: { _id: null, itemsTotal: { $sum: { $ifNull: ["$items.quantity", 0] } } } }
    ]);

    const essentialsDisbursedAgg = await Donation.aggregate([
      { $match: { type: "essentials" } },
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
        Donation.countDocuments({ createdAt: { $gte: start, $lt: end || now } }),
        Donation.aggregate([
          { $match: { createdAt: { $gte: start, $lt: end || now }, type: "financial" } },
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

    // University breakdown: verified moms and donations sent to uni
    const verifiedByUni = await User.aggregate([
      { $match: { role: "student" } },
      { $group: { 
        _id: "$university",
        verifiedMoms: { $sum: { $cond: [{ $and: ["$isApproved", "$profileSubmitted", "$profileApproved"] }, 1, 0] } },
        totalStudents: { $sum: 1 }
      } },
      { $sort: { totalStudents: -1 } }
    ]);

    // Donations to universities via disbursedTo -> aidRequest.university
    const donationsToUni = await Donation.aggregate([
      { $unwind: "$disbursedTo" },
      { $lookup: { from: "aidrequests", localField: "disbursedTo.aidRequestId", foreignField: "_id", as: "ar" } },
      { $unwind: "$ar" },
      { $group: {
        _id: "$ar.university",
        financialAmount: { $sum: { $ifNull: ["$disbursedTo.amount", 0] } },
        essentialsItems: { $sum: { $sum: { $map: { input: { $ifNull: ["$disbursedTo.items", []] }, as: "it", in: { $ifNull: ["$$it.quantity", 0] } } } } }
      } }
    ]);

    const donationsByUniMap = new Map();
    donationsToUni.forEach(d => donationsByUniMap.set(d._id, d));

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
          essentialsItems: totalEssentialsItems
        }
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

// Donor: get donation reports
export const getDonorReports = async (req, res) => {
  try {
    if (req.user.role !== "donor") {
      return res.status(403).json({ message: "Only donors can view their reports" });
    }

    const { startDate, endDate, type } = req.query;
    
    // Build query
    const query = { donor: req.user._id };
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    
    if (type) {
      query.type = type;
    }

    const donations = await Donation.find(query).sort({ createdAt: -1 });
    
    // Calculate summary stats
    const totalDonations = donations.length;
    const totalFinancial = donations
      .filter(d => d.type === "financial")
      .reduce((sum, d) => sum + (d.amount || 0), 0);
    const totalEssentials = donations
      .filter(d => d.type === "essentials")
      .reduce((sum, d) => sum + d.items.length, 0);
    
    res.json({
      donations,
      summary: {
        totalDonations,
        totalFinancialAmount: totalFinancial,
        totalEssentialsItems: totalEssentials,
        averageDonation: totalDonations > 0 ? totalFinancial / totalDonations : 0
      }
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
