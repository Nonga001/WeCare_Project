# Immediate Implementation Plan - Payment & Verification

## What We Can Implement RIGHT NOW (No External APIs Needed)

This plan prioritizes **quick wins** that significantly improve security without waiting for payment gateway integration.

---

## PHASE 1A: Payment Verification Foundation (2-3 hours)

### 1. Add Payment Verification Status to Donations

**Change**: Update Donation model to track payment verification

```javascript
// wecare-backend/models/Donation.js
const donationSchema = new mongoose.Schema({
  // ... existing fields
  
  // NEW: Payment verification
  paymentStatus: {
    type: String,
    enum: ["pending_verification", "verified", "failed", "manual_review"],
    default: "pending_verification"
  },
  
  transactionId: { type: String, required: true }, // Make required
  transactionAmount: { type: Number }, // Actual amount from payment provider
  transactionDate: { type: Date },
  transactionProof: { type: String }, // Upload screenshot/receipt
  
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  verifiedAt: { type: Date },
  verificationNotes: { type: String },
  
  // Change this:
  // status: { type: String, enum: ["pending", "confirmed", ...], default: "pending" }
  // To:
  status: { 
    type: String, 
    enum: ["pending_payment", "verified", "confirmed", "disbursed", "partially_disbursed"], 
    default: "pending_payment"  // Start as pending
  },
});
```

**Impact**: 🟢 Donors can't claim unverified donations. Admins must verify first.

---

### 2. Update Donation Creation Logic

**Change**: Donations start as "pending_payment" until verified

```javascript
// wecare-backend/controllers/donationController.js

export const createDonation = async (req, res) => {
  try {
    if (req.user.role !== "donor") {
      return res.status(403).json({ message: "Only donors can make donations" });
    }

    const { type, amount, items, paymentMethod, organization, notes, transactionId } = req.body;
    
    // NEW: Require transaction ID
    if (!transactionId) {
      return res.status(400).json({ 
        message: "Transaction ID/reference is required. Please provide your M-Pesa/bank reference number." 
      });
    }
    
    // Validation (existing)...
    
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
      mothersSupported: 1,
      
      // NEW: Payment verification fields
      transactionId,
      paymentStatus: "pending_verification",
      status: "pending_payment",  // Changed from "confirmed"
      transactionDate: new Date()
    });

    res.status(201).json({
      ...donation.toObject(),
      message: "Donation created! Awaiting payment verification by admin. You'll be notified once verified."
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
```

**Impact**: 🟢 Stops fake donations immediately

---

### 3. Create Admin Payment Verification Endpoint

**NEW Controller**: Admin verifies payment proof

```javascript
// wecare-backend/controllers/donationController.js

// Admin/SuperAdmin: Verify payment
export const verifyPayment = async (req, res) => {
  try {
    if (!["admin", "superadmin"].includes(req.user.role)) {
      return res.status(403).json({ message: "Only admins can verify payments" });
    }

    const { donationId, verified, verificationNotes, transactionAmount } = req.body;
    
    if (!donationId) {
      return res.status(400).json({ message: "Donation ID is required" });
    }

    const donation = await Donation.findById(donationId)
      .populate("donor", "name email organization");

    if (!donation) {
      return res.status(404).json({ message: "Donation not found" });
    }

    if (donation.paymentStatus !== "pending_verification") {
      return res.status(400).json({ 
        message: `Payment already ${donation.paymentStatus}` 
      });
    }

    // Update donation
    if (verified) {
      donation.paymentStatus = "verified";
      donation.status = "confirmed";  // Now available for disbursement
      donation.verifiedBy = req.user._id;
      donation.verifiedAt = new Date();
      donation.verificationNotes = verificationNotes || "Verified by admin";
      donation.transactionAmount = transactionAmount || donation.amount;
      
      // Check if amount matches
      if (transactionAmount && donation.amount && 
          Math.abs(transactionAmount - donation.amount) > 1) {
        donation.paymentStatus = "manual_review";
        donation.verificationNotes = `Amount mismatch: Claimed ${donation.amount}, Verified ${transactionAmount}`;
      }
    } else {
      donation.paymentStatus = "failed";
      donation.status = "pending_payment";
      donation.verificationNotes = verificationNotes || "Payment verification failed";
    }

    await donation.save();

    // TODO: Send notification to donor
    // await notificationService.send(donation.donor._id, {
    //   message: verified ? "Your donation has been verified!" : "Payment verification failed"
    // });

    res.json({
      message: verified ? "Payment verified successfully" : "Payment verification failed",
      donation
    });

  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Get donations pending verification
export const getPendingVerifications = async (req, res) => {
  try {
    if (!["admin", "superadmin"].includes(req.user.role)) {
      return res.status(403).json({ message: "Only admins can view pending verifications" });
    }

    const pendingDonations = await Donation.find({
      paymentStatus: "pending_verification"
    })
    .populate("donor", "name email phone organization")
    .sort({ createdAt: -1 });

    res.json(pendingDonations);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
```

**Impact**: 🟢 Admins gate-keep donations before disbursement

---

### 4. Update Disbursement to Check Payment Status

**Change**: Only verified donations can be disbursed

```javascript
// wecare-backend/controllers/disbursementController.js

export const disburseWithMatch = async (req, res) => {
  // ... existing code ...
  
  // Get the donation
  const donation = await Donation.findOne({
    _id: donationId,
    status: { $in: ["confirmed", "partially_disbursed"] }
  });

  if (!donation) {
    return res.status(404).json({ message: "Donation not found or not available" });
  }
  
  // NEW: Check payment verification
  if (donation.paymentStatus !== "verified") {
    return res.status(400).json({ 
      message: `Donation payment not verified. Status: ${donation.paymentStatus}` 
    });
  }

  // Rest of disbursement logic...
};
```

---

## PHASE 1B: Audit Logging System (2 hours)

### 5. Create AuditLog Model

**NEW Model**: Track all sensitive actions

```javascript
// wecare-backend/models/AuditLog.js

import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    enum: [
      "create_donation",
      "verify_payment",
      "create_aid_request",
      "approve_aid_request",
      "reject_aid_request",
      "disburse_aid",
      "confirm_delivery",
      "modify_user",
      "suspend_user",
      "approve_user"
    ]
  },
  
  actorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  actorRole: {
    type: String,
    enum: ["student", "donor", "admin", "superadmin"]
  },
  actorDepartment: { type: String }, // For admins
  actorUniversity: { type: String },
  
  targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
  targetType: {
    type: String,
    enum: ["donation", "aid_request", "user", "disbursement"],
    required: true
  },
  
  changes: { type: mongoose.Schema.Types.Mixed }, // What changed
  oldValue: { type: mongoose.Schema.Types.Mixed }, // Before
  newValue: { type: mongoose.Schema.Types.Mixed }, // After
  
  metadata: {
    ipAddress: String,
    userAgent: String,
    reason: String, // Why was this action taken
    notes: String
  },
  
  timestamp: { type: Date, default: Date.now, index: true }
}, {
  timestamps: true
});

// Index for faster queries
auditLogSchema.index({ actorId: 1, timestamp: -1 });
auditLogSchema.index({ targetId: 1, targetType: 1 });
auditLogSchema.index({ action: 1, timestamp: -1 });

export default mongoose.model("AuditLog", auditLogSchema);
```

---

### 6. Create Audit Logging Middleware

**NEW Middleware**: Automatic logging

```javascript
// wecare-backend/middleware/auditMiddleware.js

import AuditLog from "../models/AuditLog.js";

export const createAuditLog = async (action, req, targetId, targetType, changes = {}) => {
  try {
    await AuditLog.create({
      action,
      actorId: req.user._id,
      actorRole: req.user.role,
      actorDepartment: req.user.department,
      actorUniversity: req.user.university,
      targetId,
      targetType,
      changes,
      oldValue: changes.oldValue || null,
      newValue: changes.newValue || null,
      metadata: {
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
        reason: req.body.reason || req.body.notes,
        notes: req.body.verificationNotes
      },
      timestamp: new Date()
    });
  } catch (err) {
    console.error("Audit log failed:", err);
    // Don't block the main operation if logging fails
  }
};

// Middleware to wrap around sensitive routes
export const auditAction = (action, targetType) => {
  return async (req, res, next) => {
    // Store original send
    const originalSend = res.json;
    
    res.json = function(data) {
      // If successful response, log it
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const targetId = req.params.id || req.body.donationId || req.body.aidRequestId || data._id;
        if (targetId) {
          createAuditLog(action, req, targetId, targetType, {
            oldValue: req.body.oldValue,
            newValue: data
          }).catch(console.error);
        }
      }
      
      // Call original
      originalSend.call(this, data);
    };
    
    next();
  };
};
```

---

### 7. Add Audit Logging to Controllers

**Change**: Log critical actions

```javascript
// wecare-backend/controllers/donationController.js
import { createAuditLog } from "../middleware/auditMiddleware.js";

export const createDonation = async (req, res) => {
  try {
    // ... existing logic ...
    
    const donation = await Donation.create({ /* ... */ });
    
    // NEW: Log donation creation
    await createAuditLog("create_donation", req, donation._id, "donation", {
      newValue: {
        amount: donation.amount,
        type: donation.type,
        transactionId: donation.transactionId
      }
    });
    
    res.status(201).json(donation);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

export const verifyPayment = async (req, res) => {
  // ... existing logic ...
  
  await donation.save();
  
  // NEW: Log payment verification
  await createAuditLog("verify_payment", req, donation._id, "donation", {
    oldValue: { paymentStatus: "pending_verification" },
    newValue: { 
      paymentStatus: donation.paymentStatus,
      verifiedBy: req.user._id 
    }
  });
  
  res.json({ message: "Payment verified", donation });
};
```

---

## PHASE 1C: Dual Verification System (1-2 hours)

### 8. Add Approval Chain to AidRequest

**Change**: Track who approved vs who disburses

```javascript
// wecare-backend/models/AidRequest.js

const aidRequestSchema = new mongoose.Schema({
  // ... existing fields ...
  
  // NEW: Track approver separately from disburser
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  approvedAt: { type: Date },
  
  disbursingAdmin: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // NEW
  disbursedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  disbursedAt: { type: Date },
  
  // NEW: Prevent self-dealing
  canSelfApprove: { type: Boolean, default: false }, // Only true for small amounts
});
```

---

### 9. Enforce Different Admin for Approval vs Disbursement

**Change**: Disbursement controller checks

```javascript
// wecare-backend/controllers/disbursementController.js

export const disburseWithMatch = async (req, res) => {
  try {
    // ... existing validation ...
    
    const aidRequest = await AidRequest.findOne({
      _id: aidRequestId,
      university,
      status: { $in: ["approved"] } // Must be approved
    });
    
    if (!aidRequest) {
      return res.status(404).json({ message: "Aid request not found or not approved" });
    }
    
    // NEW: Check dual verification
    if (aidRequest.approvedBy && 
        aidRequest.approvedBy.toString() === req.user._id.toString()) {
      
      // Only allow self-disbursement for small amounts
      if (aidRequest.amount > 10000 && !aidRequest.canSelfApprove) {
        return res.status(403).json({ 
          message: "You cannot disburse aid that you approved. Another admin must complete disbursement for amounts over KES 10,000." 
        });
      }
    }
    
    // Set disbursing admin
    aidRequest.disbursingAdmin = req.user._id;
    
    // Rest of disbursement logic...
    
    await aidRequest.save();
    
    // NEW: Log disbursement
    await createAuditLog("disburse_aid", req, aidRequest._id, "aid_request", {
      oldValue: { status: "approved" },
      newValue: { 
        status: "disbursed",
        approvedBy: aidRequest.approvedBy,
        disbursedBy: req.user._id
      }
    });
    
    res.json({ message: "Aid disbursed successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
```

---

## PHASE 1D: Duplicate Request Prevention (30 mins)

### 10. Prevent Duplicate Aid Requests

**Change**: Check for existing pending requests

```javascript
// wecare-backend/controllers/aidController.js

export const createAidRequest = async (req, res) => {
  try {
    if (req.user.role !== "student") {
      return res.status(403).json({ message: "Only students can create aid requests" });
    }

    // NEW: Check for duplicate requests
    const existingRequest = await AidRequest.findOne({
      student: req.user._id,
      status: { $in: ["pending", "approved", "waiting"] },
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
    });

    if (existingRequest) {
      return res.status(400).json({ 
        message: `You already have a ${existingRequest.status} aid request created on ${existingRequest.createdAt.toLocaleDateString()}. Please wait for it to be processed.`,
        existingRequest: {
          _id: existingRequest._id,
          status: existingRequest.status,
          createdAt: existingRequest.createdAt
        }
      });
    }

    // Rest of creation logic...
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
```

---

## PHASE 1E: Student Snapshot (30 mins)

### 11. Immutable Student Record at Request Time

**Change**: Capture student details when request is made

```javascript
// wecare-backend/models/AidRequest.js

const aidRequestSchema = new mongoose.Schema({
  // ... existing fields ...
  
  // NEW: Student snapshot (immutable)
  studentSnapshot: {
    name: String,
    email: String,
    studentId: String,
    university: String,
    course: String,
    yearOfStudy: String,
    capturedAt: { type: Date, default: Date.now }
  },
});

// wecare-backend/controllers/aidController.js

export const createAidRequest = async (req, res) => {
  try {
    // ... validation ...
    
    const student = await User.findById(req.user._id);
    
    const aidRequest = await AidRequest.create({
      type,
      amount,
      items,
      reason,
      student: req.user._id,
      university: req.user.university,
      
      // NEW: Snapshot student data
      studentSnapshot: {
        name: student.name,
        email: student.email,
        studentId: student.studentId,
        university: student.university,
        course: student.course,
        yearOfStudy: student.yearOfStudy,
        capturedAt: new Date()
      }
    });
    
    res.status(201).json(aidRequest);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
```

---

## PHASE 1F: Routes & Frontend Updates (1 hour)

### 12. Add New Routes

```javascript
// wecare-backend/routes/donations.js

router.post("/verify-payment", verifyPayment);
router.get("/pending-verifications", getPendingVerifications);
```

### 13. Frontend: Transaction ID Input

**Change**: RegisterDonor and Donation creation pages

```javascript
// wecare-frontend/src/pages/donor/Donations.jsx

const [formData, setFormData] = useState({
  // ... existing fields
  transactionId: "",
  transactionProof: null
});

// In the form:
<div>
  <label>Transaction ID / M-Pesa Reference *</label>
  <input
    type="text"
    name="transactionId"
    value={formData.transactionId}
    onChange={handleChange}
    placeholder="e.g., RFL2K4M9XY"
    required
  />
  <p className="text-sm text-gray-500">
    Enter your M-Pesa confirmation code or bank transfer reference
  </p>
</div>

<div>
  <label>Upload Payment Proof (Optional)</label>
  <input
    type="file"
    accept="image/*,.pdf"
    onChange={(e) => setFormData({ ...formData, transactionProof: e.target.files[0] })}
  />
</div>
```

### 14. Frontend: Admin Payment Verification Page

**NEW Page**: Admin verifies donations

```javascript
// wecare-frontend/src/pages/dashboards/admin/AdminVerifyPayments.jsx

import { useState, useEffect } from "react";
import donationService from "../../../services/donationService";

export default function AdminVerifyPayments() {
  const [pendingDonations, setPendingDonations] = useState([]);

  useEffect(() => {
    fetchPending();
  }, []);

  const fetchPending = async () => {
    const data = await donationService.getPendingVerifications();
    setPendingDonations(data);
  };

  const handleVerify = async (donationId, verified, notes, actualAmount) => {
    await donationService.verifyPayment({
      donationId,
      verified,
      verificationNotes: notes,
      transactionAmount: actualAmount
    });
    fetchPending();
  };

  return (
    <div>
      <h2>Pending Payment Verifications</h2>
      
      {pendingDonations.map(donation => (
        <div key={donation._id} className="border p-4 mb-4">
          <h3>{donation.donor.name}</h3>
          <p>Amount: KES {donation.amount}</p>
          <p>Transaction ID: {donation.transactionId}</p>
          <p>Date: {new Date(donation.createdAt).toLocaleString()}</p>
          
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => handleVerify(donation._id, true, "Verified", donation.amount)}
              className="bg-green-500 text-white px-4 py-2 rounded"
            >
              ✓ Verify
            </button>
            
            <button
              onClick={() => {
                const notes = prompt("Reason for rejection:");
                if (notes) handleVerify(donation._id, false, notes, null);
              }}
              className="bg-red-500 text-white px-4 py-2 rounded"
            >
              ✗ Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
```

---

## Summary: What This Achieves

| Feature | Before | After | Time |
|---------|--------|-------|------|
| Fake donations | ✗ Anyone claims | ✓ Admin verifies first | 2h |
| Payment proof | ✗ None | ✓ Transaction ID required | 30m |
| Audit trail | ✗ None | ✓ All actions logged | 2h |
| Collusion prevention | ✗ Same admin | ✓ Different admin required | 1h |
| Duplicate requests | ✗ Unlimited | ✓ One per 30 days | 30m |
| Student ID swap | ✗ Possible | ✓ Snapshot captured | 30m |
| Disbursement safety | ✗ Any donation | ✓ Only verified donations | 30m |

**Total Time: 6-8 hours of development**

---

## What We're NOT Doing Yet (Requires External APIs)

❌ M-Pesa STK Push (auto-deduct from phone)
❌ Bank API integration (automatic verification)
❌ SMS notifications
❌ Email notifications

These require:
- M-Pesa Daraja API credentials
- Bank API access
- Twilio/Africa's Talking account
- SMTP server setup

**Can be added in Phase 2** once we have API credentials.

---

## Implementation Order

1. ✅ Update Donation model (payment fields)
2. ✅ Update donation creation (require transaction ID)
3. ✅ Create payment verification endpoint
4. ✅ Create AuditLog model
5. ✅ Add audit logging to controllers
6. ✅ Add dual verification check
7. ✅ Add duplicate request prevention
8. ✅ Add student snapshot
9. ✅ Update routes
10. ✅ Build frontend verification page

**Start with #1-3** (payment verification) - that's your biggest security win!

