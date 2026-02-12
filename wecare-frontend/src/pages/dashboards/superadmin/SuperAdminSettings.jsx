import { useState, useEffect } from "react";
import { useAuth } from "../../../context/AuthContext";
import { getSystemConfig, updateSystemConfig } from "../../../services/configService";

const SuperAdminSettings = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("system");
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const normalizeNumberInput = (value) => {
    if (value === "") return "";
    const num = Number(value);
    if (Number.isNaN(num)) return "";
    return String(Math.max(0, num));
  };
  
  // System Configuration
  const [platformName, setPlatformName] = useState("WeCare");
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [announcementBanner, setAnnouncementBanner] = useState("");
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  
  // Track original values for unsaved changes detection
  const [originalConfig, setOriginalConfig] = useState({
    maintenanceMode: false,
    announcementBanner: "",
    showAnnouncement: false
  });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Security Settings
  const [sessionTimeout, setSessionTimeout] = useState("24");
  const [minPasswordLength, setMinPasswordLength] = useState("8");
  const [loginAttempts, setLoginAttempts] = useState("5");
  const [lockoutDuration, setLockoutDuration] = useState("30");

  // Load system config on mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await getSystemConfig();
        const initConfig = {
          maintenanceMode: config.maintenanceMode || false,
          announcementBanner: config.announcementBanner || "",
          showAnnouncement: config.showAnnouncement || false
        };
        setMaintenanceMode(initConfig.maintenanceMode);
        setAnnouncementBanner(initConfig.announcementBanner);
        setShowAnnouncement(initConfig.showAnnouncement);
        setOriginalConfig(initConfig);
        setHasUnsavedChanges(false);
        setSessionTimeout(String(config.sessionTimeoutHours ?? sessionTimeout));
        setLoginAttempts(String(config.maxLoginAttempts ?? loginAttempts));
        setLockoutDuration(String(config.lockoutDurationMinutes ?? lockoutDuration));
      } catch (err) {
        console.error("Failed to load system config:", err);
      }
    };
    loadConfig();
  }, []);

  // Track unsaved changes
  useEffect(() => {
    const changed =
      maintenanceMode !== originalConfig.maintenanceMode ||
      announcementBanner !== originalConfig.announcementBanner ||
      showAnnouncement !== originalConfig.showAnnouncement;
    setHasUnsavedChanges(changed);
  }, [maintenanceMode, announcementBanner, showAnnouncement, originalConfig]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleSaveSystemSettings = async () => {
    try {
      setLoading(true);
      setError("");
      await updateSystemConfig(user?.token, {
        maintenanceMode,
        announcementBanner,
        showAnnouncement
      });
      setOriginalConfig({
        maintenanceMode,
        announcementBanner,
        showAnnouncement
      });
      setHasUnsavedChanges(false);
      setSuccess("System settings saved successfully");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save system settings");
      setTimeout(() => setError(""), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSecuritySettings = async () => {
    try {
      setLoading(true);
      setError("");
      await updateSystemConfig(user?.token, {
        sessionTimeoutHours: Number(sessionTimeout) || 0,
        maxLoginAttempts: Number(loginAttempts) || 0,
        lockoutDurationMinutes: Number(lockoutDuration) || 0
      });
      setSuccess("Security settings updated successfully");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save security settings");
      setTimeout(() => setError(""), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tabId) => {
    if (hasUnsavedChanges && activeTab === "system") {
      const confirmLeave = window.confirm("You have unsaved changes. Do you want to leave without saving?");
      if (!confirmLeave) return;
    }
    setActiveTab(tabId);
  };

  const tabs = [
    { id: "system", label: "System" },
    { id: "security", label: "Security" }
  ];

  return (
    <div className="space-y-6">
      {/* Toast Notifications */}
      {error && (
        <div className="fixed top-4 right-4 z-50 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg shadow-lg max-w-md">
          {error}
        </div>
      )}
      {success && (
        <div className="fixed top-4 right-4 z-50 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 rounded-lg shadow-lg max-w-md">
          {success}
        </div>
      )}

      {/* Header */}
      <div className="rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-2">System Settings</h3>
        <p className="text-sm text-stone-600 dark:text-stone-400">Configure platform-wide settings and integrations</p>
      </div>

      {/* Tabs */}
      <div className="rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        <div className="flex overflow-x-auto border-b border-stone-200 dark:border-stone-700">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`px-6 py-3 text-sm font-semibold whitespace-nowrap transition ${
                activeTab === tab.id
                  ? "bg-gradient-to-r from-red-500 to-rose-600 text-white"
                  : "text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* System Configuration */}
          {activeTab === "system" && (
            <div className="space-y-6">
              <div className="opacity-50 pointer-events-none">
                <label className="block text-sm font-semibold text-stone-700 dark:text-stone-300 mb-2">
                  Platform Name
                </label>
                <input
                  type="text"
                  value={platformName}
                  onChange={(e) => setPlatformName(e.target.value)}
                  disabled
                  className="w-full px-4 py-2 border border-stone-300 dark:border-stone-600 rounded-lg bg-stone-100 dark:bg-slate-800 text-stone-500 dark:text-stone-400 cursor-not-allowed focus:outline-none"
                />
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">Hardcoded to "WeCare" - contact developer to change</p>
              </div>

              <div className="flex items-center justify-between p-4 border border-stone-200 dark:border-stone-700 rounded-lg bg-stone-50 dark:bg-slate-800/50">
                <div>
                  <p className="font-semibold text-stone-700 dark:text-stone-300">Maintenance Mode</p>
                  <p className="text-sm text-stone-600 dark:text-stone-400">Only super admin can access the platform. Other users see "Under Maintenance" page</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={maintenanceMode}
                    onChange={(e) => setMaintenanceMode(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-stone-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 dark:peer-focus:ring-red-800 rounded-full peer dark:bg-stone-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-stone-600 peer-checked:bg-gradient-to-r peer-checked:from-red-500 peer-checked:to-rose-600"></div>
                </label>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-stone-700 dark:text-stone-300">
                    Announcement Banner
                  </label>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showAnnouncement}
                      onChange={(e) => setShowAnnouncement(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-stone-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 dark:peer-focus:ring-red-800 rounded-full peer dark:bg-stone-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-stone-600 peer-checked:bg-gradient-to-r peer-checked:from-red-500 peer-checked:to-rose-600"></div>
                  </label>
                </div>
                <p className="text-xs text-stone-600 dark:text-stone-400 mb-2">Display a platform-wide message at the top of every user's dashboard</p>
                <textarea
                  value={announcementBanner}
                  onChange={(e) => setAnnouncementBanner(e.target.value)}
                  rows="3"
                  placeholder="Enter platform-wide announcement message... (e.g., 'Server maintenance scheduled for Feb 15, 10pm-12am EAT')"
                  className="w-full px-4 py-2 border border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-slate-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              {hasUnsavedChanges && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium text-amber-800 dark:text-amber-300">You have unsaved changes</span>
                </div>
              )}

              <button
                onClick={handleSaveSystemSettings}
                disabled={loading}
                className={`w-full sm:w-auto px-6 py-2.5 font-semibold rounded-lg transition ${
                  hasUnsavedChanges
                    ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700 shadow-lg'
                    : 'bg-gradient-to-r from-red-500 to-rose-600 text-white hover:from-red-600 hover:to-rose-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loading ? "Saving..." : hasUnsavedChanges ? "Save Changes" : "Save System Settings"}
              </button>
            </div>
          )}

          {/* Security Settings */}
          {activeTab === "security" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-stone-500 dark:text-stone-400 mb-2">
                    Session Timeout (hours)
                  </label>
                  <input
                    type="number"
                    value={sessionTimeout}
                    onChange={(e) => setSessionTimeout(normalizeNumberInput(e.target.value))}
                    min="0"
                    className="w-full px-4 py-2 border border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-slate-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-stone-500 dark:text-stone-400 mb-2">
                    Minimum Password Length
                  </label>
                  <input
                    type="number"
                    value={minPasswordLength}
                    onChange={(e) => setMinPasswordLength(e.target.value)}
                    disabled
                    className="w-full px-4 py-2 border border-stone-300 dark:border-stone-600 rounded-lg bg-stone-100 dark:bg-slate-800 text-stone-500 dark:text-stone-400 cursor-not-allowed focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-stone-500 dark:text-stone-400 mb-2">
                    Max Login Attempts
                  </label>
                  <input
                    type="number"
                    value={loginAttempts}
                    onChange={(e) => setLoginAttempts(normalizeNumberInput(e.target.value))}
                    min="0"
                    className="w-full px-4 py-2 border border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-slate-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-stone-500 dark:text-stone-400 mb-2">
                    Lockout Duration (minutes)
                  </label>
                  <input
                    type="number"
                    value={lockoutDuration}
                    onChange={(e) => setLockoutDuration(normalizeNumberInput(e.target.value))}
                    min="0"
                    className="w-full px-4 py-2 border border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-slate-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              <div className="p-4 bg-blue-100/50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  <span className="font-semibold">Security Tip:</span> Enabling stricter password policies and session timeouts improves platform security.
                </p>
              </div>

              <button
                onClick={handleSaveSecuritySettings}
                className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-red-500 to-rose-600 text-white hover:from-red-600 hover:to-rose-700 font-semibold rounded-lg transition"
              >
                Save Security Settings
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default SuperAdminSettings;


