import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { getAdminReports } from "../../../services/aidService";

const ReportCard = ({ title, value, trend }) => (
  <div className="rounded-2xl border border-amber-200 dark:border-slate-700 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-slate-900 dark:to-slate-800 p-5 shadow-sm hover:shadow-md transition-shadow">
    <p className="text-sm text-amber-700 dark:text-slate-300">{title}</p>
    <p className="mt-1 text-2xl font-bold text-amber-900 dark:text-slate-100">{value}</p>
    {trend && <p className="text-xs text-amber-600 dark:text-slate-400">{trend}</p>}
  </div>
);

const AdminReports = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [period, setPeriod] = useState("month");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const printRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await getAdminReports(user?.token, period);
        setData(res);
      } catch (e) {
        setError("Failed to load reports");
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    if (user?.token) load();
  }, [user?.token, period]);

  if (loading) return <div className="py-8 text-center text-slate-600 dark:text-slate-300">Loading reports...</div>;
  if (error) return <div className="py-8 text-center text-red-600 dark:text-rose-300">{error}</div>;

  const vm = data?.verifiedMoms || { currentTotal: 0, currentPeriod: 0, previousPeriod: 0 };
  const fa = data?.financialAid || { currentPeriod: 0, previousPeriod: 0 };
  const ed = data?.essentialsDistributed || { currentPeriodItems: 0, previousPeriodItems: 0 };
  const retention = typeof data?.retention === 'number' ? data.retention : 0;
  const summary = data?.aidDisbursementSummary || {};
  const beneficiary = data?.beneficiaryActivity || {};
  const pendingRejected = data?.pendingRejected || {};
  const rateOverride = data?.rateLimitOverride || {};
  const methodReport = data?.disbursementMethod || {};
  const impact = data?.impactSnapshot || {};
  const audit = data?.auditCompliance || {};
  const vmTrend = `${(vm.currentPeriod || 0) - (vm.previousPeriod || 0) >= 0 ? '↑' : '↓'} ${Math.abs((vm.currentPeriod || 0) - (vm.previousPeriod || 0))}`;
  const faTrend = `${(fa.currentPeriod || 0) - (fa.previousPeriod || 0) >= 0 ? '↑' : '↓'} ${Math.abs((fa.currentPeriod || 0) - (fa.previousPeriod || 0)).toLocaleString()}`;
  const edTrend = `${(ed.currentPeriodItems || 0) - (ed.previousPeriodItems || 0) >= 0 ? '↑' : '↓'} ${Math.abs((ed.currentPeriodItems || 0) - (ed.previousPeriodItems || 0)).toLocaleString()} items`;
  const periodLabelMap = { day: "Day", week: "Week", month: "Month", semester: "Semester", year: "Year" };
  const periodLabel = periodLabelMap[period] || "Month";
  const formatCurrency = (value) => `KES ${(Number(value) || 0).toLocaleString()}`;
  const breakdown = summary.breakdown || {};
  const renderBreakdown = (label, dataSet) => {
    const financial = dataSet?.financial || {};
    const essentials = dataSet?.essentials || {};
    const categories = Array.from(new Set([...Object.keys(financial), ...Object.keys(essentials)])).sort();
    if (categories.length === 0) return <div className="text-sm text-slate-500 dark:text-slate-400">No data.</div>;
    return (
      <div className="overflow-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-slate-600 dark:text-slate-300">
              <th className="py-2 pr-4">Category</th>
              <th className="py-2 pr-4">Financial (KES)</th>
              <th className="py-2">Essentials Items</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={`${label}-${c}`} className="border-t border-slate-100 dark:border-slate-700">
                <td className="py-2 pr-4 capitalize">{c}</td>
                <td className="py-2 pr-4">{formatCurrency(financial[c] || 0)}</td>
                <td className="py-2">{(essentials[c] || 0).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-6" ref={printRef}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 flex-1">
          <ReportCard title="Verified Moms" value={(vm.currentTotal || 0).toLocaleString()} trend={`${vmTrend} vs last ${periodLabel.toLowerCase()}`} />
          <ReportCard title="Financial Aid" value={`KES ${(fa.currentPeriod || 0).toLocaleString()}`} trend={`${faTrend} vs last ${periodLabel.toLowerCase()}`} />
          <ReportCard title="Essentials Distributed" value={`${(ed.currentPeriodItems || 0).toLocaleString()} items`} trend={`${edTrend} vs last ${periodLabel.toLowerCase()}`} />
          <ReportCard title="Retention Rate" value={`${retention}%`} trend="" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-300">Period</span>
          <select value={period} onChange={(e) => setPeriod(e.target.value)} className="input text-sm">
            <option value="day">Day</option>
            <option value="week">Week</option>
            <option value="month">Month</option>
            <option value="semester">Semester</option>
            <option value="year">Year</option>
          </select>
        </div>
      </div>

      <div className="rounded-2xl border border-amber-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">Visualizations</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">Verified Moms (Prev vs Current)</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-24 text-xs text-slate-500 dark:text-slate-400">Previous</span>
                <div className="h-3 bg-amber-200 dark:bg-amber-900/40 rounded w-full">
                  <div className="h-3 bg-amber-500 rounded" style={{ width: `${Math.max(5, Math.min(100, ((vm.previousPeriod || 0) / Math.max(1, vm.currentTotal || 1)) * 100))}%` }} />
                </div>
                <span className="w-16 text-right text-xs text-slate-600 dark:text-slate-300">{vm.previousPeriod}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-24 text-xs text-slate-500 dark:text-slate-400">Current</span>
                <div className="h-3 bg-amber-200 dark:bg-amber-900/40 rounded w-full">
                  <div className="h-3 bg-amber-700 rounded" style={{ width: `${Math.max(5, Math.min(100, ((vm.currentTotal || 0) / Math.max(1, vm.currentTotal || 1)) * 100))}%` }} />
                </div>
                <span className="w-16 text-right text-xs text-slate-600 dark:text-slate-300">{vm.currentTotal}</span>
              </div>
            </div>
          </div>

          <div>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">Financial Aid (KES)</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-24 text-xs text-slate-500 dark:text-slate-400">Previous</span>
                <div className="h-3 bg-amber-200 dark:bg-amber-900/40 rounded w-full">
                  <div className="h-3 bg-amber-500 rounded" style={{ width: `${Math.max(5, Math.min(100, ((fa.previousPeriod || 0) / Math.max(1, fa.currentPeriod || 1)) * 100))}%` }} />
                </div>
                <span className="w-20 text-right text-xs text-slate-600 dark:text-slate-300">{(fa.previousPeriod || 0).toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-24 text-xs text-slate-500 dark:text-slate-400">Current</span>
                <div className="h-3 bg-amber-200 dark:bg-amber-900/40 rounded w-full">
                  <div className="h-3 bg-amber-700 rounded" style={{ width: `${Math.max(5, Math.min(100, ((fa.currentPeriod || 0) / Math.max(1, fa.currentPeriod || 1)) * 100))}%` }} />
                </div>
                <span className="w-20 text-right text-xs text-slate-600 dark:text-slate-300">{(fa.currentPeriod || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">Essentials Items (Prev vs Current)</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-24 text-xs text-slate-500 dark:text-slate-400">Previous</span>
                <div className="h-3 bg-amber-200 dark:bg-amber-900/40 rounded w-full">
                  <div className="h-3 bg-amber-500 rounded" style={{ width: `${Math.max(5, Math.min(100, ((ed.previousPeriodItems || 0) / Math.max(1, ed.currentPeriodItems || 1)) * 100))}%` }} />
                </div>
                <span className="w-16 text-right text-xs text-slate-600 dark:text-slate-300">{(ed.previousPeriodItems || 0).toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-24 text-xs text-slate-500 dark:text-slate-400">Current</span>
                <div className="h-3 bg-amber-200 dark:bg-amber-900/40 rounded w-full">
                  <div className="h-3 bg-amber-700 rounded" style={{ width: `${Math.max(5, Math.min(100, ((ed.currentPeriodItems || 0) / Math.max(1, ed.currentPeriodItems || 1)) * 100))}%` }} />
                </div>
                <span className="w-16 text-right text-xs text-slate-600 dark:text-slate-300">{(ed.currentPeriodItems || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">Retention</p>
            <div className="flex items-center gap-2">
              <div className="h-3 bg-amber-200 dark:bg-amber-900/40 rounded w-full">
                <div className="h-3 bg-amber-600 rounded" style={{ width: `${Math.max(5, Math.min(100, retention))}%` }} />
              </div>
              <span className="w-12 text-right text-xs text-slate-600 dark:text-slate-300">{retention}%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-amber-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">Aid Disbursement Summary</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <ReportCard title="Funds Received" value={formatCurrency(summary.totalFundsReceived)} trend="" />
          <ReportCard title="Funds Disbursed" value={formatCurrency(summary.totalFundsDisbursed)} trend="" />
          <ReportCard title="Remaining Balance" value={formatCurrency(summary.remainingBalance)} trend="" />
          <ReportCard title="Essentials Items" value={`${(summary.essentialsItemsDisbursed || 0).toLocaleString()} items`} trend="" />
        </div>
        <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Weekly Breakdown</p>
            {renderBreakdown("week", breakdown.week)}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Monthly Breakdown</p>
            {renderBreakdown("month", breakdown.month)}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Semester Breakdown</p>
            {renderBreakdown("semester", breakdown.semester)}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-amber-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">Beneficiary Activity</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <ReportCard title="Student Moms Supported" value={(beneficiary.supportedStudents || 0).toLocaleString()} trend="" />
          <ReportCard title="Requests per Student" value={(beneficiary.requestsPerStudent || 0).toLocaleString()} trend="" />
          <ReportCard title="Avg Aid per Student" value={formatCurrency(beneficiary.avgAidPerStudent)} trend="" />
          <ReportCard title="Repeat vs New" value={`${beneficiary.repeatBeneficiaries || 0} / ${beneficiary.newBeneficiaries || 0}`} trend="" />
        </div>
      </div>

      <div className="rounded-2xl border border-amber-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">Pending & Rejected Requests</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <ReportCard title="Pending Review" value={(pendingRejected.pendingReview || 0).toLocaleString()} trend="" />
          <ReportCard title="Waiting for Funds" value={(pendingRejected.waitingFunds || 0).toLocaleString()} trend="" />
          <ReportCard title="Rejected" value={(pendingRejected.rejectedCount || 0).toLocaleString()} trend="" />
        </div>
        <div className="mt-4">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Top Rejection Reasons</p>
          {(pendingRejected.rejectionReasons || []).length === 0 ? (
            <div className="text-sm text-slate-500 dark:text-slate-400">No rejection reasons recorded.</div>
          ) : (
            <ul className="text-sm text-slate-600 dark:text-slate-300 space-y-1">
              {(pendingRejected.rejectionReasons || []).map((r) => (
                <li key={r.reason}><span className="font-medium">{r.reason}:</span> {r.count}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-amber-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">Rate Limiting & Overrides</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <ReportCard title="Rate Limit Blocks" value={(rateOverride.rateLimitBlocks || 0).toLocaleString()} trend="" />
          <ReportCard title="Overrides Used" value={(rateOverride.overrideUsageCount || 0).toLocaleString()} trend="" />
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Override Approvers</p>
            {(rateOverride.overrideAdmins || []).length === 0 ? (
              <div className="text-sm text-slate-500 dark:text-slate-400">No overrides in this period.</div>
            ) : (
              <ul className="text-sm text-slate-600 dark:text-slate-300 space-y-1">
                {(rateOverride.overrideAdmins || []).map((o) => (
                  <li key={o.adminId}><span className="font-medium">{o.name || "Unknown"}:</span> {o.count}</li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Overrides by Category</p>
            {(rateOverride.overrideCategories || []).length === 0 ? (
              <div className="text-sm text-slate-500 dark:text-slate-400">No overrides in this period.</div>
            ) : (
              <ul className="text-sm text-slate-600 dark:text-slate-300 space-y-1">
                {(rateOverride.overrideCategories || []).map((o) => (
                  <li key={o.category}><span className="font-medium capitalize">{o.category}:</span> {o.count}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-amber-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">Disbursement Method</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <ReportCard title="Successful" value={(methodReport.successfulDisbursements || 0).toLocaleString()} trend="" />
          <ReportCard title="Failed" value={(methodReport.failedDisbursements || 0).toLocaleString()} trend="" />
          <ReportCard title="Avg Processing (hrs)" value={(methodReport.averageProcessingTimeHours || 0).toLocaleString()} trend="" />
        </div>
        <div className="mt-4">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">By Payment Method</p>
          {(methodReport.byPaymentMethod || []).length === 0 ? (
            <div className="text-sm text-slate-500 dark:text-slate-400">No disbursements in this period.</div>
          ) : (
            <ul className="text-sm text-slate-600 dark:text-slate-300 space-y-1">
              {(methodReport.byPaymentMethod || []).map((m) => (
                <li key={m.method}><span className="font-medium uppercase">{m.method}:</span> {formatCurrency(m.totalAmount)} ({m.count})</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-amber-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">Impact Snapshot</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Semester Outcomes</p>
            <div className="text-sm text-slate-600 dark:text-slate-300 space-y-1">
              <div><span className="font-medium">Current:</span> {impact.semesterOutcomes?.current?.disbursedRequests || 0} disbursed, {formatCurrency(impact.semesterOutcomes?.current?.financialDisbursed || 0)}, {impact.semesterOutcomes?.current?.essentialsItems || 0} items</div>
              <div><span className="font-medium">Previous:</span> {impact.semesterOutcomes?.previous?.disbursedRequests || 0} disbursed, {formatCurrency(impact.semesterOutcomes?.previous?.financialDisbursed || 0)}, {impact.semesterOutcomes?.previous?.essentialsItems || 0} items</div>
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Feedback (Anonymous)</p>
            <div className="text-sm text-slate-600 dark:text-slate-300">
              <div><span className="font-medium">Responses:</span> {impact.feedbackStats?.count || 0}</div>
              <div><span className="font-medium">Average Score:</span> {(impact.feedbackStats?.averageScore || 0).toFixed(2)}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-amber-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">Audit & Compliance Log (Recent)</h3>
        {(audit.recentEvents || []).length === 0 ? (
          <div className="text-sm text-slate-500 dark:text-slate-400">No recent events.</div>
        ) : (
          <div className="overflow-auto rounded-lg border border-slate-100 dark:border-slate-700">
            <table className="min-w-full text-sm text-slate-700 dark:text-slate-200">
              <thead>
                <tr className="text-left text-slate-600 dark:text-slate-200 bg-slate-50 dark:bg-slate-900/60">
                  <th className="py-2 pr-4">Time</th>
                  <th className="py-2 pr-4">Type</th>
                  <th className="py-2 pr-4">Admin</th>
                  <th className="py-2 pr-4">Request</th>
                  <th className="py-2 pr-4">Category</th>
                  <th className="py-2">Transaction</th>
                </tr>
              </thead>
              <tbody>
                {(audit.recentEvents || []).map((e, idx) => (
                  <tr key={`${e.requestId}-${idx}`} className="border-t border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60">
                    <td className="py-2 pr-4">{new Date(e.timestamp).toLocaleString()}</td>
                    <td className="py-2 pr-4">{e.type.replace(/_/g, " ")}</td>
                    <td className="py-2 pr-4">{e.adminName || "-"}</td>
                    <td className="py-2 pr-4">{e.requestId || "-"}</td>
                    <td className="py-2 pr-4 capitalize">{e.aidCategory || "-"}</td>
                    <td className="py-2">{e.transactionId || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-amber-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">Downloads</h3>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => {
            const rows = [
              ["Reports"],
              ["Admin", user?.name || ""],
              ["Institution", user?.university || ""],
              [""],
              ["Metric","Current","Previous"],
              ["Verified Moms", `${vm.currentTotal}`, `${vm.previousPeriod}`],
              ["Financial Aid (KES)", `${fa.currentPeriod}`, `${fa.previousPeriod}`],
              ["Essentials Items", `${ed.currentPeriodItems}`, `${ed.previousPeriodItems}`],
              ["Retention (%)", `${data.retention}`, ""]
            ];
            const csv = rows.map(r => r.join(",")).join("\n");
            const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = 'admin_reports.csv'; a.click(); URL.revokeObjectURL(url);
          }} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 text-white text-sm font-medium hover:from-amber-700 hover:to-amber-800 transition-all">Export CSV</button>
          <button onClick={() => {
            const w = window.open('', '_blank');
            if (!w) return;
            const auditRows = (audit.recentEvents || []).slice(0, 10).map((e) => `
              <tr>
                <td>${new Date(e.timestamp).toLocaleString()}</td>
                <td>${String(e.type || '').replace(/_/g, ' ')}</td>
                <td>${e.adminName || '-'}</td>
                <td>${e.requestId || '-'}</td>
                <td>${e.aidCategory || '-'}</td>
              </tr>
            `).join('');
            const rejectionRows = (pendingRejected.rejectionReasons || []).map((r) => `
              <li>${r.reason}: ${r.count}</li>
            `).join('') || '<li>None</li>';
            const methodRows = (methodReport.byPaymentMethod || []).map((m) => `
              <li>${String(m.method || 'unknown').toUpperCase()}: ${formatCurrency(m.totalAmount)} (${m.count})</li>
            `).join('') || '<li>None</li>';
            const html = `
              <html>
                <head>
                  <title>Admin Reports</title>
                  <style>
                    body{font-family:ui-sans-serif,system-ui,Segoe UI,Roboto,Helvetica,Arial;padding:24px;color:#0f172a}
                    h2{margin:0 0 8px 0}
                    .muted{color:#64748b;margin:0 0 16px 0}
                    table{border-collapse:collapse;width:100%;margin-top:12px}
                    th,td{border:1px solid #e2e8f0;padding:8px 10px;text-align:left;font-size:12px}
                    th{background:#f8fafc}
                    h3{margin:20px 0 8px 0}
                    ul{margin:8px 0 0 16px;padding:0}
                  </style>
                </head>
                <body>
                  <h2>Admin Reports</h2>
                  <p class="muted"><strong>Admin:</strong> ${user?.name || ''} &nbsp; | &nbsp; <strong>Institution:</strong> ${user?.university || ''}</p>
                  <table>
                    <thead>
                      <tr><th>Metric</th><th>Current</th><th>Previous</th></tr>
                    </thead>
                    <tbody>
                      <tr><td>Verified Moms</td><td>${vm.currentTotal || 0}</td><td>${vm.previousPeriod || 0}</td></tr>
                      <tr><td>Financial Aid (KES)</td><td>${fa.currentPeriod || 0}</td><td>${fa.previousPeriod || 0}</td></tr>
                      <tr><td>Essentials Items</td><td>${ed.currentPeriodItems || 0}</td><td>${ed.previousPeriodItems || 0}</td></tr>
                      <tr><td>Retention (%)</td><td>${retention}</td><td>-</td></tr>
                    </tbody>
                  </table>

                  <h3>Aid Disbursement Summary</h3>
                  <table>
                    <thead>
                      <tr><th>Funds Received</th><th>Funds Disbursed</th><th>Remaining</th><th>Essentials Items</th></tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>${formatCurrency(summary.totalFundsReceived)}</td>
                        <td>${formatCurrency(summary.totalFundsDisbursed)}</td>
                        <td>${formatCurrency(summary.remainingBalance)}</td>
                        <td>${summary.essentialsItemsDisbursed || 0}</td>
                      </tr>
                    </tbody>
                  </table>

                  <h3>Beneficiary Activity</h3>
                  <table>
                    <thead>
                      <tr><th>Supported Students</th><th>Requests per Student</th><th>Avg Aid per Student</th><th>Repeat vs New</th></tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>${beneficiary.supportedStudents || 0}</td>
                        <td>${beneficiary.requestsPerStudent || 0}</td>
                        <td>${formatCurrency(beneficiary.avgAidPerStudent)}</td>
                        <td>${beneficiary.repeatBeneficiaries || 0} / ${beneficiary.newBeneficiaries || 0}</td>
                      </tr>
                    </tbody>
                  </table>

                  <h3>Pending & Rejected</h3>
                  <table>
                    <thead>
                      <tr><th>Pending Review</th><th>Waiting for Funds</th><th>Rejected</th></tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>${pendingRejected.pendingReview || 0}</td>
                        <td>${pendingRejected.waitingFunds || 0}</td>
                        <td>${pendingRejected.rejectedCount || 0}</td>
                      </tr>
                    </tbody>
                  </table>
                  <div><strong>Top Rejection Reasons:</strong><ul>${rejectionRows}</ul></div>

                  <h3>Disbursement Method</h3>
                  <table>
                    <thead>
                      <tr><th>Successful</th><th>Failed</th><th>Avg Processing (hrs)</th></tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>${methodReport.successfulDisbursements || 0}</td>
                        <td>${methodReport.failedDisbursements || 0}</td>
                        <td>${methodReport.averageProcessingTimeHours || 0}</td>
                      </tr>
                    </tbody>
                  </table>
                  <div><strong>By Payment Method:</strong><ul>${methodRows}</ul></div>

                  <h3>Audit & Compliance (Recent 10)</h3>
                  <table>
                    <thead>
                      <tr><th>Time</th><th>Type</th><th>Admin</th><th>Request</th><th>Category</th></tr>
                    </thead>
                    <tbody>
                      ${auditRows || '<tr><td colspan="5">No recent events.</td></tr>'}
                    </tbody>
                  </table>
                </body>
              </html>`;
            w.document.write(html);
            w.document.close(); w.focus(); w.print(); w.close();
          }} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 text-white text-sm font-medium hover:from-emerald-700 hover:to-emerald-800 transition-all">Export PDF</button>
        </div>
      </div>
    </div>
  );
};

export default AdminReports;


