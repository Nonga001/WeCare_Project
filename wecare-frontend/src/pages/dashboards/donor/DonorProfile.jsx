import { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { changePassword as changePasswordApi, updateDonorProfile } from "../../../services/userService";

const DonorProfile = () => {
  const { user } = useAuth();
  const [type, setType] = useState("individual");
  const [form, setForm] = useState({
    phone: "",
    org: "",
    contact: "",
    csr: "",
    preference: "one-time",
  });
  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  useEffect(() => {
    // If donor profile phone is stored on user, seed it here (fallback empty)
    setForm((f) => ({ ...f, phone: user?.phone || "" }));
  }, [user?.phone]);

  const handlePhoneUpdate = async () => {
    if (!form.phone || form.phone.trim() === "") return alert("Enter a phone number");
    try {
      await updateDonorProfile(user?.token, { phone: form.phone.trim() });
      alert("Phone number updated");
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to update phone");
    }
  };

  const [pwd, setPwd] = useState({ currentPassword: "", newPassword: "", confirmNewPassword: "" });
  const [showPwd, setShowPwd] = useState({ current:false, next:false, confirm:false });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const passwordStrong = () => {
    const p = pwd.newPassword || "";
    return p.length >= 8 && /[A-Z]/.test(p) && /[a-z]/.test(p) && /[0-9]/.test(p) && /[^A-Za-z0-9]/.test(p);
  };
  const handlePasswordChange = async () => {
    try {
      setError(""); setMessage("");
      if (!pwd.currentPassword) { setError("Enter your current password"); return; }
      if (!passwordStrong()) { setError("Password must be 8+ chars with A-Z, a-z, 0-9, special"); return; }
      if (pwd.newPassword !== pwd.confirmNewPassword) { setError("New passwords do not match"); return; }
      await changePasswordApi(user?.token, { currentPassword: pwd.currentPassword, newPassword: pwd.newPassword });
      setMessage("Password updated successfully");
      setPwd({ currentPassword: "", newPassword: "", confirmNewPassword: "" });
      setTimeout(()=>setMessage(""), 3000);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to update password");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Donor Type</h3>
          <div className="flex gap-3">
            <button onClick={()=>setType("individual")} className={`px-4 py-2 rounded-xl text-sm font-medium ${type==="individual"?"bg-slate-900 text-white":"bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"}`}>Individual</button>
            <button onClick={()=>setType("corporate")} className={`px-4 py-2 rounded-xl text-sm font-medium ${type==="corporate"?"bg-slate-900 text-white":"bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"}`}>Corporate</button>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Profile</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input value={user?.name || ""} disabled className="w-full px-4 py-3 border rounded-xl bg-slate-50 text-slate-500" />
            <input value={user?.email || ""} disabled className="w-full px-4 py-3 border rounded-xl bg-slate-50 text-slate-500" />
            {type === "individual" ? (
              <>
                <select name="preference" value={form.preference} onChange={handle} className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300">
                  <option value="one-time">One-time</option>
                  <option value="monthly">Monthly</option>
                </select>
              </>
            ) : (
              <>
                <input name="org" placeholder="Organization Name" value={form.org} onChange={handle} className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300" />
                <input name="contact" placeholder="Contact Person" value={form.contact} onChange={handle} className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300" />
                <input name="csr" placeholder="CSR Focus Area (optional)" value={form.csr} onChange={handle} className="sm:col-span-2 w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300" />
              </>
            )}
            <div className="sm:col-span-2">
              <label className="block text-sm text-slate-600 mb-1">Phone Number</label>
              <div className="flex gap-2">
                <input name="phone" placeholder="Phone" value={form.phone} onChange={handle} className="flex-1 px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300" />
                <button type="button" onClick={handlePhoneUpdate} className="px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700">Update</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 p-5">
          <h4 className="font-semibold text-slate-800 mb-2">Payment Preferences</h4>
          <p className="text-slate-600 text-sm">Set up auto-donate or one-time donations.</p>
        </div>
        <div className="rounded-xl border border-slate-200 p-5">
          <h4 className="font-semibold text-slate-800 mb-3">Security</h4>
          {(message || error) && (
            <div className={`${error?"bg-red-50 border-red-200 text-red-700":"bg-green-50 border-green-200 text-green-700"} border px-4 py-3 rounded mb-3`}>{error||message}</div>
          )}
          <div className="grid grid-cols-1 gap-3">
            <div className="relative">
              <input type="password" placeholder="Current Password" value={pwd.currentPassword} onChange={(e)=>setPwd({...pwd, currentPassword:e.target.value})} className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300" />
            </div>
            <div className="relative">
              <input type={showPwd.next?"text":"password"} placeholder="New Password" value={pwd.newPassword} onChange={(e)=>setPwd({...pwd, newPassword:e.target.value})} className="w-full px-4 py-3 pr-12 border rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300" />
              <button type="button" onClick={()=>setShowPwd(s=>({...s, next:!s.next}))} className="absolute inset-y-0 right-0 px-3 text-slate-500">{showPwd.next?"🙈":"👁️"}</button>
            </div>
            <div className="relative">
              <input type={showPwd.confirm?"text":"password"} placeholder="Confirm New Password" value={pwd.confirmNewPassword} onChange={(e)=>setPwd({...pwd, confirmNewPassword:e.target.value})} className="w-full px-4 py-3 pr-12 border rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300" />
              <button type="button" onClick={()=>setShowPwd(s=>({...s, confirm:!s.confirm}))} className="absolute inset-y-0 right-0 px-3 text-slate-500">{showPwd.confirm?"🙈":"👁️"}</button>
            </div>
          </div>
          <div className="mt-3">
            <button type="button" onClick={handlePasswordChange} className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800">Update Password</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DonorProfile;


