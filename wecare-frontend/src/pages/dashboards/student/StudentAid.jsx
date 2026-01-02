import { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { createAid, myAidRequests } from "../../../services/aidService";
import { getProfileCompletion } from "../../../services/userService";
import { ESSENTIAL_ITEMS } from "../../../constants/essentials";

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
    
    // Validation
    if (!financial.amount || financial.amount.trim() === "") {
      setError("Amount is required");
      return;
    }
    if (!financial.reason || financial.reason.trim() === "") {
      setError("Reason is required");
      return;
    }
    if (isNaN(Number(financial.amount)) || Number(financial.amount) <= 0) {
      setError("Amount must be a valid positive number");
      return;
    }
    
    try {
      setError("");
      await createAid(user?.token, { type: "financial", amount: Number(financial.amount), reason: financial.reason.trim() });
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
    
    // Validation
    if (!essential.item || essential.item.trim() === "") {
      setError("Item is required");
      return;
    }
    if (!essential.quantity || essential.quantity.trim() === "") {
      setError("Quantity is required");
      return;
    }
    if (isNaN(Number(essential.quantity)) || Number(essential.quantity) <= 0) {
      setError("Quantity must be a valid positive number");
      return;
    }
    
    try {
      setError("");
      const items = [{ name: essential.item.trim(), quantity: Number(essential.quantity) }];
      await createAid(user?.token, { type: "essentials", items, reason: `${essential.item} x${essential.quantity}` });
      setEssential({ item: "", quantity: "" });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}
        
        <div className="rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-3">Apply for Financial Aid</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input 
              type="number"
              placeholder="Amount (KES)" 
              value={financial.amount} 
              min="1"
              onChange={(e)=>{
                const val = e.target.value;
                if (Number(val) < 0) return; // prevent negative entry
                setFinancial({...financial,amount:val})
              }} 
              className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300" 
            />
            <input 
              placeholder="Reason" 
              value={financial.reason} 
              onChange={(e)=>setFinancial({...financial,reason:e.target.value})} 
              className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300" 
            />
          </div>
          <div className="mt-3">
            <button 
              onClick={submitFinancial} 
              disabled={!profileComplete}
              className="px-5 py-2.5 rounded-xl bg-amber-700 text-white font-medium hover:bg-amber-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {profileComplete ? "Submit" : "Complete Profile First"}
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-3">Request Essentials</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <select 
              value={essential.item} 
              onChange={(e)=>setEssential({...essential,item:e.target.value})} 
              className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300"
            >
              <option value="">Select an item</option>
              {ESSENTIAL_ITEMS.map(item => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
            <input 
              type="number"
              placeholder="Quantity" 
              value={essential.quantity} 
              min="1"
              onChange={(e)=>{
                const val = e.target.value;
                if (Number(val) < 0) return; // prevent negative entry
                setEssential({...essential,quantity:val})
              }} 
              className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300" 
            />
          </div>
          <div className="mt-3">
            <button 
              onClick={submitEssential} 
              disabled={!profileComplete}
              className="px-5 py-2.5 rounded-xl bg-amber-700 text-white font-medium hover:bg-amber-800 disabled:opacity-50 disabled:cursor-not-allowed"
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
                  <p className="text-slate-500 text-xs">
                    Status: <span className={`font-medium ${
                      h.status === 'pending' ? 'text-yellow-600' :
                      h.status === 'approved' ? 'text-amber-600' :
                      h.status === 'waiting' ? 'text-orange-600' :
                      h.status === 'disbursed' ? 'text-amber-600' :
                      h.status === 'rejected' ? 'text-red-600' : 'text-gray-600'
                    }`}>{h.status}</span>
                  </p>
                  <p className="text-slate-400 text-xs">Created: {new Date(h.createdAt).toLocaleString()}</p>
                  {h.approvedAt && <p className="text-slate-400 text-xs">Approved: {new Date(h.approvedAt).toLocaleString()}</p>}
                  {h.disbursedAt && <p className="text-slate-400 text-xs">Disbursed: {new Date(h.disbursedAt).toLocaleString()}</p>}
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


