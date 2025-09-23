import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { getAdminReports } from "../../../services/aidService";

const ReportCard = ({ title, value, trend }) => (
  <div className="rounded-xl border border-slate-200 p-5">
    <p className="text-sm text-slate-500">{title}</p>
    <p className="mt-1 text-2xl font-bold text-slate-800">{value}</p>
    {trend && <p className="text-xs text-slate-500">{trend}</p>}
  </div>
);

const AdminReports = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const printRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await getAdminReports(user?.token);
        setData(res);
      } catch (e) {
        setError("Failed to load reports");
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    if (user?.token) load();
  }, [user?.token]);

  if (loading) return <div className="py-8 text-center">Loading reports...</div>;
  if (error) return <div className="py-8 text-center text-red-600">{error}</div>;

  const vm = data?.verifiedMoms || { currentTotal: 0, currentMonth: 0, previousMonth: 0 };
  const fa = data?.financialAid || { currentMonth: 0, previousMonth: 0 };
  const ed = data?.essentialsDistributed || { currentMonthItems: 0, previousMonthItems: 0 };
  const retention = typeof data?.retention === 'number' ? data.retention : 0;
  const vmTrend = `${(vm.currentMonth || 0) - (vm.previousMonth || 0) >= 0 ? '↑' : '↓'} ${Math.abs((vm.currentMonth || 0) - (vm.previousMonth || 0))}`;
  const faTrend = `${(fa.currentMonth || 0) - (fa.previousMonth || 0) >= 0 ? '↑' : '↓'} ${Math.abs((fa.currentMonth || 0) - (fa.previousMonth || 0)).toLocaleString()}`;
  const edTrend = `${(ed.currentMonthItems || 0) - (ed.previousMonthItems || 0) >= 0 ? '↑' : '↓'} ${Math.abs((ed.currentMonthItems || 0) - (ed.previousMonthItems || 0)).toLocaleString()} items`;

  return (
    <div className="space-y-6" ref={printRef}>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <ReportCard title="Verified Moms" value={(vm.currentTotal || 0).toLocaleString()} trend={`${vmTrend} vs last month`} />
        <ReportCard title="Financial Aid" value={`KES ${(fa.currentMonth || 0).toLocaleString()}`} trend={`${faTrend} vs last month`} />
        <ReportCard title="Essentials Distributed" value={`${(ed.currentMonthItems || 0).toLocaleString()} items`} trend={`${edTrend} vs last month`} />
        <ReportCard title="Retention Rate" value={`${retention}%`} trend="" />
      </div>

      <div className="rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-800 mb-3">Visualizations</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-slate-600 mb-2">Verified Moms (Prev vs Current)</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-24 text-xs text-slate-500">Previous</span>
                <div className="h-3 bg-slate-200 rounded w-full">
                  <div className="h-3 bg-slate-500 rounded" style={{ width: `${Math.max(5, Math.min(100, ((vm.previousMonth || 0) / Math.max(1, vm.currentTotal || 1)) * 100))}%` }} />
                </div>
                <span className="w-16 text-right text-xs text-slate-600">{vm.previousMonth}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-24 text-xs text-slate-500">Current</span>
                <div className="h-3 bg-slate-200 rounded w-full">
                  <div className="h-3 bg-violet-600 rounded" style={{ width: `${Math.max(5, Math.min(100, ((vm.currentTotal || 0) / Math.max(1, vm.currentTotal || 1)) * 100))}%` }} />
                </div>
                <span className="w-16 text-right text-xs text-slate-600">{vm.currentTotal}</span>
              </div>
            </div>
          </div>

          <div>
            <p className="text-sm text-slate-600 mb-2">Financial Aid (KES)</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-24 text-xs text-slate-500">Previous</span>
                <div className="h-3 bg-slate-200 rounded w-full">
                  <div className="h-3 bg-slate-500 rounded" style={{ width: `${Math.max(5, Math.min(100, ((fa.previousMonth || 0) / Math.max(1, fa.currentMonth || 1)) * 100))}%` }} />
                </div>
                <span className="w-20 text-right text-xs text-slate-600">{fa.previousMonth.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-24 text-xs text-slate-500">Current</span>
                <div className="h-3 bg-slate-200 rounded w-full">
                  <div className="h-3 bg-emerald-600 rounded" style={{ width: `${Math.max(5, Math.min(100, ((fa.currentMonth || 0) / Math.max(1, fa.currentMonth || 1)) * 100))}%` }} />
                </div>
                <span className="w-20 text-right text-xs text-slate-600">{fa.currentMonth.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div>
            <p className="text-sm text-slate-600 mb-2">Essentials Items (Prev vs Current)</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-24 text-xs text-slate-500">Previous</span>
                <div className="h-3 bg-slate-200 rounded w-full">
                  <div className="h-3 bg-slate-500 rounded" style={{ width: `${Math.max(5, Math.min(100, ((ed.previousMonthItems || 0) / Math.max(1, ed.currentMonthItems || 1)) * 100))}%` }} />
                </div>
                <span className="w-16 text-right text-xs text-slate-600">{ed.previousMonthItems.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-24 text-xs text-slate-500">Current</span>
                <div className="h-3 bg-slate-200 rounded w-full">
                  <div className="h-3 bg-blue-600 rounded" style={{ width: `${Math.max(5, Math.min(100, ((ed.currentMonthItems || 0) / Math.max(1, ed.currentMonthItems || 1)) * 100))}%` }} />
                </div>
                <span className="w-16 text-right text-xs text-slate-600">{ed.currentMonthItems.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div>
            <p className="text-sm text-slate-600 mb-2">Retention</p>
            <div className="flex items-center gap-2">
              <div className="h-3 bg-slate-200 rounded w-full">
                <div className="h-3 bg-amber-500 rounded" style={{ width: `${Math.max(5, Math.min(100, retention))}%` }} />
              </div>
              <span className="w-12 text-right text-xs text-slate-600">{retention}%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-800 mb-3">Downloads</h3>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => {
            const rows = [
              ["Reports"],
              ["Admin", user?.name || ""],
              ["Institution", user?.university || ""],
              [""],
              ["Metric","Current","Previous"],
              ["Verified Moms", `${vm.currentTotal}`, `${vm.previousMonth}`],
              ["Financial Aid (KES)", `${fa.currentMonth}`, `${fa.previousMonth}`],
              ["Essentials Items", `${ed.currentMonthItems}`, `${ed.previousMonthItems}`],
              ["Retention (%)", `${data.retention}`, ""]
            ];
            const csv = rows.map(r => r.join(",")).join("\n");
            const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = 'admin_reports.csv'; a.click(); URL.revokeObjectURL(url);
          }} className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800">Export CSV</button>
          <button onClick={() => {
            const w = window.open('', '_blank');
            if (!w) return;
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
                      <tr><td>Verified Moms</td><td>${vm.currentTotal || 0}</td><td>${vm.previousMonth || 0}</td></tr>
                      <tr><td>Financial Aid (KES)</td><td>${fa.currentMonth || 0}</td><td>${fa.previousMonth || 0}</td></tr>
                      <tr><td>Essentials Items</td><td>${ed.currentMonthItems || 0}</td><td>${ed.previousMonthItems || 0}</td></tr>
                      <tr><td>Retention (%)</td><td>${retention}</td><td>-</td></tr>
                    </tbody>
                  </table>
                </body>
              </html>`;
            w.document.write(html);
            w.document.close(); w.focus(); w.print(); w.close();
          }} className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700">Export PDF</button>
        </div>
      </div>
    </div>
  );
};

export default AdminReports;


