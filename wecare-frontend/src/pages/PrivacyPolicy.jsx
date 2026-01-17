const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-12">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-4xl font-bold text-slate-800 mb-2">Privacy Policy & Data Collection</h1>
        <p className="text-slate-600 mb-8">Last updated: January 17, 2026</p>

        <div className="space-y-8">
          {/* Section 1 */}
          <section>
            <h2 className="text-2xl font-bold text-slate-800 mb-4">1. Personal Data We Collect</h2>
            <p className="text-slate-700 mb-4">WeCare collects and processes the following personal data:</p>
            
            <div className="bg-amber-50 border-l-4 border-amber-600 p-4 mb-4">
              <h3 className="font-semibold text-slate-800 mb-2">For All Users (Students, Donors, Admins):</h3>
              <ul className="list-disc list-inside space-y-1 text-slate-700">
                <li><strong>Full Name</strong> - Required to identify you in the system</li>
                <li><strong>Email Address</strong> - Used for account access and notifications</li>
                <li><strong>Phone Number</strong> - Used for contact and M-Pesa payments (for donors)</li>
                <li><strong>Password (hashed)</strong> - Securely stored, never visible to staff</li>
                <li><strong>University/Organization</strong> - To organize users by institution</li>
                <li><strong>Account Status</strong> - Whether approved, suspended, or pending verification</li>
                <li><strong>Last Active Timestamp</strong> - To track platform usage</li>
              </ul>
            </div>

            <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mb-4">
              <h3 className="font-semibold text-slate-800 mb-2">For Students Only:</h3>
              <ul className="list-disc list-inside space-y-1 text-slate-700">
                <li><strong>Student ID</strong> - Unique identifier from your university</li>
                <li><strong>Student Email (.ac.ke)</strong> - Academic email for verification</li>
                <li><strong>Course Name</strong> - Your field of study</li>
                <li><strong>Year of Study</strong> - Current academic year</li>
                <li><strong>Child Details</strong> - Information about dependents (if applicable)</li>
                <li><strong>Student Card/Admission Letter</strong> - Document for verification</li>
                <li><strong>Profile Submission Status</strong> - Whether your profile was submitted for approval</li>
              </ul>
            </div>

            <div className="bg-green-50 border-l-4 border-green-600 p-4 mb-4">
              <h3 className="font-semibold text-slate-800 mb-2">For Donors Only:</h3>
              <ul className="list-disc list-inside space-y-1 text-slate-700">
                <li><strong>Organization Name</strong> - Your organization or company name</li>
                <li><strong>Donor Type</strong> - Individual or corporate</li>
                <li><strong>Donation Preferences</strong> - Monthly or occasional giving</li>
                <li><strong>Contact Person (if corporate)</strong> - Name of authorized contact</li>
                <li><strong>CSR Focus Area (if corporate)</strong> - Your social responsibility focus</li>
                <li><strong>Donation History</strong> - All donations made through the platform</li>
              </ul>
            </div>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-2xl font-bold text-slate-800 mb-4">2. Why We Collect This Data</h2>
            <div className="space-y-3 text-slate-700">
              <p><strong>✓ Essential for Platform Function:</strong> Name, email, and password are required to create and secure your account.</p>
              <p><strong>✓ Verification & Safety:</strong> Student documents are collected to verify your identity and ensure platform integrity.</p>
              <p><strong>✓ Aid Distribution:</strong> Phone numbers enable M-Pesa payments for donors and aid recipients.</p>
              <p><strong>✓ Organization:</strong> University and organization fields help us organize users and match aid with appropriate recipients.</p>
              <p><strong>✓ Communication:</strong> Your phone and email enable notifications, approvals, and urgent alerts.</p>
              <p><strong>✓ Analytics & Improvement:</strong> Last active data helps us understand platform usage and identify issues.</p>
            </div>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-2xl font-bold text-slate-800 mb-4">3. How Your Data is Stored & Protected</h2>
            <div className="space-y-3 text-slate-700">
              <p><strong>🔒 Encryption:</strong> All passwords are hashed with bcryptjs before storage. Sensitive data is encrypted in transit (HTTPS).</p>
              <p><strong>🔒 Database Security:</strong> Your data is stored in MongoDB Atlas with secure authentication.</p>
              <p><strong>🔒 Access Control:</strong> Only authorized staff can view student verification documents and personal details.</p>
              <p><strong>🔒 File Storage:</strong> Uploaded documents are stored in a protected uploads folder with restricted access.</p>
              <p><strong>🔒 Session Management:</strong> JWT tokens expire after a set period for security.</p>
            </div>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-2xl font-bold text-slate-800 mb-4">4. Who Has Access to Your Data</h2>
            <table className="w-full border-collapse border border-slate-300 text-slate-700">
              <thead className="bg-slate-200">
                <tr>
                  <th className="border border-slate-300 p-3 text-left">User Type</th>
                  <th className="border border-slate-300 p-3 text-left">Can See</th>
                  <th className="border border-slate-300 p-3 text-left">Cannot See</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-slate-300 p-3 font-semibold">Student</td>
                  <td className="border border-slate-300 p-3">Their own profile, submissions, aid status</td>
                  <td className="border border-slate-300 p-3">Other students' data, donation amounts</td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="border border-slate-300 p-3 font-semibold">Donor</td>
                  <td className="border border-slate-300 p-3">Their profile, donation history, general statistics</td>
                  <td className="border border-slate-300 p-3">Student personal details (only name/course)</td>
                </tr>
                <tr>
                  <td className="border border-slate-300 p-3 font-semibold">Admin</td>
                  <td className="border border-slate-300 p-3">Student verification documents, profiles, within their university only</td>
                  <td className="border border-slate-300 p-3">Students from other universities, staff passwords</td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="border border-slate-300 p-3 font-semibold">Super Admin</td>
                  <td className="border border-slate-300 p-3">System-wide analytics, all user statistics (anonymized where possible)</td>
                  <td className="border border-slate-300 p-3">Individual student documents (admins review these)</td>
                </tr>
              </tbody>
            </table>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-2xl font-bold text-slate-800 mb-4">5. Your Rights & Control</h2>
            <div className="space-y-3 text-slate-700">
              <p><strong>✏️ Right to Update:</strong> You can update your profile information at any time in your dashboard.</p>
              <p><strong>✏️ Right to Access:</strong> You can view all your personal data stored in the system.</p>
              <p><strong>✏️ Right to Delete:</strong> Contact support to request account deletion (note: historical donation/aid records may be retained for audit purposes).</p>
              <p><strong>✏️ Right to Privacy:</strong> You can control notification preferences in your settings.</p>
              <p><strong>✏️ No Sharing Without Consent:</strong> We will not share your data with third parties without explicit permission.</p>
            </div>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-2xl font-bold text-slate-800 mb-4">6. Data Retention</h2>
            <div className="space-y-3 text-slate-700">
              <p><strong>Active Account Data:</strong> Kept as long as your account is active.</p>
              <p><strong>Deleted Account Data:</strong> Removed within 30 days of deletion request, except:</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Transaction records (kept for 7 years for compliance)</li>
                <li>Audit logs (kept for 2 years)</li>
              </ul>
            </div>
          </section>

          {/* Section 7 */}
          <section>
            <h2 className="text-2xl font-bold text-slate-800 mb-4">7. Contact & Support</h2>
            <p className="text-slate-700 mb-4">If you have questions about your privacy or want to exercise your rights:</p>
            <div className="bg-amber-50 p-4 rounded border border-amber-200">
              <p className="text-slate-800"><strong>Email:</strong> privacy@wecare.app</p>
              <p className="text-slate-800"><strong>Response Time:</strong> Within 7 business days</p>
            </div>
          </section>

          {/* Acknowledgment */}
          <section className="bg-green-50 border-l-4 border-green-600 p-6 rounded">
            <p className="text-slate-800">
              <strong>By using WeCare, you acknowledge that you have read this privacy policy and understand how your data is collected, stored, and used.</strong>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
