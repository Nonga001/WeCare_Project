import { useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { register } from "../../services/authService";
import DataHandlingModal from "../../components/DataHandlingModal";

const RegisterAdmin = () => {
  const [form, setForm] = useState({
    name: "",
    university: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [dataConsent, setDataConsent] = useState(false);
  const [showDataInfo, setShowDataInfo] = useState(false);
  const [showDataHandlingModal, setShowDataHandlingModal] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "phone") {
      const digitsOnly = value.replace(/\\D/g, "").slice(0, 10);
      setForm({ ...form, [name]: digitsOnly });
      return;
    }
    setForm({ ...form, [name]: value });
  };

  const universities = useMemo(
    () => [
      "Dedan Kimathi University (DeKUT)",
      "University of Nairobi (UoN)",
      "Kirinyaga University",
      "Kenyatta University (KU)",
      "Karatina University",
    ],
    []
  );

  const passwordChecks = useMemo(() => {
    const lengthOk = form.password.length >= 8;
    const upperOk = /[A-Z]/.test(form.password);
    const lowerOk = /[a-z]/.test(form.password);
    const numberOk = /[0-9]/.test(form.password);
    const specialOk = /[^A-Za-z0-9]/.test(form.password);
    return { lengthOk, upperOk, lowerOk, numberOk, specialOk };
  }, [form.password]);

  const isPasswordStrong = Object.values(passwordChecks).every(Boolean);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!dataConsent) {
      setError("You must consent to data collection to proceed");
      return;
    }
    if (form.phone.length !== 10) {
      setError("Phone number must be exactly 10 digits");
      return;
    }
    if (!isPasswordStrong) {
      setError(
        "Password must be at least 8 chars with uppercase, lowercase, number, and special character"
      );
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    try {
      await register("admin", {
        name: form.name,
        university: form.university,
        phone: form.phone,
        email: form.email,
        password: form.password,
      });
      navigate("/login/admin");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-amber-50 via-amber-50 to-amber-100 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md p-8 bg-white rounded-2xl shadow-xl border border-gray-200"
      >
        <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
          Admin Registration
        </h2>

        {error && (
          <p className="text-center text-red-500 bg-red-100 px-3 py-2 rounded mb-4">
            {error}
          </p>
        )}

        <div className="mb-3">
          <label htmlFor="name" className="block mb-1 text-sm font-medium text-gray-700">Full Name</label>
          <input
            id="name"
            type="text"
            name="name"
            placeholder="Full Name"
            value={form.name}
            onChange={handleChange}
            className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-transparent transition"
            required
          />
        </div>

        <div className="mb-3">
          <label htmlFor="phone" className="block mb-1 text-sm font-medium text-gray-700">Phone Number</label>
          <input
            id="phone"
            type="tel"
            name="phone"
            placeholder="Format: 07... / 01..."
            value={form.phone}
            onChange={handleChange}
            className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-transparent transition"
            inputMode="numeric"
            maxLength={10}
            pattern="^[0-9]{10}$"
            required
          />
        </div>

        <div className="mb-3">
          <label htmlFor="university" className="block mb-1 text-sm font-medium text-gray-700">University</label>
          <select
            id="university"
            name="university"
            value={form.university}
            onChange={handleChange}
            className="w-full px-4 py-3 border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-transparent transition"
            required
          >
            <option value="" disabled>Select university</option>
            {universities.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>

        <div className="mb-3">
          <label htmlFor="email" className="block mb-1 text-sm font-medium text-gray-700">Email</label>
          <input
            id="email"
            type="email"
            name="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-transparent transition"
            autoComplete="email"
            required
          />
        </div>

        <div className="mb-3">
          <label htmlFor="password" className="block mb-1 text-sm font-medium text-gray-700">Password</label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Minimum 8 characters"
              value={form.password}
              onChange={handleChange}
              className="w-full px-4 py-3 pr-12 border rounded-xl focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition"
              autoComplete="new-password"
              required
            />
            <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-gray-700" aria-label={showPassword ? "Hide password" : "Show password"}>
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M3.53 2.47a.75.75 0 0 0-1.06 1.06l18 18a.75.75 0 0 0 1.06-1.06l-2.086-2.086A12.326 12.326 0 0 0 21.75 12s-3-7.5-9.75-7.5a9.7 9.7 0 0 0-4.689 1.226L3.53 2.47ZM12 6.75c5.22 0 7.92 4.63 8.69 6.048a10.83 10.83 0 0 1-3.129 3.348l-2.087-2.087A3.75 3.75 0 0 0 9.94 8.439l-2.22-2.22A8.2 8.2 0 0 1 12 6.75Zm0 10.5a3.75 3.75 0 0 1-3.378-5.402l5.73 5.73A3.72 3.72 0 0 1 12 17.25Z"/><path d="M15.75 12a3.75 3.75 0 0 1-4.84 3.57l-4.037-4.038A10.82 10.82 0 0 0 3.31 12C4.08 10.58 6.78 6.75 12 6.75c.863 0 1.68.112 2.45.318A3.75 3.75 0 0 1 15.75 12Z"/></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M12 4.5C5.25 4.5 2.25 12 2.25 12s3 7.5 9.75 7.5S21.75 12 21.75 12 18.75 4.5 12 4.5Zm0 12.75A3.75 3.75 0 1 1 12 9.75a3.75 3.75 0 0 1 0 7.5Z"/></svg>
              )}
            </button>
          </div>
          <ul className="mt-2 text-xs text-gray-600 space-y-1">
            <li className={passwordChecks.lengthOk ? "text-green-600" : "text-gray-500"}>• At least 8 characters</li>
            <li className={passwordChecks.upperOk ? "text-green-600" : "text-gray-500"}>• Contains an uppercase letter</li>
            <li className={passwordChecks.lowerOk ? "text-green-600" : "text-gray-500"}>• Contains a lowercase letter</li>
            <li className={passwordChecks.numberOk ? "text-green-600" : "text-gray-500"}>• Contains a number</li>
            <li className={passwordChecks.specialOk ? "text-green-600" : "text-gray-500"}>• Contains a special character</li>
          </ul>
        </div>

        <div className="mb-5">
          <label htmlFor="confirmPassword" className="block mb-1 text-sm font-medium text-gray-700">Confirm Password</label>
          <div className="relative">
            <input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              name="confirmPassword"
              placeholder="Re-enter your password"
              value={form.confirmPassword}
              onChange={handleChange}
              className="w-full px-4 py-3 pr-12 border rounded-xl focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition"
              autoComplete="new-password"
              required
            />
            <button type="button" onClick={() => setShowConfirmPassword((s) => !s)} className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-gray-700" aria-label={showConfirmPassword ? "Hide password" : "Show password"}>
              {showConfirmPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M3.53 2.47a.75.75 0 0 0-1.06 1.06l18 18a.75.75 0 0 0 1.06-1.06l-2.086-2.086A12.326 12.326 0 0 0 21.75 12s-3-7.5-9.75-7.5a9.7 9.7 0 0 0-4.689 1.226L3.53 2.47ZM12 6.75c5.22 0 7.92 4.63 8.69 6.048a10.83 10.83 0 0 1-3.129 3.348l-2.087-2.087A3.75 3.75 0 0 0 9.94 8.439l-2.22-2.22A8.2 8.2 0 0 1 12 6.75Zm0 10.5a3.75 3.75 0 0 1-3.378-5.402l5.73 5.73A3.72 3.72 0 0 1 12 17.25Z"/><path d="M15.75 12a3.75 3.75 0 0 1-4.84 3.57l-4.037-4.038A10.82 10.82 0 0 0 3.31 12C4.08 10.58 6.78 6.75 12 6.75c.863 0 1.68.112 2.45.318A3.75 3.75 0 0 1 15.75 12Z"/></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M12 4.5C5.25 4.5 2.25 12 2.25 12s3 7.5 9.75 7.5S21.75 12 21.75 12 18.75 4.5 12 4.5Zm0 12.75A3.75 3.75 0 1 1 12 9.75a3.75 3.75 0 0 1 0 7.5Z"/></svg>
              )}
            </button>
          </div>
        </div>

        {/* Data Collection Disclosure */}
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-blue-900 flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zm-11-1a1 1 0 11-2 0 1 1 0 012 0z" clipRule="evenodd"/></svg>
                Data We Collect
              </h3>
              <button
                type="button"
                onClick={() => setShowDataInfo(!showDataInfo)}
                className="text-xs text-blue-600 hover:text-blue-800 mt-1 underline"
              >
                {showDataInfo ? "Hide details" : "Show details"}
              </button>
            </div>
          </div>
          
          {showDataInfo && (
            <div className="mt-3 text-xs text-blue-900 space-y-2 border-t border-blue-200 pt-3">
              <p><strong>Full Name:</strong> For admin identification and system records</p>
              <p><strong>Email:</strong> For account access, password recovery, and official communications</p>
              <p><strong>Phone:</strong> For emergency contact and system coordination</p>
              <p><strong>University:</strong> To assign you to your institution's aid management</p>
              <p><strong>Password:</strong> Securely encrypts your account to prevent unauthorized access</p>
              <p className="pt-2 italic">We only collect what's necessary to verify your role and facilitate aid administration.</p>
            </div>
          )}
        </div>

        {/* Consent Checkbox */}
        <div className="mb-5 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={dataConsent}
              onChange={(e) => setDataConsent(e.target.checked)}
              className="mt-1 w-4 h-4 text-amber-600 rounded focus:ring-2 focus:ring-amber-500"
            />
            <span className="text-sm text-gray-700">
              I understand that WeCare collects my name, email, phone, and university information to verify my role as an admin and manage aid distribution. 
              <button
                type="button"
                onClick={() => setShowDataHandlingModal(true)}
                className="text-amber-600 hover:text-amber-700 font-semibold underline ml-1"
              >
                View data handling details →
              </button>
              <br/>
              <span className="font-semibold">I consent to this data collection.</span>
            </span>
          </label>
        </div>

        <button
          type="submit"
          disabled={!dataConsent}
          className="w-full py-3 bg-amber-600 text-white font-semibold rounded-xl shadow-md hover:bg-amber-700 transition transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Register
        </button>

        <p className="mt-5 text-sm text-center text-gray-700">
          Already have an account?{" "}
          <Link
            to="/login/admin"
            className="text-amber-600 font-medium hover:underline"
          >
            Login here
          </Link>
        </p>

        <p className="mt-2 text-sm text-center text-gray-500">
          <Link to="/" className="hover:text-gray-700 hover:underline">
            Back to Home
          </Link>
        </p>
      </form>

      {/* Data Handling Modal */}
      {showDataHandlingModal && (
        <DataHandlingModal
          onAccept={() => {
            setDataConsent(true);
            setShowDataHandlingModal(false);
          }}
          onReject={() => setShowDataHandlingModal(false)}
        />
      )}
    </div>
  );
};

export default RegisterAdmin;
