import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { getSuperAnalytics } from "../../../services/donationService";

const StatCard = ({ title, value, subtext, trend, color }) => (
  <div className="rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-slate-900 p-4 shadow-sm hover:shadow-md transition">
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <p className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">{title}</p>
        <p className="mt-2 text-2xl font-bold text-stone-900 dark:text-stone-100">{value}</p>
        {subtext && <p className="text-xs text-stone-600 dark:text-stone-400 mt-1">{subtext}</p>}
        {trend !== undefined && (
          <div className={`flex items-center gap-1 mt-2 text-sm font-semibold ${trend >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            <span>{trend >= 0 ? '↑' : '↓'}</span>
            <span>{Math.abs(trend)}</span>
          </div>
        )}
      </div>
      {color && (
        <div className={`p-3 rounded-lg ${color}`}>
        </div>
      )}
    </div>
  </div>
);

const ProgressBar = ({ label, value, max, percentage }) => (
  <div>
    <div className="flex items-center justify-between mb-1">
      <span className="text-sm font-medium text-stone-700 dark:text-stone-300">{label}</span>
      <span className="text-xs font-semibold text-stone-600 dark:text-stone-400">{percentage}%</span>
    </div>
    <div className="w-full bg-stone-200 dark:bg-slate-700 rounded-full h-2">
      <div 
        className="bg-gradient-to-r from-red-500 to-rose-600 h-2 rounded-full transition-all duration-300"
        style={{ width: `${percentage}%` }}
      ></div>
    </div>
  </div>
);

const SuperAdminAnalytics = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dateRange, setDateRange] = useState("month");
  const printRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await getSuperAnalytics(user?.token);
        setData(res);
      } catch (e) {
        setError("Failed to load analytics");
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    if (user?.token) load();
  }, [user?.token]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-40 bg-gradient-to-r from-stone-200 to-stone-100 dark:from-slate-800 dark:to-slate-900 rounded-lg animate-pulse"></div>
        <div className="h-64 bg-gradient-to-r from-stone-200 to-stone-100 dark:from-slate-800 dark:to-slate-900 rounded-lg animate-pulse"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6">
        <p className="text-red-700 dark:text-red-300 font-semibold">{error}</p>
      </div>
    );
  }

  const weeklyDeltaUsers = (data.weekly.current.users - data.weekly.previous.users) || 0;
  const weeklyDeltaDonations = (data.weekly.current.donationsAmount - data.weekly.previous.donationsAmount) || 0;
  const weeklyDeltaRequests = (data.weekly.current.requests - data.weekly.previous.requests) || 0;
  const weeklyDeltaFulfilled = (data.weekly.current.fulfilled - data.weekly.previous.fulfilled) || 0;

  const fulfillmentRate = data.totals.requests > 0 ? Math.round((data.totals.fulfilled / data.totals.requests) * 100) : 0;
  const donationCount = data.totals.donations?.count || 1;
  const avgDonation = donationCount > 0 ? Math.round(data.totals.donations.financialAmount / donationCount) : 0;

  const monthlyUserGrowth = data.monthly.current.users > 0 
    ? Math.round(((data.monthly.current.users - data.monthly.previous.users) / data.monthly.previous.users || 1) * 100)
    : 0;
  const monthlyDonationGrowth = data.monthly.current.donationsAmount > 0
    ? Math.round(((data.monthly.current.donationsAmount - data.monthly.previous.donationsAmount) / data.monthly.previous.donationsAmount || 1) * 100)
    : 0;

  return (
    <div className="space-y-6" ref={printRef}>
      {/* Header */}
      <div className="rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100">Platform Analytics</h3>
            <p className="text-sm text-stone-600 dark:text-stone-400">Real-time performance metrics and insights</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2 border border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-slate-800 text-stone-900 dark:text-stone-100 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Users" 
          value={data.totals.users.toLocaleString()} 
          trend={weeklyDeltaUsers}
          color="bg-blue-100 dark:bg-blue-900/30"
        />
        <StatCard 
          title="Total Donations (KES)" 
          value={data.totals.donations.financialAmount.toLocaleString()} 
          trend={weeklyDeltaDonations}
          subtext={`Avg: KES ${avgDonation.toLocaleString()}`}
          color="bg-green-100 dark:bg-green-900/30"
        />
        <StatCard 
          title="Aid Requests" 
          value={data.totals.requests.toLocaleString()} 
          trend={weeklyDeltaRequests}
          color="bg-purple-100 dark:bg-purple-900/30"
        />
        <StatCard 
          title="Fulfilled" 
          value={data.totals.fulfilled.toLocaleString()} 
          trend={weeklyDeltaFulfilled}
          subtext={`Rate: ${fulfillmentRate}%`}
          color="bg-orange-100 dark:bg-orange-900/30"
        />
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-6">System Performance</h3>
          <div className="space-y-4">
            <ProgressBar 
              label="Fulfillment Rate"
              value={data.totals.fulfilled}
              max={data.totals.requests}
              percentage={fulfillmentRate}
            />
            <ProgressBar 
              label="Essential Items Distributed"
              value={data.balances.essentialsItems}
              max={data.balances.essentialsItems + 1000}
              percentage={Math.min(100, Math.round((data.balances.essentialsItems / (data.balances.essentialsItems + 1000)) * 100))}
            />
          </div>
        </div>

        {/* Monthly Comparison */}
        <div className="rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-6">Monthly Growth</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-stone-50 dark:bg-slate-800/50">
              <div>
                <p className="text-sm font-medium text-stone-700 dark:text-stone-300">Users</p>
                <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5">{data.monthly.previous.users} → {data.monthly.current.users}</p>
              </div>
              <div className={`text-lg font-bold ${monthlyUserGrowth >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {monthlyUserGrowth >= 0 ? '+' : ''}{monthlyUserGrowth}%
              </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-stone-50 dark:bg-slate-800/50">
              <div>
                <p className="text-sm font-medium text-stone-700 dark:text-stone-300">Donations (KES)</p>
                <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5">{data.monthly.previous.donationsAmount.toLocaleString()} → {data.monthly.current.donationsAmount.toLocaleString()}</p>
              </div>
              <div className={`text-lg font-bold ${monthlyDonationGrowth >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {monthlyDonationGrowth >= 0 ? '+' : ''}{monthlyDonationGrowth}%
              </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-stone-50 dark:bg-slate-800/50">
              <div>
                <p className="text-sm font-medium text-stone-700 dark:text-stone-300">Requests</p>
                <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5">{data.monthly.previous.requests} → {data.monthly.current.requests}</p>
              </div>
              <span className="text-lg font-bold text-stone-900 dark:text-stone-100">{data.monthly.current.requests - data.monthly.previous.requests > 0 ? '+' : ''}{data.monthly.current.requests - data.monthly.previous.requests}</span>
            </div>
          </div>
        </div>
      </div>

      {/* University Breakdown */}
      <div className="rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-4">University Performance Ranking</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 dark:border-stone-700">
                <th className="text-left py-3 px-4 font-semibold text-stone-700 dark:text-stone-300">University</th>
                <th className="text-right py-3 px-4 font-semibold text-stone-700 dark:text-stone-300">Verified Students</th>
                <th className="text-right py-3 px-4 font-semibold text-stone-700 dark:text-stone-300">Donations (KES)</th>
                <th className="text-right py-3 px-4 font-semibold text-stone-700 dark:text-stone-300">Essential Items</th>
              </tr>
            </thead>
            <tbody>
              {data.universityBreakdown.map((u, idx) => (
                <tr key={u.university} className="border-b border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-slate-800/50 transition">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-r from-red-500 to-rose-600 text-white text-xs font-bold">
                        {idx + 1}
                      </span>
                      <span className="font-medium text-stone-900 dark:text-stone-100">{u.university}</span>
                    </div>
                  </td>
                  <td className="text-right py-3 px-4 text-stone-700 dark:text-stone-300">{u.verifiedMoms.toLocaleString()}</td>
                  <td className="text-right py-3 px-4 text-stone-700 dark:text-stone-300">KES {u.donationsToUniversity.financialAmount.toLocaleString()}</td>
                  <td className="text-right py-3 px-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                      {u.donationsToUniversity.essentialsItems.toLocaleString()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Essentials Inventory */}
      {data.balances.essentialsInventory && data.balances.essentialsInventory.length > 0 && (
        <div className="rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-4">Essentials Inventory Status</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.balances.essentialsInventory.map((item) => (
              <div key={item.name} className="flex items-center justify-between p-4 rounded-lg border border-stone-200 dark:border-stone-700 hover:shadow-md transition">
                <div>
                  <p className="font-semibold text-stone-900 dark:text-stone-100">{item.name}</p>
                  <p className={`text-sm font-medium ${item.available < 10 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                    Available: {item.available}
                  </p>
                </div>
                <div className={`px-3 py-1.5 rounded-lg font-bold text-white ${item.available < 10 ? 'bg-red-500' : 'bg-green-500'}`}>
                  {item.available}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Financial & Balance Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-4">Financial Balance</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
              <p className="text-sm font-medium text-stone-700 dark:text-stone-300">Available Balance</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">KES {data.balances.financialAmount.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-4">Donation Breakdown</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-stone-50 dark:bg-slate-800/50">
              <span className="text-sm font-medium text-stone-700 dark:text-stone-300">Financial Donations</span>
              <span className="font-bold text-stone-900 dark:text-stone-100">{(data.totals.donations?.count || 0).toLocaleString()} donations</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-stone-50 dark:bg-slate-800/50">
              <span className="text-sm font-medium text-stone-700 dark:text-stone-300">Total Essential Items</span>
              <span className="font-bold text-stone-900 dark:text-stone-100">{(data.totals.donations?.essentialsItems || 0).toLocaleString()} items</span>
            </div>
          </div>
        </div>
      </div>

      {/* Export Actions */}
      <div className="rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-4">Export Report</h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => {
              const rows = [
                ["Analytics Report"],
                ["Generated By", user?.name || "Super Admin"],
                ["Role", user?.role || "super_admin"],
                ["Date", new Date().toLocaleDateString()],
                [""],
                ["KEY METRICS"],
                ["Total Users", data.totals.users],
                ["Total Donations (KES)", data.totals.donations.financialAmount],
                ["Total Requests", data.totals.requests],
                ["Fulfilled", data.totals.fulfilled],
                ["Fulfillment Rate (%)", fulfillmentRate],
                [""],
                ["UNIVERSITY BREAKDOWN"],
                ["University","Verified Students","Financial (KES)","Essential Items"],
                ...data.universityBreakdown.map(u => [u.university, u.verifiedMoms, u.donationsToUniversity.financialAmount, u.donationsToUniversity.essentialsItems])
              ];
              const csv = rows.map(r => r.map(x => `"${String(x).replace(/"/g,'""')}"`).join(",")).join("\n");
              const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `analytics_${new Date().toISOString().split('T')[0]}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="px-6 py-2.5 bg-gradient-to-r from-red-500 to-rose-600 text-white font-semibold rounded-lg hover:from-red-600 hover:to-rose-700 transition"
          >
            Export CSV
          </button>
          <button
            onClick={() => {
              const w = window.open('', '_blank');
              if (!w) return;
              const content = printRef.current?.innerHTML || '';
              w.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Analytics Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; background: white; color: #333; }
    h1 { color: #dc2626; margin-bottom: 10px; }
    .meta { color: #666; font-size: 14px; margin-bottom: 30px; }
    button, nav, header, footer { display: none !important; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #f3f4f6; font-weight: 600; }
    tr:hover { background: #f9fafb; }
    .highlight { background: #fef2f2; }
  </style>
</head>
<body>
  <h1>WeCare Platform Analytics Report</h1>
  <div class="meta">
    <p><strong>Generated By:</strong> ${user?.name || 'Super Admin'}</p>
    <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
  </div>
  ${content}
</body>
</html>`);
              w.document.close();
              w.focus();
              w.print();
            }}
            className="px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
          >
            Print PDF
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminAnalytics;


