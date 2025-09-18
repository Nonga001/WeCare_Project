const Metric = ({ title, value }) => (
  <div className="rounded-xl border border-slate-200 p-5">
    <p className="text-sm text-slate-500">{title}</p>
    <p className="mt-1 text-2xl font-bold text-slate-800">{value}</p>
  </div>
);

const DonorReports = () => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Metric title="Mothers Supported" value="12" />
        <Metric title="Financial Donated" value="KES 140k" />
        <Metric title="Essentials Funded" value="220 items" />
        <Metric title="Events Sponsored" value="3" />
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

export default DonorReports;


