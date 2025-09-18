import { useState } from "react";
import { Link } from "react-router-dom";

const Landing = () => {
  const [mode, setMode] = useState(""); // "", "login", or "register"

  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full bg-gradient-to-br from-indigo-50 via-white to-blue-50 px-4">
      <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-800 mb-4 text-center tracking-tight">
        Welcome to WeCare
      </h1>
      <p className="text-base sm:text-lg text-slate-600 mb-10 text-center max-w-2xl">
        WeCare connects student moms, donors, and universities to provide aid
        and emergency support. Join us today to make a difference.
      </p>

      {/* Show both buttons only if no mode selected */}
      {mode === "" && (
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <button
            onClick={() => setMode("login")}
            className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-xl shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 active:bg-blue-800 transition"
          >
            Login
          </button>
          <button
            onClick={() => setMode("register")}
            className="px-8 py-3 bg-emerald-600 text-white font-semibold rounded-xl shadow hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-300 active:bg-emerald-800 transition"
          >
            Register
          </button>
        </div>
      )}

      {/* Login Options */}
      {mode === "login" && (
        <div className="flex flex-col items-center gap-3">
          <h2 className="text-2xl font-semibold mb-4 text-slate-800">Login as:</h2>
          <Link
            to="/login/student"
            className="px-6 py-3 bg-blue-600 text-white rounded-xl w-56 text-center font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 transition"
          >
            Student
          </Link>
          <Link
            to="/login/donor"
            className="px-6 py-3 bg-violet-600 text-white rounded-xl w-56 text-center font-medium hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-300 transition"
          >
            Donor
          </Link>
          <Link
            to="/login/admin"
            className="px-6 py-3 bg-rose-600 text-white rounded-xl w-56 text-center font-medium hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-300 transition"
          >
            Admin
          </Link>

          <p className="mt-5 text-sm text-slate-700">
            Don’t have an account?{" "}
            <button
              onClick={() => setMode("register")}
              className="text-emerald-600 font-medium hover:underline"
            >
              Register here
            </button>
          </p>

          <p className="mt-2 text-sm text-slate-500">
            <button
              onClick={() => setMode("")}
              className="hover:text-gray-700 hover:underline"
            >
              Back to Home
            </button>
          </p>
        </div>
      )}

      {/* Register Options */}
      {mode === "register" && (
        <div className="flex flex-col items-center gap-3">
          <h2 className="text-2xl font-semibold mb-4 text-slate-800">Register as:</h2>
          <Link
            to="/register/student"
            className="px-6 py-3 bg-blue-600 text-white rounded-xl w-56 text-center font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 transition"
          >
            Student
          </Link>
          <Link
            to="/register/donor"
            className="px-6 py-3 bg-violet-600 text-white rounded-xl w-56 text-center font-medium hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-300 transition"
          >
            Donor
          </Link>
          <Link
            to="/register/admin"
            className="px-6 py-3 bg-rose-600 text-white rounded-xl w-56 text-center font-medium hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-300 transition"
          >
            Admin
          </Link>

          <p className="mt-5 text-sm text-slate-700">
            Already have an account?{" "}
            <button
              onClick={() => setMode("login")}
              className="text-blue-600 font-medium hover:underline"
            >
              Login here
            </button>
          </p>

          <p className="mt-2 text-sm text-slate-500">
            <button
              onClick={() => setMode("")}
              className="hover:text-gray-700 hover:underline"
            >
              Back to Home
            </button>
          </p>
        </div>
      )}
    </div>
  );
};

export default Landing;
