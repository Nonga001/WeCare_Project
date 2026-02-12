import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { getNotifications, markAsRead } from "../../../services/notificationService";
import { getAidStats, myAidRequests } from "../../../services/aidService";
import { TrendingUp, Package, Hand, Clock, AlertTriangle, FileText, Bell, Sparkles, PhoneOff, FileCheck, Wallet } from "lucide-react";

const Badge = ({ status }) => {
  const map = {
    verified: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-800",
    awaiting_verification: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-200 dark:border-blue-800",
    pending: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-800",
    rejected: "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/40 dark:text-rose-200 dark:border-rose-800",
  };
  const label = status === "verified" ? "Verified" : status === "awaiting_verification" ? "Awaiting Verification" : status === "rejected" ? "Rejected" : "Pending";
  return <span className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${map[status] || map.pending}`}>{label}</span>;
};

const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className={`bg-gradient-to-br ${color} rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all dark:brightness-90`}>
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium opacity-90">{label}</p>
        <p className="text-3xl font-bold mt-2">{value}</p>
      </div>
      <Icon className="w-12 h-12 opacity-30" />
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
    financial: Wallet,
    essentials: Package,
  };
  const IconComponent = typeIcons[type] || FileCheck;
  return (
    <div className="rounded-xl border-2 border-slate-200 p-4 hover:shadow-md hover:border-slate-300 transition-all dark:border-slate-700 dark:bg-slate-900/40">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
            <IconComponent className="w-5 h-5 text-slate-700 dark:text-slate-300" />
          </div>
          <div>
            <p className="font-semibold text-slate-800 dark:text-slate-100">{type === 'financial' ? 'Financial Aid' : 'Essentials'}</p>
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
  const verified = user?.role === "superadmin" ? true : (user?.isApproved && user?.profileSubmitted && user?.profileApproved) || false;
  const awaiting = (user?.isApproved && user?.profileSubmitted && !user?.profileApproved) || false;
  const status = verified ? "verified" : awaiting ? "awaiting_verification" : "pending";
  const isDedanKimathi = user?.university?.toLowerCase().includes("dedan kimathi");
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState({ financialPending: 0, essentialsPending: 0 });
  const [notifications, setNotifications] = useState([]);
  const [clearingUpdates, setClearingUpdates] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getNotifications(user?.token);
        setNotifications(data.slice(0, 2));
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

  const handleClearUpdates = async () => {
    try {
      setClearingUpdates(true);
      await Promise.all(notifications.map(n => markAsRead(user?.token, n._id)));
      setNotifications([]);
    } catch (err) {
      console.error("Failed to clear updates:", err);
    } finally {
      setClearingUpdates(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section with Status */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-3xl font-bold mb-2 text-slate-800 dark:text-slate-100">Welcome back, {user?.name}! <Hand className="inline-block w-8 h-8" /></h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm">Here's your financial aid dashboard overview</p>
          </div>
          <Badge status={status} />
        </div>
        {!verified && (
          <div className="mt-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200 flex items-center gap-2">
              {awaiting ? (<><Clock className="w-4 h-4" /> Your profile is awaiting admin verification. You'll be notified once approved.</> ) : (<><AlertTriangle className="w-4 h-4" /> Your account is pending verification. Complete your profile to unlock all features.</>)}
            </p>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatCard 
          icon={TrendingUp}
          label="Financial Aid Pending"
          value={stats.financialPending}
          color="from-amber-400 to-amber-600"
        />
        <StatCard 
          icon={Package}
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
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Your Requests</h3>
              </div>
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
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                <h4 className="text-lg font-bold text-slate-800 dark:text-slate-100">Updates</h4>
              </div>
              {notifications.length > 0 && (
                <button
                  onClick={handleClearUpdates}
                  disabled={clearingUpdates}
                  className="text-xs px-3 py-1 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 transition-colors disabled:opacity-50 font-medium"
                >
                  {clearingUpdates ? "Clearing..." : "Clear All"}
                </button>
              )}
            </div>
            {notifications.length === 0 ? (
              <div className="text-center py-6">
                <Sparkles className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                <p className="text-sm text-slate-500 dark:text-slate-400">All caught up!</p>
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
          {isDedanKimathi && (
            <a
              href="tel:+254743150434"
              className="w-full bg-amber-700 hover:bg-amber-800 text-white font-semibold py-4 rounded-2xl shadow-md hover:shadow-lg transition-all text-center block"
            >
              <div className="flex items-center justify-center gap-2">
                <PhoneOff className="w-5 h-5" />
                <span>Emergency Help</span>
              </div>
              <p className="text-xs opacity-90 mt-1">Campus Support Line</p>
            </a>
          )}

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


