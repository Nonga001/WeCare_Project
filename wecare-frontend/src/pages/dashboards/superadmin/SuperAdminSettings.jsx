const SuperAdminSettings = () => {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-800 mb-3">Integrations</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-lg border border-slate-200 p-4">
            <p className="font-medium text-slate-800">M-Pesa</p>
            <p className="text-sm text-slate-600">Configure payment keys and webhooks.</p>
            <button className="mt-3 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm hover:bg-slate-800">Configure</button>
          </div>
          <div className="rounded-lg border border-slate-200 p-4">
            <p className="font-medium text-slate-800">Card Payments</p>
            <p className="text-sm text-slate-600">Stripe/Flutterwave configuration.</p>
            <button className="mt-3 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm hover:bg-slate-800">Configure</button>
          </div>
          <div className="rounded-lg border border-slate-200 p-4">
            <p className="font-medium text-slate-800">AI Assistant</p>
            <p className="text-sm text-slate-600">Model keys and safety settings.</p>
            <button className="mt-3 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm hover:bg-slate-800">Configure</button>
          </div>
          <div className="rounded-lg border border-slate-200 p-4">
            <p className="font-medium text-slate-800">University Systems</p>
            <p className="text-sm text-slate-600">Partnership & SSO settings.</p>
            <button className="mt-3 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm hover:bg-slate-800">Configure</button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-800 mb-3">Global Rules</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input placeholder="Donation limit (KES)" className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300" />
          <input placeholder="Profile required fields" className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300" />
          <button className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700">Save</button>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminSettings;


