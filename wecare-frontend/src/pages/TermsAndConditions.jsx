const TermsAndConditions = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-12">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-4xl font-bold text-slate-800 mb-2">Terms & Conditions</h1>
        <p className="text-slate-600 mb-8">Last updated: January 17, 2026</p>

        <div className="space-y-8">
          {/* Section 1 */}
          <section>
            <h2 className="text-2xl font-bold text-slate-800 mb-4">1. Platform Purpose & Eligibility</h2>
            <div className="space-y-3 text-slate-700">
              <p><strong>What is WeCare?</strong> WeCare is a platform designed to connect student mothers with donors and universities to provide emergency aid and support.</p>
              <p><strong>Who can use WeCare?</strong></p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Students must be enrolled in a participating Kenyan university and be 18+ years old</li>
                <li>Donors can be individuals or organizations willing to contribute to the cause</li>
                <li>Admins must be authorized representatives of participating universities</li>
              </ul>
            </div>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-2xl font-bold text-slate-800 mb-4">2. User Responsibilities</h2>
            <div className="space-y-3 text-slate-700">
              <p><strong>You agree to:</strong></p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Provide accurate, truthful information during registration</li>
                <li>Keep your password confidential and secure</li>
                <li>Report any unauthorized account access immediately</li>
                <li>Use the platform only for its intended purpose</li>
                <li>Not harass, threaten, or defame other users</li>
                <li>Not attempt to hack or exploit the system</li>
              </ul>
            </div>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-2xl font-bold text-slate-800 mb-4">3. Data Collection & Consent</h2>
            <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mb-4">
              <p className="text-slate-800 font-semibold mb-2">📋 By registering, you consent to:</p>
              <ul className="list-disc list-inside space-y-2 text-slate-700">
                <li>Collection of personal information as outlined in our Privacy Policy</li>
                <li>Use of your data for platform operation, verification, and communication</li>
                <li>Your data being accessed by relevant admins/staff for verification purposes</li>
                <li>Receiving notifications about your account and aid status</li>
                <li>Anonymous statistical analysis for platform improvement</li>
              </ul>
            </div>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-2xl font-bold text-slate-800 mb-4">4. For Students</h2>
            <div className="space-y-3 text-slate-700">
              <p><strong>Profile Verification:</strong> Your profile must be verified by a university admin before you can receive aid. Incomplete or false information may result in denial.</p>
              <p><strong>Document Upload:</strong> Student ID and admission letter are required for verification. These documents will be reviewed by authorized staff only.</p>
              <p><strong>Aid Eligibility:</strong> You must be in good academic standing (as determined by your university) to receive aid.</p>
              <p><strong>Honest Requests:</strong> Aid requests must be truthful. False or fraudulent requests may result in permanent suspension.</p>
            </div>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-2xl font-bold text-slate-800 mb-4">5. For Donors</h2>
            <div className="space-y-3 text-slate-700">
              <p><strong>Donation Processing:</strong> Donations are processed via M-Pesa or other secure payment methods. WeCare is not liable for payment gateway failures.</p>
              <p><strong>Donation Records:</strong> All donations are recorded for transparency and compliance purposes.</p>
              <p><strong>No Refunds:</strong> Donations are final and cannot be refunded once processed, unless there's a system error.</p>
              <p><strong>Donor Privacy:</strong> Donation amounts are kept confidential and not shared with students receiving aid.</p>
            </div>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-2xl font-bold text-slate-800 mb-4">6. For Admins</h2>
            <div className="space-y-3 text-slate-700">
              <p><strong>Verification Duty:</strong> You are responsible for verifying student profiles and ensuring data accuracy within your university.</p>
              <p><strong>Confidentiality:</strong> Student data is confidential. Do not share personal information outside the platform or your institution.</p>
              <p><strong>Fair Assessment:</strong> Assessments must be unbiased and follow institutional policies.</p>
            </div>
          </section>

          {/* Section 7 */}
          <section>
            <h2 className="text-2xl font-bold text-slate-800 mb-4">7. Account Suspension & Termination</h2>
            <div className="space-y-3 text-slate-700">
              <p><strong>We may suspend or terminate your account if:</strong></p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>You violate these terms</li>
                <li>You provide false or fraudulent information</li>
                <li>You engage in harassment or abuse</li>
                <li>You attempt to exploit or hack the system</li>
                <li>You violate data protection laws</li>
              </ul>
              <p className="mt-4"><strong>Suspension Notice:</strong> You will be notified of suspension before permanent termination, except in cases of severe violation.</p>
            </div>
          </section>

          {/* Section 8 */}
          <section>
            <h2 className="text-2xl font-bold text-slate-800 mb-4">8. Liability & Disclaimers</h2>
            <div className="space-y-3 text-slate-700">
              <p><strong>Platform As-Is:</strong> WeCare is provided "as is" without warranty of any kind. We do not guarantee uninterrupted service.</p>
              <p><strong>Financial Loss:</strong> WeCare is not responsible for any financial loss due to payment gateway failures, hacking, or system errors.</p>
              <p><strong>Aid Decisions:</strong> WeCare does not make final decisions on aid eligibility. Your university admin makes these decisions.</p>
              <p><strong>Third-Party Services:</strong> We are not responsible for third-party payment providers or communication services used on the platform.</p>
            </div>
          </section>

          {/* Section 9 */}
          <section>
            <h2 className="text-2xl font-bold text-slate-800 mb-4">9. Data Protection & GDPR Compliance</h2>
            <div className="space-y-3 text-slate-700">
              <p><strong>Your Rights:</strong> You have the right to:</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Access your personal data</li>
                <li>Correct inaccurate data</li>
                <li>Request deletion (where applicable)</li>
                <li>Withdraw consent at any time</li>
              </ul>
              <p className="mt-4"><strong>Data Breach:</strong> In case of a data breach, affected users will be notified within 72 hours.</p>
            </div>
          </section>

          {/* Section 10 */}
          <section>
            <h2 className="text-2xl font-bold text-slate-800 mb-4">10. Changes to Terms</h2>
            <p className="text-slate-700">WeCare reserves the right to modify these terms at any time. Changes will be effective upon posting to the platform. Continued use of the platform constitutes acceptance of updated terms.</p>
          </section>

          {/* Section 11 */}
          <section>
            <h2 className="text-2xl font-bold text-slate-800 mb-4">11. Governing Law</h2>
            <p className="text-slate-700">These terms are governed by the laws of Kenya. Disputes shall be resolved in Kenyan courts.</p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-2xl font-bold text-slate-800 mb-4">12. Contact Us</h2>
            <div className="bg-amber-50 p-4 rounded border border-amber-200">
              <p className="text-slate-800"><strong>Questions about these terms?</strong></p>
              <p className="text-slate-800"><strong>Email:</strong> support@wecare.app</p>
              <p className="text-slate-800"><strong>Response Time:</strong> Within 48 hours</p>
            </div>
          </section>

          {/* Acknowledgment */}
          <section className="bg-green-50 border-l-4 border-green-600 p-6 rounded">
            <p className="text-slate-800 font-semibold">
              ✓ I have read and agree to these Terms & Conditions and the Privacy Policy
            </p>
            <p className="text-slate-700 text-sm mt-2">This acknowledgment is required to use WeCare.</p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TermsAndConditions;
