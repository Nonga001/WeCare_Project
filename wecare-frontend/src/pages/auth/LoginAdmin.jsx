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

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-r from-indigo-100 to-red-50 px-4">
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
          <input
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
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition"
            required
          />
        </div>

        <button className="w-full py-3 bg-gradient-to-r from-red-500 to-rose-600 text-white font-semibold rounded-xl shadow-md hover:from-red-600 hover:to-rose-700 transition">
          Login
        </button>

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
