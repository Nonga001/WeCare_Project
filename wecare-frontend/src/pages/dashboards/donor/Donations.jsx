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
    items: [{ name: "", quantity: "" }],
    paymentMethod: "mpesa",
    organization: "",
    notes: "" 
  });
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

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
      amount: amount || prev.amount,
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
      if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0) {
        setError("Please enter a valid amount");
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
        notes: form.notes,
        organization: form.organization || undefined
      };

      if (form.type === "financial") {
        payload.amount = Number(form.amount);
      } else {
        payload.items = form.items.filter(item => item.name && item.quantity && Number(item.quantity) > 0);
      }

      await createDonation(user?.token, payload);
      setSuccess("Donation submitted successfully! Thank you for your support.");
      
      // Reset form
      setForm({ 
        type: "financial", 
        amount: "", 
        items: [{ name: "", quantity: "" }],
        paymentMethod: "mpesa",
        organization: "",
        notes: "" 
      });

      // Hide donated request locally
      if (form.requestId) {
        try {
          const raw = localStorage.getItem("hiddenAidRequests");
          const arr = raw ? JSON.parse(raw) : [];
          if (!arr.includes(form.requestId)) {
            arr.push(form.requestId);
            localStorage.setItem("hiddenAidRequests", JSON.stringify(arr));
          }
        } catch {
          // ignore
        }
      }

      // Reload history
      const data = await getMyDonations(user?.token);
      setHistory(data);

    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit donation");
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
          <h3 className="mb-4">Make a Donation</h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Donation Type */}
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

            {/* Financial Donation */}
            {form.type === "financial" && (
              <div>
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

            {/* Essentials Donation */}
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

            {/* Payment Method */}
            <div>
              <label className="label">Payment Method</label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, paymentMethod: "mpesa" })}
                  className={`btn ${form.paymentMethod === 'mpesa' ? 'btn-primary' : 'btn-ghost border'}`}
                >
                  M-Pesa
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, paymentMethod: "bank_transfer" })}
                  className={`btn ${form.paymentMethod === 'bank_transfer' ? 'btn-primary' : 'btn-ghost border'}`}
                >
                  Bank Transfer
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, paymentMethod: "card" })}
                  className={`btn ${form.paymentMethod === 'card' ? 'btn-primary' : 'btn-ghost border'}`}
                >
                  Card
                </button>
              </div>
            </div>

            {/* Organization (optional) */}
            <div>
              <label className="label">Organization (Optional)</label>
              <input
                type="text"
                name="organization"
                value={form.organization}
                onChange={handle}
                placeholder="Your organization name"
                className="input"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="label">Notes (Optional)</label>
              <textarea
                name="notes"
                value={form.notes}
                onChange={handle}
                placeholder="Any additional notes..."
                rows={3}
                className="input"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full"
            >
              {loading ? "Processing..." : "Donate Now"}
            </button>
          </form>
        </div>
      </div>

      <div className="space-y-4">
        <div className="card p-5">
          <h4 className="font-semibold text-slate-800 mb-3">Donation History</h4>
          <div className="space-y-3">
            {history.length === 0 ? (
              <p className="text-sm text-slate-500">No donations yet.</p>
            ) : (
              history.map((donation) => (
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
        </div>
      </div>
    </div>
  );
};

export default Donations;