import { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { getGlobalStats, getAllDonations } from "../../../services/donationService";

const Stat = ({ label, value, subtitle }) => (
  <div className="rounded-xl border border-slate-200 p-5 text-center">
    <p className="text-sm text-slate-500">{label}</p>
    <p className="mt-1 text-2xl font-bold text-slate-800">{value}</p>
    {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
  </div>
);

const SuperAdminHome = () => {
  const { user } = useAuth();
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
    }
  });
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [globalStats, allDonations] = await Promise.all([
          getGlobalStats(user?.token),
          getAllDonations(user?.token)
        ]);
        
        setStats(globalStats);
        setDonations(allDonations.slice(0, 10)); // Show latest 10 donations
      } catch (err) {
        console.error("Failed to load super admin data:", err);
      } finally {
        setLoading(false);
      }
    };
    
    if (user?.token) loadData();
  }, [user?.token]);

  if (loading) {
    return <div className="text-center py-8">Loading super admin dashboard...</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        {/* Main Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Stat label="Total Students" value={stats.totalStudents} />
          <Stat label="Admins" value={stats.totalAdmins} />
          <Stat label="Donors" value={stats.totalDonors} />
          <Stat label="Total Requests" value={stats.totalRequests} />
          <Stat label="Fulfilled" value={stats.totalFulfilled} />
          <Stat label="Total Donations" value={stats.totalDonations} />
        </div>

        {/* Weekly Stats */}
        <div className="rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Weekly Statistics</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Stat label="New Users" value={stats.weeklyStats.users} subtitle="This week" />
            <Stat label="New Donations" value={stats.weeklyStats.donations} subtitle="This week" />
            <Stat label="New Requests" value={stats.weeklyStats.requests} subtitle="This week" />
            <Stat label="Fulfilled" value={stats.weeklyStats.fulfilled} subtitle="This week" />
          </div>
        </div>

        {/* University Breakdown */}
        <div className="rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-4">University Breakdown</h3>
          <div className="space-y-3">
            {stats.universityBreakdown.map((uni, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="font-medium text-slate-800">{uni._id || 'Unknown University'}</p>
                  <p className="text-sm text-slate-600">{uni.count} students</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-slate-800">{uni.verifiedMoms} verified moms</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* Recent Donations */}
        <div className="rounded-xl border border-slate-200 p-5">
          <h4 className="font-semibold text-slate-800 mb-3">Recent Donations</h4>
          <div className="space-y-3">
            {donations.length === 0 ? (
              <p className="text-sm text-slate-500">No donations yet.</p>
            ) : (
              donations.map((donation) => (
                <div key={donation._id} className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-sm font-medium text-slate-800">
                    {donation.donor?.name || 'Anonymous'}
                  </p>
                  <p className="text-xs text-slate-600">
                    {donation.type === 'financial' 
                      ? `KES ${donation.amount?.toLocaleString()}` 
                      : donation.items?.map(i => `${i.name} x${i.quantity}`).join(', ')
                    }
                  </p>
                  <p className="text-xs text-slate-400">
                    {new Date(donation.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* System Status */}
        <div className="rounded-xl border border-slate-200 p-5">
          <h4 className="font-semibold text-slate-800 mb-3">System Status</h4>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Database</span>
              <span className="text-xs text-green-600 font-medium">● Online</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">API</span>
              <span className="text-xs text-green-600 font-medium">● Online</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Payments</span>
              <span className="text-xs text-green-600 font-medium">● Online</span>
            </div>
            {stats.activeUsers && (
              <div className="mt-3 rounded-lg border border-slate-200 p-3">
                <p className="text-sm font-medium text-slate-800 mb-2">Active Users (last 24h): {stats.activeUsers.total}</p>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-700">
                  <div className="flex justify-between"><span>Admins</span><span className="font-semibold">{stats.activeUsers.byRole.admin}</span></div>
                  <div className="flex justify-between"><span>Superadmins</span><span className="font-semibold">{stats.activeUsers.byRole.superadmin}</span></div>
                  <div className="flex justify-between"><span>Students</span><span className="font-semibold">{stats.activeUsers.byRole.student}</span></div>
                  <div className="flex justify-between"><span>Donors</span><span className="font-semibold">{stats.activeUsers.byRole.donor}</span></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminHome;


