import { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { getSuperAnalytics } from "../../../services/donationService";

const Tile = ({ title, value, sub }) => (
  <div className="rounded-xl border border-slate-200 p-5">
    <p className="text-sm text-slate-500">{title}</p>
    <p className="mt-1 text-2xl font-bold text-slate-800">{value}</p>
    {sub && <p className="text-xs text-slate-500">{sub}</p>}
  </div>
);

const SuperAdminAnalytics = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  if (loading) return <div className="py-8 text-center">Loading analytics...</div>;
  if (error) return <div className="py-8 text-center text-red-600">{error}</div>;

  const weeklyDeltaUsers = (data.weekly.current.users - data.weekly.previous.users) || 0;
  const weeklyDeltaDonations = (data.weekly.current.donationsAmount - data.weekly.previous.donationsAmount) || 0;
  const weeklyDeltaRequests = (data.weekly.current.requests - data.weekly.previous.requests) || 0;
  const weeklyDeltaFulfilled = (data.weekly.current.fulfilled - data.weekly.previous.fulfilled) || 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Tile title="Users" value={data.totals.users.toLocaleString()} sub={`${weeklyDeltaUsers >= 0 ? "↑" : "↓"} ${Math.abs(weeklyDeltaUsers)}`} />
        <Tile title="Donations (KES)" value={data.totals.donations.financialAmount.toLocaleString()} sub={`${weeklyDeltaDonations >= 0 ? "↑" : "↓"} ${Math.abs(weeklyDeltaDonations).toLocaleString()}`} />
        <Tile title="Requests" value={data.totals.requests.toLocaleString()} sub={`${weeklyDeltaRequests >= 0 ? "↑" : "↓"} ${Math.abs(weeklyDeltaRequests)}`} />
        <Tile title="Fulfilled" value={data.totals.fulfilled.toLocaleString()} sub={`${weeklyDeltaFulfilled >= 0 ? "↑" : "↓"} ${Math.abs(weeklyDeltaFulfilled)}`} />
      </div>

      <div className="rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-800 mb-3">University Breakdown</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-slate-700">
          {data.universityBreakdown.map((u) => (
            <div key={u.university} className="rounded-lg border border-slate-200 p-4">
              <p className="font-medium">{u.university}</p>
              <p>Verified Moms: {u.verifiedMoms.toLocaleString()}</p>
              <p>Donations to Uni: KES {u.donationsToUniversity.financialAmount.toLocaleString()}</p>
              <p>Essentials Items: {u.donationsToUniversity.essentialsItems.toLocaleString()}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button onClick={() => {
            const rows = [
              ["University","Verified Moms","Financial (KES)","Essentials Items"],
              ...data.universityBreakdown.map(u => [u.university, u.verifiedMoms, u.donationsToUniversity.financialAmount, u.donationsToUniversity.essentialsItems])
            ];
            const csv = rows.map(r => r.map(x => `"${String(x).replace(/"/g,'""')}"`).join(",")).join("\n");
            const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = 'university_breakdown.csv'; a.click(); URL.revokeObjectURL(url);
          }} className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800">Export CSV</button>
          <button onClick={() => window.print()} className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700">Export PDF</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-2">Balances</h3>
          <p className="text-sm text-slate-600">Financial balance: KES {data.balances.financialAmount.toLocaleString()}</p>
          <p className="text-sm text-slate-600">Essentials balance (items): {data.balances.essentialsItems.toLocaleString()}</p>
          {data.balances.essentialsInventory && (
            <div className="mt-3">
              <h4 className="text-sm font-medium text-slate-700 mb-1">Essentials Inventory</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {data.balances.essentialsInventory.map((it) => (
                  <div key={it.name} className="border border-slate-200 rounded-lg px-3 py-2 text-sm flex justify-between">
                    <span className="text-slate-700">{it.name}</span>
                    <span className="text-slate-900 font-medium">{it.available}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-2">Monthly vs Previous</h3>
          <p className="text-sm text-slate-600">Users: {data.monthly.current.users} vs {data.monthly.previous.users}</p>
          <p className="text-sm text-slate-600">Donations (KES): {data.monthly.current.donationsAmount.toLocaleString()} vs {data.monthly.previous.donationsAmount.toLocaleString()}</p>
          <p className="text-sm text-slate-600">Requests: {data.monthly.current.requests} vs {data.monthly.previous.requests}</p>
          <p className="text-sm text-slate-600">Fulfilled: {data.monthly.current.fulfilled} vs {data.monthly.previous.fulfilled}</p>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminAnalytics;


