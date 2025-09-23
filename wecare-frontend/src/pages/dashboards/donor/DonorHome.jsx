const Card = ({ title, children }) => (
  <div className="card p-5">
    <h3 className="mb-2">{title}</h3>
    {children}
  </div>
);

import { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { getAidStats } from "../../../services/aidService";
import { getDonorStats, getGlobalAidRequests } from "../../../services/donationService";

const DonorHome = () => {
  const { user } = useAuth();
  const [needs, setNeeds] = useState({ financial: 0, essentials: 0 });
  const [impact, setImpact] = useState({ 
    mothersSupported: 0, 
    financialDonated: 0, 
    essentialsDonated: 0,
    totalDonations: 0 
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [aidStats, donorStats, globalRequests] = await Promise.all([
          getAidStats(user?.token),
          getDonorStats(user?.token),
          getGlobalAidRequests(user?.token)
        ]);
        
        setNeeds({ 
          financial: aidStats.financialOpen || 0, 
          essentials: aidStats.essentialsOpen || 0 
        });
        
        setImpact({
          mothersSupported: donorStats.mothersSupported || 0,
          financialDonated: donorStats.financialDonated || 0,
          essentialsDonated: donorStats.essentialsDonated || 0,
          totalDonations: donorStats.totalDonations || 0
        });
      } catch (err) {
        console.error("Failed to load data:", err);
      } finally {
        setLoading(false);
      }
    };
    if (user?.token) load();
  }, [user?.token]);

  if (loading) {
    return <div className="text-center py-8">Loading donor dashboard...</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="card p-5 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">Financial Requests</p>
            <p className="mt-1 text-2xl font-bold">{needs.financial}</p>
          </div>
          <div className="card p-5 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">Essentials Needed</p>
            <p className="mt-1 text-2xl font-bold">{needs.essentials}</p>
          </div>
          <div className="card p-5 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">Mothers Supported</p>
            <p className="mt-1 text-2xl font-bold">{impact.mothersSupported}</p>
          </div>
          <div className="card p-5 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">Total Donations</p>
            <p className="mt-1 text-2xl font-bold">{impact.totalDonations}</p>
          </div>
        </div>

        <Card title="Your Impact">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400">Financial Donated</p>
              <p className="text-lg font-bold">KES {impact.financialDonated.toLocaleString()}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400">Essentials Donated</p>
              <p className="text-lg font-bold">{impact.essentialsDonated} items</p>
            </div>
          </div>
        </Card>

        <Card title="Quick Donate">
          <div className="flex flex-wrap gap-3">
            <a href="/dashboard/donor/donations?type=financial" className="btn btn-primary">Financial Aid</a>
            <a href="/dashboard/donor/donations?type=essentials" className="btn btn-primary">Essentials</a>
            <a href="/dashboard/donor/browse" className="btn btn-secondary">Browse Requests</a>
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        <Card title="Thank You 🙏">
          <p className="text-sm text-slate-600 dark:text-slate-400">Your support keeps student mothers in school. We appreciate you!</p>
        </Card>
        
        <Card title="Recent Activity">
          <p className="text-sm text-slate-600 dark:text-slate-400">View your donation history and track your impact.</p>
          <a href="/dashboard/donor/donations" className="mt-2 inline-block text-brand-600 text-sm hover:underline">View Donations →</a>
        </Card>
      </div>
    </div>
  );
};

export default DonorHome;
