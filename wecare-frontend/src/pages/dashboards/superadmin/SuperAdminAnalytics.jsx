const Tile = ({ title, value, sub }) => (
  <div className="rounded-xl border border-slate-200 p-5">
    <p className="text-sm text-slate-500">{title}</p>
    <p className="mt-1 text-2xl font-bold text-slate-800">{value}</p>
    {sub && <p className="text-xs text-slate-500">{sub}</p>}
  </div>
);

const SuperAdminAnalytics = () => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Tile title="Users" value="768" sub="↑ 6%" />
        <Tile title="Donations (KES)" value="1,250,000" sub="↑ 12%" />
        <Tile title="Requests" value="420" sub="↑ 3%" />
        <Tile title="Fulfilled" value="310" sub="↑ 5%" />
      </div>

      <div className="rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-800 mb-3">University Breakdown</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-slate-700">
          <div className="rounded-lg border border-slate-200 p-4">
            <p className="font-medium">UON</p>
            <p>Verified Moms: 120</p>
            <p>Donations: KES 450k</p>
          </div>
          <div className="rounded-lg border border-slate-200 p-4">
            <p className="font-medium">KU</p>
            <p>Verified Moms: 95</p>
            <p>Donations: KES 320k</p>
          </div>
          <div className="rounded-lg border border-slate-200 p-4">
            <p className="font-medium">DEKUT</p>
            <p>Verified Moms: 70</p>
            <p>Donations: KES 210k</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800">Export CSV</button>
          <button className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700">Export PDF</button>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminAnalytics;


