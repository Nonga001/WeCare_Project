import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { disburseAid, setAidStatus, moveToWaiting, uniAidRequests, getAidStats } from "../../../services/aidService";
import { getAvailableBalances } from "../../../services/disbursementService";

const AdminAid = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [balances, setBalances] = useState(null);
  const [typeFilter, setTypeFilter] = useState("");
  const [error, setError] = useState("");
  const [stats, setStats] = useState(null);

  const load = async () => {
    try {
      const data = await uniAidRequests(user?.token);
      const normalized = data.map(d => ({
        _id: d._id,
        type: d.type === 'financial' ? 'Financial' : 'Essentials',
        detail: d.type === 'financial' ? `KES ${d.amount}` : (d.items?.map(i=>`${i.name} x${i.quantity}`).join(', ') || d.reason),
        requester: d.student?.name || 'Unknown',
        status: d.status,
        reason: d.reason,
        createdAt: d.createdAt,
        approvedAt: d.approvedAt,
        disbursedAt: d.disbursedAt,
        amount: d.amount,
        items: d.items,
      }));
      setRequests(normalized);
      const bal = await getAvailableBalances(user?.token);
      setBalances(bal);
      const s = await getAidStats(user?.token);
      setStats(s);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load requests');
    }
  };

  useEffect(() => { if (user?.token) load(); }, [user?.token]);

  const filtered = useMemo(() => {
    return requests.filter(r => (
      (typeFilter ? r.type === (typeFilter) : true)
    ));
  }, [requests, typeFilter]);

  const approve = async (id) => { 
    try {
      await setAidStatus(user?.token, id, 'approved'); 
      await load(); 
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to approve request');
    }
  };
  
  const reject = async (id) => { 
    try {
      await setAidStatus(user?.token, id, 'rejected'); 
      await load(); 
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reject request');
    }
  };
  
  const moveToWaitingStatus = async (id) => {
    try {
      await moveToWaiting(user?.token, id);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to move to waiting');
    }
  };
  
  const disburse = async (id) => { 
    try {
      await disburseAid(user?.token, id); 
      await load(); 
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to disburse');
    }
  };

  const disburseWithExactMatch = async (aidRequestId, donationId) => {
    try {
      await disburseWithMatch(user?.token, aidRequestId, donationId);
      await load();
      await loadAvailableDonations();
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to disburse with exact match');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Balances */}
      <div className="rounded-xl border border-slate-200 p-5 lg:col-span-2">
        <h3 className="font-semibold text-slate-800 mb-3">Available Balances</h3>
        {balances ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-sm text-slate-500">Financial Total</p>
              <p className="text-xl font-semibold">KES {balances.financial.total.toLocaleString()}</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-sm text-slate-500">Financial Balance</p>
              <p className="text-xl font-semibold">KES {balances.financial.balance.toLocaleString()}</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-sm text-slate-500">Essentials Balance (items)</p>
              <p className="text-xl font-semibold">{balances.essentials.balanceItems.toLocaleString()}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">Loading balances...</p>
        )}
      </div>
      <div className="rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-800 mb-3">Aid Requests</h3>
        
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
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
                <p className="text-xs">
                  Status: <span className={`font-medium ${
                    r.status === 'pending' ? 'text-yellow-600' :
                    r.status === 'approved' ? 'text-blue-600' :
                    r.status === 'waiting' ? 'text-orange-600' :
                    r.status === 'disbursed' ? 'text-green-600' :
                    r.status === 'rejected' ? 'text-red-600' : 'text-gray-600'
                  }`}>{r.status}</span>
                </p>
              </div>
              <p className="text-sm text-slate-600 mt-2">Reason: {r.reason}</p>
              <p className="text-xs text-slate-400 mt-1">Created: {new Date(r.createdAt).toLocaleString()}</p>
              {r.approvedAt && <p className="text-xs text-slate-400">Approved: {new Date(r.approvedAt).toLocaleString()}</p>}
              {r.disbursedAt && <p className="text-xs text-slate-400">Disbursed: {new Date(r.disbursedAt).toLocaleString()}</p>}
              
              <div className="mt-3 flex flex-wrap gap-2">
                {r.status === 'pending' && (
                  <>
                    <button onClick={()=>approve(r._id)} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700">✅ Approve</button>
                    <button onClick={()=>reject(r._id)} className="px-4 py-2 rounded-lg bg-rose-600 text-white text-sm hover:bg-rose-700">❌ Reject</button>
                  </>
                )}
                {r.status === 'approved' && (
                  <button onClick={()=>moveToWaitingStatus(r._id)} className="px-4 py-2 rounded-lg bg-orange-600 text-white text-sm hover:bg-orange-700">⏳ Move to Waiting</button>
                )}
                {r.status === 'waiting' && (
                  <button onClick={()=>disburse(r._id)} className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-700">💰 Disburse</button>
                )}
                {r.status === 'rejected' && (
                  <span className="px-4 py-2 rounded-lg bg-gray-100 text-gray-600 text-sm">No actions available</span>
                )}
                {r.status === 'disbursed' && (
                  <span className="px-4 py-2 rounded-lg bg-green-100 text-green-600 text-sm">✅ Completed</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-800 mb-3">Distribution Tracker</h3>
        {!stats ? (
          <p className="text-sm text-slate-600">Loading distribution stats...</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg border border-slate-200 p-4 text-center">
              <p className="text-xs text-slate-500">Pending</p>
              <p className="text-lg font-semibold text-slate-800">{stats.pending}</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-4 text-center">
              <p className="text-xs text-slate-500">Approved</p>
              <p className="text-lg font-semibold text-slate-800">{stats.approved}</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-4 text-center">
              <p className="text-xs text-slate-500">Waiting</p>
              <p className="text-lg font-semibold text-slate-800">{stats.waiting}</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-4 text-center">
              <p className="text-xs text-slate-500">Disbursed</p>
              <p className="text-lg font-semibold text-slate-800">{stats.disbursed}</p>
            </div>
          </div>
        )}
        {balances?.essentials?.inventory && (
          <div className="mt-4">
            <h4 className="font-medium text-slate-700 mb-2">Essentials Inventory</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
              {balances.essentials.inventory.map(item => (
                <div key={item.name} className="border border-slate-200 rounded-lg px-3 py-2 flex justify-between">
                  <span className="text-slate-700">{item.name}</span>
                  <span className="text-slate-900 font-medium">{item.available}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAid;


