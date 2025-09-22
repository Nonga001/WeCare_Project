import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { getGlobalAidRequests } from "../../../services/donationService";

const BrowseRequests = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [type, setType] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadRequests = async () => {
      try {
        setLoading(true);
        const filters = {};
        if (type) filters.type = type;
        if (minAmount) filters.minAmount = minAmount;
        
        const requests = await getGlobalAidRequests(user?.token, filters);
        setData(requests);
      } catch (err) {
        setError("Failed to load requests");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    if (user?.token) loadRequests();
  }, [user?.token, type, minAmount]);

  const filtered = useMemo(() => data, [data]);

  const donate = (r) => {
    const params = new URLSearchParams();
    params.set("type", r.type);
    if (r.amount) params.set("amount", String(r.amount));
    if (r.type === 'essentials' && r.items?.length) {
      // Encode items as name:qty;name:qty
      const itemsStr = r.items.map(i => `${encodeURIComponent(i.name)}:${i.quantity}`).join(";");
      params.set("items", itemsStr);
    }
    navigate(`/dashboard/donor/donations?${params.toString()}`);
  };

  if (loading) {
    return <div className="text-center py-8">Loading requests...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-600">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <select value={type} onChange={(e)=>setType(e.target.value)} className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300">
          <option value="">All Types</option>
          <option value="financial">Financial</option>
          <option value="essentials">Essentials</option>
        </select>
        <div></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-2 text-center py-8 text-slate-500">
            No requests found matching your criteria.
          </div>
        ) : (
          filtered.map((r) => (
            <div key={r._id} className="rounded-xl border border-slate-200 p-5">
              <div className="flex justify-between items-start mb-2">
                <p className="font-semibold text-slate-800">{`Person ${r.student?._id?.slice(-4) || 'X'}`}</p>
                <span className="text-xs text-slate-500">{r.student?.university || 'Unknown University'}</span>
              </div>
              <p className="text-sm text-slate-600 mb-2">
                {r.type === 'financial' ? 'Financial' : 'Essentials'} • {r.reason}
              </p>
              <p className="text-xs text-slate-500 mb-3">
                {r.type === "financial" 
                  ? `Amount: KES ${r.amount?.toLocaleString()}` 
                  : `Items: ${r.items?.map(i => `${i.name} x${i.quantity}`).join(', ')}`
                }
              </p>
              <p className="text-xs text-slate-400 mb-3">
                Requested: {new Date(r.createdAt).toLocaleDateString()}
              </p>
              <div className="mt-3">
                <button 
                  onClick={()=>donate(r)} 
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
                >
                  Donate
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default BrowseRequests;


