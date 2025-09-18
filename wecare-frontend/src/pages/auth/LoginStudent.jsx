import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { login as loginService } from "../../services/authService";
import StudentDashboard from "../dashboards/StudentDashboard";

const LoginStudent = () => {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = await loginService({ ...form, role: "student" });
      login(data);
      const role = data?.user?.role || "student";
      navigate(`/dashboard/${role}`);
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-r from-green-100 via-lime-50 to-teal-50 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md p-8 bg-white rounded-2xl shadow-xl border border-gray-200"
      >
        <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
          Student Login
        </h2>

        {error && (
          <p className="text-center text-red-500 bg-red-100 px-3 py-2 rounded mb-4">
            {error}
          </p>
        )}

        <input
          type="email"
          name="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
          className="w-full mb-4 px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition"
          required
        />

        <input
          type="password"
          name="password"
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
          className="w-full mb-6 px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition"
          required
        />

        <button className="w-full py-3 bg-gradient-to-r from-green-500 to-lime-600 text-white font-semibold rounded-xl shadow-md hover:from-green-600 hover:to-lime-700 transition">
          Login
        </button>

        <p className="mt-5 text-center text-gray-600 text-sm">
          Don’t have an account?{" "}
          <Link to="/register/student" className="text-blue-600 font-medium hover:underline">
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

export default LoginStudent;
