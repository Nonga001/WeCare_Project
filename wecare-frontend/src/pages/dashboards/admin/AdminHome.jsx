import { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { getAdminStats } from "../../../services/userService";
import { getNotifications } from "../../../services/notificationService";

const StatCard = ({ label, value }) => (
  <div className="rounded-xl border border-slate-200 p-5 text-center">
    <p className="text-sm text-slate-500">{label}</p>
    <p className="mt-1 text-2xl font-bold text-slate-800">{value}</p>
  </div>
);

const AdminHome = () => {
  const { user } = useAuth();
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

  const fetchStats = async () => {
    try {
      setLoading(true);
      const data = await getAdminStats(user?.token);
      setStats(data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.token) {
      fetchStats();
      // Auto-refresh stats every 30 seconds
      const interval = setInterval(fetchStats, 30000);
      return () => clearInterval(interval);
    }
  }, [user?.token]);

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

  if (loading) {
    return <div className="text-center py-8">Loading stats...</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-slate-800">Dashboard Overview</h2>
            {lastUpdated && (
              <p className="text-sm text-slate-500 mt-1">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </p>
            )}
          </div>
          <button 
            onClick={fetchStats} 
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {loading ? "Refreshing..." : "Refresh Stats"}
          </button>
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
      </div>
    </div>
  );
};

export default AdminHome;


