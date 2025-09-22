import { useEffect, useState } from "react";
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

  const vm = data.verifiedMoms;
  const fa = data.financialAid;
  const ed = data.essentialsDistributed;
  const vmTrend = `${vm.currentMonth - vm.previousMonth >= 0 ? '↑' : '↓'} ${Math.abs(vm.currentMonth - vm.previousMonth)}`;
  const faTrend = `${fa.currentMonth - fa.previousMonth >= 0 ? '↑' : '↓'} ${Math.abs(fa.currentMonth - fa.previousMonth).toLocaleString()}`;
  const edTrend = `${ed.currentMonthItems - ed.previousMonthItems >= 0 ? '↑' : '↓'} ${Math.abs(ed.currentMonthItems - ed.previousMonthItems).toLocaleString()} items`;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <ReportCard title="Verified Moms" value={vm.currentTotal.toLocaleString()} trend={`${vmTrend} vs last month`} />
        <ReportCard title="Financial Aid" value={`KES ${fa.currentMonth.toLocaleString()}`} trend={`${faTrend} vs last month`} />
        <ReportCard title="Essentials Distributed" value={`${ed.currentMonthItems.toLocaleString()} items`} trend={`${edTrend} vs last month`} />
        <ReportCard title="Retention Rate" value={`${data.retention}%`} trend="" />
      </div>

      <div className="rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-800 mb-3">Downloads</h3>
        <div className="flex flex-wrap gap-3">
          <button className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800">Export CSV</button>
          <button className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700">Export PDF</button>
        </div>
      </div>
    </div>
  );
};

export default AdminReports;


