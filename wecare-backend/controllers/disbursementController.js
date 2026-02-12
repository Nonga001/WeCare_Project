import AidRequest from "../models/AidRequest.js";
import Donation from "../models/Donation.js";
import User from "../models/User.js";
import { creditWallet } from "./walletController.js";

// Get available donations for disbursement (exact matches only)
export const getAvailableDonations = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Only admins can view available donations" });
    }
    if (req.user.department !== "welfare") {
      return res.status(403).json({ message: "Only welfare admins can view disbursement options" });
    }

    const university = req.user.university;
    
    // Get all pending/approved aid requests for this university
    const aidRequests = await AidRequest.find({
      university,
      status: { $in: ["pending", "approved"] }
    }).populate("student", "name email");

    // Get all confirmed donations that haven't been fully disbursed
    const donations = await Donation.find({
      status: { $in: ["confirmed", "partially_disbursed"] }
    }).populate("donor", "name organization");

    const availableMatches = [];

    for (const request of aidRequests) {
      const matches = [];

      if (request.type === "financial") {
        // Find financial donations that can cover this request
        const availableFinancialDonations = donations.filter(donation => 
          donation.type === "financial" && 
          (donation.amount - donation.disbursedAmount) >= request.amount
        );

        // Sort by creation date (first come first serve)
        availableFinancialDonations.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

        for (const donation of availableFinancialDonations) {
          const availableAmount = donation.amount - donation.disbursedAmount;
          if (availableAmount >= request.amount) {
            matches.push({
              donationId: donation._id,
              donorName: donation.donor?.name || 'Anonymous',
              organization: donation.donor?.organization,
              availableAmount,
              requiredAmount: request.amount,
              canFulfill: true
            });
            break; // Take the first available donation (FCFS)
          }
        }
      } else if (request.type === "essentials") {
        // Find essentials donations that can cover this request
        const availableEssentialsDonations = donations.filter(donation => 
          donation.type === "essentials"
        );

        // Sort by creation date (first come first serve)
        availableEssentialsDonations.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

        const requiredItems = {};
        request.items.forEach(item => {
          requiredItems[item.name] = (requiredItems[item.name] || 0) + item.quantity;
        });

        for (const donation of availableEssentialsDonations) {
          const availableItems = {};
          donation.items.forEach(item => {
            const disbursedQty = donation.disbursedItems.find(di => di.name === item.name)?.quantity || 0;
            const availableQty = item.quantity - disbursedQty;
            if (availableQty > 0) {
              availableItems[item.name] = (availableItems[item.name] || 0) + availableQty;
            }
          });

          // Check if this donation can fulfill the request
          let canFulfill = true;
          const matchItems = {};
          
          for (const [itemName, requiredQty] of Object.entries(requiredItems)) {
            const availableQty = availableItems[itemName] || 0;
            if (availableQty < requiredQty) {
              canFulfill = false;
              break;
            }
            matchItems[itemName] = Math.min(availableQty, requiredQty);
          }

          if (canFulfill) {
            matches.push({
              donationId: donation._id,
              donorName: donation.donor?.name || 'Anonymous',
              organization: donation.donor?.organization,
              availableItems,
              requiredItems,
              matchItems,
              canFulfill: true
            });
            break; // Take the first available donation (FCFS)
          }
        }
      }

      if (matches.length > 0) {
        availableMatches.push({
          aidRequest: {
            _id: request._id,
            student: request.student,
            type: request.type,
            amount: request.amount,
            items: request.items,
            reason: request.reason,
            status: request.status,
            createdAt: request.createdAt
          },
          matches
        });
      }
    }

    res.json(availableMatches);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Disburse aid with exact match
export const disburseWithMatch = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Only admins can disburse aid" });
    }

    const { aidRequestId, donationId } = req.body;
    
    if (!aidRequestId || !donationId) {
      return res.status(400).json({ message: "Aid request ID and donation ID are required" });
    }

    const university = req.user.university;
    
    // Get the aid request
    const aidRequest = await AidRequest.findOne({
      _id: aidRequestId,
      university,
      status: { $in: ["pending", "approved"] }
    });

    if (!aidRequest) {
      return res.status(404).json({ message: "Aid request not found or not eligible for disbursement" });
    }

    // Get the donation
    const donation = await Donation.findOne({
      _id: donationId,
      status: { $in: ["confirmed", "partially_disbursed"] }
    });

    if (!donation) {
      return res.status(404).json({ message: "Donation not found or not available" });
    }

    // Verify exact match
    if (aidRequest.type === "financial") {
      const availableAmount = donation.amount - donation.disbursedAmount;
      if (availableAmount < aidRequest.amount) {
        return res.status(400).json({ message: "Insufficient donation amount for this request" });
      }

      // Update donation
      donation.disbursedAmount += aidRequest.amount;
      donation.disbursedTo.push({
        aidRequestId: aidRequest._id,
        amount: aidRequest.amount,
        disbursedAt: new Date()
      });

      if (donation.disbursedAmount >= donation.amount) {
        donation.status = "disbursed";
      } else {
        donation.status = "partially_disbursed";
      }

      // Update aid request
      aidRequest.status = "disbursed";
      aidRequest.disbursedBy = req.user._id;
      aidRequest.disbursedAt = new Date();
      aidRequest.disbursementMatches.push({
        donationId: donation._id,
        amount: aidRequest.amount,
        disbursedAt: new Date()
      });

    } else if (aidRequest.type === "essentials") {
      // Check if donation can fulfill the request
      const availableItems = {};
      donation.items.forEach(item => {
        const disbursedQty = donation.disbursedItems.find(di => di.name === item.name)?.quantity || 0;
        const availableQty = item.quantity - disbursedQty;
        if (availableQty > 0) {
          availableItems[item.name] = (availableItems[item.name] || 0) + availableQty;
        }
      });

      const requiredItems = {};
      aidRequest.items.forEach(item => {
        requiredItems[item.name] = (requiredItems[item.name] || 0) + item.quantity;
      });

      // Verify exact match
      for (const [itemName, requiredQty] of Object.entries(requiredItems)) {
        const availableQty = availableItems[itemName] || 0;
        if (availableQty < requiredQty) {
          return res.status(400).json({ 
            message: `Insufficient quantity for ${itemName}. Required: ${requiredQty}, Available: ${availableQty}` 
          });
        }
      }

      // Update donation
      const disbursedItems = [];
      for (const [itemName, requiredQty] of Object.entries(requiredItems)) {
        disbursedItems.push({ name: itemName, quantity: requiredQty });
      }

      donation.disbursedItems.push(...disbursedItems);
      donation.disbursedTo.push({
        aidRequestId: aidRequest._id,
        items: disbursedItems,
        disbursedAt: new Date()
      });

      // Check if donation is fully disbursed
      let isFullyDisbursed = true;
      for (const item of donation.items) {
        const disbursedQty = donation.disbursedItems.reduce((sum, di) => 
          di.name === item.name ? sum + di.quantity : sum, 0
        );
        if (disbursedQty < item.quantity) {
          isFullyDisbursed = false;
          break;
        }
      }

      if (isFullyDisbursed) {
        donation.status = "disbursed";
      } else {
        donation.status = "partially_disbursed";
      }

      // Update aid request
      aidRequest.status = "disbursed";
      aidRequest.disbursedBy = req.user._id;
      aidRequest.disbursedAt = new Date();
      aidRequest.disbursementMatches.push({
        donationId: donation._id,
        items: disbursedItems,
        disbursedAt: new Date()
      });
    }

    // Save both documents
    await Promise.all([donation.save(), aidRequest.save()]);

    // Credit student wallet if financial aid
    if (aidRequest.type === "financial") {
      await creditWallet(
        aidRequest.student,
        aidRequest.amount,
        aidRequest._id,
        donation._id,
        `Disbursement for ${aidRequest.aidCategory} aid request`
      );
    }

    res.json({
      message: "Aid disbursed successfully",
      aidRequest: {
        _id: aidRequest._id,
        status: aidRequest.status,
        disbursedAt: aidRequest.disbursedAt
      },
      donation: {
        _id: donation._id,
        status: donation.status,
        disbursedAmount: donation.disbursedAmount,
        disbursedItems: donation.disbursedItems
      }
    });

  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Get disbursement history for admin
export const getDisbursementHistory = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Only admins can view disbursement history" });
    }

    const university = req.user.university;
    
    const disbursedRequests = await AidRequest.find({
      university,
      status: "disbursed"
    })
    .populate("student", "name email")
    .populate("disbursedBy", "name")
    .populate("disbursementMatches.donationId", "donor amount items")
    .sort({ disbursedAt: -1 });

    res.json(disbursedRequests);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Get global available balances (financial amount, essentials items)
export const getAvailableBalances = async (req, res) => {
  try {
    if (!["admin", "superadmin"].includes(req.user.role)) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    if (req.user.role === "admin" && req.user.department !== "welfare") {
      return res.status(403).json({ message: "Only welfare admins can view balances" });
    }

    const financialAgg = await Donation.aggregate([
      { $match: { type: "financial", status: { $in: ["confirmed", "partially_disbursed", "disbursed"] } } },
      { $group: { _id: null, total: { $sum: { $ifNull: ["$amount", 0] } }, disbursed: { $sum: { $ifNull: ["$disbursedAmount", 0] } } } }
    ]);

    const essentialsTotalAgg = await Donation.aggregate([
      { $match: { type: "essentials", status: { $in: ["confirmed", "partially_disbursed", "disbursed"] } } },
      { $unwind: { path: "$items", preserveNullAndEmptyArrays: true } },
      { $group: { _id: null, total: { $sum: { $ifNull: ["$items.quantity", 0] } } } }
    ]);

    const essentialsDisbursedAgg = await Donation.aggregate([
      { $match: { type: "essentials", status: { $in: ["confirmed", "partially_disbursed", "disbursed"] } } },
      { $unwind: { path: "$disbursedItems", preserveNullAndEmptyArrays: true } },
      { $group: { _id: null, total: { $sum: { $ifNull: ["$disbursedItems.quantity", 0] } } } }
    ]);

    // Per-item remaining quantities
    const essentialsByItemTotal = await Donation.aggregate([
      { $match: { type: "essentials", status: { $in: ["confirmed", "partially_disbursed", "disbursed"] } } },
      { $unwind: { path: "$items", preserveNullAndEmptyArrays: true } },
      { $group: { _id: "$items.name", total: { $sum: { $ifNull: ["$items.quantity", 0] } } } }
    ]);
    const essentialsByItemDisbursed = await Donation.aggregate([
      { $match: { type: "essentials", status: { $in: ["confirmed", "partially_disbursed", "disbursed"] } } },
      { $unwind: { path: "$disbursedItems", preserveNullAndEmptyArrays: true } },
      { $group: { _id: "$disbursedItems.name", total: { $sum: { $ifNull: ["$disbursedItems.quantity", 0] } } } }
    ]);
    const disbursedMap = new Map(essentialsByItemDisbursed.map(e => [e._id, e.total]));
    const essentialsInventory = essentialsByItemTotal.map(e => ({
      name: e._id,
      available: Math.max(0, (e.total || 0) - (disbursedMap.get(e._id) || 0))
    })).filter(e => e.name);

    const financialTotal = financialAgg[0]?.total || 0;
    const financialDisbursed = financialAgg[0]?.disbursed || 0;
    const financialBalance = financialTotal - financialDisbursed;

    const essentialsTotal = essentialsTotalAgg[0]?.total || 0;
    const essentialsDisbursed = essentialsDisbursedAgg[0]?.total || 0;
    const essentialsBalance = essentialsTotal - essentialsDisbursed;

    res.json({
      financial: { total: financialTotal, disbursed: financialDisbursed, balance: financialBalance },
      essentials: { totalItems: essentialsTotal, disbursedItems: essentialsDisbursed, balanceItems: essentialsBalance, inventory: essentialsInventory }
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
