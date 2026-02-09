# WeCare Platform - Security & Verification Audit

## Executive Summary
This document outlines current verification mechanisms and identifies security gaps in the donation and disbursement flow. The platform handles sensitive financial and personal data requiring robust verification protocols.

---

## SCENARIO 1: Verification of Genuine Aid Requests & Donor Liability

### Current State ✅
```
✓ Student profile verification required (profileApproved by admin)
✓ Aid request reason provided but NOT VALIDATED
✓ Donor receives "confirmed" status on donation creation
✓ Admin verifies donation-request match before disbursement
```

### Current Implementation
- **Student Registration**: Documents uploaded, admin approval required
- **Aid Request**: Student submits `reason` field (free text)
- **Donation**: Created with "confirmed" status (no payment verification)
- **Disbursement**: Admin matches donation to request manually

### CRITICAL GAPS 🔴

**Gap 1.1: No Payment Verification**
```javascript
// Current: Donation created immediately as "confirmed"
const donation = await Donation.create({
  // ... other fields
  status: "confirmed"  // ❌ No actual payment processed!
});
```
**Problem**: Donors can claim donations without actual payment
**Risk Level**: CRITICAL - Financial fraud

**Gap 1.2: No Aid Request Validation**
```javascript
const aidRequest = new AidRequest({
  reason: req.body.reason,  // ❌ Free text, no validation
  status: "pending"
});
```
**Problem**: No cross-reference with actual need, no income verification
**Risk Level**: HIGH - False claims

**Gap 1.3: No Student Eligibility Verification**
```javascript
// Missing checks:
- Income threshold verification
- University enrollment verification
- Duplicate aid request detection
- Previous aid recipient status
```

### Recommendations 🛠️

**1. Payment Gateway Integration**
```javascript
// Add payment verification before confirmation
status: paymentMethod === "mpesa" ? "pending_verification" : "confirmed"
// Verify payment through payment provider API
```

**2. Aid Request Validation System**
```javascript
// Add fields to AidRequest model
{
  reason: String,                    // Why do you need this?
  incomeProof: String,              // Path to income verification
  estimatedMonthlyIncome: Number,   // Household income
  familySize: Number,               // Number of dependents
  previousAidAmount: Number,        // Already received
  reasonCategory: {                  // Standardized reason
    type: String,
    enum: ["tuition", "food", "medical", "accommodation", "utilities"]
  },
  supportingDocuments: [String],    // Links to proof
  validatedAt: Date,
  validatedBy: ObjectId            // Which admin verified
}
```

**3. Eligibility Criteria Engine**
```javascript
const eligibilityCriteria = {
  monthlyIncome: { max: 25000 },      // Max income threshold
  familySize: { min: 2, max: 10 },   // Valid range
  previousAidWindow: { months: 6 },  // Prevent double-dipping
  maxAidPerStudent: { amount: 50000 } // Annual cap
};
```

---

## SCENARIO 2: Collaborative Fraud Prevention (Cross-Rank Collusion)

### Current State ⚠️
```
Risk: Student + Admin collusion to steal donations
Mechanism: Admin creates false aid request + Student claims it + Disburse to personal account
```

### CRITICAL VULNERABILITIES 🔴

**Vulnerability 2.1: Insufficient Admin Verification**
```javascript
// Current disbursement process
const aidRequest = await AidRequest.findOne({
  _id: aidRequestId,
  university,
  status: { $in: ["pending", "approved"] }
});

const donation = await Donation.findOne({
  _id: donationId,
  status: { $in: ["confirmed", "partially_disbursed"] }
});

// ❌ Missing:
// - Verification that admin who created request != admin who disburses
// - No approval chain
// - No donor consent
// - No super-admin oversight
```

**Attack Vector**: 
1. Corrupt admin creates fake "approved" aid request
2. Student colludes to claim it
3. Admin disburses from available donation
4. Money transferred to student personal account
5. No trail back to specific admin decision

**Vulnerability 2.2: No Donor Consent/Transparency**
```javascript
// Donors CANNOT see:
- Which students receive their donations
- Individual disbursement records
- Proof of delivery
- Refusal/rejection rights
```

**Vulnerability 2.3: No Department Segregation**
```javascript
// Current: Admin from department "welfare" can:
// - Create aid requests
// - Approve aid requests
// - Disburse aid
// - View all donations

// ❌ Missing: Separation of duties
```

**Vulnerability 2.4: No Audit Trail for Sensitive Actions**
```javascript
// Missing AuditLog model to track:
- Who created the request?
- When did admin approve it?
- Which admin processed disbursement?
- What was the justification?
- Any modifications after creation?
```

### Recommendations 🛠️

**1. Implement Dual Verification**
```javascript
// Add to AidRequest model
{
  createdBy: ObjectId,              // Student ID
  approvedBy: ObjectId,             // Admin #1
  disbursingAdmin: ObjectId,        // Admin #2 (must be different!)
  requiresDonorConsent: Boolean,    // For large amounts
  superAdminApproved: Boolean,      // For amounts > threshold
}

// In disbursement controller:
if (aidRequest.disbursingAdmin === aidRequest.approvedBy) {
  return res.status(403).json({
    message: "Approving and disbursing admin must be different"
  });
}
```

**2. Create Audit Log**
```javascript
// New Model: AuditLog
{
  action: String,              // "create_request", "approve", "disburse"
  actorId: ObjectId,          // Who did it
  actorRole: String,          // "admin", "superadmin"
  actorDepartment: String,    // "welfare", "gender", "health"
  targetId: ObjectId,         // Aid request or donation ID
  targetType: String,         // "aid_request", "donation"
  changes: Object,            // What changed
  ipAddress: String,          // For forensics
  timestamp: Date,
  approved: Boolean,          // Did subsequent action approve this?
  approvedBy: ObjectId        // Who approved it
}

// Log every action:
AuditLog.create({
  action: "disburse_aid",
  actorId: req.user._id,
  targetId: aidRequest._id,
  changes: { status: "disbursed" },
  timestamp: new Date()
});
```

**3. Donor Notification & Consent**
```javascript
// For disbursement, send to donor:
{
  recipient: donation.donor._id,
  subject: "Your donation matched and disbursed",
  message: `Your donation of KES ${amount} was disbursed to ${studentName} for ${reason}`,
  studentConsent: "accepted",  // Recipient confirms receipt
  proofOfDelivery: String,     // Photo/receipt from student
  timestamp: Date
}
```

**4. Role Segregation**
```javascript
// Update authMiddleware to enforce:
admin: {
  canCreate: false,          // Cannot create aid requests (only approve/disburse)
  canApprove: true,
  canDisburse: true,
  canOversee: false          // Cannot review other admin actions
}

superadmin: {
  canCreate: false,
  canApprove: false,
  canDisburse: false,
  canOversee: true,          // Can review all actions
  canApproveHighValue: true  // Amounts > threshold
}
```

**5. High-Value Threshold Approval**
```javascript
// Any disbursement > 30,000 KES requires superadmin approval
if (aidRequest.amount > 30000 || donation.amount > 30000) {
  aidRequest.requiresSuperAdminApproval = true;
  aidRequest.status = "pending_superadmin";
  // Notify superadmin
}
```

---

## SCENARIO 3: Disbursement Delivery Verification

### Current State ❌
```
✗ No proof that student actually received the money/items
✗ No receipt/acknowledgment from student
✗ No follow-up verification
✗ No dispute resolution mechanism
```

### Current Gap Analysis
```javascript
// AidRequest disbursed, but:
aidRequest.disbursedAt = new Date();  // ❌ System time, not actual delivery
// Missing:
// - Student signature/confirmation
// - Recipient feedback
// - Payment confirmation (for bank transfers)
// - Item inventory check (for essentials)
// - Dispute period
```

### Recommendations 🛠️

**1. Add Delivery Confirmation Flow**
```javascript
// New Model: DisbursementConfirmation
{
  disbursementId: ObjectId,        // Links to disbursement record
  aidRequestId: ObjectId,
  studentId: ObjectId,
  
  // Delivery tracking
  deliveryMethod: {
    type: String,
    enum: ["bank_transfer", "mpesa", "physical_pickup", "courier"]
  },
  
  // For financial: Bank details
  bankDetails: {
    accountNumber: String,
    bankName: String,
    transferReference: String,
    transferDate: Date
  },
  
  // For essentials: Inventory
  itemsReceived: [{
    name: String,
    quantityReceived: Number,
    quantityExpected: Number,
    condition: String,             // "good", "damaged", "partial"
    notes: String
  }],
  
  // Student confirmation
  studentConfirmed: Boolean,
  studentConfirmedAt: Date,
  studentSignature: String,        // Digital signature/photo
  studentPhone: String,            // For verification callback
  
  // Photo proof
  proofOfDelivery: [String],       // Photos/receipts
  
  // Verification
  verifiedBy: ObjectId,            // Admin who verified
  verifiedAt: Date,
  verificationMethod: String,      // "phone_call", "in_person", "bank_statement"
  
  // Dispute resolution
  status: {                         // "pending", "confirmed", "disputed", "resolved"
    type: String
  },
  dispute: {
    reason: String,
    reportedAt: Date,
    evidenceFiles: [String],
    resolution: String,
    resolvedAt: Date
  }
}
```

**2. Automated Verification Flow**
```javascript
// Step 1: Generate delivery notice
const deliveryNotice = {
  studentEmail: student.email,
  studentPhone: student.phone,
  message: `Your aid of KES ${amount} will be disbursed. Please confirm receipt within 48 hours.`,
  confirmationDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000),
  confirmationLink: `/confirm-disbursement/${disbursementId}`
};

// Step 2: Track student confirmation
router.post("/confirm-disbursement/:id", async (req, res) => {
  const confirmation = await DisbursementConfirmation.findByIdAndUpdate(id, {
    studentConfirmed: true,
    studentConfirmedAt: new Date(),
    studentSignature: req.body.signature,
    proofOfDelivery: req.files.proofPhotos
  });
});

// Step 3: Admin verification (for high values)
if (disbursementAmount > 20000) {
  // Admin calls student to verify
  // Upload verification call recording/notes
  await DisbursementConfirmation.updateOne({
    verifiedBy: req.user._id,
    verificationMethod: "phone_call",
    verifiedAt: new Date()
  });
}

// Step 4: Dispute window (30 days)
setTimeout(() => {
  const disputeWindow = new Date();
  if (!confirmation.disputed && confirmation.status === "pending") {
    // Auto-confirm after 30 days of no dispute
    confirmation.status = "confirmed";
  }
}, 30 * 24 * 60 * 60 * 1000);
```

**3. Bank Reconciliation**
```javascript
// New endpoint to verify bank transfers actually posted
export const verifyBankTransfers = async (req, res) => {
  // For each disbursement with method "bank_transfer":
  const unverified = await DisbursementConfirmation.find({
    deliveryMethod: "bank_transfer",
    status: "pending",
    verifiedAt: null
  });

  for (const record of unverified) {
    // Call bank API to verify transaction posted
    const bankStatus = await bankAPI.verifyTransfer(
      record.bankDetails.transferReference
    );
    
    if (bankStatus === "completed") {
      record.status = "confirmed";
      record.verifiedAt = new Date();
      await record.save();
    }
  }
};
```

**4. Essentials Delivery Photo Proof**
```javascript
// For essentials disbursements, require photos:
{
  itemsReceived: [{
    name: "Rice (50kg)",
    quantityReceived: 1,
    photos: [
      "/uploads/rice-delivered-1.jpg",
      "/uploads/rice-delivered-2.jpg"
    ],
    condition: "good"
  }],
  proofOfDelivery: [
    "/uploads/full-delivery-photo.jpg"
  ]
}
```

---

## ADDITIONAL SECURITY SCENARIOS

### Scenario 4: Duplicate/Multiple Aid Requests from Same Student

**Current Gap**: No duplicate prevention
```javascript
// Student can submit unlimited requests
// Missing check:
const existingRequest = await AidRequest.findOne({
  student: req.body.studentId,
  status: { $in: ["pending", "approved", "disbursed"] },
  createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
});

if (existingRequest) {
  return res.status(400).json({ message: "You already have a pending request" });
}
```

**Risk**: Same student receiving multiple donations for same need

---

### Scenario 5: Donation Amount Misrepresentation

**Current Gap**: Donor claims donation of KES 100,000 but only transfers 50,000
```javascript
// Solution: Link to payment provider
{
  transactionId: String,
  transactionAmount: Number,      // From payment provider
  claimedAmount: Number,          // What donor claimed
  verified: Boolean,
  
  // Verify match:
  if (transactionAmount !== claimedAmount) {
    donation.status = "amount_mismatch";
    // Flag for superadmin review
  }
}
```

---

### Scenario 6: Admin Changing Student Identity During Disbursement

**Current Gap**: No immutable record of WHO is receiving aid
```javascript
// Add field to prevent modification:
aidRequest: {
  student: ObjectId,  // Cannot be changed after creation
  studentSnapshot: {
    name: "John Doe",
    email: "john@uni.ac.ke",
    studentId: "STU2024001",
    capturedAt: Date  // Moment of request creation
  }
  // If disputes, refer to snapshot, not current profile
}
```

---

### Scenario 7: Donation Redirection Without Donor Knowledge

**Current Gap**: Admin can disburse donor's gift to unintended recipient
```javascript
// Solution: Donor-Specified Recipients
{
  donorPreferences: {
    specificStudents: [ObjectId],      // Only these students
    categories: ["tuition", "food"],   // Only these types
    universities: ["UoN", "JKUAT"],    // Only these unis
    maxPerRecipient: 10000,            // Max per student
    autoApprove: Boolean               // Auto-disburse or manual
  }
}
```

---

### Scenario 8: Unauthorized Access by Compromised Admin Account

**Current Gap**: Single JWT token grants full access
```javascript
// Solutions:
1. Session management with logout
2. IP address tracking and whitelisting
3. Rate limiting on sensitive endpoints
4. Multi-factor authentication for admins
5. Activity monitoring and alerts

// Add to authMiddleware:
const recentActivity = await AuditLog.find({
  actorId: req.user._id,
  timestamp: { $gte: new Date(Date.now() - 5 * 60 * 1000) } // Last 5 mins
});

if (recentActivity.length > 10) {
  // Alert: Unusual activity detected
  // Possible account compromise
}
```

---

### Scenario 9: Partial Disbursement Abuse

**Current Gap**: Donation can be split indefinitely across fake requests
```javascript
// Current:
donation.status = "partially_disbursed"  // Can happen unlimited times

// Solution: Disbursement history limit
{
  disbursedTo: [
    { aidRequestId, amount, disbursedAt }
  ],
  maxDisbursements: 5,  // Max recipients per donation
  
  // Check:
  if (donation.disbursedTo.length >= donation.maxDisbursements) {
    return res.status(400).json({ 
      message: "This donation has reached its disbursement limit"
    });
  }
}
```

---

### Scenario 10: Donation from Blacklisted/Sanctioned Entities

**Current Gap**: No donor background verification
```javascript
// Add to Donation model:
{
  donor: ObjectId,
  donorVerified: Boolean,
  
  // Check against:
  // - Sanctioned individuals list
  // - Known fraudsters
  // - Business associations
  // - Politically exposed persons (PEPs)
  
  complianceCheck: {
    status: String,  // "pending", "clear", "blocked", "flagged"
    checkedAt: Date,
    checkedBy: String,  // Compliance officer
    findings: String
  }
}
```

---

## SUMMARY TABLE: Current vs Recommended

| Scenario | Current State | Risk Level | Recommendation | Effort |
|----------|--------------|-----------|-----------------|--------|
| 1. Genuine Requests | No payment verification | CRITICAL | Payment gateway integration | HIGH |
| 2. Fraud Prevention | Minimal audit trail | CRITICAL | Dual verification + audit logs | HIGH |
| 3. Delivery Proof | No receipt confirmation | HIGH | Confirmation + bank reconciliation | MEDIUM |
| 4. Duplicate Requests | No prevention | HIGH | Query-based deduplication | LOW |
| 5. Amount Verification | No validation | MEDIUM | Payment provider API check | MEDIUM |
| 6. Student ID Swap | No immutable record | HIGH | Snapshot at request time | LOW |
| 7. Donation Redirect | No donor control | MEDIUM | Donor preferences model | MEDIUM |
| 8. Account Compromise | Single token | HIGH | Session + MFA + monitoring | HIGH |
| 9. Over-Disbursement | Unlimited splits | MEDIUM | Limit per donation | LOW |
| 10. Sanctioned Donors | No background check | MEDIUM | Compliance check integration | MEDIUM |

---

## IMPLEMENTATION PRIORITY

**Phase 1 (CRITICAL - Week 1)**
- [ ] Add payment verification
- [ ] Implement audit logging
- [ ] Add dual admin requirement
- [ ] Create audit log model

**Phase 2 (HIGH - Week 2-3)**
- [ ] Delivery confirmation flow
- [ ] Bank reconciliation
- [ ] Duplicate request prevention
- [ ] Donor preferences

**Phase 3 (MEDIUM - Week 4)**
- [ ] MFA for admins
- [ ] Compliance checks
- [ ] Advanced monitoring
- [ ] Student ID snapshots

---

## Conclusion

Your current system has **4 CRITICAL gaps** and **10 HIGH/MEDIUM gaps**. The most dangerous is the **lack of audit trail combined with no dual verification**, which enables admin-student collusion to steal donations undetected.

**Recommendation**: Implement Phase 1 immediately before accepting real donations.

