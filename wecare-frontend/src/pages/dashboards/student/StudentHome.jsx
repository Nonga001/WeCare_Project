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
  return <span className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${map[status] || map.pending}`}>{label}</span>;
};

const StatCard = ({ icon, label, value, color }) => (
  <div className={`bg-gradient-to-br ${color} rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all`}>
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium opacity-90">{label}</p>
        <p className="text-3xl font-bold mt-2">{value}</p>
      </div>
      <div className="text-4xl opacity-30">{icon}</div>
    </div>
  </div>
);

const RequestCard = ({ type, status }) => {
  const statusColors = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    rejected: 'bg-rose-50 text-rose-700 border-rose-200',
    disbursed: 'bg-amber-50 text-amber-700 border-amber-200',
  };
  const typeIcons = {
    financial: '💰',
    essentials: '📦',
  };
  return (
    <div className="rounded-xl border-2 border-slate-200 p-4 hover:shadow-md hover:border-slate-300 transition-all">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-2xl">{typeIcons[type] || '📄'}</div>
          <div>
            <p className="font-semibold text-slate-800">{type === 'financial' ? 'Financial Aid' : 'Essentials'}</p>
            <span className={`text-xs font-medium mt-1 px-2 py-1 rounded-full inline-block border ${statusColors[status] || statusColors.pending}`}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const NotificationItem = ({ notification }) => (
  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
    <p className="font-medium text-sm text-slate-800 dark:text-slate-100">{notification.title}</p>
    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">{notification.message}</p>
  </div>
);

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
    <div className="space-y-6">
      {/* Welcome Section with Status */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-3xl font-bold mb-2 text-slate-800 dark:text-slate-100">Welcome back, {user?.name}! 👋</h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm">Here's your financial aid dashboard overview</p>
          </div>
          <Badge status={status} />
        </div>
        {!verified && (
          <div className="mt-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">⚠️ Your account is pending verification. Complete your profile to unlock all features.</p>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatCard 
          icon="💰"
          label="Financial Aid Pending"
          value={stats.financialPending}
          color="from-amber-400 to-amber-600"
        />
        <StatCard 
          icon="📦"
          label="Essentials Pending"
          value={stats.essentialsPending}
          color="from-amber-500 to-amber-700"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Current Requests */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">📋 Your Requests</h3>
              <span className="bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-200 text-xs font-semibold px-3 py-1.5 rounded-full">
                {requests.length} Total
              </span>
            </div>
            <div className={`space-y-3 ${requests.length > 4 ? 'max-h-[400px] overflow-y-auto pr-2' : ''}`}>
              {requests.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-slate-500 dark:text-slate-400">No requests yet.</p>
                  <a href="/dashboard/student/aid" className="text-amber-600 dark:text-amber-400 hover:underline text-sm mt-2 inline-block">
                    Create your first request →
                  </a>
                </div>
              ) : (
                requests.map((r) => (
                  <RequestCard key={r._id} type={r.type} status={r.status} />
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-4">
          {/* Notifications Card */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
            <h4 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
              🔔 Updates
            </h4>
            {notifications.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-slate-500 dark:text-slate-400">All caught up! ✨</p>
              </div>
            ) : (
              <div className="space-y-2">
                {notifications.map((n) => (
                  <NotificationItem key={n._id} notification={n} />
                ))}
              </div>
            )}
          </div>

          {/* Emergency Button */}
          <button
            className="w-full bg-amber-700 hover:bg-amber-800 text-white font-semibold py-4 rounded-2xl shadow-md hover:shadow-lg transition-all"
          >
            <span className="text-lg">🆘 Emergency Help</span>
            <p className="text-xs opacity-90 mt-1">Campus Support Line</p>
          </button>

          {/* Quick Links */}
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-600">
            <p className="font-semibold text-slate-800 dark:text-slate-100 mb-3 text-sm">Quick Actions</p>
            <div className="space-y-2">
              <a href="/dashboard/student/aid" className="block text-sm text-slate-700 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 transition-colors">
                → Submit New Request
              </a>
              <a href="/dashboard/student/profile" className="block text-sm text-slate-700 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 transition-colors">
                → Update Profile
              </a>
              <a href="/dashboard/student/support" className="block text-sm text-slate-700 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 transition-colors">
                → Get Support
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentHome;


