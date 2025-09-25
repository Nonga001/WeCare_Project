import { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { updateStudentProfile, submitProfileForApproval, getProfileCompletion, changePassword as changePasswordApi } from "../../../services/userService";

const ProgressBar = ({ value = 0 }) => (
  <div className="w-full h-2.5 bg-slate-200 rounded-full">
    <div
      className="h-2.5 bg-emerald-600 rounded-full transition-all"
      style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
    />
  </div>
);

const StudentProfile = () => {
  const { user } = useAuth();
  const [form, setForm] = useState({
    phone: "",
    studentId: "",
    studentEmail: "",
    course: "",
    yearOfStudy: "",
    childDetails: "",
    documents: "",
  });
  const [completion, setCompletion] = useState({ completionPercent: 0, isComplete: false, profileSubmitted: false, profileApproved: false, isApproved: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [userProfile, setUserProfile] = useState(null);
  const [pwd, setPwd] = useState({ currentPassword: "", newPassword: "", confirmNewPassword: "" });
  const [showPwd, setShowPwd] = useState({ current:false, next:false, confirm:false });

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const [completionData, profileData] = await Promise.all([
          getProfileCompletion(user?.token),
          fetch('http://localhost:5000/api/users/profile', {
            headers: { Authorization: `Bearer ${user?.token}` }
          }).then(res => res.json())
        ]);
        
        setUserProfile(profileData);
        setCompletion(completionData);
        setForm({
          phone: profileData.phone || "",
          studentId: profileData.studentId || "",
          studentEmail: profileData.studentEmail || "",
          course: profileData.course || "",
          yearOfStudy: profileData.yearOfStudy || "",
          childDetails: profileData.childDetails || "",
          documents: profileData.documents || "",
        });
      } catch (err) {
        setError("Failed to load profile data");
      }
    };
    if (user?.token) loadProfile();
  }, [user?.token]);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (files && files[0]) {
      // For file uploads, store the file name
      setForm((prev) => ({ ...prev, [name]: files[0].name }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const passwordStrong = () => {
    const p = pwd.newPassword || "";
    return p.length >= 8 && /[A-Z]/.test(p) && /[a-z]/.test(p) && /[0-9]/.test(p) && /[^A-Za-z0-9]/.test(p);
  };

  const handlePasswordChange = async () => {
    if (!pwd.currentPassword) {
      setError("Enter your current password");
      return;
    }
    if (!passwordStrong()) {
      setError("Password must be 8+ chars with A-Z, a-z, 0-9, special");
      return;
    }
    if (pwd.newPassword !== pwd.confirmNewPassword) {
      setError("New passwords do not match");
      return;
    }
    try {
      setLoading(true);
      setError("");
      await changePasswordApi(user?.token, { currentPassword: pwd.currentPassword, newPassword: pwd.newPassword });
      setSuccess("Password updated successfully");
      setPwd({ currentPassword: "", newPassword: "", confirmNewPassword: "" });
      setTimeout(()=>setSuccess(""), 5000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (field) => {
    if (!form[field] || form[field].trim() === "") {
      setError("Please enter a value before updating");
      return;
    }

    const fieldName = field === 'phone' ? 'phone number' : 
                     field === 'studentId' ? 'student ID' :
                     field === 'studentEmail' ? 'student email' :
                     field === 'course' ? 'course' :
                     field === 'yearOfStudy' ? 'year of study' :
                     field === 'childDetails' ? 'child details' : field;
    
    const confirmed = window.confirm(`Are you sure you want to update your ${fieldName}?`);
    if (!confirmed) return;

    try {
      setLoading(true);
      setError("");
      const response = await updateStudentProfile(user?.token, { [field]: form[field] });
      
      // Check if profile was auto-submitted
      if (response.autoSubmitted) {
        setSuccess(`🎉 Profile completed 100% and automatically submitted for approval!`);
      } else {
        setSuccess(`${fieldName} updated successfully`);
      }
      setTimeout(() => setSuccess(""), 5000);
      
      // Reload both profile data and completion status
      const [completionData, profileData] = await Promise.all([
        getProfileCompletion(user?.token),
        fetch('http://localhost:5000/api/users/profile', {
          headers: { Authorization: `Bearer ${user?.token}` }
        }).then(res => res.json())
      ]);
      
      setUserProfile(profileData);
      setCompletion(completionData);
      
      // Update form with fresh data from database
      setForm({
        phone: profileData.phone || "",
        studentId: profileData.studentId || "",
        studentEmail: profileData.studentEmail || "",
        course: profileData.course || "",
        yearOfStudy: profileData.yearOfStudy || "",
        childDetails: profileData.childDetails || "",
        documents: profileData.documents || "",
      });
      
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitForApproval = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");
      await submitProfileForApproval(user?.token);
      setSuccess("Profile submitted for approval");
      setCompletion(prev => ({ ...prev, profileSubmitted: true }));
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
        {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">{success}</div>}
        
        <form onSubmit={handleSubmitForApproval} className="space-y-4">
          {!completion.isApproved && completion.profileSubmitted && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-amber-800">
                    <strong>Profile Submitted:</strong> Your profile has been submitted for verification. The university admin will review your information and approve it. You will be notified once approved.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <div className="rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800">Basic Information</h3>
              {completion.isApproved && completion.profileSubmitted && (
                <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full border border-green-200">
                  ✓ Editable
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-600 mb-1">Full Name (Static)</label>
                <input value={user?.name || ""} disabled className="w-full px-4 py-3 border rounded-xl bg-slate-50 text-slate-500" />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">University (Static)</label>
                <input value={userProfile?.university || "Loading..."} disabled className="w-full px-4 py-3 border rounded-xl bg-slate-50 text-slate-500" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm text-slate-600 mb-1">Phone Number</label>
                <div className="flex gap-2">
                  <input name="phone" placeholder="Phone Number" value={form.phone} onChange={handleChange} className="flex-1 px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300" />
                  <button type="button" onClick={() => handleUpdate('phone')} disabled={loading} className="px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50">Update</button>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800">Extended Information</h3>
              {completion.isApproved && completion.profileSubmitted && (
                <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full border border-green-200">
                  ✓ Editable
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-600 mb-1">Student ID</label>
                <div className="flex gap-2">
                  <input name="studentId" placeholder="Student ID / Admission No." value={form.studentId} onChange={handleChange} className="flex-1 px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300" />
                  <button type="button" onClick={() => handleUpdate('studentId')} disabled={loading} className="px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50">Update</button>
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Student Email</label>
                <div className="flex gap-2">
                  <input name="studentEmail" placeholder="Student Email" value={form.studentEmail} onChange={handleChange} className="flex-1 px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300" />
                  <button type="button" onClick={() => handleUpdate('studentEmail')} disabled={loading} className="px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50">Update</button>
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Course</label>
                <div className="flex gap-2">
                  <input name="course" placeholder="Course" value={form.course} onChange={handleChange} className="flex-1 px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300" />
                  <button type="button" onClick={() => handleUpdate('course')} disabled={loading} className="px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50">Update</button>
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Year of Study</label>
                <div className="flex gap-2">
                  <input name="yearOfStudy" placeholder="Year of Study" value={form.yearOfStudy} onChange={handleChange} className="flex-1 px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300" />
                  <button type="button" onClick={() => handleUpdate('yearOfStudy')} disabled={loading} className="px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50">Update</button>
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm text-slate-600 mb-1">Child Details (Required)</label>
                <div className="flex gap-2">
                  <textarea name="childDetails" placeholder="Child details (required)" value={form.childDetails} onChange={handleChange} className="flex-1 px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300" required />
                  <button type="button" onClick={() => handleUpdate('childDetails')} disabled={loading} className="px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50">Update</button>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800">Documents (Required)</h3>
              {completion.isApproved && completion.profileSubmitted && (
                <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full border border-green-200">
                  ✓ Editable
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 gap-4">
              <label className="block">
                <span className="text-sm text-slate-600">Student card / Admission letter</span>
                <div className="flex gap-2 mt-2">
                  <input 
                    type="file" 
                    name="documents"
                    onChange={handleChange}
                    className="flex-1 block text-sm" 
                    accept=".pdf,.jpg,.jpeg,.png"
                  />
                  <button 
                    type="button" 
                    onClick={() => handleUpdate('documents')} 
                    disabled={loading || !form.documents}
                    className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50"
                  >
                    Upload
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-1">Upload your student ID or admission letter (PDF, JPG, PNG)</p>
                {form.documents && (
                  <p className="text-xs text-green-600 mt-1">Document uploaded: {form.documents}</p>
                )}
              </label>
            </div>
          </div>

          {!completion.isApproved && (
            <div className="flex justify-end">
              <button 
                type="submit" 
                disabled={!completion.isComplete || completion.profileSubmitted || loading}
                className="px-6 py-3 rounded-xl bg-emerald-600 text-white font-semibold shadow hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {completion.profileSubmitted ? "Submitted for Approval" : "Submit for Approval"}
              </button>
            </div>
          )}
          
          {completion.isApproved && completion.profileSubmitted && completion.profileApproved && (
            <div className="flex justify-end">
              <div className="px-6 py-3 rounded-xl bg-green-100 text-green-800 font-semibold border border-green-200">
                🎉 Approved Student Mom - You can now access aid requests
              </div>
            </div>
          )}
          
          {completion.isApproved && completion.profileSubmitted && completion.profileApproved && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> You can now edit your profile information. Changes will be saved immediately.
              </p>
            </div>
          )}
        </form>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 p-5">
          <h4 className="font-semibold text-slate-800 mb-3">Profile Completion</h4>
          <ProgressBar value={completion.completionPercent} />
          <p className="mt-2 text-sm text-slate-600">{completion.completionPercent}% complete ({completion.completedFields?.length || 0} of 7 fields)</p>
          {completion.completionPercent === 100 && !completion.profileSubmitted && (
            <p className="text-xs text-emerald-600 mt-1 font-medium">🎉 Profile 100% complete! It will be automatically submitted for approval.</p>
          )}
          {completion.completionPercent < 100 && (
            <p className="text-xs text-amber-600 mt-1">Complete all 7 required fields: phone, student ID, email, course, year, child details, and documents</p>
          )}
        </div>
        <div className="rounded-xl border border-slate-200 p-5">
          <h4 className="font-semibold text-slate-800 mb-2">Status</h4>
          <p className="text-slate-600 text-sm">
            {completion.isApproved && completion.profileSubmitted && completion.profileApproved ? "🎉 Approved Student Mom" : 
             completion.profileSubmitted && !completion.profileApproved ? "📤 Submitted (Awaiting Verification)" : 
             completion.profileSubmitted && completion.profileApproved ? "✅ Profile Approved - Awaiting Final Verification" :
             "❌ Not submitted"}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 p-5">
          <h4 className="font-semibold text-slate-800 mb-3">Security</h4>
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
          <ul className="mt-2 text-xs text-slate-600 space-y-1">
            <li className={pwd.newPassword.length>=8?"text-emerald-600":"text-slate-500"}>• At least 8 characters</li>
            <li className={/[A-Z]/.test(pwd.newPassword)?"text-emerald-600":"text-slate-500"}>• Uppercase letter</li>
            <li className={/[a-z]/.test(pwd.newPassword)?"text-emerald-600":"text-slate-500"}>• Lowercase letter</li>
            <li className={/[0-9]/.test(pwd.newPassword)?"text-emerald-600":"text-slate-500"}>• Number</li>
            <li className={/[^A-Za-z0-9]/.test(pwd.newPassword)?"text-emerald-600":"text-slate-500"}>• Special character</li>
          </ul>
          <div className="mt-3">
            <button type="button" onClick={handlePasswordChange} disabled={loading} className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50">Update Password</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentProfile;


