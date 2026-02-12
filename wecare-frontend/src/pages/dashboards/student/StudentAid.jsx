import { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { useSocket } from "../../../context/SocketContext";
import { createAid, myAidRequests, getAidLimits } from "../../../services/aidService";
import { getProfileCompletion } from "../../../services/userService";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

const StudentAid = () => {
  const { user } = useAuth();
  const { socketRef } = useSocket();
  const [request, setRequest] = useState({ aidCategory: "food", amount: "", explanation: "", shareWithDonors: false });
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");
  const [profileComplete, setProfileComplete] = useState(false);
  const [limits, setLimits] = useState([]);
  const [selectedClarification, setSelectedClarification] = useState(null);
  const [clarificationResponse, setClarificationResponse] = useState("");
  const [submittingResponse, setSubmittingResponse] = useState(false);
  const [cancelRequest, setCancelRequest] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancellingRequest, setCancellingRequest] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);
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
    const amount = Number(request.amount);
    if (!amount || amount <= 0) {
      setError("Enter a valid amount (must be greater than 0)");
      return;
    }
    const categoryLimit = limits.find(l => l.category === request.aidCategory);
    if (categoryLimit && amount > categoryLimit.maxAmountPerPeriod) {
      setError(`Amount exceeds the ${categoryLimit.maxAmountPerPeriod} KES limit for ${request.aidCategory}`);
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
        amount: amount,
        explanation: request.explanation.trim(),
        shareWithDonors: request.shareWithDonors
      });
      setRequest({ aidCategory: "food", amount: "", explanation: "", shareWithDonors: false });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit");
    }
  };

  const submitClarificationResponse = async () => {
    if (!clarificationResponse.trim()) {
      setError("Clarification response cannot be empty");
      return;
    }
    if (!selectedClarification) return;

    try {
      setError("");
      setSubmittingResponse(true);
      const response = await fetch(`${API_BASE}/api/aid/${selectedClarification._id}/clarification-response`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.token}`
        },
        body: JSON.stringify({ response: clarificationResponse })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      
      // Emit socket event to notify admins of new clarification response
      if (socketRef?.current) {
        socketRef.current.emit("clarification:response:new", {
          _id: selectedClarification._id,
          student: { name: user?.name, email: user?.email },
          aidCategory: selectedClarification.aidCategory,
          clarificationNote: selectedClarification.clarificationNote,
          clarificationResponse: clarificationResponse,
          clarificationResponseAt: new Date(),
          requestId: selectedClarification.requestId
        });
      }

      setSelectedClarification(null);
      setClarificationResponse("");
      await load();
    } catch (err) {
      setError(err.message || "Failed to submit response");
    } finally {
      setSubmittingResponse(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!cancelRequest) return;

    try {
      setError("");
      setCancellingRequest(true);
      const response = await fetch(`${API_BASE}/api/aid/${cancelRequest._id}/cancel`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.token}`
        },
        body: JSON.stringify({ reason: cancelReason })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);

      setCancelRequest(null);
      setCancelReason("");
      await load();
    } catch (err) {
      setError(err.message || "Failed to cancel request");
    } finally {
      setCancellingRequest(false);
    }
  };

  const canCancelRequest = (req) => {
    const cancellableStatuses = ["pending_admin", "approved", "waiting", "waiting_funds", "funds_reserved", "second_approval_pending"];
    return cancellableStatuses.includes(req.status);
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
              onChange={(e)=>setRequest((p)=>({ ...p, aidCategory:e.target.value }))} 
              className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="food">Food</option>
              <option value="childcare">Childcare</option>
              <option value="transport">Transport</option>
              <option value="academic">Academic</option>
              <option value="emergency">Emergency</option>
            </select>
            <div>
              <input
                type="number"
                placeholder="Amount (KES)"
                min="1"
                value={request.amount}
                onChange={(e)=>setRequest((p)=>({...p, amount: e.target.value}))}
                className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
              {(() => {
                const categoryLimit = limits.find(l => l.category === request.aidCategory);
                return categoryLimit ? (
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                    Max: KES {categoryLimit.maxAmountPerPeriod.toLocaleString()} per {categoryLimit.period}
                  </p>
                ) : null;
              })()}
            </div>
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
              (showAllHistory ? history : history.slice(-4)).map((h)=> (
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
                      h.status === 'disbursed' ? 'text-green-600' :
                      h.status === 'rejected' ? 'text-red-600' :
                      h.status === 'cancelled' ? 'text-slate-500' : 'text-gray-600'
                    }`}>{h.status === 'cancelled' ? '❌ CANCELLED' : h.status}</span>
                  </p>
                  {h.status === 'cancelled' && h.cancelledAt && (
                    <div className="mt-2 p-2 rounded-lg bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-600">
                      <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">Request Cancelled</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Date: {new Date(h.cancelledAt).toLocaleString()}</p>
                      {h.cancelledReason && <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Reason: {h.cancelledReason}</p>}
                    </div>
                  )}
                  {h.clarificationNote && (
                    <div>
                      <p className="text-slate-500 dark:text-slate-400 text-xs">Clarification: {h.clarificationNote}</p>
                      {!h.clarificationResponse && h.status === 'clarification_required' && (
                        <button
                          onClick={() => { setSelectedClarification(h); setClarificationResponse(""); }}
                          className="mt-2 px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:hover:bg-blue-900/50"
                        >
                          Respond
                        </button>
                      )}
                      {h.clarificationResponse && (
                        <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">Your response: {h.clarificationResponse}</p>
                      )}
                    </div>
                  )}
                  {h.rejectedReason && <p className="text-slate-500 dark:text-slate-400 text-xs">Rejection: {h.rejectedReason}</p>}
                  {h.precheckReason && <p className="text-slate-500 dark:text-slate-400 text-xs">Pre-check: {h.precheckReason}</p>}
                  <p className="text-slate-400 dark:text-slate-500 text-xs">Created: {new Date(h.createdAt).toLocaleString()}</p>
                  {h.requestId && <p className="text-slate-400 dark:text-slate-500 text-xs">Request ID: {h.requestId}</p>}
                  {h.approvedAt && <p className="text-slate-400 dark:text-slate-500 text-xs">Approved: {new Date(h.approvedAt).toLocaleString()}</p>}
                  {h.disbursedAt && <p className="text-slate-400 dark:text-slate-500 text-xs">Disbursed: {new Date(h.disbursedAt).toLocaleString()}</p>}
                  {canCancelRequest(h) && (
                    <button
                      onClick={() => { setCancelRequest(h); setCancelReason(""); }}
                      className="mt-2 px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 dark:bg-red-900/30 dark:text-red-200 dark:hover:bg-red-900/50"
                    >
                      Cancel Request
                    </button>
                  )}
                </div>
              ))
            )}
            {history.length > 4 && (
              <button
                onClick={() => setShowAllHistory(!showAllHistory)}
                className="mt-4 w-full px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 border border-blue-200 dark:border-blue-700 rounded-lg hover:bg-blue-50 dark:hover:bg-slate-800/50"
              >
                {showAllHistory ? '← Show Less' : '→ Show More'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Clarification Response Modal */}
      {selectedClarification && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Respond to Clarification</h3>
            
            <div className="mb-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Requested clarification:</p>
              <p className="text-sm text-slate-600 dark:text-slate-300">{selectedClarification.clarificationNote}</p>
            </div>

            <textarea
              placeholder="Provide your clarification/response here..."
              value={clarificationResponse}
              onChange={(e) => setClarificationResponse(e.target.value)}
              maxLength={500}
              className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              rows="4"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{clarificationResponse.length}/500 characters</p>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setSelectedClarification(null); setClarificationResponse(""); }}
                className="flex-1 px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700/50 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={submitClarificationResponse}
                disabled={submittingResponse}
                className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
              >
                {submittingResponse ? "Submitting..." : "Submit Response"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Request Modal */}
      {cancelRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Cancel Aid Request?</h3>
            
            <div className="mb-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">Request Details:</p>
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-1"><span className="font-medium">Category:</span> {cancelRequest.aidCategory}</p>
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-1"><span className="font-medium">Amount:</span> KES {cancelRequest.amount || cancelRequest.amountRange}</p>
              <p className="text-sm text-slate-600 dark:text-slate-300"><span className="font-medium">Status:</span> {cancelRequest.status}</p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Optional cancellation reason:</label>
              <textarea
                placeholder="Why are you cancelling this request? (optional)"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                maxLength={200}
                className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-red-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                rows="3"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{cancelReason.length}/200 characters</p>
            </div>

            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 rounded-lg p-3 mb-6">
              <p className="text-sm text-red-700 dark:text-red-300">⚠️ <span className="font-medium">This action cannot be undone.</span> The request will be marked as cancelled and admins will be notified.</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setCancelRequest(null); setCancelReason(""); }}
                className="flex-1 px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700/50 text-sm font-medium"
              >
                Keep Request
              </button>
              <button
                onClick={handleCancelRequest}
                disabled={cancellingRequest}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
              >
                {cancellingRequest ? "Cancelling..." : "Confirm Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentAid;


