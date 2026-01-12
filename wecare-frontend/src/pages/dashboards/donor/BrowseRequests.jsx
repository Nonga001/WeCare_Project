import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { getGlobalAidRequests } from "../../../services/donationService";

const BrowseRequests = ({ initialLimit = 6 }) => {
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

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            No requests found matching your criteria.
          </div>
        ) : (
          (showAll ? filtered : filtered.slice(0, initialLimit)).map((r) => (
            <div key={r._id} className="flex items-center justify-between p-3 border border-stone-200 dark:border-stone-700 rounded-lg bg-stone-50 dark:bg-slate-800/50 hover:bg-stone-100 dark:hover:bg-slate-800 transition cursor-pointer" onClick={()=>donate(r)}>
              <div className="flex-1 flex items-center gap-4 text-sm">
                <span className="font-semibold text-stone-800 dark:text-stone-100 min-w-fit">
                  {r.type === 'financial' ? 'Financial' : 'Essentials'}
                </span>
                <span className="text-slate-700 dark:text-stone-200 min-w-fit">
                  {r.type === "financial" 
                    ? `KES ${r.amount?.toLocaleString() || '—'}` 
                    : `${r.items?.map(i => `${i.name} x${i.quantity}`).join(', ') || '—'}`
                  }
                </span>
                <span className="text-slate-600 dark:text-stone-300 text-xs min-w-fit">
                  {new Date(r.createdAt).toLocaleDateString()}
                </span>
              </div>
              {r.status === 'pending' && (
                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300">
                  Pending
                </span>
              )}
            </div>
          ))
        )}
      </div>

      {filtered.length > initialLimit && (
        <div className="flex justify-center mt-3">
          <button
            type="button"
            onClick={()=>setShowAll((v)=>!v)}
            className="px-4 py-2 text-sm font-semibold text-stone-800 hover:text-stone-900 dark:text-stone-100"
          >
            {showAll ? 'Show less' : `Show more (${filtered.length - initialLimit})`}
          </button>
        </div>
      )}
    </div>
  );
};

export default BrowseRequests;


