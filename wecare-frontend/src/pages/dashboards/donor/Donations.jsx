import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { createDonation, getMyDonations } from "../../../services/donationService";
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
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const handlePhone = (e) => {
    const digitsOnly = (e.target.value || "").replace(/\D/g, "").slice(0, 12);
    setForm({ ...form, phoneNumber: digitsOnly });
  };

  const location = useLocation();
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const type = params.get("type");
    const amount = params.get("amount");
    const items = params.get("items");
    const requestId = params.get("requestId");
    setForm((prev) => ({
      ...prev,
      type: type || prev.type,
      amount: amount && Number(amount) > 0 ? amount : "",
    }));
    if (type === 'essentials' && items) {
      const parsed = items.split(";").map(p => {
        const [nameEnc, qtyStr] = p.split(":");
        return { name: decodeURIComponent(nameEnc), quantity: qtyStr };
      }).filter(x => x.name && x.quantity);
      if (parsed.length) {
        setForm((prev2) => ({ ...prev2, type: 'essentials', items: parsed }));
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
      }
    };
    if (user?.token) loadHistory();
  }, [user?.token]);

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

      await createDonation(user?.token, payload);
      // Show API error instead of success per request, and do not mutate history
      setSuccess("");
      setError("Error calling API");
      setShowModal(false);
      // keep form values and history unchanged

    } catch (err) {
      setError(err.response?.data?.message || "Error calling API");
      setShowModal(false);
    } finally {
      setLoading(false);
    }
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
          <p className="text-sm text-slate-600 mb-4">Click donate to enter your amount and details in a quick popup.</p>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="btn btn-primary w-full"
          >
            Donate
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="card p-5">
          <h4 className="font-semibold text-slate-800 mb-3">Donation History</h4>
          <div className={`space-y-3 ${showAllHistory && history.length > 5 ? 'max-h-96 overflow-y-auto pr-1' : ''}`}>
            {history.length === 0 ? (
              <p className="text-sm text-slate-500">No donations yet.</p>
            ) : (
              (showAllHistory ? history : history.slice(0,5)).map((donation) => (
                <div key={donation._id} className="card p-3">
                  <p className="text-slate-700 text-sm">
                    <span className="font-medium">{donation.type}:</span> {
                      donation.type === 'financial' 
                        ? `KES ${donation.amount?.toLocaleString()}` 
                        : donation.items?.map(i => `${i.name} x${i.quantity}`).join(', ')
                    }
                  </p>
                  <p className="text-slate-500 text-xs">
                    {donation.paymentMethod} • {new Date(donation.createdAt).toLocaleDateString()}
                  </p>
                  <p className="text-slate-500 text-xs">
                    Status: <span className={`font-medium ${
                      donation.status === 'pending' ? 'text-yellow-600' :
                      donation.status === 'confirmed' ? 'text-blue-600' :
                      donation.status === 'disbursed' ? 'text-green-600' : 'text-gray-600'
                    }`}>{donation.status}</span>
                  </p>
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
              <button onClick={() => setShowModal(false)} className="text-stone-500 hover:text-stone-700">✕</button>
            </div>

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
                    className={`btn ${form.type === "essentials" ? 'btn-primary' : 'btn-ghost border'}`}
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
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-ghost">Cancel</button>
                <button
                  type="submit"
                  disabled={
                    loading ||
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