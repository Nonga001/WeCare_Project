import { useState, useEffect } from "react";
import { useAuth } from "../../../context/AuthContext";

const SuperAdminProfile = () => {
  const { user } = useAuth();
  const [form, setForm] = useState({ 
    currentPassword: "", 
    newPassword: "", 
    confirmPassword: "" 
  });
  const [systemInfo, setSystemInfo] = useState({
    currentSession: new Date().toLocaleString(),
    databaseStatus: "Connected",
    lastBackup: "N/A"
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, feedback: "" });

  const handle = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    
    // Check password strength in real-time for new password
    if (name === "newPassword") {
      checkPasswordStrength(value);
    }
  };

  const checkPasswordStrength = (password) => {
    if (!password) {
      setPasswordStrength({ score: 0, feedback: "" });
      return;
    }

    let score = 0;
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^A-Za-z0-9]/.test(password)
    };

    if (checks.length) score++;
    if (checks.uppercase) score++;
    if (checks.lowercase) score++;
    if (checks.number) score++;
    if (checks.special) score++;

    let feedback = "";
    let color = "";
    
    if (score === 5) {
      feedback = "Strong password";
      color = "text-green-600 dark:text-green-400";
    } else if (score >= 3) {
      feedback = "Medium strength";
      color = "text-yellow-600 dark:text-yellow-400";
    } else {
      feedback = "Weak password";
      color = "text-red-600 dark:text-red-400";
    }

    const missing = [];
    if (!checks.length) missing.push("at least 8 characters");
    if (!checks.uppercase) missing.push("uppercase letter");
    if (!checks.lowercase) missing.push("lowercase letter");
    if (!checks.number) missing.push("number");
    if (!checks.special) missing.push("special character");

    setPasswordStrength({ 
      score, 
      feedback, 
      color,
      missing: missing.length > 0 ? `Missing: ${missing.join(", ")}` : "",
      checks
    });
  };

  const validateForm = () => {
    if (!form.currentPassword) {
      setError("Current password is required");
      return false;
    }
    if (!form.newPassword) {
      setError("New password is required");
      return false;
    }
    if (form.newPassword.length < 8) {
      setError("New password must be at least 8 characters");
      return false;
    }
    if (passwordStrength.score < 5) {
      setError("Password must meet all strength requirements");
      return false;
    }
    if (form.newPassword !== form.confirmPassword) {
      setError("Passwords do not match");
      return false;
    }
    if (form.currentPassword === form.newPassword) {
      setError("New password must be different from current password");
      return false;
    }
    return true;
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!validateForm()) return;

    try {
      setLoading(true);
      
      // Call backend API to update super admin password
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/change-superadmin-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${user?.token}`
        },
        body: JSON.stringify({
          currentPassword: form.currentPassword,
          newPassword: form.newPassword
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to change password");
      }

      setSuccess("Password changed successfully!");
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setPasswordStrength({ score: 0, feedback: "" });
    } catch (err) {
      setError(err.message || "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetch system info on mount
    const loadSystemInfo = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/system-info`, {
          headers: {
            "Authorization": `Bearer ${user?.token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setSystemInfo(data);
        }
      } catch (err) {
        console.error("Failed to load system info:", err);
      }
    };
    
    if (user?.token) loadSystemInfo();
  }, [user?.token]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        {/* Account Information */}
        <div className="rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-4">Account Information</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">Name</label>
              <input 
                type="text" 
                value="Super Admin" 
                disabled 
                className="w-full px-4 py-3 border border-stone-300 dark:border-stone-600 rounded-lg bg-stone-50 dark:bg-slate-800 text-stone-500 dark:text-stone-400 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">Email</label>
              <input 
                type="email" 
                value="wecare@admin.com" 
                disabled 
                className="w-full px-4 py-3 border border-stone-300 dark:border-stone-600 rounded-lg bg-stone-50 dark:bg-slate-800 text-stone-500 dark:text-stone-400 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">Role</label>
              <div className="inline-block px-4 py-2 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-lg font-semibold text-sm">
                System Administrator
              </div>
            </div>
          </div>
        </div>

        {/* Change Password Section */}
        <div className="rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-4">Change Password</h3>
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg text-sm">
              {error}
            </div>
          )}
          
          {success && (
            <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 rounded-lg text-sm">
              {success}
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">Current Password</label>
              <input 
                type="password"
                name="currentPassword"
                value={form.currentPassword}
                onChange={handle}
                placeholder="Enter current password"
                className="w-full px-4 py-3 border border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-slate-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">New Password</label>
              <input 
                type="password"
                name="newPassword"
                value={form.newPassword}
                onChange={handle}
                placeholder="Enter new password"
                className="w-full px-4 py-3 border border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-slate-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                required
              />
              
              {/* Password Strength Indicator */}
              {form.newPassword && (
                <div className="mt-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${
                          passwordStrength.score === 5 ? 'bg-green-500 w-full' :
                          passwordStrength.score >= 3 ? 'bg-yellow-500 w-3/5' :
                          'bg-red-500 w-2/5'
                        }`}
                      />
                    </div>
                    <span className={`text-xs font-semibold ${passwordStrength.color}`}>
                      {passwordStrength.feedback}
                    </span>
                  </div>
                  
                  {/* Password Requirements Checklist */}
                  <div className="space-y-1 text-xs">
                    <div className={`flex items-center gap-2 ${passwordStrength.checks?.length ? 'text-green-600 dark:text-green-400' : 'text-stone-500 dark:text-stone-400'}`}>
                      <span>{passwordStrength.checks?.length ? '✓' : '○'}</span>
                      <span>At least 8 characters</span>
                    </div>
                    <div className={`flex items-center gap-2 ${passwordStrength.checks?.uppercase ? 'text-green-600 dark:text-green-400' : 'text-stone-500 dark:text-stone-400'}`}>
                      <span>{passwordStrength.checks?.uppercase ? '✓' : '○'}</span>
                      <span>One uppercase letter</span>
                    </div>
                    <div className={`flex items-center gap-2 ${passwordStrength.checks?.lowercase ? 'text-green-600 dark:text-green-400' : 'text-stone-500 dark:text-stone-400'}`}>
                      <span>{passwordStrength.checks?.lowercase ? '✓' : '○'}</span>
                      <span>One lowercase letter</span>
                    </div>
                    <div className={`flex items-center gap-2 ${passwordStrength.checks?.number ? 'text-green-600 dark:text-green-400' : 'text-stone-500 dark:text-stone-400'}`}>
                      <span>{passwordStrength.checks?.number ? '✓' : '○'}</span>
                      <span>One number</span>
                    </div>
                    <div className={`flex items-center gap-2 ${passwordStrength.checks?.special ? 'text-green-600 dark:text-green-400' : 'text-stone-500 dark:text-stone-400'}`}>
                      <span>{passwordStrength.checks?.special ? '✓' : '○'}</span>
                      <span>One special character</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">Confirm New Password</label>
              <input 
                type="password"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handle}
                placeholder="Confirm new password"
                className="w-full px-4 py-3 border border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-slate-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                required
              />
              {form.confirmPassword && form.newPassword !== form.confirmPassword && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">Passwords do not match</p>
              )}
            </div>

            <button 
              type="submit"
              disabled={loading || passwordStrength.score < 5 || form.newPassword !== form.confirmPassword}
              className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-red-500 to-rose-600 text-white font-semibold rounded-lg hover:from-red-600 hover:to-rose-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Updating..." : "Update Password"}
            </button>
          </form>
        </div>
      </div>

      {/* System Info Sidebar */}
      <div className="space-y-6">
        <div className="rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-4">System Information</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-stone-50 dark:bg-slate-800/50 rounded-lg">
              <span className="text-sm text-stone-600 dark:text-stone-400">Database</span>
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></span>
                <span className="text-sm font-semibold text-green-600 dark:text-green-400">{systemInfo.databaseStatus}</span>
              </span>
            </div>
            
            <div className="p-3 bg-stone-50 dark:bg-slate-800/50 rounded-lg">
              <span className="block text-xs text-stone-500 dark:text-stone-400 mb-1">Current Session</span>
              <span className="text-sm font-medium text-stone-900 dark:text-stone-100">{systemInfo.currentSession}</span>
            </div>
            
            <div className="p-3 bg-stone-50 dark:bg-slate-800/50 rounded-lg">
              <span className="block text-xs text-stone-500 dark:text-stone-400 mb-1">Last Backup</span>
              <span className="text-sm font-medium text-stone-900 dark:text-stone-100">{systemInfo.lastBackup}</span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-4">Account Status</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 bg-green-500 rounded-full"></span>
              <span className="text-sm text-stone-600 dark:text-stone-300">System Owner</span>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-2">
              This is the primary system administrator account with full access to all features.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminProfile;


