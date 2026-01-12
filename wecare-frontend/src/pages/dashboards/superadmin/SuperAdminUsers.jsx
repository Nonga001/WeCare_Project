import { useEffect, useMemo, useState, useRef } from "react";
import { useAuth } from "../../../context/AuthContext";
import { listUsers, approveAdmin as approveAdminApi, suspendUser, resetAdminDepartmentByAdmin } from "../../../services/userService";

const SuperAdminUsers = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showResetModal, setShowResetModal] = useState(false);
  const [selectedAdminForReset, setSelectedAdminForReset] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [expandedUserId, setExpandedUserId] = useState(null);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showActionMenu, setShowActionMenu] = useState(null);
  const actionMenuRef = useRef(null);

  const token = user?.token;

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await listUsers(token);
      setUsers(data);
      setError("");
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

  // Close action menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target)) {
        setShowActionMenu(null);
      }
    };

    if (showActionMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showActionMenu]);

  const handleApproveAdmin = async (id) => {
    try {
      await approveAdminApi(token, id);
      setSuccess("Admin approved successfully");
      setTimeout(() => setSuccess(""), 3000);
      await fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to approve admin");
      setTimeout(() => setError(""), 3000);
    }
  };

  const handleSuspendToggle = async (id, current) => {
    try {
      await suspendUser(token, id, !current);
      setSuccess(`User ${current ? "unsuspended" : "suspended"} successfully`);
      setTimeout(() => setSuccess(""), 3000);
      await fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update suspension");
      setTimeout(() => setError(""), 3000);
    }
  };

  const handleResetDepartment = async () => {
    if (!selectedAdminForReset) return;
    try {
      await resetAdminDepartmentByAdmin(token, selectedAdminForReset._id);
      setShowResetModal(false);
      setSelectedAdminForReset(null);
      setSuccess("Department reset successfully");
      setTimeout(() => setSuccess(""), 3000);
      await fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to reset department");
      setTimeout(() => setError(""), 3000);
      setShowResetModal(false);
    }
  };

  const handleBulkSuspend = async () => {
    try {
      for (const id of selectedUsers) {
        await suspendUser(token, id, true);
      }
      setSuccess(`${selectedUsers.length} user(s) suspended`);
      setTimeout(() => setSuccess(""), 3000);
      setSelectedUsers([]);
      await fetchUsers();
    } catch (err) {
      setError("Failed to suspend users");
      setTimeout(() => setError(""), 3000);
    }
  };

  const toggleUserSelection = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map(u => u._id));
    }
  };

  // Filter and search logic
  const filteredUsers = useMemo(() => {
    let filtered = users;

    // Role filter
    if (roleFilter !== "all") {
      filtered = filtered.filter(u => u.role === roleFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(u => 
        u.name?.toLowerCase().includes(query) ||
        u.email?.toLowerCase().includes(query) ||
        u.university?.toLowerCase().includes(query) ||
        u.role?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [users, roleFilter, searchQuery]);

  // Count users by role
  const roleCounts = useMemo(() => {
    return {
      all: users.length,
      student: users.filter(u => u.role === "student").length,
      donor: users.filter(u => u.role === "donor").length,
      admin: users.filter(u => u.role === "admin").length,
    };
  }, [users]);

  const getStatusBadge = (u) => {
    if (u.isSuspended) {
      return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">Suspended</span>;
    }
    if (!u.isApproved) {
      return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300">Pending</span>;
    }
    return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">Active</span>;
  };

  const getRoleBadge = (role) => {
    const colors = {
      student: "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300",
      donor: "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300",
      admin: "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300",
    };
    return <span className={`px-2 py-1 rounded-full text-xs font-semibold capitalize ${colors[role] || "bg-stone-200 dark:bg-stone-700 text-stone-800 dark:text-stone-200"}`}>{role}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Toast Notifications */}
      {error && (
        <div className="fixed top-4 right-4 z-50 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg shadow-lg max-w-md">
          {error}
        </div>
      )}
      {success && (
        <div className="fixed top-4 right-4 z-50 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 rounded-lg shadow-lg max-w-md">
          {success}
        </div>
      )}

      {/* Header with Search and Filters */}
      <div className="rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100">User Management</h3>
          
          {/* Bulk Actions */}
          {selectedUsers.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-stone-600 dark:text-stone-400">{selectedUsers.length} selected</span>
              <button
                onClick={handleBulkSuspend}
                className="px-3 py-1.5 bg-gradient-to-r from-red-500 to-rose-600 text-white text-sm font-semibold rounded-lg hover:from-red-600 hover:to-rose-700 transition"
              >
                Suspend Selected
              </button>
              <button
                onClick={() => setSelectedUsers([])}
                className="px-3 py-1.5 bg-stone-200 dark:bg-stone-700 text-stone-800 dark:text-stone-200 text-sm font-semibold rounded-lg hover:bg-stone-300 dark:hover:bg-stone-600 transition"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {/* Search Bar */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search by name, email, or university..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 border border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-slate-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>

        {/* Role Filter Tabs */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setRoleFilter("all")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
              roleFilter === "all"
                ? "bg-gradient-to-r from-red-500 to-rose-600 text-white shadow"
                : "bg-stone-100 dark:bg-slate-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-slate-700"
            }`}
          >
            All ({roleCounts.all})
          </button>
          <button
            onClick={() => setRoleFilter("student")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
              roleFilter === "student"
                ? "bg-gradient-to-r from-red-500 to-rose-600 text-white shadow"
                : "bg-stone-100 dark:bg-slate-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-slate-700"
            }`}
          >
            Students ({roleCounts.student})
          </button>
          <button
            onClick={() => setRoleFilter("donor")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
              roleFilter === "donor"
                ? "bg-gradient-to-r from-red-500 to-rose-600 text-white shadow"
                : "bg-stone-100 dark:bg-slate-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-slate-700"
            }`}
          >
            Donors ({roleCounts.donor})
          </button>
          <button
            onClick={() => setRoleFilter("admin")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
              roleFilter === "admin"
                ? "bg-gradient-to-r from-red-500 to-rose-600 text-white shadow"
                : "bg-stone-100 dark:bg-slate-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-slate-700"
            }`}
          >
            Admins ({roleCounts.admin})
          </button>
        </div>
      </div>

      {/* Users List */}
      <div className="space-y-4">
        {loading ? (
          <div className="rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-slate-900 p-12 shadow-sm">
            <div className="flex flex-col items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mb-4"></div>
              <p className="text-stone-600 dark:text-stone-300">Loading users...</p>
            </div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-slate-900 p-12 shadow-sm">
            <div className="text-center">
              <svg className="mx-auto h-12 w-12 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-stone-900 dark:text-stone-100">No users found</h3>
              <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                {searchQuery ? "Try adjusting your search or filters" : "No users in the system yet"}
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-stone-50 dark:bg-slate-800 border-b border-stone-200 dark:border-stone-700">
                    <tr>
                      <th className="px-4 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                          onChange={toggleSelectAll}
                          className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-stone-600 dark:text-stone-300 uppercase tracking-wider">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-stone-600 dark:text-stone-300 uppercase tracking-wider">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-stone-600 dark:text-stone-300 uppercase tracking-wider">Role</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-stone-600 dark:text-stone-300 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-stone-600 dark:text-stone-300 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200 dark:divide-stone-700">
                    {filteredUsers.map((u) => (
                      <tr key={u._id} className="hover:bg-stone-50 dark:hover:bg-slate-800/50 transition">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedUsers.includes(u._id)}
                            onChange={() => toggleUserSelection(u._id)}
                            className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-stone-900 dark:text-stone-100">{u.name}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-stone-600 dark:text-stone-400">{u.email}</div>
                        </td>
                        <td className="px-4 py-3">
                          {getRoleBadge(u.role)}
                        </td>
                        <td className="px-4 py-3">
                          {getStatusBadge(u)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setExpandedUserId(expandedUserId === u._id ? null : u._id)}
                              className="px-3 py-1.5 text-xs font-semibold bg-stone-200 dark:bg-stone-700 text-stone-800 dark:text-stone-200 rounded-lg hover:bg-stone-300 dark:hover:bg-stone-600 transition"
                            >
                              {expandedUserId === u._id ? "Hide" : "Details"}
                            </button>
                            <div className="relative pointer-events-auto" ref={showActionMenu === u._id ? actionMenuRef : null}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowActionMenu(showActionMenu === u._id ? null : u._id);
                                }}
                                className="px-3 py-1.5 text-xs font-semibold bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-lg hover:from-red-600 hover:to-rose-700 transition"
                              >
                                Actions ▾
                              </button>
                              {showActionMenu === u._id && (
                                <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-slate-800 border border-stone-200 dark:border-stone-700 rounded-lg shadow-xl z-[100] pointer-events-auto">
                                  {u.role === "admin" && !u.isApproved && (
                                    <button
                                      onClick={() => {
                                        handleApproveAdmin(u._id);
                                        setShowActionMenu(null);
                                      }}
                                      className="w-full px-4 py-2 text-left text-sm text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-slate-700 first:rounded-t-lg"
                                    >
                                      Approve Admin
                                    </button>
                                  )}
                                  {u.role === "admin" && u.department && (
                                    <button
                                      onClick={() => {
                                        setSelectedAdminForReset(u);
                                        setShowResetModal(true);
                                        setShowActionMenu(null);
                                      }}
                                      className="w-full px-4 py-2 text-left text-sm text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-slate-700"
                                    >
                                      Reset Department
                                    </button>
                                  )}
                                  {(u.role === "student" || u.role === "donor" || u.role === "admin") && (
                                    <button
                                      onClick={() => {
                                        handleSuspendToggle(u._id, u.isSuspended);
                                        setShowActionMenu(null);
                                      }}
                                      className="w-full px-4 py-2 text-left text-sm text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-slate-700 last:rounded-b-lg"
                                    >
                                      {u.isSuspended ? "Unsuspend User" : "Suspend User"}
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Expandable Details */}
              {filteredUsers.map((u) => expandedUserId === u._id && (
                <div key={`detail-${u._id}`} className="border-t border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-slate-800/50 p-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <span className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase">University</span>
                      <p className="text-sm text-stone-900 dark:text-stone-100 mt-1">{u.university || "-"}</p>
                    </div>
                    {u.role === "admin" && (
                      <div>
                        <span className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase">Department</span>
                        <p className="text-sm text-stone-900 dark:text-stone-100 mt-1 capitalize">{u.department || "-"}</p>
                      </div>
                    )}
                    {u.role === "donor" && (
                      <div>
                        <span className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase">Organization</span>
                        <p className="text-sm text-stone-900 dark:text-stone-100 mt-1">{u.organization || "-"}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase">Phone</span>
                      <p className="text-sm text-stone-900 dark:text-stone-100 mt-1">{u.phone || "-"}</p>
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase">Joined</span>
                      <p className="text-sm text-stone-900 dark:text-stone-100 mt-1">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "-"}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Mobile/Tablet Card View */}
            <div className="lg:hidden space-y-4">
              {filteredUsers.map((u) => (
                <div key={u._id} className="rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3 flex-1">
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(u._id)}
                          onChange={() => toggleUserSelection(u._id)}
                          className="mt-1 w-4 h-4 text-red-600 rounded focus:ring-red-500"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-stone-900 dark:text-stone-100 truncate">{u.name}</h4>
                          <p className="text-sm text-stone-600 dark:text-stone-400 truncate">{u.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        {getRoleBadge(u.role)}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-stone-200 dark:border-stone-700">
                      <div>
                        {getStatusBadge(u)}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setExpandedUserId(expandedUserId === u._id ? null : u._id)}
                          className="px-3 py-1.5 text-xs font-semibold bg-stone-200 dark:bg-stone-700 text-stone-800 dark:text-stone-200 rounded-lg"
                        >
                          {expandedUserId === u._id ? "Hide" : "Details"}
                        </button>
                        <div className="relative pointer-events-auto" ref={showActionMenu === u._id ? actionMenuRef : null}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowActionMenu(showActionMenu === u._id ? null : u._id);
                            }}
                            className="px-3 py-1.5 text-xs font-semibold bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-lg hover:from-red-600 hover:to-rose-700 transition"
                          >
                            ⋯
                          </button>
                          {showActionMenu === u._id && (
                            <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-slate-800 border border-stone-200 dark:border-stone-700 rounded-lg shadow-xl z-[100] pointer-events-auto">
                              {u.role === "admin" && !u.isApproved && (
                                <button
                                  onClick={() => {
                                    handleApproveAdmin(u._id);
                                    setShowActionMenu(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-slate-700 first:rounded-t-lg"
                                >
                                  Approve Admin
                                </button>
                              )}
                              {u.role === "admin" && u.department && (
                                <button
                                  onClick={() => {
                                    setSelectedAdminForReset(u);
                                    setShowResetModal(true);
                                    setShowActionMenu(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-slate-700"
                                >
                                  Reset Department
                                </button>
                              )}
                              {(u.role === "student" || u.role === "donor" || u.role === "admin") && (
                                <button
                                  onClick={() => {
                                    handleSuspendToggle(u._id, u.isSuspended);
                                    setShowActionMenu(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-slate-700 last:rounded-b-lg"
                                >
                                  {u.isSuspended ? "Unsuspend" : "Suspend"}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expandable Details for Mobile */}
                  {expandedUserId === u._id && (
                    <div className="border-t border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-slate-800/50 p-4">
                      <div className="space-y-3">
                        <div>
                          <span className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase">University</span>
                          <p className="text-sm text-stone-900 dark:text-stone-100 mt-1">{u.university || "-"}</p>
                        </div>
                        {u.role === "admin" && u.department && (
                          <div>
                            <span className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase">Department</span>
                            <p className="text-sm text-stone-900 dark:text-stone-100 mt-1 capitalize">{u.department}</p>
                          </div>
                        )}
                        {u.role === "donor" && u.organization && (
                          <div>
                            <span className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase">Organization</span>
                            <p className="text-sm text-stone-900 dark:text-stone-100 mt-1">{u.organization}</p>
                          </div>
                        )}
                        <div>
                          <span className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase">Phone</span>
                          <p className="text-sm text-stone-900 dark:text-stone-100 mt-1">{u.phone || "-"}</p>
                        </div>
                        <div>
                          <span className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase">Joined</span>
                          <p className="text-sm text-stone-900 dark:text-stone-100 mt-1">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "-"}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
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


