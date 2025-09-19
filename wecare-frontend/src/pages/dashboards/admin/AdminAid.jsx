import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { disburseAid, setAidStatus, uniAidRequests } from "../../../services/aidService";

const AdminAid = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const data = await uniAidRequests(user?.token);
      const normalized = data.map(d => ({
        _id: d._id,
        type: d.type === 'financial' ? 'Financial' : 'Essentials',
        detail: d.type === 'financial' ? `KES ${d.amount}` : (d.items?.map(i=>`${i.name} x${i.quantity}`).join(', ') || d.reason),
        requester: d.student?.name || 'Unknown',
        status: d.status,
      }));
      setRequests(normalized);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load requests');
    }
  };

  useEffect(() => { if (user?.token) load(); }, [user?.token]);

  const filtered = useMemo(() => {
    return requests.filter(r => (
      (typeFilter ? r.type === (typeFilter) : true) &&
      (`${r.requester} ${r.detail}`.toLowerCase().includes(query.toLowerCase()))
    ));
  }, [requests, query, typeFilter]);

  const approve = async (id) => { await setAidStatus(user?.token, id, 'approved'); await load(); };
  const reject = async (id) => { await setAidStatus(user?.token, id, 'rejected'); await load(); };
  const disburse = async (id) => { await disburseAid(user?.token, id); await load(); };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-800 mb-3">Aid Requests</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          <input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search requester or detail" className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300" />
          <select value={typeFilter} onChange={(e)=>setTypeFilter(e.target.value)} className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300">
            <option value="">All Types</option>
            <option value="Financial">Financial</option>
            <option value="Essentials">Essentials</option>
          </select>
          <div></div>
        </div>
        <div className="space-y-3">
          {filtered.map((r) => (
            <div key={r._id} className="rounded-lg border border-slate-200 p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                <p className="font-medium text-slate-800">{r.type}</p>
                <p className="text-slate-700">{r.detail}</p>
                <p className="text-slate-700">Requester: {r.requester}</p>
                <p className="text-xs text-slate-500">Status: {r.status}</p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={()=>approve(r._id)} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700">Approve</button>
                <button onClick={()=>reject(r._id)} className="px-4 py-2 rounded-lg bg-rose-600 text-white text-sm hover:bg-rose-700">Reject</button>
                <button onClick={()=>disburse(r._id)} className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-700">Disburse</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-800 mb-3">Distribution Tracker</h3>
        <p className="text-sm text-slate-600">Monitor aid distribution progress.</p>
      </div>
    </div>
  );
};

export default AdminAid;


