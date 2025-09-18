const ReportCard = ({ title, value, trend }) => (
  <div className="rounded-xl border border-slate-200 p-5">
    <p className="text-sm text-slate-500">{title}</p>
    <p className="mt-1 text-2xl font-bold text-slate-800">{value}</p>
    {trend && <p className="text-xs text-slate-500">{trend}</p>}
  </div>
);

const AdminReports = () => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <ReportCard title="Verified Moms" value="86" trend="↑ 5% vs last month" />
        <ReportCard title="Financial Aid" value="KES 320k" trend="↑ 12%" />
        <ReportCard title="Essentials Distributed" value="410 items" trend="↑ 8%" />
        <ReportCard title="Retention Rate" value="92%" trend="—" />
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


