import { useState } from "react";

const StudentAid = () => {
  const [financial, setFinancial] = useState({ amount: "", reason: "" });
  const [essential, setEssential] = useState({ item: "", quantity: "" });
  const history = [
    { id: 1, type: "Financial", detail: "KES 5,000", status: "approved" },
    { id: 2, type: "Essentials", detail: "Diapers x3", status: "pending" },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-3">Apply for Financial Aid</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input placeholder="Amount (KES)" value={financial.amount} onChange={(e)=>setFinancial({...financial,amount:e.target.value})} className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300" />
            <input placeholder="Reason" value={financial.reason} onChange={(e)=>setFinancial({...financial,reason:e.target.value})} className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300" />
          </div>
          <div className="mt-3">
            <button className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700">Submit</button>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-3">Request Essentials</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input placeholder="Item (e.g., diapers)" value={essential.item} onChange={(e)=>setEssential({...essential,item:e.target.value})} className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300" />
            <input placeholder="Quantity" value={essential.quantity} onChange={(e)=>setEssential({...essential,quantity:e.target.value})} className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300" />
          </div>
          <div className="mt-3">
            <button className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700">Submit</button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 p-5">
          <h4 className="font-semibold text-slate-800 mb-3">Request History</h4>
          <div className="space-y-2">
            {history.map((h)=> (
              <div key={h.id} className="rounded-lg border border-slate-200 p-3">
                <p className="text-slate-700 text-sm"><span className="font-medium">{h.type}:</span> {h.detail}</p>
                <p className="text-slate-500 text-xs">Status: {h.status}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentAid;


