import { useEffect, useRef, useState } from "react";
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
  const printRef = useRef(null);

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
    <div className="space-y-6" ref={printRef}>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Metric title="Mothers Supported" value={(stats?.mothersSupported || 0).toLocaleString()} />
        <Metric title="Financial Donated" value={`KES ${(stats?.financialDonated || 0).toLocaleString()}`} />
        <Metric title="Essentials Funded" value={`${(stats?.essentialsDonated || 0).toLocaleString()} items`} />
        {/* Events Sponsored removed for now */}
      </div>

      <div className="rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-800 mb-3">Downloads</h3>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => {
            const rows = [
              ["Reports"],
              ["Donor", user?.name || ""],
              ["Email", user?.email || ""],
              [""],
              ["Metric","Value"],
              ["Mothers Supported", `${stats?.mothersSupported || 0}`],
              ["Financial Donated (KES)", `${stats?.financialDonated || 0}`],
              ["Essentials Funded (items)", `${stats?.essentialsDonated || 0}`]
            ];
            const csv = rows.map(r => r.join(",")).join("\n");
            const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = 'donor_reports.csv'; a.click(); URL.revokeObjectURL(url);
          }} className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800">Export CSV</button>
          <button onClick={() => {
            const w = window.open('', '_blank');
            if (!w) return;
            const content = printRef.current?.innerHTML || '';
            w.document.write(`<html><head><title>Donor Reports</title><style>body{font-family:sans-serif;padding:20px} button,nav,header,footer{display:none!important}</style></head><body><h2>Donor Reports</h2><p><strong>Donor:</strong> ${user?.name || ''}</p><p><strong>Email:</strong> ${user?.email || ''}</p>${content}</body></html>`);
            w.document.close(); w.focus(); w.print(); w.close();
          }} className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700">Export PDF</button>
        </div>
      </div>
    </div>
  );
};

export default DonorReports;


