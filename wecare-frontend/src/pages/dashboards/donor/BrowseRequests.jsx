import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const BrowseRequests = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [type, setType] = useState("");
  const [min, setMin] = useState("");

  const data = [
    { id: 1, student: "Jane Doe", type: "Financial", detail: "Tuition balance", amount: 8000 },
    { id: 2, student: "Mary W.", type: "Essentials", detail: "Baby food", amount: 0, quantity: 5 },
    { id: 3, student: "Aisha K.", type: "Financial", detail: "Hostel fees", amount: 5000 },
  ];

  const filtered = useMemo(() =>
    data.filter((r) =>
      (!type || r.type === type) &&
      (!query || (r.student + " " + r.detail).toLowerCase().includes(query.toLowerCase())) &&
      (!min || r.amount >= Number(min))
    )
  , [data, query, type, min]);

  const donate = (r) => {
    const params = new URLSearchParams();
    params.set("category", r.type);
    if (r.amount) params.set("amount", String(r.amount));
    navigate(`/dashboard/donor/donations?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search student or need" className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300" />
        <select value={type} onChange={(e)=>setType(e.target.value)} className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300">
          <option value="">All Types</option>
          <option value="Financial">Financial</option>
          <option value="Essentials">Essentials</option>
        </select>
        <input value={min} onChange={(e)=>setMin(e.target.value)} placeholder="Min Amount (KES)" className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300" />
        <div></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.map((r) => (
          <div key={r.id} className="rounded-xl border border-slate-200 p-5">
            <p className="font-semibold text-slate-800">{r.student}</p>
            <p className="text-sm text-slate-600">{r.type} • {r.detail}</p>
            <p className="text-xs text-slate-500 mt-1">{r.type === "Financial" ? `Amount: KES ${r.amount}` : `Quantity: ${r.quantity}`}</p>
            <div className="mt-3">
              <button onClick={()=>donate(r)} className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700">Donate</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BrowseRequests;


