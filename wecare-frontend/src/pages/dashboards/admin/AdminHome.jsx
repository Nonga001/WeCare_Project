const StatCard = ({ label, value }) => (
  <div className="rounded-xl border border-slate-200 p-5 text-center">
    <p className="text-sm text-slate-500">{label}</p>
    <p className="mt-1 text-2xl font-bold text-slate-800">{value}</p>
  </div>
);

const AdminHome = () => {
  const stats = {
    pendingMoms: 12,
    verifiedMoms: 86,
    aidPending: 9,
    aidApproved: 21,
    aidDistributed: 15,
  };
  const notifications = [
    { id: 1, text: "3 new student mother registrations pending verification." },
    { id: 2, text: "Donation update: Corporate sponsor added 50 care packages." },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <StatCard label="Pending Moms" value={stats.pendingMoms} />
          <StatCard label="Verified Moms" value={stats.verifiedMoms} />
          <StatCard label="Aid Pending" value={stats.aidPending} />
          <StatCard label="Aid Approved" value={stats.aidApproved} />
          <StatCard label="Distributed" value={stats.aidDistributed} />
        </div>

        <div className="rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-3">Quick Links</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <a href="#verify" className="rounded-xl bg-slate-900 text-white text-center py-3 text-sm font-medium hover:bg-slate-800">Verify Students</a>
            <a href="#aid" className="rounded-xl bg-blue-600 text-white text-center py-3 text-sm font-medium hover:bg-blue-700">Manage Aid</a>
            <a href="#reports" className="rounded-xl bg-emerald-600 text-white text-center py-3 text-sm font-medium hover:bg-emerald-700">Reports</a>
            <a href="#notify" className="rounded-xl bg-violet-600 text-white text-center py-3 text-sm font-medium hover:bg-violet-700">Notifications</a>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 p-5">
          <h4 className="font-semibold text-slate-800 mb-3">Notifications</h4>
          <ul className="space-y-2">
            {notifications.map((n) => (
              <li key={n.id} className="text-sm text-slate-600">• {n.text}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AdminHome;


