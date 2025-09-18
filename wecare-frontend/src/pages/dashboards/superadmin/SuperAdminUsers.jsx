import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { listUsers, approveAdmin as approveAdminApi, suspendUser } from "../../../services/userService";

const SuperAdminUsers = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const token = user?.token;

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await listUsers(token);
      setUsers(data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleApproveAdmin = async (id) => {
    try {
      await approveAdminApi(token, id);
      await fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to approve admin");
    }
  };

  const handleSuspendToggle = async (id, current) => {
    try {
      await suspendUser(token, id, !current);
      await fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update suspension");
    }
  };

  const rows = useMemo(() => users, [users]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-800 mb-3">User Management</h3>
        {error && <p className="text-red-600 bg-red-50 rounded px-3 py-2 mb-3">{error}</p>}
        {loading ? (
          <p className="text-slate-500">Loading...</p>
        ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">University</th>
                <th className="py-2 pr-4">Role</th>
                <th className="py-2 pr-4">Approved</th>
                <th className="py-2 pr-4">Suspended</th>
                <th className="py-2 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u)=> (
                <tr key={u._id} className="border-t border-slate-200">
                  <td className="py-2 pr-4 text-slate-800">{u.name}</td>
                  <td className="py-2 pr-4 text-slate-600">{u.email}</td>
                  <td className="py-2 pr-4 text-slate-600">{u.university || "-"}</td>
                  <td className="py-2 pr-4">
                    <span className="px-2 py-1 rounded bg-slate-100 text-slate-700">{u.role}</span>
                  </td>
                  <td className="py-2 pr-4">{u.isApproved ? 
                    <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-700">Yes</span> :
                    <span className="px-2 py-1 rounded bg-amber-100 text-amber-700">No</span>
                  }</td>
                  <td className="py-2 pr-4">{u.isSuspended ? 
                    <span className="px-2 py-1 rounded bg-rose-100 text-rose-700">Yes</span> :
                    <span className="px-2 py-1 rounded bg-slate-100 text-slate-700">No</span>
                  }</td>
                  <td className="py-2 pr-4 space-x-2">
                    {u.role === "admin" && !u.isApproved && (
                      <button onClick={() => handleApproveAdmin(u._id)} className="px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700">Approve Admin</button>
                    )}
                    {(u.role === "student" || u.role === "donor" || u.role === "admin") && (
                      <button onClick={() => handleSuspendToggle(u._id, u.isSuspended)} className={`px-3 py-1.5 rounded-lg text-white ${u.isSuspended ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"}`}>
                        {u.isSuspended ? "Unsuspend" : "Suspend"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </div>
    </div>
  );
};

export default SuperAdminUsers;


