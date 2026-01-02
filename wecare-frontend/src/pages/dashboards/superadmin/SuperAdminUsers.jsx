import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { listUsers, approveAdmin as approveAdminApi, suspendUser, resetAdminDepartmentByAdmin } from "../../../services/userService";

const SuperAdminUsers = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showResetModal, setShowResetModal] = useState(false);
  const [selectedAdminForReset, setSelectedAdminForReset] = useState(null);

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

  const handleResetDepartment = async () => {
    if (!selectedAdminForReset) return;
    try {
      await resetAdminDepartmentByAdmin(token, selectedAdminForReset._id);
      setShowResetModal(false);
      setSelectedAdminForReset(null);
      await fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to reset department");
      setShowResetModal(false);
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
                <th className="py-2 pr-4">Department</th>
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
                  <td className="py-2 pr-4">
                    {u.role === "admin" && (u.department ? 
                      <span className="px-2 py-1 rounded bg-blue-100 text-blue-700 capitalize">{u.department}</span> :
                      <span className="px-2 py-1 rounded bg-slate-100 text-slate-700">-</span>
                    )}
                    {u.role !== "admin" && <span className="px-2 py-1 rounded bg-slate-100 text-slate-700">-</span>}
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
                    {u.role === "admin" && u.department && (
                      <button onClick={() => {
                        setSelectedAdminForReset(u);
                        setShowResetModal(true);
                      }} className="px-3 py-1.5 rounded-lg bg-orange-600 text-white hover:bg-orange-700">Reset Dept</button>
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

      {/* Reset Department Modal */}
      {showResetModal && selectedAdminForReset && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border-2 border-orange-300">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Reset Admin Department</h3>
            <p className="text-slate-700 mb-4">
              Are you sure you want to reset <span className="font-bold">{selectedAdminForReset.name}</span>'s department assignment from <span className="font-bold capitalize text-orange-700">{selectedAdminForReset.department}</span>?
            </p>
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-4">
              <p className="text-sm text-slate-700 font-medium">⚠️ Important:</p>
              <ul className="text-xs text-slate-600 mt-2 space-y-1 list-disc list-inside">
                <li>This admin will need to reassign a department</li>
                <li>They will be blocked from administrative activities</li>
                <li>Other admins in the same university can use this department</li>
              </ul>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowResetModal(false);
                  setSelectedAdminForReset(null);
                }}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetDepartment}
                className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-orange-700 text-white font-medium hover:from-orange-700 hover:to-orange-800 transition-all"
              >
                Reset Department
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminUsers;


