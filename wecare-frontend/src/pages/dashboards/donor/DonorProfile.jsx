import { useState } from "react";

const DonorProfile = () => {
  const [type, setType] = useState("individual");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    org: "",
    contact: "",
    csr: "",
    preference: "one-time",
  });
  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

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
            {type === "individual" ? (
              <>
                <input name="name" placeholder="Full Name" value={form.name} onChange={handle} className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300" />
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
            <input name="email" placeholder="Email" value={form.email} onChange={handle} className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300" />
            <input name="phone" placeholder="Phone" value={form.phone} onChange={handle} className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300" />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 p-5">
          <h4 className="font-semibold text-slate-800 mb-2">Payment Preferences</h4>
          <p className="text-slate-600 text-sm">Set up auto-donate or one-time donations.</p>
        </div>
      </div>
    </div>
  );
};

export default DonorProfile;


