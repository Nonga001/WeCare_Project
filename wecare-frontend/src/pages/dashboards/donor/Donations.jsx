import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { clearMyDonations, createDonation, getMyDonations, queryDonationStatus } from "../../../services/donationService";
import { ESSENTIAL_ITEMS } from "../../../constants/essentials";

const Donations = () => {
  const { user } = useAuth();
  const [form, setForm] = useState({ 
    type: "financial", 
    amount: "", 
    phoneNumber: "",
    items: [{ name: "", quantity: "" }],
    paymentMethod: "mpesa",
    notes: "" 
  });
  const [showModal, setShowModal] = useState(false);
  const [history, setHistory] = useState([]);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [paymentState, setPaymentState] = useState({
    status: "idle",
    donationId: null,
    message: "",
    startedAt: null
  });
  const paymentTimeoutMs = 2 * 60 * 1000;
  const paymentGraceMs = 2 * 60 * 1000;

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const handlePhone = (e) => {
    const digitsOnly = (e.target.value || "").replace(/\D/g, "").slice(0, 12);
    setForm({ ...form, phoneNumber: digitsOnly });
  };

  useEffect(() => {
    const raw = user?.phone || "";
    const digits = raw.replace(/\D/g, "");
    let normalized = "";
    if (digits.startsWith("254") && digits.length === 12) {
      normalized = digits;
    } else if (digits.startsWith("0") && digits.length === 10) {
      normalized = `254${digits.slice(1)}`;
    } else if (digits.length === 9) {
      normalized = `254${digits}`;
    }
    if (normalized && !form.phoneNumber) {
      setForm((prev) => ({ ...prev, phoneNumber: normalized }));
    }
  }, [user?.phone, form.phoneNumber]);

  const location = useLocation();
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const type = params.get("type");
    const amount = params.get("amount");
    const items = params.get("items");
    const requestId = params.get("requestId");
    setForm((prev) => ({
      ...prev,
      type: type === "essentials" ? "financial" : (type || prev.type),
      amount: amount && Number(amount) > 0 ? amount : "",
    }));
    if (type === "essentials") {
      setError("Essentials donations are temporarily unavailable.");
    }
    if (type === 'essentials' && items) {
      const parsed = items.split(";").map(p => {
        const [nameEnc, qtyStr] = p.split(":");
        return { name: decodeURIComponent(nameEnc), quantity: qtyStr };
      }).filter(x => x.name && x.quantity);
      if (parsed.length) {
        setForm((prev2) => ({ ...prev2, type: 'financial' }));
      }
    }
    if (requestId) {
      setForm((prev3) => ({ ...prev3, requestId }));
    }
  }, [location.search]);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const data = await getMyDonations(user?.token);
        setHistory(data);
      } catch (err) {
        console.error("Failed to load donation history:", err);
        setError(err.response?.data?.message || "Failed to load donation history");
      }
    };
    if (user?.token) loadHistory();
  }, [user?.token]);

  const refreshHistory = async () => {
    try {
      const data = await getMyDonations(user?.token);
      setHistory(data);
    } catch (err) {
      console.error("Failed to load donation history:", err);
    }
  };

  const upsertDonation = (updatedDonation) => {
    if (!updatedDonation?._id) return;
    setHistory((prev) => {
      const index = prev.findIndex((d) => d._id === updatedDonation._id);
      if (index === -1) return [updatedDonation, ...prev];
      const next = [...prev];
      next[index] = { ...next[index], ...updatedDonation };
      return next;
    });
  };

  const hasPending = useMemo(
    () => history.some((donation) => donation.status === "pending"),
    [history]
  );

  const getPaymentMethodLabel = (method) => {
    const value = String(method || "").toLowerCase();
    if (value === "sandbox") return "WeCare";
    if (value === "mpesa") return "M-Pesa";
    if (value === "bank_transfer") return "Bank Transfer";
    if (value === "card") return "Card";
    return method || "-";
  };

  const getReferenceId = (donation) =>
    donation?.transactionId || donation?.accountReference || donation?.mpesaReceiptNumber || "-";

  useEffect(() => {
    if (!user?.token || !hasPending) return undefined;
    const interval = setInterval(() => {
      refreshHistory();
    }, 5000);
    return () => clearInterval(interval);
  }, [user?.token, hasPending]);

  useEffect(() => {
    const onFocus = () => {
      if (user?.token) refreshHistory();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [user?.token]);

  useEffect(() => {
    if (!user?.token || !paymentState.donationId) return undefined;
    if (paymentState.status !== "waiting" && paymentState.status !== "timeout") return undefined;
    const startedAt = paymentState.startedAt || Date.now();
    const pollStatus = async () => {
      try {
        const data = await queryDonationStatus(user?.token, paymentState.donationId);
        if (data?.donation) upsertDonation(data.donation);
      } catch (err) {
        console.error("Failed to query donation status:", err);
      }
    };

    pollStatus();
    const interval = setInterval(pollStatus, 5000);
    const timeoutId = setTimeout(() => clearInterval(interval), paymentGraceMs - (Date.now() - startedAt));
    return () => {
      clearInterval(interval);
      clearTimeout(timeoutId);
    };
  }, [user?.token, paymentState.status, paymentState.donationId, paymentState.startedAt]);

  useEffect(() => {
    if (!paymentState.donationId) return;
    const latest = history.find((donation) => donation._id === paymentState.donationId);
    if (!latest) return;

    if (latest.status === "confirmed" || latest.mpesaReceiptNumber) {
      setPaymentState({
        status: "success",
        donationId: paymentState.donationId,
        message: "Payment confirmed. Thank you for your donation.",
        startedAt: paymentState.startedAt
      });
      return;
    }

    if (latest.status === "failed") {
      const desc = (latest.mpesaResultDesc || "").toLowerCase();
      const cancelled = desc.includes("cancelled") || desc.includes("canceled");
      setPaymentState({
        status: cancelled ? "canceled" : "failed",
        donationId: paymentState.donationId,
        message: latest.mpesaResultDesc || "Payment failed.",
        startedAt: paymentState.startedAt
      });
      return;
    }

    if (latest.status === "pending") {
      setPaymentState((prev) => ({
        ...prev,
        status: "waiting",
        message: "Prompt sent to phone. Waiting for confirmation..."
      }));
    }
  }, [history, paymentState.donationId]);

  useEffect(() => {
    if (paymentState.status !== "waiting" || !paymentState.startedAt) return;
    const checkTimeout = () => {
      const elapsed = Date.now() - paymentState.startedAt;
      if (elapsed >= paymentTimeoutMs) {
        setPaymentState((prev) => ({
          ...prev,
          status: "timeout",
          message: "No response received yet. We will keep checking briefly."
        }));
      }
    };

    const timeoutId = setTimeout(checkTimeout, paymentTimeoutMs);
    return () => clearTimeout(timeoutId);
  }, [paymentState.status, paymentState.startedAt]);

  const handleClearHistory = async () => {
    if (!history.length || clearing) return;
    const confirmed = window.confirm(
      "This will permanently delete your donation history. Continue?"
    );
    if (!confirmed) return;

    try {
      setClearing(true);
      setError("");
      setSuccess("");
      await clearMyDonations(user?.token);
      setHistory([]);
      setSuccess("Donation history cleared.");
    } catch (err) {
      const message = err.response?.data?.message || "Failed to clear donation history";
      setError(message);
    } finally {
      setClearing(false);
    }
  };

  const addItem = () => {
    const allValid = form.items.every(item => item.name && item.quantity && Number(item.quantity) > 0);
    if (!allValid) return; // prevent adding blanks/duplicates when current items invalid
    setForm({ ...form, items: [...form.items, { name: "", quantity: "" }] });
  };

  const removeItem = (index) => {
    const newItems = form.items.filter((_, i) => i !== index);
    setForm({ ...form, items: newItems });
  };

  const updateItem = (index, field, value) => {
    const newItems = form.items.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    );
    setForm({ ...form, items: newItems });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (form.type === "essentials") {
      setError("Essentials donations are temporarily unavailable.");
      return;
    }

    // Validation
    if (form.type === "financial") {
      const numericAmount = Number(form.amount);
      if (!form.amount || isNaN(numericAmount) || numericAmount <= 0) {
        setError("Amount must be greater than 0");
        return;
      }
      const phoneDigits = (form.phoneNumber || "").replace(/\D/g, "");
      const phoneRegex = /^254[71]\d{8}$/; // exactly 12 digits total
      if (!phoneDigits || !phoneRegex.test(phoneDigits)) {
        setError("Enter a valid phone starting with 2547 or 2541 (12 digits)");
        return;
      }
    } else {
      const validItems = form.items.filter(item => item.name && item.quantity && Number(item.quantity) > 0);
      if (validItems.length === 0) {
        setError("Please add at least one valid item");
        return;
      }
    }

    try {
      setLoading(true);
      setPaymentState({
        status: "waiting",
        donationId: null,
        message: "Sending prompt...",
        startedAt: Date.now()
      });
      const payload = {
        type: form.type,
        paymentMethod: form.paymentMethod,
        notes: form.notes
      };

      if (form.type === "financial") {
        payload.amount = Number(form.amount);
        payload.phoneNumber = (form.phoneNumber || "").replace(/\D/g, "");
      } else {
        payload.items = form.items.filter(item => item.name && item.quantity && Number(item.quantity) > 0);
      }

      const response = await createDonation(user?.token, payload);
      if (response?.donation) {
        setPaymentState({
          status: "waiting",
          donationId: response.donation._id,
          message: "Prompt sent to phone. Waiting for confirmation...",
          startedAt: Date.now()
        });
        upsertDonation(response.donation);
      }
      if (response?.mpesa?.CheckoutRequestID) {
        setSuccess("M-Pesa prompt sent. Please complete the payment on your phone.");
      } else {
        setSuccess("Donation created successfully.");
      }
      setShowModal(true);
      await refreshHistory();

    } catch (err) {
      const message = err.response?.data?.message || "Error calling API";
      setError(message);
      setPaymentState({ status: "failed", donationId: null, message, startedAt: null });
      setShowModal(true);
    } finally {
      setLoading(false);
    }
  };

  const isWaitingForPayment = paymentState.status === "waiting";
  const canCloseModal = true;
  const handleCloseModal = () => {
    setShowModal(false);
    if (!isWaitingForPayment) {
      setPaymentState({ status: "idle", donationId: null, message: "", startedAt: null });
    }
  };
  const handleOpenModal = () => {
    if (paymentState.status === "waiting") {
      setPaymentState({ status: "idle", donationId: null, message: "", startedAt: null });
    }
    setShowModal(true);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        {error && (
          <div className="alert alert-error">
            <p>{error}</p>
          </div>
        )}
        
        {success && (
          <div className="alert alert-success">
            <p>{success}</p>
          </div>
        )}

        <div className="card p-5">
          <h3 className="mb-2">Make a Donation</h3>
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">Click donate to enter your amount and details in a quick popup.</p>
          <button
            type="button"
            onClick={handleOpenModal}
            className="btn btn-primary w-full"
          >
            Donate
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-slate-800 dark:text-slate-100">Donation History</h4>
            {history.length > 0 && (
              <button
                type="button"
                onClick={handleClearHistory}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700"
                disabled={clearing}
              >
                {clearing ? "Clearing..." : "Clear history"}
              </button>
            )}
          </div>
          <div className={`space-y-3 ${showAllHistory && history.length > 5 ? 'max-h-96 overflow-y-auto pr-1' : ''}`}>
            {history.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">No donations yet.</p>
            ) : (
              (showAllHistory ? history : history.slice(0,5)).map((donation) => (
                <div key={donation._id} className="card p-3">
                  <p className="text-slate-700 dark:text-slate-200 text-sm">
                    <span className="font-medium">{donation.type}:</span> {
                      donation.type === 'financial' 
                        ? `KES ${donation.amount?.toLocaleString()}` 
                        : donation.items?.map(i => `${i.name} x${i.quantity}`).join(', ')
                    }
                  </p>
                  <p className="text-slate-500 dark:text-slate-400 text-xs">
                    {getPaymentMethodLabel(donation.paymentMethod)} • {new Date(donation.createdAt).toLocaleString()}
                  </p>
                  <p className="text-slate-500 dark:text-slate-400 text-xs">
                    Reference: {getReferenceId(donation)}
                  </p>
                  <p className="text-slate-500 dark:text-slate-400 text-xs">
                    Status: <span className={`font-medium ${
                      (donation.status || 'pending') === 'pending' ? 'text-yellow-600' :
                      donation.status === 'confirmed' ? 'text-blue-600' :
                      donation.status === 'disbursed' ? 'text-green-600' :
                      donation.status === 'failed' ? 'text-rose-600' : 'text-gray-600'
                    }`}>{donation.status || 'pending'}</span>
                  </p>
                  {donation.mpesaResultDesc && (
                    <p className="text-slate-500 dark:text-slate-400 text-xs">
                      Result: {donation.mpesaResultDesc}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
          {history.length > 5 && (
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => setShowAllHistory((v) => !v)}
                className="text-sm font-semibold text-stone-800 hover:text-stone-900 dark:text-stone-100"
              >
                {showAllHistory ? 'Show less' : `View more (${history.length - 5})`}
              </button>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-2xl p-6 border border-stone-200 dark:border-stone-700">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100">Complete Your Donation</h3>
                <p className="text-sm text-slate-600 dark:text-stone-300">Add your amount or items and confirm.</p>
              </div>
              <button
                onClick={handleCloseModal}
                className={`text-stone-500 hover:text-stone-700 ${canCloseModal ? "" : "opacity-40 cursor-not-allowed"}`}
                disabled={!canCloseModal}
                title="Close"
              >
                ✕
              </button>
            </div>

            {paymentState.status !== "idle" && (
              <div className="mb-4 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-slate-800 p-3">
                <div className="flex items-center gap-2">
                  {paymentState.status === "waiting" && (
                    <span className="inline-flex items-center gap-2 text-amber-700 dark:text-amber-300 text-sm">
                      <span className="h-4 w-4 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
                      Waiting for payment confirmation. Please keep this page open.
                    </span>
                  )}
                  {paymentState.status === "success" && (
                    <span className="text-emerald-700 dark:text-emerald-300 text-sm">✓ Payment successful.</span>
                  )}
                  {paymentState.status === "failed" && (
                    <span className="text-rose-700 dark:text-rose-300 text-sm">⚠ Payment failed.</span>
                  )}
                  {paymentState.status === "timeout" && (
                    <span className="text-amber-700 dark:text-amber-300 text-sm">⏳ Payment taking longer than usual.</span>
                  )}
                  {paymentState.status === "canceled" && (
                    <span className="text-slate-700 dark:text-slate-300 text-sm">✖ Payment canceled.</span>
                  )}
                </div>
                {paymentState.message && (
                  <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                    {paymentState.message}
                  </p>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Donation Type</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, type: "financial" })}
                    className={`btn ${form.type === "financial" ? 'btn-primary' : 'btn-ghost border'}`}
                  >
                    Financial
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, type: "essentials" })}
                    disabled
                    className="btn btn-ghost border opacity-50 cursor-not-allowed"
                    title="Essentials donations are temporarily unavailable"
                  >
                    Essentials
                  </button>
                </div>
              </div>

              {form.type === "financial" && (
                <div>
                  <label className="label">Phone Number (Mpesa)</label>
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={form.phoneNumber}
                    onChange={handlePhone}
                    placeholder="2547XXXXXXXX or 2541XXXXXXXX"
                    className="input mb-3"
                    inputMode="numeric"
                    maxLength={12}
                    title="Enter 12 digits starting with 2547 or 2541"
                    required
                  />
                  <label className="label">Amount (KES)</label>
                  <input
                    type="number"
                    name="amount"
                    value={form.amount}
                    onChange={handle}
                    placeholder="Enter amount"
                    className="input"
                    min={1}
                    required
                  />
                </div>
              )}

              {form.type === "essentials" && (
                <div>
                  <label className="label">Essential Items</label>
                  {form.items.map((item, index) => (
                    <div key={index} className="flex gap-3 mb-3">
                      <select
                        value={item.name}
                        onChange={(e) => updateItem(index, "name", e.target.value)}
                        className="input flex-1"
                        required
                      >
                        <option value="">Select item</option>
                        {ESSENTIAL_ITEMS.map(essential => (
                          <option key={essential} value={essential}>{essential}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, "quantity", e.target.value)}
                        className="input w-24"
                        min={1}
                        required
                      />
                      {form.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="btn btn-ghost text-rose-600 hover:text-rose-700"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addItem}
                    className="btn btn-ghost text-brand-600"
                  >
                    + Add another item
                  </button>
                </div>
              )}

              <div>
                <label className="label">Payment Method</label>
                <p className="text-sm text-slate-600">M-Pesa (only available method for now)</p>
                <p className="text-xs text-slate-500 mt-1">
                  A donation can fail if M-Pesa is not configured, the phone/amount is invalid, or the
                  M-Pesa request is declined or times out.
                </p>
              </div>

              <div>
                <label className="label">Notes (Optional)</label>
                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={handle}
                  placeholder="Any additional notes..."
                  rows={3}
                  className="input resize-none"
                />
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="btn btn-ghost"
                  disabled={!canCloseModal}
                >
                  {isWaitingForPayment ? "Close" : "Close"}
                </button>
                <button
                  type="submit"
                  disabled={
                    loading ||
                    paymentState.status === "waiting" ||
                    (form.type === "financial" && ((form.phoneNumber || "").replace(/\D/g, "").length !== 12)) ||
                    (form.type === "essentials" && !form.items.every(it => it.name && it.quantity && Number(it.quantity) > 0))
                  }
                  className="btn btn-primary"
                >
                  {loading ? "Processing..." : "Make Donation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Donations;