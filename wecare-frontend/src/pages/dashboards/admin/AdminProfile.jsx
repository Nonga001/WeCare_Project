import { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { updateAdminDepartment, changePassword as changePasswordApi } from "../../../services/userService";

const AdminProfile = () => {
  const { user } = useAuth();
  const [form, setForm] = useState({ name: "", university: "", email: "", department: "welfare", currentPassword: "", newPassword: "", confirmNewPassword: "" });
  const [show, setShow] = useState({ next: false, confirm: false });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setForm((f)=>({
      ...f,
      name: user?.name || "",
      university: user?.university || "",
      email: user?.email || "",
      department: user?.department || "welfare",
    }));
  }, [user?.name, user?.university, user?.email, user?.department]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleDepartmentUpdate = async () => {
    try {
      setError(""); setMessage("");
      await updateAdminDepartment(user?.token, form.department);
      setMessage("Department updated");
      setTimeout(()=>setMessage(""), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update department");
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
          <div className={`${error?"bg-red-50 border-red-200 text-red-700":"bg-green-50 border-green-200 text-green-700"} border px-4 py-3 rounded`}>{error||message}</div>
        )}
        <div className="rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Admin Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input name="name" placeholder="Full Name" value={form.name} disabled className="w-full px-4 py-3 border rounded-xl bg-slate-50 text-slate-500" />
            <input name="university" placeholder="University" value={form.university} disabled className="w-full px-4 py-3 border rounded-xl bg-slate-50 text-slate-500" />
            <select name="department" value={form.department} onChange={handleChange} className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300">
              <option value="welfare">Welfare</option>
              <option value="gender">Gender</option>
              <option value="health">Health</option>
            </select>
            <input name="email" placeholder="Official Email" value={form.email} disabled className="w-full px-4 py-3 border rounded-xl bg-slate-50 text-slate-500" />
            <div className="sm:col-span-2">
              <button type="button" onClick={handleDepartmentUpdate} className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800">Update Department</button>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Security</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="relative">
              <input name="currentPassword" type="password" placeholder="Current Password" value={form.currentPassword} onChange={handleChange} className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300" />
            </div>
            <div className="relative">
              <input name="newPassword" type={show.next?"text":"password"} placeholder="New Password" value={form.newPassword} onChange={handleChange} className="w-full px-4 py-3 pr-12 border rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300" />
              <button type="button" onClick={()=>setShow(s=>({...s, next:!s.next}))} className="absolute inset-y-0 right-0 px-3 text-slate-500">{show.next?"🙈":"👁️"}</button>
            </div>
            <div className="relative sm:col-span-2">
              <input name="confirmNewPassword" type={show.confirm?"text":"password"} placeholder="Confirm New Password" value={form.confirmNewPassword} onChange={handleChange} className="w-full px-4 py-3 pr-12 border rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300" />
              <button type="button" onClick={()=>setShow(s=>({...s, confirm:!s.confirm}))} className="absolute inset-y-0 right-0 px-3 text-slate-500">{show.confirm?"🙈":"👁️"}</button>
            </div>
          </div>
          <ul className="mt-2 text-xs text-slate-600 space-y-1">
            <li className={form.newPassword.length>=8?"text-emerald-600":"text-slate-500"}>• At least 8 characters</li>
            <li className={/[A-Z]/.test(form.newPassword)?"text-emerald-600":"text-slate-500"}>• Uppercase letter</li>
            <li className={/[a-z]/.test(form.newPassword)?"text-emerald-600":"text-slate-500"}>• Lowercase letter</li>
            <li className={/[0-9]/.test(form.newPassword)?"text-emerald-600":"text-slate-500"}>• Number</li>
            <li className={/[^A-Za-z0-9]/.test(form.newPassword)?"text-emerald-600":"text-slate-500"}>• Special character</li>
          </ul>
          <div className="mt-3">
            <button type="button" onClick={handlePasswordChange} className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800">Update Password</button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 p-5">
          <h4 className="font-semibold text-slate-800 mb-2">Status</h4>
          <p className="text-slate-600 text-sm">Approved by Super Admin</p>
        </div>
      </div>
    </div>
  );
};

export default AdminProfile;


