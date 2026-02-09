import { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { getAdminStats } from "../../../services/userService";
import { getNotifications } from "../../../services/notificationService";
import { useSocket } from "../../../context/SocketContext";

const StatCard = ({ label, value }) => (
  <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100 dark:border-slate-700 dark:from-slate-900 dark:to-slate-800 p-5 text-center hover:shadow-lg transition-shadow">
    <p className="text-sm text-amber-700 dark:text-slate-300">{label}</p>
    <p className="mt-1 text-2xl font-bold text-amber-900 dark:text-slate-100">{value}</p>
  </div>
);

const AdminHome = () => {
  const { user } = useAuth();
  const { socketRef } = useSocket();
  const [stats, setStats] = useState({
    pendingRegistration: 0,
    awaitingProfileVerification: 0,
    verifiedStudents: 0,
    approvedStudentMoms: 0,
    aidPending: 0,
    aidApproved: 0,
    aidWaiting: 0,
    aidDistributed: 0,
  });
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [departmentError, setDepartmentError] = useState(false);

  const fetchStats = async () => {
    try {
      const data = await getAdminStats(user?.token);
      setStats(data);
      setLastUpdated(new Date());
      setDepartmentError(false);
    } catch (err) {
      if (err.response?.data?.requiresDepartment) {
        setDepartmentError(true);
      }
      console.error("Failed to fetch stats:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.token) {
      fetchStats();
    }
  }, [user?.token]);

  // Listen for socket updates to stats
  useEffect(() => {
    const s = socketRef?.current;
    if (!s) return;

    const onStatsUpdate = (newStats) => {
      setStats(newStats);
      setLastUpdated(new Date());
    };

    s.on("admin:stats:update", onStatsUpdate);
    return () => {
      try { s.off("admin:stats:update", onStatsUpdate); } catch {}
    };
  }, [socketRef?.current]);

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

  // Listen for new notifications via socket
  useEffect(() => {
    const s = socketRef?.current;
    if (!s) return;

    const onNewNotification = (n) => {
      setNotifications(prev => [n, ...prev.slice(0, 4)]);
    };

    s.on("notification:new", onNewNotification);
    return () => {
      try { s.off("notification:new", onNewNotification); } catch {}
    };
  }, [socketRef?.current]);

  if (loading) {
    return <div className="text-center py-8 text-slate-600 dark:text-slate-300">Loading stats...</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        {departmentError && (
          <div className="rounded-2xl border-2 border-red-300 dark:border-rose-800 bg-red-50 dark:bg-rose-950/40 p-5">
            <h3 className="font-bold text-red-800 dark:text-rose-200 mb-2">⚠️ Action Required</h3>
            <p className="text-red-700 dark:text-rose-200 text-sm mb-3">
              You must assign yourself a department (Welfare, Gender, or Health) before you can perform administrative activities.
            </p>
            <p className="text-red-600 dark:text-rose-200 text-sm font-medium">
              Please go to your profile and select a department to continue.
            </p>
          </div>
        )}
        
        <div>
          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Dashboard Overview</h2>
          {lastUpdated && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Pending Registration" value={stats.pendingRegistration} />
          <StatCard label="Awaiting Profile Verification" value={stats.awaitingProfileVerification} />
          <StatCard label="Verified Students" value={stats.verifiedStudents} />
          <StatCard label="Approved Student Moms" value={stats.approvedStudentMoms} />
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Aid Pending" value={stats.aidPending} />
          <StatCard label="Aid Approved" value={stats.aidApproved} />
          <StatCard label="Aid Waiting" value={stats.aidWaiting} />
          <StatCard label="Distributed" value={stats.aidDistributed} />
        </div>

        <div className="rounded-2xl border border-amber-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">Quick Links</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <a href="#verify" className="rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white text-center py-3 text-sm font-medium hover:from-amber-600 hover:to-amber-700 transition-all">Verify Students</a>
            <a href="#aid" className="rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white text-center py-3 text-sm font-medium hover:from-amber-600 hover:to-amber-700 transition-all">Manage Aid</a>
            <a href="#reports" className="rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 text-white text-center py-3 text-sm font-medium hover:from-amber-700 hover:to-amber-800 transition-all">Reports</a>
            <a href="#notify" className="rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white text-center py-3 text-sm font-medium hover:from-amber-600 hover:to-amber-700 transition-all">Notifications</a>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-amber-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
          <h4 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">Recent Notifications</h4>
          {notifications.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">No notifications yet.</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {notifications.map((n) => (
                <div key={n._id} className={`border rounded-xl p-3 text-sm ${((n.isRead || []).some(r => (r.user === (user?._id||user?.id)) || (r.user?._id === (user?._id||user?.id)) || (String(r.user)===String(user?._id||user?.id)))) ? "border-amber-200 bg-amber-50 dark:border-amber-800/40 dark:bg-amber-900/20" : "border-amber-300 bg-amber-100 dark:border-amber-700/50 dark:bg-amber-900/30"}`}>
                  <p className="font-medium text-slate-800 dark:text-slate-100">{n.title}</p>
                  <p className="text-slate-700 dark:text-slate-300 mt-1">{n.message}</p>
                  <div className="flex justify-between items-center mt-2 text-xs text-slate-600 dark:text-slate-400">
                    <span>To: {n.recipientType === 'individual' ? 'Individual' : n.recipientType === 'university_students' ? 'University Students' : 'All'}</span>
                    <span>{new Date(n.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminHome;


