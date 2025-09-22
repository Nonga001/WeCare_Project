import { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { getDonorStats } from "../../../services/donationService";

const Metric = ({ title, value }) => (
  <div className="rounded-xl border border-slate-200 p-5">
    <p className="text-sm text-slate-500">{title}</p>
    <p className="mt-1 text-2xl font-bold text-slate-800">{value}</p>
  </div>
);

const DonorReports = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const s = await getDonorStats(user?.token);
        setStats(s);
      } catch (e) {
        setError("Failed to load stats");
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    if (user?.token) load();
  }, [user?.token]);

  if (loading) return <div className="py-8 text-center">Loading...</div>;
  if (error) return <div className="py-8 text-center text-red-600">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Metric title="Mothers Supported" value={(stats?.mothersSupported || 0).toLocaleString()} />
        <Metric title="Financial Donated" value={`KES ${(stats?.financialDonated || 0).toLocaleString()}`} />
        <Metric title="Essentials Funded" value={`${(stats?.essentialsDonated || 0).toLocaleString()} items`} />
        <Metric title="Events Sponsored" value={(stats?.eventsSponsored || 0)} />
      </div>

      <div className="rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-800 mb-3">Downloads</h3>
        <div className="flex flex-wrap gap-3">
          <button className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800">Export CSV</button>
          <button className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700">Export PDF</button>
        </div>
      </div>
    </div>
  );
};

export default DonorReports;


