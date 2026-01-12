import { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { useSocket } from "../../../context/SocketContext";
import { getGlobalStats, getAllDonations } from "../../../services/donationService";

const StatBox = ({ label, value, subtitle, trend }) => (
  <div className="rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-slate-800 p-4 shadow-sm hover:shadow-md transition">
    <div className="flex justify-between items-start">
      <div className="flex-1">
        <p className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase">{label}</p>
        <p className="mt-2 text-2xl font-bold text-stone-900 dark:text-stone-100">{value.toLocaleString()}</p>
        {subtitle && <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">{subtitle}</p>}
      </div>
    </div>
    {trend && (
      <div className="mt-2 text-xs font-semibold">
        <span className={trend > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
          {trend > 0 ? "↑" : "↓"} {Math.abs(trend)}% from last week
        </span>
      </div>
    )}
  </div>
);

const SuperAdminHome = () => {
  const { user } = useAuth();
  const { socketRef } = useSocket();
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalAdmins: 0,
    totalDonors: 0,
    totalRequests: 0,
    totalDonations: 0,
    totalFulfilled: 0,
    universityBreakdown: [],
    weeklyStats: {
      users: 0,
      donations: 0,
      requests: 0,
      fulfilled: 0
    },
    activeUsers: { total: 0, byRole: {} }
  });
  const [donations, setDonations] = useState([]);
  const [showAllDonations, setShowAllDonations] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      const [globalStats, allDonations] = await Promise.all([
        getGlobalStats(user?.token),
        getAllDonations(user?.token)
      ]);
      
      setStats(globalStats || {});
      setDonations(allDonations || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load super admin data");
      console.error("Failed to load super admin data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.token) loadData();
  }, [user?.token]);

  // Real-time updates via Socket.io
  useEffect(() => {
    const s = socketRef?.current;
    if (!s) return;

    const onStatsUpdate = (updatedStats) => {
      setStats(prev => ({ ...prev, ...updatedStats }));
    };

    const onDonationNew = (donation) => {
      setDonations(prev => [donation, ...prev]);
      setStats(prev => ({ 
        ...prev, 
        totalDonations: (prev.totalDonations || 0) + 1 
      }));
    };

    const onRequestNew = () => {
      setStats(prev => ({ 
        ...prev, 
        totalRequests: (prev.totalRequests || 0) + 1 
      }));
    };

    s.on("stats:update", onStatsUpdate);
    s.on("donation:new", onDonationNew);
    s.on("request:new", onRequestNew);

    return () => {
      try {
        s.off("stats:update", onStatsUpdate);
        s.off("donation:new", onDonationNew);
        s.off("request:new", onRequestNew);
      } catch {}
    };
  }, [socketRef?.current]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-stone-700 dark:border-stone-300 mx-auto mb-4"></div>
          <p className="text-stone-600 dark:text-stone-300">Loading super admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Main Statistics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatBox label="Total Students" value={stats.totalStudents || 0} />
        <StatBox label="University Admins" value={stats.totalAdmins || 0} />
        <StatBox label="Donors" value={stats.totalDonors || 0} />
        <StatBox label="Aid Requests" value={stats.totalRequests || 0} />
        <StatBox label="Donations Received" value={stats.totalDonations || 0} />
        <StatBox label="Fulfilled Requests" value={stats.totalFulfilled || 0} />
      </div>

      {/* Weekly Statistics */}
      <div className="rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100">Weekly Activity</h3>
          <span className="text-xs text-stone-500 dark:text-stone-400">Last 7 days</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg border border-blue-200 dark:border-blue-700">
            <p className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase">New Users</p>
            <p className="mt-2 text-2xl font-bold text-blue-900 dark:text-blue-100">{stats.weeklyStats?.users || 0}</p>
          </div>
          <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg border border-green-200 dark:border-green-700">
            <p className="text-xs font-medium text-green-600 dark:text-green-400 uppercase">Donations</p>
            <p className="mt-2 text-2xl font-bold text-green-900 dark:text-green-100">{stats.weeklyStats?.donations || 0}</p>
          </div>
          <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg border border-purple-200 dark:border-purple-700">
            <p className="text-xs font-medium text-purple-600 dark:text-purple-400 uppercase">Requests</p>
            <p className="mt-2 text-2xl font-bold text-purple-900 dark:text-purple-100">{stats.weeklyStats?.requests || 0}</p>
          </div>
          <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-lg border border-orange-200 dark:border-orange-700">
            <p className="text-xs font-medium text-orange-600 dark:text-orange-400 uppercase">Fulfilled</p>
            <p className="mt-2 text-2xl font-bold text-orange-900 dark:text-orange-100">{stats.weeklyStats?.fulfilled || 0}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* University Breakdown */}
        <div className="lg:col-span-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-4">University Breakdown</h3>
          {(stats.universityBreakdown || []).length === 0 ? (
            <p className="text-stone-500 dark:text-stone-400 text-center py-8">No universities yet</p>
          ) : (
            <div className="space-y-3">
              {stats.universityBreakdown.map((uni, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-stone-50 dark:bg-slate-800/50 rounded-lg border border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600 transition">
                  <div className="flex-1">
                    <p className="font-medium text-stone-900 dark:text-stone-100">{uni._id || "Unknown"}</p>
                    <p className="text-sm text-stone-600 dark:text-stone-400 mt-1">{uni.count} students enrolled</p>
                  </div>
                  <div className="text-right">
                    <div className="inline-block bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-3 py-1 rounded-full text-sm font-semibold">
                      {uni.verifiedMoms || 0} verified
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* System Status & Active Users */}
        <div className="space-y-6">
          {/* System Status */}
          <div className="rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-4">System Status</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-stone-600 dark:text-stone-300 font-medium">Database</span>
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></span>
                  <span className="text-xs text-green-600 dark:text-green-400 font-semibold">Online</span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-stone-600 dark:text-stone-300 font-medium">API Server</span>
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></span>
                  <span className="text-xs text-green-600 dark:text-green-400 font-semibold">Online</span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-stone-600 dark:text-stone-300 font-medium">Real-time Updates</span>
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></span>
                  <span className="text-xs text-green-600 dark:text-green-400 font-semibold">Active</span>
                </span>
              </div>
            </div>
          </div>

          {/* Active Users */}
          {stats.activeUsers && (
            <div className="rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-4">Active Users (24h)</h3>
              <p className="text-2xl font-bold text-stone-900 dark:text-stone-100 mb-4">{stats.activeUsers.total || 0}</p>
              <div className="space-y-2">
                {Object.entries(stats.activeUsers.byRole || {}).map(([role, count]) => (
                  <div key={role} className="flex justify-between items-center p-2 bg-stone-50 dark:bg-slate-800/50 rounded">
                    <span className="text-sm text-stone-600 dark:text-stone-300 capitalize font-medium">{role}s</span>
                    <span className="font-semibold text-stone-900 dark:text-stone-100">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Donations */}
      <div className="rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-4">Recent Donations</h3>
        {donations.length === 0 ? (
          <p className="text-stone-500 dark:text-stone-400 text-center py-8">No donations yet</p>
        ) : (
          <div>
            {/* Scrollable Container */}
            <div className={`space-y-3 ${showAllDonations ? "max-h-96 overflow-y-auto pr-2" : ""}`}>
              {(showAllDonations ? donations : donations.slice(0, 3)).map((donation) => (
                <div key={donation._id} className="flex items-center justify-between p-4 bg-stone-50 dark:bg-slate-800/50 rounded-lg border border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600 transition">
                  <div className="flex-1">
                    <p className="font-medium text-stone-900 dark:text-stone-100">{donation.donor?.name || "Anonymous Donor"}</p>
                    <p className="text-sm text-stone-600 dark:text-stone-400 mt-1">
                      {donation.type === "financial"
                        ? `KES ${(donation.amount || 0).toLocaleString()}`
                        : donation.items?.map((i) => `${i.name} x${i.quantity}`).join(", ") || "Items donation"
                      }
                    </p>
                    <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">
                      {new Date(donation.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ml-2 ${
                    donation.status === "completed" 
                      ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                      : donation.status === "pending"
                      ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300"
                      : "bg-stone-200 dark:bg-stone-700 text-stone-800 dark:text-stone-200"
                  }`}>
                    {donation.status || "Pending"}
                  </div>
                </div>
              ))}
            </div>

            {/* Show More/Less Button */}
            {donations.length > 3 && (
              <div className="mt-4 text-center">
                <button
                  onClick={() => setShowAllDonations(!showAllDonations)}
                  className="px-4 py-2 bg-gradient-to-r from-stone-700 to-stone-800 text-white font-semibold rounded-lg hover:from-stone-800 hover:to-stone-900 dark:from-stone-600 dark:to-stone-700 dark:hover:from-stone-700 dark:hover:to-stone-800 transition"
                >
                  {showAllDonations ? "Show Less" : `Show More (${donations.length - 3} more)`}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SuperAdminHome;


