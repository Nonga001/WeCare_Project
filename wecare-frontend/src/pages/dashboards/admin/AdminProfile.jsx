import { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { updateAdminDepartment, changePassword as changePasswordApi, getProfile } from "../../../services/userService";

const AdminProfile = () => {
  const { user } = useAuth();
  const [form, setForm] = useState({ name: "", university: "", email: "", department: "", currentPassword: "", newPassword: "", confirmNewPassword: "" });
  const [show, setShow] = useState({ next: false, confirm: false });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingDepartment, setPendingDepartment] = useState(null);
  const [isUpdatingDept, setIsUpdatingDept] = useState(false);

  // Debug log to check what's coming from user context
  useEffect(() => {
    console.log("AdminProfile - User data from context:", user);
    console.log("AdminProfile - University field:", user?.university);
  }, [user]);

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user?.token) return;
      try {
        const profileData = await getProfile(user.token);
        console.log("AdminProfile - Fresh profile data from API:", profileData);
        // Update form with fresh data
        setForm((f) => ({
          ...f,
          name: profileData.name || "",
          university: profileData.university || "",
          email: profileData.email || "",
          department: profileData.department || "",
        }));
      } catch (err) {
        console.error("Failed to fetch profile:", err);
        // Fallback to user context data
        setForm((f)=>({
          ...f,
          name: user?.name || "",
          university: user?.university || "",
          email: user?.email || "",
          department: user?.department || "",
        }));
      }
    };
    
    fetchProfileData();
  }, [user?.token]);

  useEffect(() => {
    // Ensure form is updated from context
    setForm((f)=>({
      ...f,
      name: user?.name || "",
      university: user?.university || "",
      email: user?.email || "",
      department: user?.department || "",
    }));
  }, [user?.name, user?.university, user?.email, user?.department]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleDepartmentUpdate = async () => {
    try {
      setError(""); setMessage("");
      await updateAdminDepartment(user?.token, form.department);
      setMessage("Department updated successfully");
      setShowConfirmModal(false);
      setPendingDepartment(null);
      setTimeout(()=>setMessage(""), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update department");
      setShowConfirmModal(false);
    }
  };

  const handleDepartmentChange = (e) => {
    const newDept = e.target.value;
    if (newDept !== form.department) {
      setPendingDepartment(newDept);
      setShowConfirmModal(true);
    }
  };

  const confirmDepartmentUpdate = async () => {
    setIsUpdatingDept(true);
    setForm({ ...form, department: pendingDepartment });
    try {
      setError(""); setMessage("");
      await updateAdminDepartment(user?.token, pendingDepartment);
      setMessage("Department updated successfully and is now permanent");
      setShowConfirmModal(false);
      setPendingDepartment(null);
      setTimeout(()=>setMessage(""), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update department");
      setShowConfirmModal(false);
      // Revert the form change
      setForm((f) => ({ ...f, department: user?.department || "" }));
    } finally {
      setIsUpdatingDept(false);
    }
  };

  const passwordStrong = () => {
    const p = form.newPassword || "";
    return p.length >= 8 && /[A-Z]/.test(p) && /[a-z]/.test(p) && /[0-9]/.test(p) && /[^A-Za-z0-9]/.test(p);
  };

  const handlePasswordChange = async () => {
    try {
      setError(""); setMessage("");
      if (!form.currentPassword) {
        setError("Enter your current password");
        return;
      }
      if (!passwordStrong()) {
        setError("Password must be 8+ chars with A-Z, a-z, 0-9, special");
        return;
      }
      if (form.newPassword !== form.confirmNewPassword) {
        setError("New passwords do not match");
        return;
      }
      await changePasswordApi(user?.token, { currentPassword: form.currentPassword, newPassword: form.newPassword });
      setMessage("Password updated successfully");
      setForm((f)=>({...f, currentPassword: "", newPassword: "", confirmNewPassword: "" }));
      setTimeout(()=>setMessage(""), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update password");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        {(message || error) && (
          <div className={`${error?"bg-red-50 border-red-200 text-red-700 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-200":"bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-200"} border px-4 py-3 rounded-xl`}>{error||message}</div>
        )}
        <div className="rounded-2xl border border-amber-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Admin Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input name="name" placeholder="Full Name" value={form.name} disabled className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-300" />
            <input name="university" placeholder="University" value={form.university} disabled className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-300" />
            <div>
              <select 
                name="department" 
                value={form.department} 
                onChange={handleDepartmentChange}
                disabled={form.department && form.department.trim() !== ""}
                className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 dark:bg-slate-900 dark:text-slate-100 ${form.department && form.department.trim() !== "" ? "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-300 cursor-not-allowed" : "border-amber-200 dark:border-slate-600 focus:ring-amber-300 dark:focus:ring-amber-600"}`}
              >
                <option value="">Select Department</option>
                <option value="welfare">Welfare</option>
                <option value="gender">Gender</option>
                <option value="health">Health</option>
              </select>
              <p className={`text-xs mt-1 ${form.department && form.department.trim() !== "" ? "text-emerald-600 dark:text-emerald-300 font-medium" : "text-slate-600 dark:text-slate-400"}`}>
                {form.department && form.department.trim() !== "" ? "✓ Department assigned and locked" : "💡 Once assigned, this department is permanent for your university"}
              </p>
            </div>
            <input name="email" placeholder="Official Email" value={form.email} disabled className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-300" />
          </div>
        </div>

        <div className="rounded-2xl border border-amber-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Security</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="relative">
              <input name="currentPassword" type="password" placeholder="Current Password" value={form.currentPassword} onChange={handleChange} className="w-full px-4 py-3 border border-amber-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-300 dark:focus:ring-amber-600" />
            </div>
            <div className="relative">
              <input name="newPassword" type={show.next?"text":"password"} placeholder="New Password" value={form.newPassword} onChange={handleChange} className="w-full px-4 py-3 pr-12 border border-amber-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-300 dark:focus:ring-amber-600" />
              <button type="button" onClick={()=>setShow(s=>({...s, next:!s.next}))} className="absolute inset-y-0 right-0 px-3 text-slate-500 dark:text-slate-400">{show.next?"🙈":"👁️"}</button>
            </div>
            <div className="relative sm:col-span-2">
              <input name="confirmNewPassword" type={show.confirm?"text":"password"} placeholder="Confirm New Password" value={form.confirmNewPassword} onChange={handleChange} className="w-full px-4 py-3 pr-12 border border-amber-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-300 dark:focus:ring-amber-600" />
              <button type="button" onClick={()=>setShow(s=>({...s, confirm:!s.confirm}))} className="absolute inset-y-0 right-0 px-3 text-slate-500 dark:text-slate-400">{show.confirm?"🙈":"👁️"}</button>
            </div>
          </div>
          <ul className="mt-2 text-xs text-slate-600 dark:text-slate-400 space-y-1">
            <li className={form.newPassword.length>=8?"text-emerald-600 dark:text-emerald-300":"text-slate-500 dark:text-slate-500"}>• At least 8 characters</li>
            <li className={/[A-Z]/.test(form.newPassword)?"text-emerald-600 dark:text-emerald-300":"text-slate-500 dark:text-slate-500"}>• Uppercase letter</li>
            <li className={/[a-z]/.test(form.newPassword)?"text-emerald-600 dark:text-emerald-300":"text-slate-500 dark:text-slate-500"}>• Lowercase letter</li>
            <li className={/[0-9]/.test(form.newPassword)?"text-emerald-600 dark:text-emerald-300":"text-slate-500 dark:text-slate-500"}>• Number</li>
            <li className={/[^A-Za-z0-9]/.test(form.newPassword)?"text-emerald-600 dark:text-emerald-300":"text-slate-500 dark:text-slate-500"}>• Special character</li>
          </ul>
          <div className="mt-3">
            <button type="button" onClick={handlePasswordChange} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 text-white text-sm font-medium hover:from-amber-700 hover:to-amber-800 transition-all">Update Password</button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-amber-200 dark:border-slate-700 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-slate-900 dark:to-slate-800 p-5 shadow-sm">
          <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">Admin Information</h4>
          <div className="space-y-3">
            <div>
              <p className="text-xs font-medium text-slate-700 dark:text-slate-300 uppercase">University</p>
              <p className="text-slate-900 dark:text-slate-100 font-bold text-base mt-1">{form.university && form.university.trim() ? form.university : "Not set"}</p>
            </div>
            <div className="h-px bg-amber-300 dark:bg-slate-600"></div>
            <div>
              <p className="text-xs font-medium text-slate-700 dark:text-slate-300 uppercase">Department</p>
              <p className="text-slate-900 dark:text-slate-100 font-bold text-base mt-1 capitalize">{form.department || "Not set"}</p>
            </div>
            <div className="h-px bg-amber-300 dark:bg-slate-600"></div>
            <div>
              <p className="text-xs font-medium text-slate-700 dark:text-slate-300 uppercase">Status</p>
              <p className="text-emerald-700 dark:text-emerald-300 font-bold text-base mt-1">Approved by Super Admin</p>
            </div>
          </div>
        </div>

        {/* Confirmation Modal */}
        {showConfirmModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full shadow-2xl border-2 border-amber-300 dark:border-slate-700">
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Confirm Department Assignment</h3>
              <p className="text-slate-700 dark:text-slate-300 mb-4">
                You are about to assign the <span className="font-bold capitalize text-amber-700 dark:text-amber-300">{pendingDepartment}</span> department to yourself.
              </p>
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4 mb-4">
                <p className="text-sm text-slate-700 dark:text-slate-200 font-medium">⚠️ Important Notes:</p>
                <ul className="text-xs text-slate-600 dark:text-slate-300 mt-2 space-y-1 list-disc list-inside">
                  <li>This assignment is <span className="font-bold">permanent</span></li>
                  <li>Only one admin per department per university</li>
                  <li>Other admins without departments cannot perform activities</li>
                  <li>This action cannot be undone</li>
                </ul>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowConfirmModal(false);
                    setForm((f) => ({ ...f, department: user?.department || "" }));
                    setPendingDepartment(null);
                  }}
                  disabled={isUpdatingDept}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDepartmentUpdate}
                  disabled={isUpdatingDept}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 text-white font-medium hover:from-amber-700 hover:to-amber-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUpdatingDept ? "Confirming..." : "Yes, Confirm"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminProfile;


