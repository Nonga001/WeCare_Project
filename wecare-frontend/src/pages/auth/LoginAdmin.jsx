import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { login as loginService } from "../../services/authService";
import AdmintDashboard from "../dashboards/AdminDashboard";

const LoginAdmin = () => {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Force role to admin unless default superadmin credentials are used (backend handles it)
      const data = await loginService({ ...form, role: "admin" });
      login(data);
      const role = data?.user?.role || "admin";
      navigate(`/dashboard/${role}`);
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    }
  };

  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="flex justify-end sm:justify-center items-center h-screen overflow-hidden bg-gradient-to-r from-indigo-100 to-red-50 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md p-8 bg-white rounded-2xl shadow-xl border border-gray-200"
      >
        <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
          Admin Login
        </h2>

        {error && (
          <p className="text-center text-red-500 bg-red-100 px-3 py-2 rounded mb-4">
            {error}
          </p>
        )}

        <div className="mb-4">
          <label htmlFor="email" className="block mb-1 text-sm font-medium text-gray-700">Email</label>
          <input
            id="email"
            type="email"
            name="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition"
            required
          />
        </div>

        <div className="mb-6">
          <label htmlFor="password" className="block mb-1 text-sm font-medium text-gray-700">Password</label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Password"
              value={form.password}
              onChange={handleChange}
              className="w-full px-4 py-3 pr-12 border rounded-xl focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-gray-700"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M3.53 2.47a.75.75 0 0 0-1.06 1.06l18 18a.75.75 0 0 0 1.06-1.06l-2.086-2.086A12.326 12.326 0 0 0 21.75 12s-3-7.5-9.75-7.5a9.7 9.7 0 0 0-4.689 1.226L3.53 2.47ZM12 6.75c5.22 0 7.92 4.63 8.69 6.048a10.83 10.83 0 0 1-3.129 3.348l-2.087-2.087A3.75 3.75 0 0 0 9.94 8.439l-2.22-2.22A8.2 8.2 0 0 1 12 6.75Zm0 10.5a3.75 3.75 0 0 1-3.378-5.402l5.73 5.73A3.72 3.72 0 0 1 12 17.25Z"/><path d="M15.75 12a3.75 3.75 0 0 1-4.84 3.57l-4.037-4.038A10.82 10.82 0 0 0 3.31 12C4.08 10.58 6.78 6.75 12 6.75c.863 0 1.68.112 2.45.318A3.75 3.75 0 0 1 15.75 12Z"/></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M12 4.5C5.25 4.5 2.25 12 2.25 12s3 7.5 9.75 7.5S21.75 12 21.75 12 18.75 4.5 12 4.5Zm0 12.75A3.75 3.75 0 1 1 12 9.75a3.75 3.75 0 0 1 0 7.5Z"/></svg>
              )}
            </button>
          </div>
        </div>

        <button className="w-full py-3 bg-gradient-to-r from-red-500 to-rose-600 text-white font-semibold rounded-xl shadow-md hover:from-red-600 hover:to-rose-700 transition">
          Login
        </button>

        <p className="mt-3 text-center text-red-600 text-sm">
          <a href="#" className="hover:underline">Forgot password?</a>
        </p>

        <p className="mt-5 text-center text-gray-600 text-sm">
          Don’t have an account?{" "}
          <Link
            to="/register/admin"
            className="text-blue-600 font-medium hover:underline"
          >
            Register here
          </Link>
        </p>

        <p className="mt-2 text-center text-gray-500 text-sm">
          <Link to="/" className="hover:text-gray-700 hover:underline">
            Back to Home
          </Link>
        </p>
      </form>
    </div>
  );
};

export default LoginAdmin;
