import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { register } from "../../services/authService";

const RegisterDonor = () => {
  const [form, setForm] = useState({
    name: "",
    organization: "",
    phone: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await register("donor", form);
      navigate("/login/donor");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-purple-100 via-pink-50 to-indigo-50 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md p-8 bg-white rounded-2xl shadow-xl border border-gray-200"
      >
        <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
          Donor Registration
        </h2>

        {error && (
          <p className="text-center text-red-500 bg-red-100 px-3 py-2 rounded mb-4">
            {error}
          </p>
        )}

        <input
          type="text"
          name="name"
          placeholder="Full Name / Organization Contact"
          value={form.name}
          onChange={handleChange}
          className="w-full mb-3 px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition"
          required
        />

        <input
          type="text"
          name="organization"
          placeholder="Organization (optional)"
          value={form.organization}
          onChange={handleChange}
          className="w-full mb-3 px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition"
        />

        <input
          type="tel"
          name="phone"
          placeholder="Phone Number"
          value={form.phone}
          onChange={handleChange}
          className="w-full mb-3 px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition"
          required
        />

        <input
          type="email"
          name="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
          className="w-full mb-3 px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition"
          required
        />

        <input
          type="password"
          name="password"
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
          className="w-full mb-5 px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition"
          required
        />

        <button className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold rounded-xl shadow-md hover:from-purple-600 hover:to-pink-700 transition transform hover:-translate-y-1">
          Register
        </button>

        <p className="mt-5 text-sm text-center text-gray-700">
          Already have an account?{" "}
          <Link
            to="/login/donor"
            className="text-blue-600 font-medium hover:underline"
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
    </div>
  );
};

export default RegisterDonor;
