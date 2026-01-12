import { useState, useEffect } from "react";
import { useAuth } from "../../../context/AuthContext";

const SuperAdminSettings = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("system");
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  
  // System Configuration
  const [platformName, setPlatformName] = useState("WeCare");
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [announcementBanner, setAnnouncementBanner] = useState("");
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  
  // Security Settings
  const [sessionTimeout, setSessionTimeout] = useState("24");
  const [minPasswordLength, setMinPasswordLength] = useState("8");
  const [loginAttempts, setLoginAttempts] = useState("5");
  const [lockoutDuration, setLockoutDuration] = useState("30");
  
  // Donation Limits
  const [minDonation, setMinDonation] = useState("100");
  const [maxDonation, setMaxDonation] = useState("1000000");
  const [transactionFee, setTransactionFee] = useState("0");
  
  // Payment Integration
  const [mpesaConsumerKey, setMpesaConsumerKey] = useState("");
  const [mpesaConsumerSecret, setMpesaConsumerSecret] = useState("");
  const [mpesaShortcode, setMpesaShortcode] = useState("");
  const [mpesaPasskey, setMpesaPasskey] = useState("");
  
  // Notification Settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [systemAlertEmail, setSystemAlertEmail] = useState("");
  
  // Approval Rules
  const [autoApproveStudents, setAutoApproveStudents] = useState(false);
  const [requireDocumentVerification, setRequireDocumentVerification] = useState(true);
  const [aidRequestThreshold, setAidRequestThreshold] = useState("50000");

  const handleSaveSystemSettings = () => {
    setSuccess("System settings saved successfully");
    setTimeout(() => setSuccess(""), 3000);
  };

  const handleSaveSecuritySettings = () => {
    setSuccess("Security settings updated successfully");
    setTimeout(() => setSuccess(""), 3000);
  };

  const handleSavePaymentSettings = () => {
    setSuccess("Payment settings saved successfully");
    setTimeout(() => setSuccess(""), 3000);
  };

  const handleSaveNotificationSettings = () => {
    setSuccess("Notification settings updated successfully");
    setTimeout(() => setSuccess(""), 3000);
  };

  const handleSaveApprovalRules = () => {
    setSuccess("Approval rules updated successfully");
    setTimeout(() => setSuccess(""), 3000);
  };

  const tabs = [
    { id: "system", label: "System" },
    { id: "security", label: "Security" },
    { id: "payments", label: "Payments" },
    { id: "notifications", label: "Notifications" },
    { id: "approvals", label: "Approvals" },
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
              onClick={() => setActiveTab(tab.id)}
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
            <div className="space-y-6 opacity-50 pointer-events-none">
              <div>
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
              </div>

              <div className="flex items-center justify-between p-4 border border-stone-200 dark:border-stone-700 rounded-lg bg-stone-50 dark:bg-slate-800/50">
                <div>
                  <p className="font-semibold text-stone-500 dark:text-stone-400">Maintenance Mode</p>
                  <p className="text-sm text-stone-500 dark:text-stone-400">Disable platform access for all users except super admin</p>
                </div>
                <label className="relative inline-flex items-center cursor-not-allowed">
                  <input
                    type="checkbox"
                    checked={maintenanceMode}
                    onChange={(e) => setMaintenanceMode(e.target.checked)}
                    disabled
                    className="sr-only peer cursor-not-allowed"
                  />
                  <div className="w-11 h-6 bg-stone-300 peer-focus:outline-none rounded-full peer dark:bg-stone-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-stone-600"></div>
                </label>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-stone-500 dark:text-stone-400">
                    Announcement Banner
                  </label>
                  <label className="relative inline-flex items-center cursor-not-allowed">
                    <input
                      type="checkbox"
                      checked={showAnnouncement}
                      onChange={(e) => setShowAnnouncement(e.target.checked)}
                      disabled
                      className="sr-only peer cursor-not-allowed"
                    />
                    <div className="w-11 h-6 bg-stone-300 peer-focus:outline-none rounded-full peer dark:bg-stone-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-stone-600"></div>
                  </label>
                </div>
                <textarea
                  value={announcementBanner}
                  onChange={(e) => setAnnouncementBanner(e.target.value)}
                  rows="3"
                  placeholder="Enter platform-wide announcement message..."
                  disabled
                  className="w-full px-4 py-2 border border-stone-300 dark:border-stone-600 rounded-lg bg-stone-100 dark:bg-slate-800 text-stone-500 dark:text-stone-400 cursor-not-allowed focus:outline-none"
                />
              </div>

              <button
                onClick={handleSaveSystemSettings}
                disabled
                className="w-full sm:w-auto px-6 py-2.5 bg-stone-300 dark:bg-stone-700 text-stone-500 dark:text-stone-400 font-semibold rounded-lg cursor-not-allowed"
              >
                Save System Settings
              </button>
            </div>
          )}

          {/* Security Settings */}
          {activeTab === "security" && (
            <div className="space-y-6 opacity-50 pointer-events-none">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-stone-500 dark:text-stone-400 mb-2">
                    Session Timeout (hours)
                  </label>
                  <input
                    type="number"
                    value={sessionTimeout}
                    onChange={(e) => setSessionTimeout(e.target.value)}
                    disabled
                    className="w-full px-4 py-2 border border-stone-300 dark:border-stone-600 rounded-lg bg-stone-100 dark:bg-slate-800 text-stone-500 dark:text-stone-400 cursor-not-allowed focus:outline-none"
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
                    onChange={(e) => setLoginAttempts(e.target.value)}
                    disabled
                    className="w-full px-4 py-2 border border-stone-300 dark:border-stone-600 rounded-lg bg-stone-100 dark:bg-slate-800 text-stone-500 dark:text-stone-400 cursor-not-allowed focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-stone-500 dark:text-stone-400 mb-2">
                    Lockout Duration (minutes)
                  </label>
                  <input
                    type="number"
                    value={lockoutDuration}
                    onChange={(e) => setLockoutDuration(e.target.value)}
                    disabled
                    className="w-full px-4 py-2 border border-stone-300 dark:border-stone-600 rounded-lg bg-stone-100 dark:bg-slate-800 text-stone-500 dark:text-stone-400 cursor-not-allowed focus:outline-none"
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
                disabled
                className="w-full sm:w-auto px-6 py-2.5 bg-stone-300 dark:bg-stone-700 text-stone-500 dark:text-stone-400 font-semibold rounded-lg cursor-not-allowed"
              >
                Save Security Settings
              </button>
            </div>
          )}

          {/* Payment Settings */}
          {activeTab === "payments" && (
            <div className="space-y-6 opacity-50 pointer-events-none">
              <div>
                <h4 className="font-semibold text-stone-500 dark:text-stone-400 mb-4">Donation Limits</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-stone-500 dark:text-stone-400 mb-2">
                      Minimum (KES)
                    </label>
                    <input
                      type="number"
                      value={minDonation}
                      onChange={(e) => setMinDonation(e.target.value)}
                      disabled
                      className="w-full px-4 py-2 border border-stone-300 dark:border-stone-600 rounded-lg bg-stone-100 dark:bg-slate-800 text-stone-500 dark:text-stone-400 cursor-not-allowed focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-stone-500 dark:text-stone-400 mb-2">
                      Maximum (KES)
                    </label>
                    <input
                      type="number"
                      value={maxDonation}
                      onChange={(e) => setMaxDonation(e.target.value)}
                      disabled
                      className="w-full px-4 py-2 border border-stone-300 dark:border-stone-600 rounded-lg bg-stone-100 dark:bg-slate-800 text-stone-500 dark:text-stone-400 cursor-not-allowed focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-stone-500 dark:text-stone-400 mb-2">
                      Transaction Fee (%)
                    </label>
                    <input
                      type="number"
                      value={transactionFee}
                      onChange={(e) => setTransactionFee(e.target.value)}
                      step="0.1"
                      disabled
                      className="w-full px-4 py-2 border border-stone-300 dark:border-stone-600 rounded-lg bg-stone-100 dark:bg-slate-800 text-stone-500 dark:text-stone-400 cursor-not-allowed focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-stone-200 dark:border-stone-700 pt-6">
                <h4 className="font-semibold text-stone-500 dark:text-stone-400 mb-4">M-Pesa Integration</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-stone-500 dark:text-stone-400 mb-2">
                      Consumer Key
                    </label>
                    <input
                      type="password"
                      value={mpesaConsumerKey}
                      onChange={(e) => setMpesaConsumerKey(e.target.value)}
                      placeholder="Enter M-Pesa consumer key"
                      disabled
                      className="w-full px-4 py-2 border border-stone-300 dark:border-stone-600 rounded-lg bg-stone-100 dark:bg-slate-800 text-stone-500 dark:text-stone-400 cursor-not-allowed focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-stone-500 dark:text-stone-400 mb-2">
                      Consumer Secret
                    </label>
                    <input
                      type="password"
                      value={mpesaConsumerSecret}
                      onChange={(e) => setMpesaConsumerSecret(e.target.value)}
                      placeholder="Enter M-Pesa consumer secret"
                      disabled
                      className="w-full px-4 py-2 border border-stone-300 dark:border-stone-600 rounded-lg bg-stone-100 dark:bg-slate-800 text-stone-500 dark:text-stone-400 cursor-not-allowed focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-stone-500 dark:text-stone-400 mb-2">
                        Business Shortcode
                      </label>
                      <input
                        type="text"
                        value={mpesaShortcode}
                        onChange={(e) => setMpesaShortcode(e.target.value)}
                        placeholder="e.g., 174379"
                        disabled
                        className="w-full px-4 py-2 border border-stone-300 dark:border-stone-600 rounded-lg bg-stone-100 dark:bg-slate-800 text-stone-500 dark:text-stone-400 cursor-not-allowed focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-stone-500 dark:text-stone-400 mb-2">
                        Passkey
                      </label>
                      <input
                        type="password"
                        value={mpesaPasskey}
                        onChange={(e) => setMpesaPasskey(e.target.value)}
                        placeholder="Enter passkey"
                        disabled
                        className="w-full px-4 py-2 border border-stone-300 dark:border-stone-600 rounded-lg bg-stone-100 dark:bg-slate-800 text-stone-500 dark:text-stone-400 cursor-not-allowed focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={handleSavePaymentSettings}
                disabled
                className="w-full sm:w-auto px-6 py-2.5 bg-stone-300 dark:bg-stone-700 text-stone-500 dark:text-stone-400 font-semibold rounded-lg cursor-not-allowed"
              >
                Save Payment Settings
              </button>
            </div>
          )}

          {/* Notification Settings */}
          {activeTab === "notifications" && (
            <div className="space-y-6 opacity-50 pointer-events-none">
              <div className="flex items-center justify-between p-4 border border-stone-200 dark:border-stone-700 rounded-lg bg-stone-50 dark:bg-slate-800/50">
                <div>
                  <p className="font-semibold text-stone-500 dark:text-stone-400">Email Notifications</p>
                  <p className="text-sm text-stone-500 dark:text-stone-400">Send email notifications for important events</p>
                </div>
                <label className="relative inline-flex items-center cursor-not-allowed">
                  <input
                    type="checkbox"
                    checked={emailNotifications}
                    onChange={(e) => setEmailNotifications(e.target.checked)}
                    disabled
                    className="sr-only peer cursor-not-allowed"
                  />
                  <div className="w-11 h-6 bg-stone-300 peer-focus:outline-none rounded-full peer dark:bg-stone-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-stone-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 border border-stone-200 dark:border-stone-700 rounded-lg bg-stone-50 dark:bg-slate-800/50">
                <div>
                  <p className="font-semibold text-stone-500 dark:text-stone-400">SMS Notifications</p>
                  <p className="text-sm text-stone-500 dark:text-stone-400">Send SMS for critical alerts (requires SMS provider)</p>
                </div>
                <label className="relative inline-flex items-center cursor-not-allowed">
                  <input
                    type="checkbox"
                    checked={smsNotifications}
                    onChange={(e) => setSmsNotifications(e.target.checked)}
                    disabled
                    className="sr-only peer cursor-not-allowed"
                  />
                  <div className="w-11 h-6 bg-stone-300 peer-focus:outline-none rounded-full peer dark:bg-stone-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-stone-600"></div>
                </label>
              </div>

              <div>
                <label className="block text-sm font-semibold text-stone-500 dark:text-stone-400 mb-2">
                  System Alert Email
                </label>
                <input
                  type="email"
                  value={systemAlertEmail}
                  onChange={(e) => setSystemAlertEmail(e.target.value)}
                  placeholder="admin@wecare.com"
                  disabled
                  className="w-full px-4 py-2 border border-stone-300 dark:border-stone-600 rounded-lg bg-stone-100 dark:bg-slate-800 text-stone-500 dark:text-stone-400 cursor-not-allowed focus:outline-none"
                />
                <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">
                  Critical system alerts will be sent to this email address
                </p>
              </div>

              <button
                onClick={handleSaveNotificationSettings}
                disabled
                className="w-full sm:w-auto px-6 py-2.5 bg-stone-300 dark:bg-stone-700 text-stone-500 dark:text-stone-400 font-semibold rounded-lg cursor-not-allowed"
              >
                Save Notification Settings
              </button>
            </div>
          )}

          {/* Approval Rules */}
          {activeTab === "approvals" && (
            <div className="space-y-6 opacity-50 pointer-events-none">
              <div className="flex items-center justify-between p-4 border border-stone-200 dark:border-stone-700 rounded-lg bg-stone-50 dark:bg-slate-800/50">
                <div>
                  <p className="font-semibold text-stone-500 dark:text-stone-400">Auto-approve Students</p>
                  <p className="text-sm text-stone-500 dark:text-stone-400">Automatically approve student registrations from verified universities</p>
                </div>
                <label className="relative inline-flex items-center cursor-not-allowed">
                  <input
                    type="checkbox"
                    checked={autoApproveStudents}
                    onChange={(e) => setAutoApproveStudents(e.target.checked)}
                    disabled
                    className="sr-only peer cursor-not-allowed"
                  />
                  <div className="w-11 h-6 bg-stone-300 peer-focus:outline-none rounded-full peer dark:bg-stone-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-stone-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 border border-stone-200 dark:border-stone-700 rounded-lg bg-stone-50 dark:bg-slate-800/50">
                <div>
                  <p className="font-semibold text-stone-500 dark:text-stone-400">Require Document Verification</p>
                  <p className="text-sm text-stone-500 dark:text-stone-400">Students must upload ID/student documents for approval</p>
                </div>
                <label className="relative inline-flex items-center cursor-not-allowed">
                  <input
                    type="checkbox"
                    checked={requireDocumentVerification}
                    onChange={(e) => setRequireDocumentVerification(e.target.checked)}
                    disabled
                    className="sr-only peer cursor-not-allowed"
                  />
                  <div className="w-11 h-6 bg-stone-300 peer-focus:outline-none rounded-full peer dark:bg-stone-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-stone-600"></div>
                </label>
              </div>

              <div>
                <label className="block text-sm font-semibold text-stone-500 dark:text-stone-400 mb-2">
                  Aid Request Approval Threshold (KES)
                </label>
                <input
                  type="number"
                  value={aidRequestThreshold}
                  onChange={(e) => setAidRequestThreshold(e.target.value)}
                  disabled
                  className="w-full px-4 py-2 border border-stone-300 dark:border-stone-600 rounded-lg bg-stone-100 dark:bg-slate-800 text-stone-500 dark:text-stone-400 cursor-not-allowed focus:outline-none"
                />
                <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">
                  Aid requests above this amount require super admin approval
                </p>
              </div>

              <button
                onClick={handleSaveApprovalRules}
                disabled
                className="w-full sm:w-auto px-6 py-2.5 bg-stone-300 dark:bg-stone-700 text-stone-500 dark:text-stone-400 font-semibold rounded-lg cursor-not-allowed"
              >
                Save Approval Rules
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SuperAdminSettings;


