import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { approveStudent, listStudentsForAdmin, rejectStudent } from "../../../services/userService";

const AdminVerify = () => {
  const { user } = useAuth();
  const token = user?.token;
  const [students, setStudents] = useState([]);
  const [tab, setTab] = useState("pending");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const data = await listStudentsForAdmin(token);
      setStudents(data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load students");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const pending = useMemo(() => students.filter(s => !s.isApproved), [students]);
  const verified = useMemo(() => students.filter(s => s.isApproved), [students]);

  const handleApprove = async (id) => {
    try {
      await approveStudent(token, id);
      await fetchStudents();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to approve student");
    }
  };

  const handleReject = async (id) => {
    try {
      await rejectStudent(token, id);
      await fetchStudents();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to reject student");
    }
  };

  const Table = ({ data, showActions }) => (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-slate-500">
            <th className="py-2 pr-4">Name</th>
            <th className="py-2 pr-4">Email</th>
            <th className="py-2 pr-4">Registered</th>
            {showActions && <th className="py-2 pr-4">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {data.map(s => (
            <tr key={s._id} className="border-t border-slate-200">
              <td className="py-2 pr-4 text-slate-800">{s.name}</td>
              <td className="py-2 pr-4 text-slate-600">{s.email}</td>
              <td className="py-2 pr-4 text-slate-600">{new Date(s.createdAt).toLocaleString()}</td>
              {showActions && (
                <td className="py-2 pr-4 space-x-2">
                  <button onClick={() => handleApprove(s._id)} className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700">Approve</button>
                  <button onClick={() => handleReject(s._id)} className="px-3 py-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-700">Reject</button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-4">
      {error && <p className="text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>}
      <div className="flex items-center gap-3">
        <button onClick={() => setTab("pending")} className={`px-4 py-2 rounded-xl ${tab === "pending" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"}`}>Pending Registration</button>
        <button onClick={() => setTab("verified")} className={`px-4 py-2 rounded-xl ${tab === "verified" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"}`}>Verified Student Moms</button>
      </div>
      <div className="rounded-xl border border-slate-200 p-5">
        {loading ? (
          <p className="text-slate-500">Loading...</p>
        ) : tab === "pending" ? (
          <Table data={pending} showActions={true} />
        ) : (
          <Table data={verified} showActions={false} />
        )}
      </div>
    </div>
  );
};

export default AdminVerify;


