import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { getDonorStats } from "../../../services/donationService";

const Card = ({ title, children }) => (
  <div className="rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
    {title && <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-4">{title}</h3>}
    {children}
  </div>
);

const StatBox = ({ label, value, subtext }) => (
  <div className="flex flex-col">
    <p className="text-sm text-slate-600 dark:text-stone-300">{label}</p>
    <p className="text-3xl font-bold text-stone-900 dark:text-stone-100 mt-1">{value}</p>
    {subtext && <p className="text-xs text-slate-500 dark:text-stone-400 mt-1">{subtext}</p>}
  </div>
);

const DonorReports = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [period, setPeriod] = useState("month");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const printRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const s = await getDonorStats(user?.token, period);
        setStats(s);
      } catch (e) {
        setError("Failed to load stats");
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    if (user?.token) load();
  }, [user?.token, period]);

  if (loading) return <div className="py-8 text-center text-slate-600">Loading reports...</div>;
  if (error) return <div className="py-8 text-center text-red-600">{error}</div>;

  const current = stats?.current || { donationsCount: 0, mothersSupported: 0, financialDonated: 0, essentialsDonated: 0 };
  const previous = stats?.previous || { donationsCount: 0, mothersSupported: 0, financialDonated: 0, essentialsDonated: 0 };
  const allTime = stats?.allTime || { donationsCount: 0, mothersSupported: 0, financialDonated: 0, essentialsDonated: 0 };
  const periodLabelMap = { day: "Day", week: "Week", month: "Month", year: "Year" };
  const periodLabel = periodLabelMap[period] || "Month";
  const formatDelta = (cur, prev, suffix = "") => {
    const diff = (cur || 0) - (prev || 0);
    const dir = diff >= 0 ? "↑" : "↓";
    return `${dir} ${Math.abs(diff).toLocaleString()}${suffix}`;
  };

  return (
    <div className="space-y-6" ref={printRef}>
      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100">Donor Report</h3>
            <p className="text-xs text-slate-600 dark:text-stone-400">Data is pulled directly from live donations.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-stone-400">Period</span>
            <select value={period} onChange={(e) => setPeriod(e.target.value)} className="input text-sm">
              <option value="day">Day</option>
              <option value="week">Week</option>
              <option value="month">Month</option>
              <option value="year">Year</option>
            </select>
          </div>
        </div>
      </Card>

      <Card title={`Current ${periodLabel} Summary`}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <StatBox label="Total Donations" value={current.donationsCount.toLocaleString()} subtext={`This ${periodLabel.toLowerCase()}`} />
          <StatBox label="Funds Donated" value={`KES ${current.financialDonated.toLocaleString()}`} subtext={`This ${periodLabel.toLowerCase()}`} />
          <StatBox label="Items Donated" value={current.essentialsDonated.toLocaleString()} subtext={`This ${periodLabel.toLowerCase()}`} />
          <StatBox label="Mothers Supported" value={current.mothersSupported.toLocaleString()} subtext={`This ${periodLabel.toLowerCase()}`} />
        </div>
      </Card>

      <Card title={`${periodLabel} Comparison`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border border-stone-200 dark:border-stone-700 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-stone-900 dark:text-stone-100 mb-3">Funds & Items</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600 dark:text-stone-300">Funds (KES)</span>
                <span className="font-semibold text-stone-900 dark:text-stone-100">{current.financialDonated.toLocaleString()}</span>
                <span className="text-xs text-slate-500 dark:text-stone-400">{formatDelta(current.financialDonated, previous.financialDonated)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600 dark:text-stone-300">Items</span>
                <span className="font-semibold text-stone-900 dark:text-stone-100">{current.essentialsDonated.toLocaleString()}</span>
                <span className="text-xs text-slate-500 dark:text-stone-400">{formatDelta(current.essentialsDonated, previous.essentialsDonated, " items")}</span>
              </div>
            </div>
          </div>
          <div className="border border-stone-200 dark:border-stone-700 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-stone-900 dark:text-stone-100 mb-3">Activity</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600 dark:text-stone-300">Donations</span>
                <span className="font-semibold text-stone-900 dark:text-stone-100">{current.donationsCount.toLocaleString()}</span>
                <span className="text-xs text-slate-500 dark:text-stone-400">{formatDelta(current.donationsCount, previous.donationsCount)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600 dark:text-stone-300">Mothers Supported</span>
                <span className="font-semibold text-stone-900 dark:text-stone-100">{current.mothersSupported.toLocaleString()}</span>
                <span className="text-xs text-slate-500 dark:text-stone-400">{formatDelta(current.mothersSupported, previous.mothersSupported)}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card title="All-Time Totals">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <StatBox label="Total Donations" value={allTime.donationsCount.toLocaleString()} subtext="All time" />
          <StatBox label="Funds Donated" value={`KES ${allTime.financialDonated.toLocaleString()}`} subtext="All time" />
          <StatBox label="Items Donated" value={allTime.essentialsDonated.toLocaleString()} subtext="All time" />
          <StatBox label="Mothers Supported" value={allTime.mothersSupported.toLocaleString()} subtext="All time" />
        </div>
      </Card>

      <Card title="Export Report">
        <div className="flex flex-wrap gap-3">
          <button onClick={() => {
            const rows = [
              ["WeCare Donor Impact Report"],
              [""],
              ["DONOR INFORMATION"],
              ["Name", user?.name || ""],
              ["Email", user?.email || ""],
              ["Period", periodLabel],
              [""],
              ["CURRENT PERIOD"],
              ["Total Donations", current.donationsCount],
              ["Funds Donated", `KES ${current.financialDonated}`],
              ["Items Donated", current.essentialsDonated],
              ["Mothers Supported", current.mothersSupported],
              [""],
              ["PREVIOUS PERIOD"],
              ["Total Donations", previous.donationsCount],
              ["Funds Donated", `KES ${previous.financialDonated}`],
              ["Items Donated", previous.essentialsDonated],
              ["Mothers Supported", previous.mothersSupported],
              [""],
              ["ALL TIME"],
              ["Total Donations", allTime.donationsCount],
              ["Funds Donated", `KES ${allTime.financialDonated}`],
              ["Items Donated", allTime.essentialsDonated],
              ["Mothers Supported", allTime.mothersSupported],
              [""],
              ["Report Generated", new Date().toLocaleString()]
            ];
            const csv = rows.map(r => r.map(cell => `"${cell}"`).join(",")).join("\n");
            const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `donor_impact_report_${new Date().getTime()}.csv`;
            a.click();
            URL.revokeObjectURL(url);
          }} className="px-5 py-2.5 rounded-lg bg-slate-900 dark:bg-slate-800 text-white text-sm font-medium hover:bg-slate-800 dark:hover:bg-slate-700 transition">
            Export CSV
          </button>
          <button onClick={() => {
            const w = window.open("", "_blank");
            if (!w) return;
            const content = printRef.current?.innerHTML || "";
            w.document.write(`
              <html>
                <head>
                  <title>WeCare Donor Impact Report</title>
                  <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 40px; line-height: 1.6; color: #333; }
                    h3 { color: #1f2937; margin-top: 30px; margin-bottom: 15px; border-bottom: 2px solid #000; padding-bottom: 10px; }
                    button, nav, header, footer { display: none !important; }
                    .card { page-break-inside: avoid; margin-bottom: 20px; }
                    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
                    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
                    th { background-color: #f3f4f6; font-weight: bold; }
                  </style>
                </head>
                <body>
                  <h2>WeCare Donor Impact Report</h2>
                  <p><strong>Donor:</strong> ${user?.name || "N/A"}</p>
                  <p><strong>Email:</strong> ${user?.email || "N/A"}</p>
                  <p><strong>Period:</strong> ${periodLabel}</p>
                  <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
                  ${content}
                </body>
              </html>
            `);
            w.document.close();
            w.focus();
            w.print();
            w.close();
          }} className="px-5 py-2.5 rounded-lg bg-blue-600 dark:bg-blue-700 text-white text-sm font-medium hover:bg-blue-700 dark:hover:bg-blue-800 transition">
            Export PDF
          </button>
        </div>
      </Card>
    </div>
  );
};

export default DonorReports;


