const Stat = ({ label, value }) => (
  <div className="rounded-xl border border-slate-200 p-5 text-center">
    <p className="text-sm text-slate-500">{label}</p>
    <p className="mt-1 text-2xl font-bold text-slate-800">{value}</p>
  </div>
);

const SuperAdminHome = () => {
  const stats = {
    students: 540,
    admins: 18,
    donors: 210,
    requests: 420,
    fulfilled: 310,
    donationsKes: 1250000,
  };
  const alerts = [
    { id: 1, text: "Payment webhook timeout detected." },
    { id: 2, text: "2 suspicious login attempts flagged." },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Stat label="Students" value={stats.students} />
          <Stat label="Admins" value={stats.admins} />
          <Stat label="Donors" value={stats.donors} />
          <Stat label="Requests" value={stats.requests} />
          <Stat label="Fulfilled" value={stats.fulfilled} />
          <Stat label="Donations (KES)" value={stats.donationsKes.toLocaleString()} />
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 p-5">
          <h4 className="font-semibold text-slate-800 mb-3">System Alerts</h4>
          <ul className="space-y-2">
            {alerts.map((a)=> (
              <li key={a.id} className="text-sm text-slate-600">• {a.text}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminHome;


