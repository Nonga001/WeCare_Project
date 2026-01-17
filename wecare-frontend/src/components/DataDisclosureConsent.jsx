const DataDisclosureConsent = ({ onAccept, onReject }) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-amber-600 to-amber-700 text-white p-6 border-b">
          <h2 className="text-2xl font-bold">📋 Data Collection Notice</h2>
          <p className="text-amber-100 text-sm mt-1">Please read before registering</p>
        </div>

        <div className="p-6 space-y-4 text-slate-700">
          <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded">
            <h3 className="font-semibold text-slate-800 mb-2">What personal data will we collect?</h3>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li><strong>Basic Info:</strong> Name, email, phone, university, password</li>
              <li><strong>Students:</strong> Student ID, academic email, course, year, documents</li>
              <li><strong>Donors:</strong> Organization name, donation preferences</li>
              <li><strong>All Users:</strong> Account status, last active time</li>
            </ul>
          </div>

          <div className="bg-green-50 border-l-4 border-green-600 p-4 rounded">
            <h3 className="font-semibold text-slate-800 mb-2">Why do we collect this data?</h3>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>✓ To create and manage your account securely</li>
              <li>✓ To verify your identity and prevent fraud</li>
              <li>✓ To match students with donors and aid</li>
              <li>✓ To send notifications about your account</li>
              <li>✓ To process payments and donations</li>
            </ul>
          </div>

          <div className="bg-purple-50 border-l-4 border-purple-600 p-4 rounded">
            <h3 className="font-semibold text-slate-800 mb-2">Who will have access?</h3>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>✓ You (can view your own data)</li>
              <li>✓ University admins (student documents for verification)</li>
              <li>✓ Super admins (system-wide anonymized statistics)</li>
              <li>✗ Other students/donors (NOT shared)</li>
              <li>✗ Third parties (except payment processors)</li>
            </ul>
          </div>

          <div className="bg-red-50 border-l-4 border-red-600 p-4 rounded">
            <h3 className="font-semibold text-slate-800 mb-2">⚠️ Important:</h3>
            <p className="text-sm">
              By clicking <strong>I Accept</strong>, you consent to:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Collection of your personal data as described above</li>
                <li>Use of your data for platform operation and verification</li>
                <li>Your university admin viewing your documents if you're a student</li>
                <li>Secure storage and protection of your information</li>
              </ul>
            </p>
          </div>

          <div className="bg-slate-100 p-4 rounded text-sm">
            <p><strong>Need more details?</strong></p>
            <p className="text-slate-600">Read our full <a href="/privacy-policy" className="text-amber-600 font-semibold hover:underline">Privacy Policy</a> and <a href="/terms-and-conditions" className="text-amber-600 font-semibold hover:underline">Terms & Conditions</a></p>
          </div>
        </div>

        <div className="bg-slate-50 px-6 py-4 border-t flex gap-3 justify-end">
          <button
            onClick={onReject}
            className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-100 transition"
          >
            I Don't Consent
          </button>
          <button
            onClick={onAccept}
            className="px-4 py-2 rounded-lg bg-amber-600 text-white font-medium hover:bg-amber-700 transition"
          >
            I Accept & Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default DataDisclosureConsent;
