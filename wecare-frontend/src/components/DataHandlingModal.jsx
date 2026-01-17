import { useState } from "react";

// Icon components
const LockIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
  </svg>
);

const AnalyticsIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
    <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
  </svg>
);

const ShareIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
    <path d="M15 8a3 3 0 11-6 0 3 3 0 016 0zM12.935 13H8.946a6.001 6.001 0 00-5.386 3.154A6 6 0 006 19h12a6 6 0 00.367-8.846A6.001 6.001 0 0012.935 13z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
  </svg>
);

const XIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
  </svg>
);

const AlertIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
  </svg>
);

const DataHandlingModal = ({ onAccept, onReject }) => {
  const [activeTab, setActiveTab] = useState("storage");
  const [agreed, setAgreed] = useState(false);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 border-b-4 border-blue-800">
          <h2 className="text-2xl font-bold">How We Handle Your Data</h2>
          <p className="text-blue-100 mt-1">Before proceeding, please review our data practices</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab("storage")}
            className={`flex-1 px-6 py-3 font-medium transition flex items-center justify-center gap-2 ${
              activeTab === "storage"
                ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <LockIcon />
            Storage
          </button>
          <button
            onClick={() => setActiveTab("usage")}
            className={`flex-1 px-6 py-3 font-medium transition flex items-center justify-center gap-2 ${
              activeTab === "usage"
                ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <AnalyticsIcon />
            Usage
          </button>
          <button
            onClick={() => setActiveTab("sharing")}
            className={`flex-1 px-6 py-3 font-medium transition flex items-center justify-center gap-2 ${
              activeTab === "sharing"
                ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <ShareIcon />
            Sharing
          </button>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Storage */}
          {activeTab === "storage" && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <LockIcon />
                How We Store Your Data
              </h3>
              
              <div className="bg-green-50 border-l-4 border-green-600 p-4 rounded">
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <CheckIcon />
                  Security Measures
                </h4>
                <ul className="space-y-2 text-gray-700 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckIcon />
                    <span><strong>Password Encryption:</strong> bcryptjs hashing - 10 salt rounds</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckIcon />
                    <span><strong>HTTPS/TLS:</strong> All data encrypted in transit</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckIcon />
                    <span><strong>Database:</strong> MongoDB Atlas with encryption at rest</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckIcon />
                    <span><strong>Access Control:</strong> Role-based permissions</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckIcon />
                    <span><strong>Backups:</strong> Daily automated backups</span>
                  </li>
                </ul>
              </div>

              <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded">
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <AnalyticsIcon />
                  Where Data is Stored
                </h4>
                <p className="text-gray-700 text-sm mb-2">
                  Your personal data is stored on <strong>MongoDB Atlas</strong>, a secure cloud database platform. Server locations may include:
                </p>
                <ul className="list-disc list-inside text-gray-700 text-sm space-y-1">
                  <li>United States</li>
                  <li>Europe</li>
                  <li>Asia-Pacific regions</li>
                </ul>
              </div>

              <div className="bg-amber-50 border-l-4 border-amber-600 p-4 rounded">
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <AlertIcon />
                  Data Retention
                </h4>
                <p className="text-gray-700 text-sm">
                  <strong>Active Account:</strong> Data retained for as long as your account is active<br/>
                  <strong>Deleted Account:</strong> Removed within 30 days (except transaction records kept 7 years for compliance)
                </p>
              </div>
            </div>
          )}

          {/* Usage */}
          {activeTab === "usage" && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <AnalyticsIcon />
                How We Use Your Data
              </h3>
              
              <div className="bg-purple-50 border-l-4 border-purple-600 p-4 rounded">
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <CheckIcon />
                  Core Service Functions
                </h4>
                <ul className="space-y-2 text-gray-700 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckIcon />
                    <span>Process and verify aid requests</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckIcon />
                    <span>Process donations and payments</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckIcon />
                    <span>Maintain account security and prevent fraud</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckIcon />
                    <span>Send notifications and communications</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckIcon />
                    <span>Verify eligibility for aid programs</span>
                  </li>
                </ul>
              </div>

              <div className="bg-indigo-50 border-l-4 border-indigo-600 p-4 rounded">
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <AnalyticsIcon />
                  Analytics & Improvement
                </h4>
                <ul className="space-y-2 text-gray-700 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckIcon />
                    <span>Generate platform usage reports</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckIcon />
                    <span>Identify user experience issues</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckIcon />
                    <span>Detect security threats and fraud patterns</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckIcon />
                    <span>Optimize system performance</span>
                  </li>
                </ul>
              </div>

              <div className="bg-red-50 border-l-4 border-red-600 p-4 rounded">
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <AlertIcon />
                  Legal Obligations
                </h4>
                <p className="text-gray-700 text-sm">
                  We may use your data to comply with laws, court orders, and government requests when legally required.
                </p>
              </div>

              <p className="text-gray-700 text-sm italic mt-4 flex items-start gap-2">
                <AlertIcon />
                <span><strong>We do NOT:</strong> Sell your data, share with marketers, or use for commercial purposes without your consent</span>
              </p>
            </div>
          )}

          {/* Sharing */}
          {activeTab === "sharing" && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <ShareIcon />
                How We Share Your Data
              </h3>
              
              <div className="bg-yellow-50 border border-yellow-300 p-4 rounded mb-4 flex items-start gap-3">
                <AlertIcon />
                <p className="text-gray-900 font-semibold">
                  We minimize data sharing and only share when necessary for service delivery
                </p>
              </div>

              <div className="bg-green-50 border-l-4 border-green-600 p-4 rounded">
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <CheckIcon />
                  We Share With:
                </h4>
                <ul className="space-y-3 text-gray-700 text-sm">
                  <li>
                    <strong>University Staff (Admins):</strong> Can view your profile and documents for verification only
                  </li>
                  <li>
                    <strong>Your University (Verification):</strong> Basic data (name, student ID) to verify eligibility
                  </li>
                  <li>
                    <strong>Payment Processors:</strong> Only donation/transaction info for processing
                  </li>
                  <li>
                    <strong>Email Service Providers:</strong> Only for sending notifications
                  </li>
                  <li>
                    <strong>Government/Legal:</strong> Only when legally required by law
                  </li>
                </ul>
              </div>

              <div className="bg-red-50 border-l-4 border-red-600 p-4 rounded">
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <XIcon />
                  We DO NOT Share:
                </h4>
                <ul className="space-y-2 text-gray-700 text-sm">
                  <li className="flex items-start gap-2">
                    <XIcon />
                    <span>Your password or encrypted credentials</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <XIcon />
                    <span>Personal details with third-party marketers</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <XIcon />
                    <span>Donor info with students (or vice versa)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <XIcon />
                    <span>Your data for commercial purposes</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <XIcon />
                    <span>Any identifying information without permission</span>
                  </li>
                </ul>
              </div>

              <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded">
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <LockIcon />
                  Your Control
                </h4>
                <p className="text-gray-700 text-sm">
                  You can manage sharing preferences in your account settings. You can opt-out of non-essential communications at any time.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Consent & Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-6 space-y-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-1 w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-gray-700">
              <strong>I have read and understood</strong> how WeCare stores, uses, and shares my data. I acknowledge that my data will be processed according to this privacy policy and give my <strong>informed consent</strong> to proceed.
            </span>
          </label>

          <div className="flex gap-3">
            <button
              onClick={onReject}
              className="flex-1 px-6 py-3 bg-gray-200 text-gray-800 font-medium rounded-lg hover:bg-gray-300 transition"
            >
              Decline & Exit
            </button>
            <button
              onClick={onAccept}
              disabled={!agreed}
              className="flex-1 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              I Agree & Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataHandlingModal;
