const Card = ({ title, children }) => (
  <div className="rounded-xl border border-slate-200 p-5">
    <h3 className="font-semibold text-slate-800 mb-2">{title}</h3>
    {children}
  </div>
);

const DonorHome = () => {
  const needs = {
    financial: 14,
    essentials: 37,
  };
  const impact = {
    mothersSupported: 3,
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-slate-200 p-5 text-center">
            <p className="text-sm text-slate-500">Financial Requests</p>
            <p className="mt-1 text-2xl font-bold text-slate-800">{needs.financial}</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-5 text-center">
            <p className="text-sm text-slate-500">Essentials Needed</p>
            <p className="mt-1 text-2xl font-bold text-slate-800">{needs.essentials}</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-5 text-center">
            <p className="text-sm text-slate-500">Mothers Supported (You)</p>
            <p className="mt-1 text-2xl font-bold text-slate-800">{impact.mothersSupported}</p>
          </div>
        </div>

        <Card title="Quick Donate">
          <div className="flex flex-wrap gap-3">
            <button className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700">M-Pesa</button>
            <button className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700">Bank Transfer</button>
            <button className="px-5 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700">Card</button>
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        <Card title="Thank You 🙏">
          <p className="text-sm text-slate-600">Your support keeps student mothers in school. We appreciate you!</p>
        </Card>
      </div>
    </div>
  );
};

export default DonorHome;
