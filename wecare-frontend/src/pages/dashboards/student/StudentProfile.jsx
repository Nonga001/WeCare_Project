import { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { updateStudentProfile, submitProfileForApproval, getProfileCompletion, changePassword as changePasswordApi } from "../../../services/userService";

const MiniBadge = ({ status }) => {
  const map = {
    verified: "bg-emerald-100 text-emerald-800 border-emerald-200",
    pending: "bg-amber-100 text-amber-800 border-amber-200",
    rejected: "bg-rose-100 text-rose-700 border-rose-200",
  };
  const label = status === "verified" ? "Verified" : status === "rejected" ? "Rejected" : "Pending";
  return <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${map[status] || map.pending}`}>{label}</span>;
};

const ProfileField = ({ label, children }) => (
  <div>
    <label className="block text-sm text-slate-500 mb-1">{label}</label>
    {children}
  </div>
);

const StudentProfile = () => {
  const { user } = useAuth();
  const [form, setForm] = useState({ phone: "", studentId: "", studentEmail: "", course: "", yearOfStudy: "", childDetails: "", documents: "" });
  const [countryCode, setCountryCode] = useState('+254');
  const [phoneLocal, setPhoneLocal] = useState('');
  const [originalPhone, setOriginalPhone] = useState('');
  const [originalEmail, setOriginalEmail] = useState('');
  const [originalProfile, setOriginalProfile] = useState({ studentId: '', course: '', yearOfStudy: '', childDetails: '' });
  const [previewUrl, setPreviewUrl] = useState('');
  const [completion, setCompletion] = useState({ completionPercent: 0, isComplete: false, profileSubmitted: false, profileApproved: false, isApproved: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [userProfile, setUserProfile] = useState(null);
  const [pwd, setPwd] = useState({ currentPassword: "", newPassword: "", confirmNewPassword: "" });
  const [showPwd, setShowPwd] = useState({ next: false, confirm: false });

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const [completionData, profileData] = await Promise.all([
          getProfileCompletion(user?.token),
          fetch('http://localhost:5000/api/users/profile', { headers: { Authorization: `Bearer ${user?.token}` } }).then((r) => r.json()),
        ]);
        setUserProfile(profileData);
        setCompletion(completionData);
        // parse phone into country code + local number when possible
        const rawPhone = profileData.phone || '';
        const phoneMatch = rawPhone.match(/^(\+\d{1,4})\s*(.*)$/);
        if (phoneMatch) {
          setCountryCode(phoneMatch[1]);
          setPhoneLocal(phoneMatch[2] || '');
          setOriginalPhone(`${phoneMatch[1]} ${phoneMatch[2] || ''}`.trim());
        } else {
          setPhoneLocal(rawPhone || '');
          // keep default country code if none present
          setOriginalPhone(rawPhone || '');
        }
        setForm({
          phone: rawPhone,
          studentId: profileData.studentId || "",
          studentEmail: profileData.studentEmail || "",
          course: profileData.course || "",
          yearOfStudy: profileData.yearOfStudy || "",
          childDetails: profileData.childDetails || "",
          documents: profileData.documents || "",
        });
        setOriginalEmail(profileData.studentEmail || '');
        setOriginalProfile({
          studentId: profileData.studentId || '',
          course: profileData.course || '',
          yearOfStudy: profileData.yearOfStudy || '',
          childDetails: profileData.childDetails || '',
          documents: profileData.documents || '',
        });
      } catch (err) {
        setError(err?.message || "Failed to load profile data");
      }
    };
    if (user?.token) loadProfile();
  }, [user?.token]);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'countryCode') return setCountryCode(value);
    if (name === 'phoneLocal') return setPhoneLocal(value);
    if (files && files[0]) {
      // store File object to allow preview and FormData upload
      setForm((p) => ({ ...p, [name]: files[0] }));
      return;
    }
    else setForm((p) => ({ ...p, [name]: value }));
  };

  const passwordStrong = () => {
    const p = pwd.newPassword || "";
    return p.length >= 8 && /[A-Z]/.test(p) && /[a-z]/.test(p) && /[0-9]/.test(p) && /[^A-Za-z0-9]/.test(p);
  };

  const handlePasswordChange = async () => {
    if (!pwd.currentPassword) return setError('Enter your current password');
    if (!passwordStrong()) return setError('Password must be 8+ chars with A-Z,a-z,0-9 and special');
    if (pwd.newPassword !== pwd.confirmNewPassword) return setError('New passwords do not match');
    try {
      setLoading(true); setError("");
      await changePasswordApi(user?.token, { currentPassword: pwd.currentPassword, newPassword: pwd.newPassword });
      setSuccess('Password updated successfully'); setPwd({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
      setTimeout(() => setSuccess(''), 4500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update password');
    } finally { setLoading(false); }
  };

  const handleUpdate = async (field) => {
    // special handling for studentEmail: must end with .ac.ke and only update if changed
    if (field === 'studentEmail') {
      const newEmail = (form.studentEmail || '').trim();
      if (!newEmail) return setError('Please enter a student email before updating');
      if (newEmail === originalEmail) return setError('No changes detected');
      if (!newEmail.toLowerCase().endsWith('.ac.ke')) return setError('Student email must end with .ac.ke');
      const confirmedEmail = window.confirm('Confirm update to student email?'); if (!confirmedEmail) return;
      try {
        setLoading(true); setError('');
        const resp = await updateStudentProfile(user?.token, { studentEmail: newEmail });
        if (resp?.autoSubmitted) setSuccess('🎉 Profile completed and auto-submitted for approval');
        else setSuccess('Student email updated'); setTimeout(() => setSuccess(''), 3500);
        const [completionData, profileData] = await Promise.all([
          getProfileCompletion(user?.token),
          fetch('http://localhost:5000/api/users/profile', { headers: { Authorization: `Bearer ${user?.token}` } }).then(r => r.json()),
        ]);
        setUserProfile(profileData); setCompletion(completionData);
        setForm((p) => ({ ...p, ...(profileData || {}) }));
        setOriginalEmail(profileData.studentEmail || '');
      } catch (err) { setError(err.response?.data?.message || 'Failed to update student email'); }
      finally { setLoading(false); }
      return;
    }
    // special handling for phone (country code + local)
  if (field === 'phone') {
      const combined = `${countryCode} ${phoneLocal}`.trim();
      if (!combined) return setError('Please enter a phone number before updating');
      if (combined === originalPhone) return setError('No changes detected');
      const confirmed = window.confirm('Confirm update to phone number?'); if (!confirmed) return;
      try {
        setLoading(true); setError('');
        const resp = await updateStudentProfile(user?.token, { phone: combined });
        if (resp?.autoSubmitted) setSuccess('🎉 Profile completed and auto-submitted for approval');
        else setSuccess('Phone updated'); setTimeout(() => setSuccess(''), 3500);
        const [completionData, profileData] = await Promise.all([
          getProfileCompletion(user?.token),
          fetch('http://localhost:5000/api/users/profile', { headers: { Authorization: `Bearer ${user?.token}` } }).then(r => r.json()),
        ]);
        setUserProfile(profileData); setCompletion(completionData);
        // update states to reflect persisted value
        const rawPhone = profileData.phone || '';
        const phoneMatch = rawPhone.match(/^(\+\d{1,4})\s*(.*)$/);
        if (phoneMatch) {
          setCountryCode(phoneMatch[1]); setPhoneLocal(phoneMatch[2] || ''); setOriginalPhone(`${phoneMatch[1]} ${phoneMatch[2] || ''}`.trim());
        } else {
          setPhoneLocal(rawPhone || ''); setOriginalPhone(rawPhone || '');
        }

          if (field === 'documents') {
            // determine file name (if file) or string
            const newDoc = form.documents;
            const newName = newDoc && typeof newDoc === 'object' ? newDoc.name : (newDoc || '');
            const oldName = originalProfile.documents || '';
            if (!newName) return setError('Please choose a document before uploading');
            if (newName === oldName) return setError('No changes detected');
            const confirmed = window.confirm('Confirm upload of new document?'); if (!confirmed) return;
            try {
              setLoading(true); setError('');
              // if we have a File object, send as FormData so backend can accept multipart
              if (typeof newDoc === 'object' && newDoc instanceof File) {
                const fd = new FormData();
                fd.append('documents', newDoc);
                // updateStudentProfile will pass FormData through axios
                const resp = await updateStudentProfile(user?.token, fd);
                if (resp?.autoSubmitted) setSuccess('🎉 Profile completed and auto-submitted for approval');
                else setSuccess('Document uploaded');
              } else {
                // fallback: send filename string
                const resp = await updateStudentProfile(user?.token, { documents: newName });
                if (resp?.autoSubmitted) setSuccess('🎉 Profile completed and auto-submitted for approval');
                else setSuccess('Document reference updated');
              }
              setTimeout(() => setSuccess(''), 3500);
              const [completionData, profileData] = await Promise.all([
                getProfileCompletion(user?.token),
                fetch('http://localhost:5000/api/users/profile', { headers: { Authorization: `Bearer ${user?.token}` } }).then(r => r.json()),
              ]);
              setUserProfile(profileData); setCompletion(completionData);
              setForm((p) => ({ ...p, documents: profileData.documents || '' }));
              setOriginalProfile((op) => ({ ...op, documents: profileData.documents || '' }));
              // clear preview URL if any
              setPreviewUrl('');
            } catch (err) { setError(err.response?.data?.message || 'Failed to upload document'); }
            finally { setLoading(false); }
            return;
          }
        setForm((p) => ({ ...p, phone: rawPhone }));
      } catch (err) { setError(err.response?.data?.message || 'Failed to update'); }
      finally { setLoading(false); }
      return;
    }

    // fallback generic update for other fields
    if (!form[field] || form[field].trim() === '') return setError('Please enter a value before updating');
    // prevent no-op updates: compare against originalProfile when available
    if (originalProfile && Object.prototype.hasOwnProperty.call(originalProfile, field)) {
      if ((form[field] || '').trim() === (originalProfile[field] || '').trim()) return setError('No changes detected');
    }
    const confirmed = window.confirm('Confirm update?'); if (!confirmed) return;
    try {
      setLoading(true); setError('');
      const resp = await updateStudentProfile(user?.token, { [field]: form[field] });
      if (resp?.autoSubmitted) setSuccess('🎉 Profile completed and auto-submitted for approval');
      else setSuccess('Updated'); setTimeout(() => setSuccess(''), 3500);
      const [completionData, profileData] = await Promise.all([
        getProfileCompletion(user?.token),
        fetch('http://localhost:5000/api/users/profile', { headers: { Authorization: `Bearer ${user?.token}` } }).then(r => r.json()),
      ]);
      setUserProfile(profileData); setCompletion(completionData);
      setForm((p) => ({ ...p, ...(profileData || {}) }));
    } catch (err) { setError(err.response?.data?.message || 'Failed to update'); }
    finally { setLoading(false); }
  };

  const handleSubmitForApproval = async (e) => {
    e.preventDefault();
    try { setLoading(true); setError(''); await submitProfileForApproval(user?.token); setSuccess('Profile submitted for approval'); setCompletion(c => ({ ...c, profileSubmitted: true })); }
    catch (err) { setError(err.response?.data?.message || 'Failed to submit profile'); }
    finally { setLoading(false); }
  };

  // preview handling for document files
  useEffect(() => {
    if (!form.documents) {
      setPreviewUrl('');
      return;
    }
    if (typeof form.documents === 'object' && form.documents instanceof File) {
      const u = URL.createObjectURL(form.documents);
      setPreviewUrl(u);
      return () => URL.revokeObjectURL(u);
    }
    // if it's a filename string, try to construct backend URL for preview
    if (typeof form.documents === 'string') {
      const fileName = form.documents;
      // attempt common upload path; if your backend uses another path adjust accordingly
      setPreviewUrl(fileName.startsWith('http') ? fileName : `http://localhost:5000/uploads/${fileName}`);
    }
  }, [form.documents]);

  const isPreviewImage = previewUrl ? /\.(jpe?g|png)$/i.test(previewUrl) : false;
  const isPreviewPdf = previewUrl ? previewUrl.toLowerCase().endsWith('.pdf') : false;

  return (
    <div className="space-y-6">
      {error && <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3">{error}</div>}
      {success && <div className="rounded-lg bg-green-50 border border-green-200 text-green-700 px-4 py-3">{success}</div>}

      {/* Header / Hero */}
      <div className="bg-gradient-to-r from-emerald-500 via-green-500 to-lime-500 rounded-2xl p-6 text-white shadow-md">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Your Profile</h2>
            <p className="text-emerald-100 mt-1">Manage your details & verification status</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-2xl font-semibold">{(user?.name||'U').charAt(0).toUpperCase()}</div>
            <div className="text-right">
              <div className="font-semibold">{user?.name}</div>
              <div className="text-sm opacity-90">{user?.email}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main form */}
        <div className="lg:col-span-2 space-y-4">
          <form onSubmit={handleSubmitForApproval} className="space-y-4">
            {/* Profile status */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Profile Overview</h3>
                  <p className="text-sm text-slate-500 mt-1">Completion: <span className="font-semibold">{completion.completionPercent}%</span></p>
                </div>
                <div>
                  <MiniBadge status={completion.isApproved ? 'verified' : (completion.profileSubmitted ? 'pending' : 'pending')} />
                </div>
              </div>
            </div>

            {/* Basic info */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
              <h4 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">Basic Information</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ProfileField label="Full name">
                  <input value={user?.name || ''} disabled className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border" />
                </ProfileField>
                <ProfileField label="University">
                  <input value={userProfile?.university || ''} disabled className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border" />
                </ProfileField>

                <ProfileField label="Phone number">
                  <div className="flex gap-2">
                    <select name="countryCode" value={countryCode} onChange={handleChange} className="w-28 px-3 py-3 rounded-xl border bg-white">
                      <option value="+254">+254</option>
                      <option value="+1">+1</option>
                      <option value="+44">+44</option>
                      <option value="+234">+234</option>
                      <option value="+255">+255</option>
                      <option value="+92">+92</option>
                    </select>
                    <input name="phoneLocal" value={phoneLocal} onChange={handleChange} placeholder="Local number" className="flex-1 px-4 py-3 rounded-xl border focus:ring-2 focus:ring-slate-300" />
                    <button type="button" onClick={() => handleUpdate('phone')} disabled={loading || `${countryCode} ${phoneLocal}`.trim() === originalPhone} className="px-4 py-3 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50">Update</button>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Current: {originalPhone || 'Not set'}</div>
                </ProfileField>
              </div>
            </div>

            {/* Extended */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
              <h4 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">Extended Details</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ProfileField label="Student ID">
                  <div className="flex gap-2">
                    <input name="studentId" value={form.studentId} onChange={handleChange} placeholder="Student ID" className="flex-1 px-4 py-3 rounded-xl border" />
                    <button type="button" onClick={() => handleUpdate('studentId')} disabled={loading || (form.studentId||'').trim() === (originalProfile.studentId||'').trim()} className="px-4 py-3 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50">Update</button>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Current: {originalProfile.studentId || 'Not set'}</div>
                </ProfileField>
                <ProfileField label="Student email">
                  <div className="flex gap-2">
                    <input name="studentEmail" value={form.studentEmail} onChange={handleChange} placeholder="Student email (must end with .ac.ke)" className="flex-1 px-4 py-3 rounded-xl border" />
                    <button type="button" onClick={() => handleUpdate('studentEmail')} disabled={loading || (form.studentEmail||'').trim() === originalEmail || !((form.studentEmail||'').trim().toLowerCase().endsWith('.ac.ke'))} className="px-4 py-3 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50">Update</button>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Academic emails must end with <code>.ac.ke</code>. Current: {originalEmail || 'Not set'}</div>
                </ProfileField>
                <ProfileField label="Course">
                  <div className="flex gap-2">
                    <input name="course" value={form.course} onChange={handleChange} placeholder="Course" className="flex-1 px-4 py-3 rounded-xl border" />
                    <button type="button" onClick={() => handleUpdate('course')} disabled={loading || (form.course||'').trim() === (originalProfile.course||'').trim()} className="px-4 py-3 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50">Update</button>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Current: {originalProfile.course || 'Not set'}</div>
                </ProfileField>
                <ProfileField label="Year of study">
                  <div className="flex gap-2">
                    <input name="yearOfStudy" value={form.yearOfStudy} onChange={handleChange} placeholder="Year of study" className="flex-1 px-4 py-3 rounded-xl border" />
                    <button type="button" onClick={() => handleUpdate('yearOfStudy')} disabled={loading || (form.yearOfStudy||'').trim() === (originalProfile.yearOfStudy||'').trim()} className="px-4 py-3 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50">Update</button>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Current: {originalProfile.yearOfStudy || 'Not set'}</div>
                </ProfileField>

                <ProfileField label="Child details">
                  <div className="flex gap-2">
                    <textarea name="childDetails" value={form.childDetails} onChange={handleChange} placeholder="Child details" className="flex-1 px-4 py-3 rounded-xl border" />
                    <button type="button" onClick={() => handleUpdate('childDetails')} disabled={loading || (form.childDetails||'').trim() === (originalProfile.childDetails||'').trim()} className="px-4 py-3 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50">Update</button>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Current: {originalProfile.childDetails || 'Not set'}</div>
                </ProfileField>
              </div>
            </div>

            {/* Documents */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
              <h4 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">Documents</h4>
              <div className="space-y-2">
                <label className="block text-sm text-slate-600">Student card / Admission letter</label>
                <div className="flex gap-2 items-center">
                  <input type="file" name="documents" onChange={handleChange} accept=".pdf,.jpg,.jpeg,.png" className="text-sm" />
                  <button type="button" onClick={() => handleUpdate('documents')} disabled={loading || !form.documents || ((typeof form.documents === 'string' ? form.documents : form.documents.name) === (originalProfile.documents || ''))} className="px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50">Upload</button>
                </div>
                {form.documents && (
                  <div className="mt-2">
                    <div className="text-xs text-slate-700 dark:text-slate-300">Preview:</div>
                    {previewUrl && (
                      isPreviewImage ? (
                        <img src={previewUrl} alt="document preview" className="mt-2 max-h-48 rounded-md border" />
                      ) : isPreviewPdf ? (
                        <a href={previewUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-emerald-700">Open PDF</a>
                      ) : (
                        <a href={previewUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-emerald-700">Open document</a>
                      )
                    )}
                    <div className="text-xs text-green-600 mt-1">Current: {originalProfile.documents || 'Not set'}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Submit */}
            <div className="flex justify-end">
              {!completion.isApproved ? (
                <button type="submit" disabled={!completion.isComplete || completion.profileSubmitted || loading} className="px-6 py-3 rounded-2xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50">{completion.profileSubmitted ? 'Submitted' : 'Submit for Approval'}</button>
              ) : (
                <div className="px-6 py-3 rounded-2xl bg-green-100 text-green-800 font-semibold">Profile Approved</div>
              )}
            </div>
          </form>
        </div>

        {/* Right column: progress, security, quick actions */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
            <h4 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">Profile Completion</h4>
            <div className="w-full bg-slate-100 dark:bg-slate-900 rounded-full h-3 overflow-hidden">
              <div className="h-3 bg-emerald-500" style={{ width: `${completion.completionPercent}%` }} />
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">{completion.completionPercent}% complete</p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
            <h4 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">Security</h4>
            <div className="space-y-3">
              <input type="password" placeholder="Current password" value={pwd.currentPassword} onChange={(e) => setPwd(p => ({ ...p, currentPassword: e.target.value }))} className="w-full px-4 py-3 rounded-xl border" />
              <div className="relative">
                <input type={showPwd.next ? 'text' : 'password'} placeholder="New password" value={pwd.newPassword} onChange={(e) => setPwd(p => ({ ...p, newPassword: e.target.value }))} className="w-full px-4 py-3 rounded-xl border pr-12" />
                <button type="button" onClick={() => setShowPwd(s => ({ ...s, next: !s.next }))} className="absolute inset-y-0 right-0 px-3 text-slate-500">{showPwd.next ? '🙈' : '👁️'}</button>
              </div>
              <div className="relative">
                <input type={showPwd.confirm ? 'text' : 'password'} placeholder="Confirm new password" value={pwd.confirmNewPassword} onChange={(e) => setPwd(p => ({ ...p, confirmNewPassword: e.target.value }))} className="w-full px-4 py-3 rounded-xl border pr-12" />
                <button type="button" onClick={() => setShowPwd(s => ({ ...s, confirm: !s.confirm }))} className="absolute inset-y-0 right-0 px-3 text-slate-500">{showPwd.confirm ? '🙈' : '👁️'}</button>
              </div>
              <button type="button" onClick={handlePasswordChange} disabled={loading} className="w-full px-4 py-3 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50">Update password</button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
            <h4 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">Quick Actions</h4>
            <div className="flex flex-col gap-2">
              <a href="/dashboard/student/aid" className="px-4 py-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100">Submit new aid request</a>
              <a href="/dashboard/student/support" className="px-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 hover:bg-slate-100">Contact support</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentProfile;


