import { useState } from "react";

const SuperAdminProfile = () => {
  const [form, setForm] = useState({ name: "Super Admin", email: "wecare@admin.com", role: "superadmin", password: "", newPassword: "" });
  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Profile</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input name="name" value={form.name} onChange={handle} className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300" />
            <input name="email" value={form.email} onChange={handle} className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300" />
            <input value="Super Admin" disabled className="w-full px-4 py-3 border rounded-xl bg-slate-50 text-slate-500" />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Security</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input name="password" type="password" placeholder="Current Password" value={form.password} onChange={handle} className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300" />
            <input name="newPassword" type="password" placeholder="New Password" value={form.newPassword} onChange={handle} className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300" />
          </div>
          <div className="mt-3">
            <button className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800">Update Password</button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 p-5">
          <h4 className="font-semibold text-slate-800 mb-2">Status</h4>
          <p className="text-slate-600 text-sm">System Owner</p>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminProfile;


