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
  const [sortBy, setSortBy] = useState("recent");
  const [showAll, setShowAll] = useState(false);

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

  const filtered = useMemo(() => {
    const base = [...data];
    if (sortBy === "amount") {
      return base.sort((a, b) => (b.amount || 0) - (a.amount || 0));
    }
    // recent by createdAt desc (already sorted from API, but ensure)
    return base.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [data, sortBy]);

  const donate = (r) => {
    const params = new URLSearchParams();
    params.set("type", r.type);
    params.set("requestId", r._id);
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <select value={type} onChange={(e)=>setType(e.target.value)} className="input">
          <option value="">All Types</option>
          <option value="financial">Financial</option>
          <option value="essentials">Essentials</option>
        </select>
        <select value={sortBy} onChange={(e)=>setSortBy(e.target.value)} className="input">
          <option value="recent">Most Recent</option>
          <option value="amount">Highest Amount First</option>
        </select>
        <div></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-2 text-center py-8 text-slate-500">
            No requests found matching your criteria.
          </div>
        ) : (
          (showAll ? filtered : filtered.slice(0, 6)).map((r) => (
            <div key={r._id} className="card p-5 flex flex-col gap-2">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-slate-800">{r.student?.name || `Person ${r.student?._id?.slice(-4) || 'X'}`}</p>
                  <span className="text-xs text-slate-500">{r.student?.university || 'Unknown University'}</span>
                </div>
                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-stone-100 text-stone-700">
                  {r.type === 'financial' ? 'Financial' : 'Essentials'}
                </span>
              </div>

              <p className="text-sm text-slate-700">
                {r.reason || 'Request details not provided.'}
              </p>

              <p className="text-xs text-slate-600">
                {r.type === "financial" 
                  ? `Requested: KES ${r.amount?.toLocaleString() || '—'}` 
                  : `Items: ${r.items?.map(i => `${i.name} x${i.quantity}`).join(', ') || '—'}`
                }
              </p>

              <p className="text-[11px] text-slate-400">
                Requested on {new Date(r.createdAt).toLocaleDateString()}
              </p>

              <div className="mt-2">
                <button onClick={()=>donate(r)} className="btn btn-primary w-full">Donate</button>
              </div>
            </div>
          ))
        )}
      </div>

      {filtered.length > 6 && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={()=>setShowAll((v)=>!v)}
            className="px-4 py-2 text-sm font-semibold text-stone-800 hover:text-stone-900 dark:text-stone-100"
          >
            {showAll ? 'Show less' : `View more (${filtered.length - 6})`}
          </button>
        </div>
      )}
    </div>
  );
};

export default BrowseRequests;


