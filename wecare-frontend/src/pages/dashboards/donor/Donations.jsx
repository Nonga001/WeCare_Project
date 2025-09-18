import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

const Donations = () => {
  const [form, setForm] = useState({ category: "Financial", amount: "", note: "" });
  const [history] = useState([
    { id: 1, date: "2025-09-10", category: "Financial", amount: "KES 5,000", receipt: "#A123" },
    { id: 2, date: "2025-09-02", category: "Essentials", amount: "Diapers x4", receipt: "#A098" },
  ]);
  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const location = useLocation();
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const category = params.get("category");
    const amount = params.get("amount");
    setForm((prev) => ({
      ...prev,
      category: category || prev.category,
      amount: amount || prev.amount,
    }));
  }, [location.search]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-3">Make a Donation</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <select name="category" value={form.category} onChange={handle} className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300">
              <option>Financial</option>
              <option>Essentials</option>
              <option>Emergency</option>
            </select>
            <input name="amount" placeholder="Amount / Items" value={form.amount} onChange={handle} className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300" />
            <textarea name="note" placeholder="Note (optional)" value={form.note} onChange={handle} className="sm:col-span-2 w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300" />
          </div>
          <div className="mt-3 flex flex-wrap gap-3">
            <button className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700">M-Pesa</button>
            <button className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700">Bank Transfer</button>
            <button className="px-5 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700">Card</button>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-3">Donation History</h3>
          <div className="space-y-2">
            {history.map((h)=> (
              <div key={h.id} className="rounded-lg border border-slate-200 p-4">
                <p className="text-slate-700 text-sm"><span className="font-medium">{h.date}</span> - {h.category} - {h.amount}</p>
                <p className="text-slate-500 text-xs">Receipt: {h.receipt}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 p-5">
          <h4 className="font-semibold text-slate-800 mb-2">Impact Tracking</h4>
          <p className="text-slate-600 text-sm">See anonymized beneficiaries and funded items.</p>
        </div>
      </div>
    </div>
  );
};

export default Donations;


