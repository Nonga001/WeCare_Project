import { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { createAid, myAidRequests } from "../../../services/aidService";
import { getProfileCompletion } from "../../../services/userService";

const StudentAid = () => {
  const { user } = useAuth();
  const [financial, setFinancial] = useState({ amount: "", reason: "" });
  const [essential, setEssential] = useState({ item: "", quantity: "" });
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");
  const [profileComplete, setProfileComplete] = useState(false);

  const load = async () => {
    try {
      const [data, profile] = await Promise.all([
        myAidRequests(user?.token),
        getProfileCompletion(user?.token)
      ]);
      setHistory(data);
      setProfileComplete(profile.isComplete && profile.isApproved);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load requests");
    }
  };

  useEffect(() => { if (user?.token) load(); }, [user?.token]);

  const submitFinancial = async () => {
    if (!profileComplete) {
      setError("Complete your profile and get approval before requesting aid");
      return;
    }
    try {
      await createAid(user?.token, { type: "financial", amount: Number(financial.amount), reason: financial.reason });
      setFinancial({ amount: "", reason: "" });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit");
    }
  };

  const submitEssential = async () => {
    if (!profileComplete) {
      setError("Complete your profile and get approval before requesting aid");
      return;
    }
    try {
      const items = essential.item ? [{ name: essential.item, quantity: Number(essential.quantity || 1) }] : [];
      await createAid(user?.token, { type: "essentials", items, reason: `${essential.item} x${essential.quantity || 1}` });
      setEssential({ item: "", quantity: "" });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit");
    }
  };

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
            <button 
              onClick={submitFinancial} 
              disabled={!profileComplete}
              className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {profileComplete ? "Submit" : "Complete Profile First"}
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-3">Request Essentials</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input placeholder="Item (e.g., diapers)" value={essential.item} onChange={(e)=>setEssential({...essential,item:e.target.value})} className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300" />
            <input placeholder="Quantity" value={essential.quantity} onChange={(e)=>setEssential({...essential,quantity:e.target.value})} className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300" />
          </div>
          <div className="mt-3">
            <button 
              onClick={submitEssential} 
              disabled={!profileComplete}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {profileComplete ? "Submit" : "Complete Profile First"}
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 p-5">
          <h4 className="font-semibold text-slate-800 mb-3">Request History</h4>
          <div className="space-y-2">
            {history.length === 0 ? (
              <p className="text-sm text-slate-500">No requests yet.</p>
            ) : (
              history.map((h)=> (
                <div key={h._id} className="rounded-lg border border-slate-200 p-3">
                  <p className="text-slate-700 text-sm"><span className="font-medium">{h.type}:</span> {h.type === 'financial' ? `KES ${h.amount}` : (h.items?.map(i=>`${i.name} x${i.quantity}`).join(', ') || h.reason)}</p>
                  <p className="text-slate-500 text-xs">Status: {h.status}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentAid;


