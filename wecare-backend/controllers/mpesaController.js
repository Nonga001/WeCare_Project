import Donation from "../models/Donation.js";
import { initiateSTKPush, querySTKPushStatus } from "../services/mpesaService.js";

const getCallbackValues = (metadata = []) => {
  const map = new Map(metadata.map((item) => [item.Name, item.Value]));
  return {
    receiptNumber: map.get("MpesaReceiptNumber"),
    amount: map.get("Amount"),
    phone: map.get("PhoneNumber"),
    transactionDate: map.get("TransactionDate"),
  };
};

export const startStkPush = async (req, res) => {
  try {
    if (req.user.role !== "donor") {
      return res.status(403).json({ message: "Only donors can initiate payments" });
    }

    const { phoneNumber, amount, accountReference, transactionDesc } = req.body;
    if (!phoneNumber || !amount) {
      return res.status(400).json({ message: "Phone number and amount are required" });
    }

    const response = await initiateSTKPush(
      phoneNumber,
      amount,
      accountReference,
      transactionDesc
    );

    res.json(response);
  } catch (err) {
    res.status(500).json({
      message: err?.message || "Failed to initiate payment",
    });
  }
};

export const handleMpesaCallback = async (req, res) => {
  try {
    console.log("[M-Pesa] Callback received:", JSON.stringify(req.body));
    const callback = req.body?.Body?.stkCallback;
    if (!callback) {
      console.warn("[M-Pesa] Invalid callback payload");
      return res.status(400).json({ message: "Invalid callback payload" });
    }

    const checkoutRequestId = callback.CheckoutRequestID;
    const donation = await Donation.findOne({ mpesaCheckoutRequestId: checkoutRequestId });

    if (!donation) {
      console.warn("[M-Pesa] Donation not found for CheckoutRequestID:", checkoutRequestId);
      return res.status(404).json({ message: "Donation not found" });
    }

    donation.mpesaResultCode = callback.ResultCode;
    donation.mpesaResultDesc = callback.ResultDesc;

    if (callback.ResultCode === 0) {
      const metadata = callback.CallbackMetadata?.Item || [];
      const values = getCallbackValues(metadata);
      donation.transactionId = values.receiptNumber || donation.transactionId;
      donation.status = "confirmed";
      donation.mpesaReceiptNumber = values.receiptNumber || donation.mpesaReceiptNumber;
      donation.mpesaTransactionDate = values.transactionDate || donation.mpesaTransactionDate;
      donation.mpesaPhoneNumber = values.phone || donation.mpesaPhoneNumber;
    } else {
      donation.status = "failed";
    }

    await donation.save();
    console.log("[M-Pesa] Donation updated:", {
      id: donation._id.toString(),
      status: donation.status,
      resultCode: donation.mpesaResultCode,
      resultDesc: donation.mpesaResultDesc,
    });
    res.json({ ResultCode: 0, ResultDesc: "Accepted" });
  } catch (err) {
    console.error("[M-Pesa] Callback error:", err?.message || err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

export const queryStkPush = async (req, res) => {
  try {
    if (req.user.role !== "donor") {
      return res.status(403).json({ message: "Only donors can query payments" });
    }
    const { checkoutRequestId } = req.params;
    if (!checkoutRequestId) {
      return res.status(400).json({ message: "CheckoutRequestID is required" });
    }
    const response = await querySTKPushStatus(checkoutRequestId);
    res.json(response);
  } catch (err) {
    res.status(500).json({ message: err?.message || "Failed to query payment" });
  }
};
