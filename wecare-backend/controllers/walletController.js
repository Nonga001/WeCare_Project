import Wallet from "../models/Wallet.js";
import User from "../models/User.js";
import AidRequest from "../models/AidRequest.js";
import Notification from "../models/Notification.js";
import { io } from "../server.js";
import axios from "axios";

// Helper: Notify individual user
const notifyUser = async ({ userId, title, message }) => {
  try {
    const doc = {
      title: String(title || "").trim(),
      message: String(message || "").trim(),
      recipientType: "individual",
      recipients: [userId]
    };
    const notification = await Notification.create(doc);
    const populated = await Notification.findById(notification._id).populate("sender", "name email role");
    io.to(`user:${userId}`).emit("notification:new", populated);
  } catch (err) {
    console.error("Error notifying user:", err);
  }
};

const notifyAdminsByUniversity = async ({ university, title, message }) => {
  try {
    if (!university) return;
    const admins = await User.find({ role: "admin", university }).select("_id");
    if (!admins.length) return;
    const doc = {
      title: String(title || "").trim(),
      message: String(message || "").trim(),
      recipientType: "single_admin",
      recipients: admins.map(a => a._id),
      university
    };
    const notification = await Notification.create(doc);
    const populated = await Notification.findById(notification._id)
      .populate("sender", "name email role")
      .populate("recipients", "name email role");
    admins.forEach((a) => io.to(`user:${a._id}`).emit("notification:new", populated));
  } catch (err) {
    console.error("Error notifying admins:", err);
  }
};

// Get wallet balance and info
export const getWalletBalance = async (req, res) => {
  try {
    if (req.user.role !== "student") {
      return res.status(403).json({ message: "Only students can view their wallet" });
    }

    let wallet = await Wallet.findOne({ student: req.user._id })
      .populate("transactions.aidRequestId", "requestId amount")
      .populate("transactions.donationId", "amount");

    if (!wallet) {
      // Create wallet if it doesn't exist
      wallet = await Wallet.create({ student: req.user._id });
    }

    res.json({
      balance: wallet.balance,
      totalReceived: wallet.totalReceived,
      totalWithdrawn: wallet.totalWithdrawn,
      lastWithdrawalAt: wallet.lastWithdrawalAt,
      recentTransactions: wallet.transactions.slice(-10)
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Get full transaction history
export const getTransactionHistory = async (req, res) => {
  try {
    if (req.user.role !== "student") {
      return res.status(403).json({ message: "Only students can view their transactions" });
    }

    const { limit = 50, skip = 0 } = req.query;

    const wallet = await Wallet.findOne({ student: req.user._id })
      .populate("transactions.aidRequestId", "requestId amount aidCategory")
      .populate("transactions.donationId", "amount");

    if (!wallet) {
      return res.json({ transactions: [], total: 0 });
    }

    const transactions = wallet.transactions.sort((a, b) => b.createdAt - a.createdAt);
    const paginatedTransactions = transactions.slice(skip, skip + parseInt(limit));

    res.json({
      transactions: paginatedTransactions,
      total: transactions.length,
      skip: parseInt(skip),
      limit: parseInt(limit)
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Withdraw to M-Pesa (simulate)
export const withdrawToMpesa = async (req, res) => {
  try {
    if (req.user.role !== "student") {
      return res.status(403).json({ message: "Only students can withdraw" });
    }

    const { amount, phone } = req.body;

    if (!amount || amount < 1 || amount > 10000) {
      return res.status(400).json({ message: "Withdrawal amount must be between 1 and 10,000" });
    }

    if (!phone || !phone.match(/^254\d{9}$|^0\d{9}$/)) {
      return res.status(400).json({ message: "Invalid M-Pesa phone number" });
    }

    const wallet = await Wallet.findOne({ student: req.user._id });
    if (!wallet) {
      return res.status(404).json({ message: "Wallet not found" });
    }

    if (wallet.balance < amount) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    // Simulate M-Pesa withdrawal
    const refId = `WLD-${Date.now()}`;

    // Deduct from wallet
    wallet.balance -= amount;
    wallet.totalWithdrawn += amount;
    wallet.lastWithdrawalAt = new Date();
    wallet.transactions.push({
      type: "debit",
      amount,
      description: `Withdrawal to M-Pesa (${phone})`,
      withdrawalRefId: refId,
      status: "success"
    });

    await wallet.save();

    // Notify student
    await notifyUser({
      userId: req.user._id,
      title: "Withdrawal Successful",
      message: `KES ${amount} has been withdrawn to M-Pesa number ${phone}. Reference: ${refId}`
    });

    res.json({
      message: "Withdrawal successful",
      refId,
      amount,
      phone,
      newBalance: wallet.balance
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Helper: Add funds to wallet (called by disbursement)
export const creditWallet = async (studentId, amount, aidRequestId, donationId, description) => {
  try {
    let wallet = await Wallet.findOne({ student: studentId });

    if (!wallet) {
      wallet = await Wallet.create({ student: studentId });
    }

    wallet.balance += amount;
    wallet.totalReceived += amount;
    wallet.transactions.push({
      type: "credit",
      amount,
      description: description || "Disbursement received",
      aidRequestId,
      donationId,
      status: "success"
    });

    await wallet.save();

    // Notify student
    await notifyUser({
      userId: studentId,
      title: "Funds Received",
      message: `KES ${amount} has been added to your wallet.`
    });

    if (aidRequestId) {
      const aidRequest = await AidRequest.findById(aidRequestId)
        .select("requestId university aidCategory")
        .lean();
      const requestLabel = aidRequest?.requestId || aidRequestId;
      await notifyAdminsByUniversity({
        university: aidRequest?.university,
        title: "Disbursement received",
        message: `Wallet credited: KES ${amount} for request ${requestLabel}.`
      });
    }

    return wallet;
  } catch (err) {
    console.error("Error crediting wallet:", err);
    throw err;
  }
};
