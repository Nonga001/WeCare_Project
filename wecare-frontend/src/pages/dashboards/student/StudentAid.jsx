import { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { createAid, myAidRequests, getAidLimits } from "../../../services/aidService";
import { getProfileCompletion } from "../../../services/userService";

const StudentAid = () => {
  const { user } = useAuth();
  const [request, setRequest] = useState({ aidCategory: "food", amountRange: "", explanation: "", shareWithDonors: false });
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");
  const [profileComplete, setProfileComplete] = useState(false);
  const [limits, setLimits] = useState([]);
  const explanationMax = 240;

  const load = async () => {
    try {
      const [data, profile, limitsData] = await Promise.all([
        myAidRequests(user?.token),
        getProfileCompletion(user?.token),
        getAidLimits(user?.token)
      ]);
      setHistory(data);
      setProfileComplete(profile.isComplete && profile.isApproved);
      setLimits(limitsData || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load requests");
    }
  };

  useEffect(() => { if (user?.token) load(); }, [user?.token]);

  const submitRequest = async () => {
    if (!profileComplete) {
      setError("Complete your profile and get approval before requesting aid");
      return;
    }
    if (!request.aidCategory) {
      setError("Select an aid type");
      return;
    }
    if (!request.amountRange) {
      setError("Select an amount range");
      return;
    }
    if ((request.explanation || "").length > explanationMax) {
      setError("Explanation is too long");
      return;
    }

    try {
      setError("");
      await createAid(user?.token, {
        aidCategory: request.aidCategory,
        amountRange: request.amountRange,
        explanation: request.explanation.trim(),
        shareWithDonors: request.shareWithDonors
      });
      setRequest({ aidCategory: "food", amountRange: "", explanation: "", shareWithDonors: false });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-rose-800 dark:bg-rose-950/40">
            <p className="text-red-600 dark:text-rose-200 text-sm">{error}</p>
          </div>
        )}
        
        <div className="rounded-xl border border-slate-200 p-5 dark:border-slate-700 dark:bg-slate-900">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">Request Aid</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <select 
              value={request.aidCategory} 
              onChange={(e)=>setRequest((p)=>({ ...p, aidCategory:e.target.value, amountRange: "" }))} 
              className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="food">Food</option>
              <option value="childcare">Childcare</option>
              <option value="transport">Transport</option>
              <option value="academic">Academic</option>
              <option value="emergency">Emergency</option>
            </select>
            <select
              value={request.amountRange}
              onChange={(e)=>setRequest((p)=>({...p, amountRange:e.target.value}))}
              className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="">Select amount range (KES)</option>
              {request.aidCategory === "food" && (
                <>
                  <option value="1-250">1 - 250</option>
                  <option value="251-500">251 - 500</option>
                  <option value="501-999">501 - 999</option>
                  <option value="1000-1500">1,000 - 1,500</option>
                </>
              )}
              {request.aidCategory === "transport" && (
                <>
                  <option value="1-200">1 - 200</option>
                  <option value="201-500">201 - 500</option>
                  <option value="501-1000">501 - 1,000</option>
                </>
              )}
              {request.aidCategory === "childcare" && (
                <>
                  <option value="1-1000">1 - 1,000</option>
                  <option value="1001-2000">1,001 - 2,000</option>
                  <option value="2001-3000">2,001 - 3,000</option>
                </>
              )}
              {request.aidCategory === "academic" && (
                <>
                  <option value="1-300">1 - 300</option>
                  <option value="301-1000">301 - 1,000</option>
                  <option value="1001-2000">1,001 - 2,000</option>
                </>
              )}
              {request.aidCategory === "emergency" && (
                <>
                  <option value="1-1200">1 - 1,200</option>
                  <option value="1201-3000">1,201 - 3,000</option>
                  <option value="3001-6000">3,001 - 6,000</option>
                  <option value="6001-10000">6,001 - 10,000</option>
                </>
              )}
            </select>
          </div>
          <div className="mt-3">
            <textarea
              placeholder="Short explanation (optional)"
              value={request.explanation}
              maxLength={explanationMax}
              onChange={(e)=>setRequest((p)=>({ ...p, explanation:e.target.value }))}
              className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              rows="3"
            />
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{request.explanation.length}/{explanationMax} characters</div>
          </div>
          <div className="mt-3 rounded-lg border border-slate-200 p-3 dark:border-slate-700 dark:bg-slate-900/60">
            <label className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200">
              <input
                type="checkbox"
                checked={request.shareWithDonors}
                onChange={(e) => setRequest((p) => ({ ...p, shareWithDonors: e.target.checked }))}
                className="mt-1"
              />
              <span>
                I consent to showing an anonymized version of this request to donors to help fund it.
              </span>
            </label>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              No personal identifiers will be shown. You can still receive aid even if you do not consent.
            </p>
          </div>
          <div className="mt-3">
            <button 
              onClick={submitRequest} 
              disabled={!profileComplete}
              className="px-5 py-2.5 rounded-xl bg-amber-700 text-white font-medium hover:bg-amber-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {profileComplete ? "Submit" : "Complete Profile First"}
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 p-5 dark:border-slate-700 dark:bg-slate-900">
          <h4 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">Your Limits & Remaining</h4>
          {limits.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading limits...</p>
          ) : (
            <div className="space-y-3">
              {limits.filter(l => l.category === (request.aidCategory || "food")).map((l) => (
                <div key={l.category} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700 dark:bg-slate-900/60">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-slate-800 dark:text-slate-100 capitalize">{l.category}</p>
                    <span className="text-xs text-slate-500 dark:text-slate-400">per {l.period}</span>
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-300 mt-1">Range: {l.rangeLabels.join(", ")} KES</div>
                  <div className="text-xs text-slate-600 dark:text-slate-300">Max amount: KES {l.maxAmountPerPeriod.toLocaleString()}</div>
                  <div className="text-xs text-slate-600 dark:text-slate-300">Max requests: {l.maxRequestsPerPeriod}</div>
                  <div className="text-xs text-slate-600 dark:text-slate-300">Used amount: KES {l.usedAmount.toLocaleString()}</div>
                  <div className="text-xs text-slate-600 dark:text-slate-300">Used requests: {l.usedRequests}</div>
                  <div className="text-xs text-amber-700 dark:text-amber-300 mt-1">Remaining amount: KES {l.remainingAmount.toLocaleString()}</div>
                  <div className="text-xs text-amber-700 dark:text-amber-300">Remaining requests: {l.remainingRequests}</div>
                  {l.requiresOverride && <div className="text-xs text-rose-600 dark:text-rose-300 mt-1">Emergency override required when limits exceeded</div>}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="rounded-xl border border-slate-200 p-5 dark:border-slate-700 dark:bg-slate-900">
          <h4 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">Request History</h4>
          <div className="space-y-2">
            {history.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">No requests yet.</p>
            ) : (
              history.map((h)=> (
                <div key={h._id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700 dark:bg-slate-900/60">
                  <p className="text-slate-700 dark:text-slate-200 text-sm"><span className="font-medium">{h.aidCategory || h.type}:</span> {h.amountRange ? `${h.amountRange} KES` : (h.type === 'financial' ? `KES ${h.amount}` : (h.items?.map(i=>`${i.name} x${i.quantity}`).join(', ') || h.reason))}</p>
                  <p className="text-slate-500 dark:text-slate-400 text-xs">
                    Status: <span className={`font-medium ${
                      h.status === 'pending_admin' ? 'text-yellow-600' :
                      h.status === 'clarification_required' ? 'text-rose-600' :
                      h.status === 'second_approval_pending' ? 'text-amber-600' :
                      h.status === 'precheck_failed' ? 'text-red-600' :
                      h.status === 'pending_verification' ? 'text-yellow-600' :
                      h.status === 'verified' ? 'text-amber-600' :
                      h.status === 'waiting_funds' ? 'text-orange-600' :
                      h.status === 'disbursed' ? 'text-amber-600' :
                      h.status === 'rejected' ? 'text-red-600' : 'text-gray-600'
                    }`}>{h.status}</span>
                  </p>
                  {h.clarificationNote && <p className="text-slate-500 dark:text-slate-400 text-xs">Clarification: {h.clarificationNote}</p>}
                  {h.rejectedReason && <p className="text-slate-500 dark:text-slate-400 text-xs">Rejection: {h.rejectedReason}</p>}
                  {h.precheckReason && <p className="text-slate-500 dark:text-slate-400 text-xs">Pre-check: {h.precheckReason}</p>}
                  <p className="text-slate-400 dark:text-slate-500 text-xs">Created: {new Date(h.createdAt).toLocaleString()}</p>
                  {h.requestId && <p className="text-slate-400 dark:text-slate-500 text-xs">Request ID: {h.requestId}</p>}
                  {h.approvedAt && <p className="text-slate-400 dark:text-slate-500 text-xs">Approved: {new Date(h.approvedAt).toLocaleString()}</p>}
                  {h.disbursedAt && <p className="text-slate-400 dark:text-slate-500 text-xs">Disbursed: {new Date(h.disbursedAt).toLocaleString()}</p>}
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


