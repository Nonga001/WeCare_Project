import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { setAidStatus, uniAidRequests, getAidStats, secondApproveAid, recheckFunds } from "../../../services/aidService";
import { getAvailableBalances } from "../../../services/disbursementService";

const AdminAid = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [balances, setBalances] = useState(null);
  const [typeFilter, setTypeFilter] = useState("");
  const [error, setError] = useState("");
  const [stats, setStats] = useState(null);
  const [expandedRequests, setExpandedRequests] = useState({});

  const load = async () => {
    try {
      const data = await uniAidRequests(user?.token);
      const normalized = data.map(d => ({
        _id: d._id,
        requestId: d.requestId || d._id,
        type: d.aidCategory || (d.type === 'financial' ? 'Financial' : 'Essentials'),
        detail: d.amountRange ? `${d.amountRange} KES` : (d.type === 'financial' ? `KES ${d.amount}` : (d.items?.map(i=>`${i.name} x${i.quantity}`).join(', ') || d.reason)),
        requester: d.student?.name || 'Unknown',
        status: d.status,
        reason: d.reason,
        explanation: d.explanation,
        rejectedReason: d.rejectedReason,
        clarificationNote: d.clarificationNote,
        emergencyOverrideRequired: d.emergencyOverrideRequired,
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

  const verify = async (id, requiresOverride = false) => { 
    try {
      const override = requiresOverride ? window.confirm("Emergency override required. Approve override?") : false;
      if (requiresOverride && !override) return;
      await setAidStatus(user?.token, id, 'verified', undefined, override); 
      await load(); 
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to verify request');
    }
  };
  
  const reject = async (id) => { 
    const reason = window.prompt("Reason for rejection?") || "Rejected";
    try {
      await setAidStatus(user?.token, id, 'rejected', reason); 
      await load(); 
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reject request');
    }
  };

  const clarify = async (id) => {
    const note = window.prompt("What clarification is needed?") || "Please provide clarification";
    try {
      await setAidStatus(user?.token, id, 'clarification_required', note);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to request clarification');
    }
  };

  const secondApprove = async (id) => {
    try {
      await secondApproveAid(user?.token, id);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to finalize approval');
    }
  };

  const recheck = async (id) => {
    try {
      await recheckFunds(user?.token, id);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to recheck funds');
    }
  };
  
  

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Balances */}
      <div className="rounded-2xl border border-amber-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 lg:col-span-2 shadow-sm">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">Available Balances</h3>
        {balances ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-amber-200 dark:border-slate-700 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-slate-900 dark:to-slate-800 p-4">
              <p className="text-sm text-amber-700 dark:text-slate-300">Financial Total</p>
              <p className="text-xl font-semibold text-amber-900 dark:text-slate-100">KES {balances.financial.total.toLocaleString()}</p>
            </div>
            <div className="rounded-xl border border-amber-200 dark:border-slate-700 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-slate-900 dark:to-slate-800 p-4">
              <p className="text-sm text-amber-700 dark:text-slate-300">Financial Balance</p>
              <p className="text-xl font-semibold text-amber-900 dark:text-slate-100">KES {balances.financial.balance.toLocaleString()}</p>
            </div>
            <div className="rounded-xl border border-amber-200 dark:border-slate-700 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-slate-900 dark:to-slate-800 p-4">
              <p className="text-sm text-amber-700 dark:text-slate-300">Essentials Balance (items)</p>
              <p className="text-xl font-semibold text-amber-900 dark:text-slate-100">{balances.essentials.balanceItems.toLocaleString()}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading balances...</p>
        )}
      </div>
      <div className="rounded-2xl border border-amber-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">Aid Requests</h3>
        
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 dark:border-rose-800 bg-red-50 dark:bg-rose-950/40 p-3">
            <p className="text-red-600 dark:text-rose-200 text-sm">{error}</p>
          </div>
        )}
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <select value={typeFilter} onChange={(e)=>setTypeFilter(e.target.value)} className="px-4 py-2 border border-amber-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-300 dark:focus:ring-amber-600">
            <option value="">All Types</option>
            <option value="food">Food</option>
            <option value="childcare">Childcare</option>
            <option value="transport">Transport</option>
            <option value="emergency">Emergency</option>
            <option value="Financial">Financial (legacy)</option>
            <option value="Essentials">Essentials (legacy)</option>
          </select>
          <div></div>
        </div>
        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
          {filtered.slice(0, 5).map((r) => (
            <div key={r._id} className="rounded-xl border border-amber-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <span className="font-medium text-slate-800 dark:text-slate-100 px-3 py-1 rounded-lg bg-amber-50 dark:bg-amber-900/20 whitespace-nowrap">{r.type}</span>
                  <p className="text-slate-700 dark:text-slate-300 font-medium">{r.requester}</p>
                  <p className="text-xs px-2 py-1 rounded-lg font-medium whitespace-nowrap" style={{
                    backgroundColor: r.status === 'pending_admin' ? '#fef3c7' :
                      r.status === 'clarification_required' ? '#fee2e2' :
                      r.status === 'second_approval_pending' ? '#dbeafe' :
                      r.status === 'waiting_funds' ? '#fed7aa' :
                      r.status === 'disbursed' ? '#dcfce7' :
                      r.status === 'rejected' ? '#fee2e2' : '#f3f4f6',
                    color: r.status === 'pending_admin' ? '#92400e' :
                      r.status === 'clarification_required' ? '#991b1b' :
                      r.status === 'second_approval_pending' ? '#1e40af' :
                      r.status === 'waiting_funds' ? '#92400e' :
                      r.status === 'disbursed' ? '#166534' :
                      r.status === 'rejected' ? '#991b1b' : '#374151'
                  }}>{r.status}</p>
                </div>
                <button 
                  onClick={() => setExpandedRequests(prev => ({ ...prev, [r._id]: !prev[r._id] }))} 
                  className="px-3 py-1 rounded-lg text-sm font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-200 hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors whitespace-nowrap"
                >
                  {expandedRequests[r._id] ? 'Show Less' : 'Show More'}
                </button>
              </div>
              
              {expandedRequests[r._id] && (
                <div className="mt-4 pt-4 border-t border-amber-100 dark:border-slate-700">
                  <div className="space-y-2 mb-4 text-sm break-words overflow-hidden">
                    <p className="text-slate-600 dark:text-slate-300"><strong>Request ID:</strong> {r.requestId}</p>
                    <p className="text-slate-600 dark:text-slate-300"><strong>Details:</strong> {r.detail}</p>
                    <p className="text-slate-600 dark:text-slate-300"><strong>Reason:</strong> {r.reason}</p>
                    {r.explanation && <p className="text-slate-600 dark:text-slate-300"><strong>Explanation:</strong> {r.explanation}</p>}
                    {r.clarificationNote && <p className="text-slate-600 dark:text-slate-300"><strong>Clarification:</strong> {r.clarificationNote}</p>}
                    {r.rejectedReason && <p className="text-slate-600 dark:text-slate-300"><strong>Rejection reason:</strong> {r.rejectedReason}</p>}
                    {r.emergencyOverrideRequired && <p className="text-slate-600 dark:text-slate-300"><strong>Emergency override:</strong> Required</p>}
                    <p className="text-xs text-slate-500 dark:text-slate-400"><strong>Created:</strong> {new Date(r.createdAt).toLocaleString()}</p>
                    {r.approvedAt && <p className="text-xs text-slate-500 dark:text-slate-400"><strong>Approved:</strong> {new Date(r.approvedAt).toLocaleString()}</p>}
                    {r.disbursedAt && <p className="text-xs text-slate-500 dark:text-slate-400"><strong>Disbursed:</strong> {new Date(r.disbursedAt).toLocaleString()}</p>}
                    {r.items && r.items.length > 0 && (
                      <div><strong>Items:</strong>
                        <ul className="ml-4 mt-1">
                          {r.items.map((item, idx) => (
                            <li key={idx} className="text-slate-600 dark:text-slate-300">• {item.name} x{item.quantity}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <div className="mt-3 flex flex-wrap gap-2">
                {r.status === 'pending_admin' && (
                  <>
                    <button onClick={()=>verify(r._id, r.emergencyOverrideRequired)} className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 text-white text-sm font-medium hover:from-amber-700 hover:to-amber-800 transition-all">Verify</button>
                    <button onClick={()=>clarify(r._id)} className="px-4 py-2 rounded-xl bg-slate-700 text-white text-sm font-medium hover:bg-slate-800">Request Clarification</button>
                    <button onClick={()=>reject(r._id)} className="px-4 py-2 rounded-xl bg-rose-600 text-white text-sm font-medium hover:bg-rose-700">Reject</button>
                  </>
                )}
                {r.status === 'clarification_required' && (
                  <button onClick={()=>verify(r._id)} className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 text-white text-sm font-medium hover:from-amber-700 hover:to-amber-800 transition-all">Verify After Clarification</button>
                )}
                {r.status === 'second_approval_pending' && (
                  <button onClick={()=>secondApprove(r._id)} className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 text-white text-sm font-medium hover:from-emerald-700 hover:to-emerald-800 transition-all">Final Approve & Disburse</button>
                )}
                {r.status === 'waiting_funds' && (
                  <button onClick={()=>recheck(r._id)} className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 text-white text-sm font-medium hover:from-orange-700 hover:to-amber-700 transition-all">Recheck Funds</button>
                )}
                {r.status === 'rejected' && (
                  <span className="px-4 py-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-200 text-sm font-medium border border-amber-200 dark:border-amber-700">No actions available</span>
                )}
                {r.status === 'disbursed' && expandedRequests[r._id] && (
                  <span className="px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-200 text-sm font-medium border border-emerald-200 dark:border-emerald-700">Completed</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-amber-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">Distribution Tracker</h3>
        {!stats ? (
          <p className="text-sm text-slate-600 dark:text-slate-300">Loading distribution stats...</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-amber-200 dark:border-slate-700 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-slate-900 dark:to-slate-800 p-4 text-center">
              <p className="text-xs text-amber-700 dark:text-slate-300">Pending</p>
              <p className="text-lg font-semibold text-amber-900 dark:text-slate-100">{stats.pending}</p>
            </div>
            <div className="rounded-xl border border-amber-200 dark:border-slate-700 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-slate-900 dark:to-slate-800 p-4 text-center">
              <p className="text-xs text-amber-700 dark:text-slate-300">Approved</p>
              <p className="text-lg font-semibold text-amber-900 dark:text-slate-100">{stats.approved}</p>
            </div>
            <div className="rounded-xl border border-amber-200 dark:border-slate-700 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-slate-900 dark:to-slate-800 p-4 text-center">
              <p className="text-xs text-amber-700 dark:text-slate-300">Waiting</p>
              <p className="text-lg font-semibold text-amber-900 dark:text-slate-100">{stats.waiting}</p>
            </div>
            <div className="rounded-xl border border-amber-200 dark:border-slate-700 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-slate-900 dark:to-slate-800 p-4 text-center">
              <p className="text-xs text-amber-700 dark:text-slate-300">Disbursed</p>
              <p className="text-lg font-semibold text-amber-900 dark:text-slate-100">{stats.disbursed}</p>
            </div>
          </div>
        )}
        {balances?.essentials?.inventory && (
          <div className="mt-4">
            <h4 className="font-medium text-slate-700 mb-2">Essentials Inventory</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
              {balances.essentials.inventory.map(item => (
                <div key={item.name} className="border border-amber-200 rounded-xl px-3 py-2 flex justify-between bg-amber-50">
                  <span className="text-amber-700">{item.name}</span>
                  <span className="text-amber-900 font-medium">{item.available}</span>
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


