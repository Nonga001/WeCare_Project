import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { getNotifications } from "../../../services/notificationService";
import { getAidStats, myAidRequests } from "../../../services/aidService";

const Badge = ({ status }) => {
  const map = {
    verified: "bg-emerald-100 text-emerald-700 border-emerald-200",
    pending: "bg-amber-100 text-amber-800 border-amber-200",
    rejected: "bg-rose-100 text-rose-700 border-rose-200",
  };
  const label = status === "verified" ? "Verified" : status === "rejected" ? "Rejected" : "Pending";
  return <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${map[status] || map.pending}`}>{label}</span>;
};

const StudentHome = () => {
  const { user } = useAuth();
  const verified = user?.role === "superadmin" ? true : user?.isApproved || false;
  const status = verified ? "verified" : "pending";
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState({ financialPending: 0, essentialsPending: 0 });
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getNotifications(user?.token);
        setNotifications(data.slice(0, 5));
      } catch {}
    };
    if (user?.token) load();
  }, [user?.token]);

  useEffect(() => {
    const load = async () => {
      try {
        const [st, list] = await Promise.all([
          getAidStats(user?.token),
          myAidRequests(user?.token)
        ]);
        setStats(st);
        setRequests(list);
      } catch {}
    };
    if (user?.token) load();
  }, [user?.token]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-4">
        <div className="rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Welcome 👋</h3>
              <p className="text-slate-600 text-sm">Here’s a quick overview of your account.</p>
            </div>
            <Badge status={status} />
          </div>
          {!verified && (
            <p className="mt-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">Your account is pending verification. Complete your profile and wait for approval to access all features.</p>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-slate-800">Current Requests</h4>
            <div className="text-sm text-slate-500 flex gap-4">
              <span>Financial pending: {stats.financialPending}</span>
              <span>Essentials pending: {stats.essentialsPending}</span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {requests.slice(0, 6).map((r) => (
              <div key={r._id} className="rounded-lg border border-slate-200 p-4">
                <p className="text-slate-700 font-medium">{r.type === 'financial' ? 'Financial' : 'Essentials'}</p>
                <p className="text-sm text-slate-500">Status: {r.status}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 p-5">
          <h4 className="font-semibold text-slate-800 mb-3">Notifications</h4>
          {notifications.length === 0 ? (
            <p className="text-sm text-slate-500">No notifications yet.</p>
          ) : (
            <ul className="space-y-2">
              {notifications.map((n) => (
                <li key={n._id} className="text-sm text-slate-600">• {n.title}: {n.message}</li>
              ))}
            </ul>
          )}
        </div>

        <a
          href="#emergency"
          className="block text-center rounded-xl bg-rose-600 text-white font-semibold py-3 shadow hover:bg-rose-700"
        >
          Emergency: Call Campus Help
        </a>
      </div>
    </div>
  );
};

export default StudentHome;


