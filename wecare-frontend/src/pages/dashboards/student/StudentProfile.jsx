import { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { updateStudentProfile, submitProfileForApproval, getProfileCompletion, changePassword as changePasswordApi, requestAccountDeletion, cancelAccountDeletion, getDeletionStatus } from "../../../services/userService";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";
const UPLOAD_BASE = import.meta.env.VITE_SOCKET_URL || API_BASE;

const MiniBadge = ({ status }) => {
  const map = {
    verified: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-700",
    awaiting_verification: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-700",
    pending: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-700",
    rejected: "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-200 dark:border-rose-700",
  };
  const label = status === "verified" ? "Verified" : status === "awaiting_verification" ? "Awaiting Verification" : status === "rejected" ? "Rejected" : "Pending";
  return <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${map[status] || map.pending}`}>{label}</span>;
};

const ProfileField = ({ label, children }) => (
  <div>
    <label className="block text-sm text-slate-500 dark:text-slate-300 mb-1">{label}</label>
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
  const [deletionStatus, setDeletionStatus] = useState({ hasPendingDeletion: false });
  const [deleteForm, setDeleteForm] = useState({ password: "", reason: "" });
  const [deletionLoading, setDeletionLoading] = useState(false);
  const [nowTick, setNowTick] = useState(Date.now());
  const fileObject = form.documents instanceof File ? form.documents : null;
  const fileName = typeof form.documents === "string" ? form.documents : "";
  const isImageName = (name) => /\.(jpe?g|png)$/i.test(name || "");
  const isPdfName = (name) => /\.pdf$/i.test(name || "");
  const lockedStudentId = Boolean(originalProfile.studentId);
  const lockedStudentEmail = Boolean(originalEmail);
  const lockedCourse = Boolean(originalProfile.course);
  const lockedDocuments = Boolean(originalProfile.documents);

  const normalizeValue = (name, value) => {
    const raw = (value || "").toString();
    const trimmed = raw.trim();
    if (name === "studentEmail") return trimmed.toLowerCase();
    if (name === "course" || name === "childDetails") return trimmed.replace(/\s+/g, " ");
    if (name === "yearOfStudy" || name === "studentId") return trimmed;
    return trimmed;
  };

  const buildExtendedChanges = () => {
    const changes = {};
    const normalized = {
      studentId: normalizeValue("studentId", form.studentId),
      studentEmail: normalizeValue("studentEmail", form.studentEmail),
      course: normalizeValue("course", form.course),
      yearOfStudy: normalizeValue("yearOfStudy", form.yearOfStudy),
      childDetails: normalizeValue("childDetails", form.childDetails),
    };

    if (!lockedStudentId && normalized.studentId !== (originalProfile.studentId || "")) changes.studentId = normalized.studentId;
    if (!lockedStudentEmail && normalized.studentEmail !== (originalEmail || "")) changes.studentEmail = normalized.studentEmail;
    if (!lockedCourse && normalized.course !== (originalProfile.course || "")) changes.course = normalized.course;
    if (normalized.yearOfStudy !== (originalProfile.yearOfStudy || "")) changes.yearOfStudy = normalized.yearOfStudy;
    if (normalized.childDetails !== (originalProfile.childDetails || "")) changes.childDetails = normalized.childDetails;

    return changes;
  };

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const [completionData, profileData] = await Promise.all([
          getProfileCompletion(user?.token),
          fetch(`${API_BASE}/api/users/profile`, { headers: { Authorization: `Bearer ${user?.token}` } }).then((r) => r.json()),
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

  const loadDeletionStatus = async () => {
    try {
      const data = await getDeletionStatus(user?.token);
      setDeletionStatus(data);
    } catch (err) {
      setDeletionStatus({ hasPendingDeletion: false });
    }
  };

  useEffect(() => {
    if (user?.token) loadDeletionStatus();
  }, [user?.token]);

  useEffect(() => {
    if (!deletionStatus?.hasPendingDeletion || !deletionStatus?.scheduledFor) return;
    const intervalId = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(intervalId);
  }, [deletionStatus?.hasPendingDeletion, deletionStatus?.scheduledFor]);

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

  const handleRequestDeletion = async () => {
    if (!deleteForm.password) return setError("Password is required to request deletion");
    const confirmed = window.confirm("Schedule account deletion? You will have 7 days to cancel.");
    if (!confirmed) return;
    try {
      setDeletionLoading(true);
      setError("");
      const payload = { password: deleteForm.password, reason: deleteForm.reason };
      await requestAccountDeletion(user?.token, payload);
      setSuccess("Account deletion scheduled");
      setDeleteForm({ password: "", reason: "" });
      await loadDeletionStatus();
      setTimeout(() => setSuccess(""), 4500);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to request account deletion");
    } finally {
      setDeletionLoading(false);
    }
  };

  const handleCancelDeletion = async () => {
    const confirmed = window.confirm("Cancel scheduled account deletion?");
    if (!confirmed) return;
    try {
      setDeletionLoading(true);
      setError("");
      await cancelAccountDeletion(user?.token);
      setSuccess("Account deletion cancelled");
      await loadDeletionStatus();
      setTimeout(() => setSuccess(""), 4500);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to cancel account deletion");
    } finally {
      setDeletionLoading(false);
    }
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
          fetch(`${API_BASE}/api/users/profile`, { headers: { Authorization: `Bearer ${user?.token}` } }).then(r => r.json()),
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
          fetch(`${API_BASE}/api/users/profile`, { headers: { Authorization: `Bearer ${user?.token}` } }).then(r => r.json()),
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
        setForm((p) => ({ ...p, phone: rawPhone }));
      } catch (err) { setError(err.response?.data?.message || 'Failed to update'); }
      finally { setLoading(false); }
      return;
    }

    // special handling for documents (file upload)
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
          fetch(`${API_BASE}/api/users/profile`, { headers: { Authorization: `Bearer ${user?.token}` } }).then(r => r.json()),
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
        fetch(`${API_BASE}/api/users/profile`, { headers: { Authorization: `Bearer ${user?.token}` } }).then(r => r.json()),
      ]);
      setUserProfile(profileData); setCompletion(completionData);
      setForm((p) => ({ ...p, ...(profileData || {}) }));
      setOriginalProfile((op) => ({
        ...op,
        studentId: profileData.studentId || "",
        course: profileData.course || "",
        yearOfStudy: profileData.yearOfStudy || "",
        childDetails: profileData.childDetails || "",
        documents: profileData.documents || "",
      }));
    } catch (err) { setError(err.response?.data?.message || 'Failed to update'); }
    finally { setLoading(false); }
  };

  const handleSaveExtended = async () => {
    setError("");
    const changes = buildExtendedChanges();
    if (Object.keys(changes).length === 0) return setError("No changes detected");

    if (changes.studentEmail && !changes.studentEmail.endsWith(".ac.ke")) {
      return setError("Student email must end with .ac.ke");
    }

    const summaryLines = Object.entries(changes)
      .map(([key, value]) => `${key}: ${value || "(empty)"}`)
      .join("\n");
    const lockNotice = [
      changes.studentId ? "- Student ID becomes locked after saving." : "",
      changes.studentEmail ? "- Student email becomes locked after saving." : "",
      changes.course ? "- Course becomes locked after saving." : "",
    ].filter(Boolean).join("\n");
    const confirmText = `Save these changes?\n\n${summaryLines}${lockNotice ? `\n\n${lockNotice}` : ""}`;
    if (!window.confirm(confirmText)) return;

    try {
      setLoading(true);
      const resp = await updateStudentProfile(user?.token, changes);
      if (resp?.autoSubmitted) setSuccess("🎉 Profile completed and auto-submitted for approval");
      else setSuccess("Profile details updated");
      setTimeout(() => setSuccess(""), 3500);
      const [completionData, profileData] = await Promise.all([
        getProfileCompletion(user?.token),
        fetch(`${API_BASE}/api/users/profile`, { headers: { Authorization: `Bearer ${user?.token}` } }).then(r => r.json()),
      ]);
      setUserProfile(profileData);
      setCompletion(completionData);
      setForm((p) => ({ ...p, ...(profileData || {}) }));
      setOriginalEmail(profileData.studentEmail || "");
      setOriginalProfile((op) => ({
        ...op,
        studentId: profileData.studentId || "",
        course: profileData.course || "",
        yearOfStudy: profileData.yearOfStudy || "",
        childDetails: profileData.childDetails || "",
        documents: profileData.documents || "",
      }));
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update details");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDocuments = async () => {
    setError("");
    if (lockedDocuments) return setError("Documents are locked after first upload");
    const newDoc = form.documents;
    const newName = newDoc && typeof newDoc === "object" ? newDoc.name : (newDoc || "");
    if (!newName) return setError("Please choose a document before uploading");

    const confirmText = `Upload this document?\n\nDocument: ${newName}\n\n- Documents cannot be deleted after upload.\n- Documents are retained for 90 days. Safe to upload.`;
    if (!window.confirm(confirmText)) return;

    try {
      setLoading(true);
      if (typeof newDoc === "object" && newDoc instanceof File) {
        const fd = new FormData();
        fd.append("documents", newDoc);
        const resp = await updateStudentProfile(user?.token, fd);
        if (resp?.autoSubmitted) setSuccess("🎉 Profile completed and auto-submitted for approval");
        else setSuccess("Document uploaded");
      } else {
        const resp = await updateStudentProfile(user?.token, { documents: newName });
        if (resp?.autoSubmitted) setSuccess("🎉 Profile completed and auto-submitted for approval");
        else setSuccess("Document uploaded");
      }
      setTimeout(() => setSuccess(""), 3500);
      const [completionData, profileData] = await Promise.all([
        getProfileCompletion(user?.token),
        fetch(`${API_BASE}/api/users/profile`, { headers: { Authorization: `Bearer ${user?.token}` } }).then(r => r.json()),
      ]);
      setUserProfile(profileData);
      setCompletion(completionData);
      setForm((p) => ({ ...p, documents: profileData.documents || "" }));
      setOriginalProfile((op) => ({ ...op, documents: profileData.documents || "" }));
      setPreviewUrl("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to upload document");
    } finally {
      setLoading(false);
    }
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
      const storedName = form.documents;
      // attempt common upload path; if your backend uses another path adjust accordingly
      setPreviewUrl(storedName.startsWith('http') ? storedName : `${UPLOAD_BASE}/uploads/${storedName}`);
    }
  }, [form.documents]);

  const isPreviewImage = fileObject
    ? (fileObject.type || "").startsWith("image/") || isImageName(fileObject.name)
    : isImageName(previewUrl) || isImageName(fileName);
  const isPreviewPdf = fileObject
    ? fileObject.type === "application/pdf" || isPdfName(fileObject.name)
    : isPdfName(fileName) || isPdfName(previewUrl);
  const currentDocName = originalProfile.documents || "";
  const currentDocUrl = currentDocName ? `${UPLOAD_BASE}/uploads/${currentDocName}` : "";
  const currentIsImage = isImageName(currentDocName);
  const currentIsPdf = isPdfName(currentDocName);
  const deletionDateLabel = deletionStatus?.scheduledFor ? new Date(deletionStatus.scheduledFor).toLocaleString() : "";
  const deletionDaysRemaining = typeof deletionStatus?.daysRemaining === "number" ? deletionStatus.daysRemaining : null;
  const deletionRemainingMs = deletionStatus?.scheduledFor
    ? Math.max(0, new Date(deletionStatus.scheduledFor).getTime() - nowTick)
    : null;
  const formatCountdown = (ms) => {
    if (ms === null) return "";
    const totalSeconds = Math.floor(ms / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (n) => n.toString().padStart(2, "0");
    if (days > 0) return `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
    if (hours > 0) return `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
    return `${pad(minutes)}m ${pad(seconds)}s`;
  };

  return (
    <div className="space-y-6">
      {error && <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-200 px-4 py-3">{error}</div>}
      {success && <div className="rounded-lg bg-amber-50 border border-amber-200 text-amber-700 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-200 px-4 py-3">{success}</div>}

      {/* Header / Hero */}
      <div className="bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 rounded-2xl p-6 text-white shadow-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold">Your Profile</h2>
            <p className="text-amber-100 text-sm sm:text-base mt-1">Manage your details & verification status</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/20 flex items-center justify-center text-xl sm:text-2xl font-semibold">{(user?.name||'U').charAt(0).toUpperCase()}</div>
            <div className="text-left sm:text-right">
              <div className="font-semibold text-sm sm:text-base">{user?.name}</div>
              <div className="text-xs sm:text-sm opacity-90 truncate max-w-[150px] sm:max-w-none">{user?.email}</div>
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
                  <MiniBadge status={completion.profileApproved ? 'verified' : (completion.profileSubmitted ? 'awaiting_verification' : 'pending')} />
                </div>
              </div>
            </div>

            {/* Basic info */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
              <h4 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">Basic Information</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ProfileField label="Full name">
                  <input value={user?.name || ''} disabled className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200" />
                </ProfileField>
                <ProfileField label="University">
                  <input value={userProfile?.university || ''} disabled className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200" />
                </ProfileField>

                <ProfileField label="Phone number">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="flex gap-2 flex-1">
                      <select name="countryCode" value={countryCode} onChange={handleChange} className="w-24 sm:w-28 px-2 sm:px-3 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-100 text-sm">
                        <option value="+254">+254</option>
                        <option value="+1">+1</option>
                        <option value="+44">+44</option>
                        <option value="+234">+234</option>
                        <option value="+255">+255</option>
                        <option value="+92">+92</option>
                      </select>
                      <input name="phoneLocal" value={phoneLocal} onChange={handleChange} placeholder="Local number" className="flex-1 min-w-0 px-3 sm:px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600 text-sm" />
                    </div>
                    <button type="button" onClick={() => handleUpdate('phone')} disabled={loading || `${countryCode} ${phoneLocal}`.trim() === originalPhone} className="w-full sm:w-auto px-4 py-3 rounded-xl bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 text-sm font-medium">Update</button>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Current: {originalPhone || 'Not set'}</div>
                </ProfileField>
              </div>
            </div>

            {/* Extended */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
              <h4 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">Extended Details</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ProfileField label="Student ID">
                  <input name="studentId" value={form.studentId} onChange={handleChange} placeholder="Student ID" disabled={lockedStudentId} className="w-full px-4 py-3 rounded-xl border text-sm disabled:bg-slate-50 disabled:text-slate-500" />
                  <div className="text-xs text-slate-500 mt-1 break-words">{lockedStudentId ? "Locked after first save" : "Current: " + (originalProfile.studentId || "Not set")}</div>
                </ProfileField>
                <ProfileField label="Student email">
                  <input name="studentEmail" value={form.studentEmail} onChange={handleChange} placeholder="Student email (must end with .ac.ke)" disabled={lockedStudentEmail} className="w-full px-4 py-3 rounded-xl border text-sm disabled:bg-slate-50 disabled:text-slate-500" />
                  <div className="text-xs text-slate-500 mt-1 break-words">{lockedStudentEmail ? "Locked after first save" : "Academic emails must end with .ac.ke. Current: " + (originalEmail || "Not set")}</div>
                </ProfileField>
                <ProfileField label="Course">
                  <input name="course" value={form.course} onChange={handleChange} placeholder="Course" disabled={lockedCourse} className="w-full px-4 py-3 rounded-xl border text-sm disabled:bg-slate-50 disabled:text-slate-500" />
                  <div className="text-xs text-slate-500 mt-1 break-words">{lockedCourse ? "Locked after first save" : "Current: " + (originalProfile.course || "Not set")}</div>
                </ProfileField>
                <ProfileField label="Year of study">
                  <input name="yearOfStudy" value={form.yearOfStudy} onChange={handleChange} placeholder="Year of study" className="w-full px-4 py-3 rounded-xl border text-sm" />
                  <div className="text-xs text-slate-500 mt-1 break-words">Current: {originalProfile.yearOfStudy || 'Not set'}</div>
                </ProfileField>

                <ProfileField label="Child details">
                  <textarea name="childDetails" value={form.childDetails} onChange={handleChange} placeholder="Child details" className="w-full px-4 py-3 rounded-xl border text-sm" rows="3" />
                  <div className="text-xs text-slate-500 mt-1 break-words">Current: {originalProfile.childDetails || 'Not set'}</div>
                </ProfileField>
              </div>
              <div className="mt-4 flex justify-end">
                <button type="button" onClick={handleSaveExtended} disabled={loading} className="px-5 py-2.5 rounded-xl bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 text-sm font-medium">Save changes</button>
              </div>
            </div>

            {/* Documents */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
              <h4 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">Documents</h4>
              <div className="space-y-3">
                <label className="block text-sm text-slate-600 dark:text-slate-400">Student card / Admission letter</label>
                <div className="text-xs text-slate-500">Documents are retained for 90 days and cannot be deleted once uploaded.</div>
                
                {/* Show currently uploaded document */}
                {originalProfile.documents && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Currently Uploaded:</div>
                    {currentIsImage ? (
                      <img 
                        src={currentDocUrl} 
                        alt="Uploaded document" 
                        className="max-h-48 rounded-md border border-slate-300"
                        onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
                      />
                    ) : currentIsPdf ? (
                      <a 
                        href={currentDocUrl} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="inline-flex items-center gap-2 px-3 py-2 bg-red-100 text-red-700 rounded-md text-sm hover:bg-red-200"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"/></svg>
                        View PDF Document
                      </a>
                    ) : (
                      <a 
                        href={currentDocUrl} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="inline-flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-700 rounded-md text-sm hover:bg-slate-200"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd"/></svg>
                        View Document
                      </a>
                    )}
                    <div style={{display: 'none'}} className="text-xs text-amber-600">Filename: {originalProfile.documents}</div>
                  </div>
                )}
                
                {/* Upload new document */}
                <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                  <input 
                    type="file" 
                    name="documents" 
                    onChange={handleChange} 
                    accept=".pdf,.jpg,.jpeg,.png" 
                    className="text-sm flex-1"
                    disabled={lockedDocuments}
                  />
                  <button 
                    type="button" 
                    onClick={handleSaveDocuments} 
                    disabled={loading || lockedDocuments || !form.documents || ((typeof form.documents === 'string' ? form.documents : form.documents.name) === (originalProfile.documents || ''))} 
                    className="px-4 py-2 rounded-xl bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 text-sm font-medium whitespace-nowrap"
                  >
                    Upload
                  </button>
                </div>
                {lockedDocuments && (
                  <div className="text-xs text-rose-600">Document upload is locked after the first upload.</div>
                )}
                
                {/* Preview of newly selected file (before upload) */}
                {form.documents && typeof form.documents === 'object' && form.documents instanceof File && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-700">
                    <div className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-2">Preview (not yet uploaded):</div>
                    {isPreviewImage ? (
                      <img src={previewUrl} alt="document preview" className="max-h-48 rounded-md border border-amber-300" />
                    ) : isPreviewPdf ? (
                      <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"/></svg>
                        PDF ready to upload: {form.documents.name}
                      </div>
                    ) : (
                      <div className="text-sm text-amber-700 dark:text-amber-400">File ready: {form.documents.name}</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Submit */}
            <div className="flex justify-end">
              {!completion.isApproved ? (
                <button type="submit" disabled={!completion.isComplete || completion.profileSubmitted || loading} className="px-6 py-3 rounded-2xl bg-amber-600 text-white font-semibold hover:bg-amber-700 disabled:opacity-50">{completion.profileSubmitted ? 'Submitted' : 'Submit for Approval'}</button>
              ) : (
                <div className="px-6 py-3 rounded-2xl bg-amber-100 text-amber-800 font-semibold">Profile Approved</div>
              )}
            </div>
          </form>
        </div>

        {/* Right column: progress, security, quick actions */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
            <h4 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">Profile Completion</h4>
            <div className="w-full bg-slate-100 dark:bg-slate-900 rounded-full h-3 overflow-hidden">
              <div className="h-3 bg-amber-500" style={{ width: `${completion.completionPercent}%` }} />
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

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-rose-200 dark:border-rose-700 shadow-sm">
            <h4 className="font-semibold text-slate-800 dark:text-slate-100 mb-2">Delete Account</h4>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
              You can schedule account deletion with a 7-day grace period.
            </p>
            <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1 mb-4">
              <div>- You can cancel any time before the deadline.</div>
              <div>- After 7 days, your account is anonymized and access is removed.</div>
              <div>- This action cannot be undone after the grace period.</div>
            </div>

            {deletionStatus?.hasPendingDeletion ? (
              <div className="space-y-3">
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  <div className="font-semibold">Deletion scheduled</div>
                  <div>Scheduled for: {deletionDateLabel || "Pending"}</div>
                  {deletionDaysRemaining !== null && (
                    <div>Days remaining: {Math.max(0, deletionDaysRemaining)}</div>
                  )}
                  {deletionRemainingMs !== null && (
                    <div>Time left: {formatCountdown(deletionRemainingMs)}</div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleCancelDeletion}
                  disabled={deletionLoading || (deletionDaysRemaining !== null && deletionDaysRemaining <= 0)}
                  className="w-full px-4 py-3 rounded-2xl bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
                >
                  Cancel deletion
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  type="password"
                  placeholder="Confirm password"
                  value={deleteForm.password}
                  onChange={(e) => setDeleteForm(p => ({ ...p, password: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border"
                />
                <textarea
                  placeholder="Reason (optional)"
                  value={deleteForm.reason}
                  onChange={(e) => setDeleteForm(p => ({ ...p, reason: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border text-sm"
                />
                <button
                  type="button"
                  onClick={handleRequestDeletion}
                  disabled={deletionLoading}
                  className="w-full px-4 py-3 rounded-2xl bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50"
                >
                  Schedule deletion
                </button>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
            <h4 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">Quick Actions</h4>
            <div className="flex flex-col gap-2">
              <a href="/dashboard/student/aid" className="px-4 py-2 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100">Submit new aid request</a>
              <a href="/dashboard/student/support" className="px-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 hover:bg-slate-100">Contact support</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentProfile;


