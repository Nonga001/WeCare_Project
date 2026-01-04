import { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { changePassword as changePasswordApi, updateDonorProfile, getProfile } from "../../../services/userService";

const DonorProfile = () => {
  const { user, login } = useAuth();
  const [type, setType] = useState("individual");
  const [form, setForm] = useState({
    org: "",
    contact: "",
    csr: "",
    preference: "monthly",
  });
  const [showModal, setShowModal] = useState(false);
  const [pendingType, setPendingType] = useState(null);
  const [showPrefModal, setShowPrefModal] = useState(false);
  const [pendingPref, setPendingPref] = useState(null);
  const [initialPreference, setInitialPreference] = useState("monthly");
  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const [countryCode, setCountryCode] = useState("+254");
  const [localPhone, setLocalPhone] = useState("");
  const [initialPhoneDigits, setInitialPhoneDigits] = useState("");
  
  // Load donor profile from backend on mount
  useEffect(() => {
    if (user?.donorType) setType(user.donorType);
    if (user?.donorPreference) {
      setForm(f => ({ ...f, preference: user.donorPreference }));
      setInitialPreference(user.donorPreference);
    }
    if (user?.organization) setForm(f => ({ ...f, org: user.organization }));
    if (user?.contactPerson) setForm(f => ({ ...f, contact: user.contactPerson }));
    if (user?.csrFocus) setForm(f => ({ ...f, csr: user.csrFocus }));
  }, [user?.donorType, user?.donorPreference, user?.organization, user?.contactPerson, user?.csrFocus]);
  
  useEffect(() => {
    // If donor profile phone is stored on user, seed it here (fallback empty)
    const raw = user?.phone || "";
    const digits = raw.replace(/\D/g, "");
    let detectedLocal = "";
    if (digits.startsWith("254") && digits.length === 12) {
      detectedLocal = digits.slice(3);
    } else if (digits.startsWith("0") && digits.length === 10) {
      detectedLocal = digits.slice(1);
    } else if (digits.length === 9) {
      detectedLocal = digits;
    }
    setCountryCode("+254");
    setLocalPhone(detectedLocal);
    setInitialPhoneDigits(detectedLocal ? `254${detectedLocal}` : "");
  }, [user?.phone]);

  const [phoneError, setPhoneError] = useState("");
  const [phoneSuccess, setPhoneSuccess] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const refreshProfile = async () => {
    if (!user?.token) return null;
    const refreshed = await getProfile(user.token);
    login({ token: user.token, user: refreshed });
    return refreshed;
  };
  
  const handleSaveProfile = async () => {
    setProfileSaving(true);
    setProfileMessage("");
    try {
      const payload = { donorPreference: form.preference, donorType: type };
      if (type === "corporate") {
        payload.organization = form.org;
        payload.contactPerson = form.contact;
        payload.csrFocus = form.csr;
      }
      await updateDonorProfile(user?.token, payload);
      await refreshProfile();
      setProfileMessage("Profile saved successfully");
      setInitialPreference(form.preference);
      setTimeout(() => setProfileMessage(""), 3000);
    } catch (err) {
      setProfileMessage(err?.response?.data?.message || "Failed to save profile");
    } finally {
      setProfileSaving(false);
    }
  };
  
  const handlePreferenceChange = (e) => {
    const newPref = e.target.value;
    if (newPref !== initialPreference) {
      setPendingPref(newPref);
      setShowPrefModal(true);
    } else {
      setForm({ ...form, preference: newPref });
    }
  };
  
  const handleConfirmPrefChange = () => {
    if (pendingPref) setForm({ ...form, preference: pendingPref });
    setShowPrefModal(false);
    setPendingPref(null);
  };
  
  const handleCancelPrefChange = () => {
    setShowPrefModal(false);
    setPendingPref(null);
  };
  
  const confirmTypeChange = (nextType) => {
    if (nextType === type) return;
    setPendingType(nextType);
    setShowModal(true);
  };
  const handleConfirmSwitch = async () => {
    if (pendingType) {
      setType(pendingType);
      try {
        await updateDonorProfile(user?.token, { donorType: pendingType });
        await refreshProfile();
      } catch (err) {
        console.error("Failed to save donor type", err);
      }
    }
    setShowModal(false);
    setPendingType(null);
  };
  const handleCancelSwitch = () => {
    setShowModal(false);
    setPendingType(null);
  };
  const handlePhoneUpdate = async () => {
    setPhoneError("");
    setPhoneSuccess("");
    const codeDigits = (countryCode || "").replace(/\D/g, "");
    const localDigits = (localPhone || "").replace(/\D/g, "");
    if (codeDigits !== "254") {
      setPhoneError("Only Kenyan (+254) numbers are supported.");
      return;
    }
    if (localDigits.length !== 9) {
      setPhoneError("Enter the 9-digit Kenyan number after +254.");
      return;
    }
    const combined = `${codeDigits}${localDigits}`;
    if (combined === initialPhoneDigits) {
      setPhoneSuccess("Phone is already up to date.");
      return;
    }
    try {
      await updateDonorProfile(user?.token, { phone: combined });
      await refreshProfile();
      setPhoneSuccess("Phone number updated");
      setInitialPhoneDigits(combined);
    } catch (err) {
      setPhoneError(err?.response?.data?.message || "Failed to update phone");
    }
  };

  const [pwd, setPwd] = useState({ currentPassword: "", newPassword: "", confirmNewPassword: "" });
  const [showPwd, setShowPwd] = useState({ current:false, next:false, confirm:false });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);
  const passwordStrong = () => {
    const p = pwd.newPassword || "";
    return p.length >= 8 && /[A-Z]/.test(p) && /[a-z]/.test(p) && /[0-9]/.test(p) && /[^A-Za-z0-9]/.test(p);
  };
  const handlePasswordChange = async () => {
    try {
      setError(""); setMessage(""); setPwdLoading(true);
      if (!passwordStrong()) { setError("Password must be 8+ chars with A-Z, a-z, 0-9, special"); return; }
      if (pwd.newPassword !== pwd.confirmNewPassword) { setError("New passwords do not match"); return; }
      await changePasswordApi(user?.token, { currentPassword: pwd.currentPassword, newPassword: pwd.newPassword });
      setMessage("Password updated successfully");
      setPwd({ currentPassword: "", newPassword: "", confirmNewPassword: "" });
      setTimeout(()=>setMessage(""), 3000);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to update password");
    } finally {
      setPwdLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <h3 className="font-semibold text-stone-900 dark:text-stone-100 mb-4">Donor Type</h3>
          <div className="flex gap-3">
            <button onClick={()=>confirmTypeChange("individual")} className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${type==="individual"?"bg-gradient-to-r from-stone-700 to-stone-800 text-white shadow":"bg-white dark:bg-slate-800 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-100 hover:bg-stone-50 dark:hover:bg-slate-800/60"}`}>Individual</button>
            <button onClick={()=>confirmTypeChange("corporate")} className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${type==="corporate"?"bg-gradient-to-r from-stone-700 to-stone-800 text-white shadow":"bg-white dark:bg-slate-800 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-100 hover:bg-stone-50 dark:hover:bg-slate-800/60"}`}>Corporate</button>
          </div>
        </div>

        <div className="rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <h3 className="font-semibold text-stone-900 dark:text-stone-100 mb-4">Profile</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input value={user?.name || ""} disabled className="w-full px-4 py-3 border rounded-xl bg-stone-50 dark:bg-slate-800/70 text-stone-700 dark:text-stone-200" />
            <input value={user?.email || ""} disabled className="w-full px-4 py-3 border rounded-xl bg-stone-50 dark:bg-slate-800/70 text-stone-700 dark:text-stone-200" />
            {type === "individual" ? (
              <>
                <select name="preference" value={form.preference} onChange={handlePreferenceChange} className="w-full px-4 py-3 border rounded-xl bg-white dark:bg-slate-800 text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-300 dark:focus:ring-stone-500">
                  <option value="monthly">Monthly</option>
                  <option value="occasional">Occasionally</option>
                </select>
              </>
            ) : (
              <>
                <input name="org" placeholder="Organization Name" value={form.org} onChange={handle} className="w-full px-4 py-3 border rounded-xl bg-white dark:bg-slate-800 text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-300 dark:focus:ring-stone-500" />
                <input name="contact" placeholder="Contact Person" value={form.contact} onChange={handle} className="w-full px-4 py-3 border rounded-xl bg-white dark:bg-slate-800 text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-300 dark:focus:ring-stone-500" />
                <select name="preference" value={form.preference} onChange={handlePreferenceChange} className="w-full px-4 py-3 border rounded-xl bg-white dark:bg-slate-800 text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-300 dark:focus:ring-stone-500">
                  <option value="monthly">Monthly</option>
                  <option value="occasional">Occasionally</option>
                </select>
                <input name="csr" placeholder="CSR Focus Area (optional)" value={form.csr} onChange={handle} className="w-full px-4 py-3 border rounded-xl bg-white dark:bg-slate-800 text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-300 dark:focus:ring-stone-500" />
              </>
            )}
            <div className="sm:col-span-2">
              <label className="block text-sm text-slate-600 mb-1">Phone Number</label>
              <div className="flex gap-2">
                <input value={countryCode} onChange={(e)=>setCountryCode(e.target.value)} className="w-24 px-4 py-3 border rounded-xl bg-white dark:bg-slate-800 text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-300 dark:focus:ring-stone-500" />
                <input name="phone" placeholder="7XXXXXXXX" value={localPhone} onChange={(e)=>setLocalPhone(e.target.value)} className="flex-1 px-4 py-3 border rounded-xl bg-white dark:bg-slate-800 text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-300 dark:focus:ring-stone-500" />
                <button type="button" onClick={handlePhoneUpdate} className="px-4 py-3 rounded-xl bg-gradient-to-r from-stone-700 to-stone-800 text-white font-semibold hover:from-stone-800 hover:to-stone-900 transition shadow disabled:opacity-60" disabled={!localPhone}>Update</button>
              </div>
              {(phoneError || phoneSuccess) && (
                <p className={`mt-2 text-sm ${phoneError ? 'text-red-600' : 'text-emerald-600'}`}>{phoneError || phoneSuccess}</p>
              )}
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            {profileMessage && (
              <p className="text-sm text-emerald-600">{profileMessage}</p>
            )}
            <button type="button" onClick={handleSaveProfile} disabled={profileSaving} className="ml-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-stone-700 to-stone-800 text-white text-sm font-semibold hover:from-stone-800 hover:to-stone-900 transition shadow disabled:opacity-60">
              {profileSaving ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <h4 className="font-semibold text-stone-900 dark:text-stone-100 mb-2">Profile Summary</h4>
          <ul className="text-sm text-slate-700 dark:text-stone-200 space-y-1">
            <li><span className="font-medium">Name:</span> {user?.name || '-'}</li>
            <li><span className="font-medium">Email:</span> {user?.email || '-'}</li>
            <li><span className="font-medium">Phone:</span> {localPhone ? `${countryCode} ${localPhone}` : '-'}</li>
            <li><span className="font-medium">Type:</span> {type === 'corporate' ? 'Corporate' : 'Individual'}</li>
            <li><span className="font-medium">Preference:</span> {form.preference === 'monthly' ? 'Monthly' : 'Occasionally'}</li>
            {type === 'corporate' && (
              <>
                <li><span className="font-medium">Organization:</span> {form.org || '-'}</li>
                <li><span className="font-medium">Contact:</span> {form.contact || '-'}</li>
                {form.csr && <li><span className="font-medium">CSR Focus:</span> {form.csr}</li>}
              </>
            )}
          </ul>
        </div>

        <div className="rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <h4 className="font-semibold text-stone-900 dark:text-stone-100 mb-3">Payment Preferences</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-stone-200 dark:border-stone-700">
              <span className="text-sm text-slate-700 dark:text-stone-200">Saved Payment Methods</span>
              <span className="text-xs text-slate-500 dark:text-stone-400">0 cards</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-stone-200 dark:border-stone-700">
              <span className="text-sm text-slate-700 dark:text-stone-200">Default Currency</span>
              <span className="text-sm font-medium text-stone-800 dark:text-stone-100">KES</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-slate-700 dark:text-stone-200">Tax Receipt Email</span>
              <span className="text-xs text-slate-500 dark:text-stone-400">{user?.email || 'Not set'}</span>
            </div>
            <button className="w-full mt-2 px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-100 text-sm font-medium hover:bg-stone-50 dark:hover:bg-slate-800/60 transition">
              Manage Payment Methods
            </button>
          </div>
        </div>
        <div className="rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <h4 className="font-semibold text-stone-900 dark:text-stone-100 mb-3">Security</h4>
          {(message || error) && (
            <div className={`${error?"bg-red-50 border-red-200 text-red-700":"bg-emerald-50 border-emerald-200 text-emerald-700"} border px-4 py-3 rounded mb-3`}>{error||message}</div>
          )}
          <div className="grid grid-cols-1 gap-3">
            <div className="relative">
              <input type={showPwd.current?"text":"password"} placeholder="Current Password" value={pwd.currentPassword} onChange={(e)=>setPwd({...pwd, currentPassword:e.target.value})} className="w-full px-4 py-3 border rounded-xl bg-white dark:bg-slate-800 text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-300 dark:focus:ring-stone-500" />
              <button type="button" onClick={()=>setShowPwd(s=>({...s, current:!s.current}))} className="absolute inset-y-0 right-0 px-3 text-slate-500 hover:text-slate-700">
                {showPwd.current ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-10-8-10-8a18.45 18.45 0 0 1 5.06-6.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 10 8 10 8a18.46 18.46 0 0 1-2.16 3.19"/><path d="M12 12a3 3 0 0 1 3 3"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s3-8 11-8 11 8 11 8-3 8-11 8S1 12 1 12Z"/><circle cx="12" cy="12" r="3"/></svg>
                )}
              </button>
            </div>
            <div className="relative">
              <input type={showPwd.next?"text":"password"} placeholder="New Password" value={pwd.newPassword} onChange={(e)=>setPwd({...pwd, newPassword:e.target.value})} className="w-full px-4 py-3 pr-12 border rounded-xl bg-white dark:bg-slate-800 text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-300 dark:focus:ring-stone-500" />
              <button type="button" onClick={()=>setShowPwd(s=>({...s, next:!s.next}))} className="absolute inset-y-0 right-0 px-3 text-slate-500 hover:text-slate-700">
                {showPwd.next ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-10-8-10-8a18.45 18.45 0 0 1 5.06-6.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 10 8 10 8a18.46 18.46 0 0 1-2.16 3.19"/><path d="M12 12a3 3 0 0 1 3 3"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s3-8 11-8 11 8 11 8-3 8-11 8S1 12 1 12Z"/><circle cx="12" cy="12" r="3"/></svg>
                )}
              </button>
              <p className="mt-1 text-xs text-slate-500 dark:text-stone-300">Use 8+ chars with upper, lower, number, and special.</p>
            </div>
            <div className="relative">
              <input type={showPwd.confirm?"text":"password"} placeholder="Confirm New Password" value={pwd.confirmNewPassword} onChange={(e)=>setPwd({...pwd, confirmNewPassword:e.target.value})} className="w-full px-4 py-3 pr-12 border rounded-xl bg-white dark:bg-slate-800 text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-300 dark:focus:ring-stone-500" />
              <button type="button" onClick={()=>setShowPwd(s=>({...s, confirm:!s.confirm}))} className="absolute inset-y-0 right-0 px-3 text-slate-500 hover:text-slate-700">
                {showPwd.confirm ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-10-8-10-8a18.45 18.45 0 0 1 5.06-6.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 10 8 10 8a18.46 18.46 0 0 1-2.16 3.19"/><path d="M12 12a3 3 0 0 1 3 3"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s3-8 11-8 11 8 11 8-3 8-11 8S1 12 1 12Z"/><circle cx="12" cy="12" r="3"/></svg>
                )}
              </button>
            </div>
          </div>
          <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="text-xs text-slate-500 dark:text-stone-300">Strong password required; avoid reuse.</div>
            <button type="button" disabled={pwdLoading} onClick={handlePasswordChange} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-stone-700 to-stone-800 text-white text-sm font-semibold hover:from-stone-800 hover:to-stone-900 transition shadow disabled:opacity-60">{pwdLoading ? "Updating..." : "Update Password"}</button>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 border border-stone-200 dark:border-stone-700">
            <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-2">Are you sure?</h3>
            <p className="text-sm text-slate-600 dark:text-stone-300 mb-6">
              Switching donor type will change the fields shown in your profile.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={handleCancelSwitch} className="px-4 py-2 rounded-xl text-sm font-semibold border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-100 bg-white dark:bg-slate-800 hover:bg-stone-50 dark:hover:bg-slate-800/60 transition">
                Cancel
              </button>
              <button onClick={handleConfirmSwitch} className="px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-stone-700 to-stone-800 text-white hover:from-stone-800 hover:to-stone-900 transition shadow">
                Switch
              </button>
            </div>
          </div>
        </div>
      )}

      {showPrefModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 border border-stone-200 dark:border-stone-700">
            <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-2">Change Donation Preference?</h3>
            <p className="text-sm text-slate-600 dark:text-stone-300 mb-6">
              You are changing from <strong>{initialPreference === 'monthly' ? 'Monthly' : 'Occasionally'}</strong> to <strong>{pendingPref === 'monthly' ? 'Monthly' : 'Occasionally'}</strong>. Remember to save your profile to apply this change.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={handleCancelPrefChange} className="px-4 py-2 rounded-xl text-sm font-semibold border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-100 bg-white dark:bg-slate-800 hover:bg-stone-50 dark:hover:bg-slate-800/60 transition">
                Cancel
              </button>
              <button onClick={handleConfirmPrefChange} className="px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-stone-700 to-stone-800 text-white hover:from-stone-800 hover:to-stone-900 transition shadow">
                Change
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DonorProfile;


