import { useState } from "react";
import { Link } from "react-router-dom";

const Landing = () => {
  const [mode, setMode] = useState(""); // "", "login", or "register"

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-indigo-100 via-blue-50 to-purple-50 px-4">
      <h1 className="text-5xl sm:text-6xl font-extrabold text-gray-800 mb-4 text-center">
        Welcome to WeCare
      </h1>
      <p className="text-lg sm:text-xl text-gray-700 mb-10 text-center max-w-2xl">
        WeCare connects student moms, donors, and universities to provide aid
        and emergency support. Join us today to make a difference.
      </p>

      {/* Show both buttons only if no mode selected */}
      {mode === "" && (
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <button
            onClick={() => setMode("login")}
            className="px-8 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-xl shadow-lg hover:from-blue-600 hover:to-indigo-700 transition transform hover:-translate-y-1"
          >
            Login
          </button>
          <button
            onClick={() => setMode("register")}
            className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-xl shadow-lg hover:from-green-600 hover:to-emerald-700 transition transform hover:-translate-y-1"
          >
            Register
          </button>
        </div>
      )}

      {/* Login Options */}
      {mode === "login" && (
        <div className="flex flex-col items-center gap-3">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">Login as:</h2>
          <Link
            to="/login?role=student"
            className="px-6 py-3 bg-blue-500 text-white rounded-xl w-56 text-center font-medium hover:bg-blue-600 transition"
          >
            Student
          </Link>
          <Link
            to="/login?role=donor"
            className="px-6 py-3 bg-purple-500 text-white rounded-xl w-56 text-center font-medium hover:bg-purple-600 transition"
          >
            Donor
          </Link>
          <Link
            to="/login?role=admin"
            className="px-6 py-3 bg-red-500 text-white rounded-xl w-56 text-center font-medium hover:bg-red-600 transition"
          >
            Admin
          </Link>

          <p className="mt-5 text-sm text-gray-700">
            Don’t have an account?{" "}
            <button
              onClick={() => setMode("register")}
              className="text-green-600 font-medium hover:underline"
            >
              Register here
            </button>
          </p>

          <p className="mt-2 text-sm text-gray-500">
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
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">Register as:</h2>
          <Link
            to="/register/student"
            className="px-6 py-3 bg-blue-500 text-white rounded-xl w-56 text-center font-medium hover:bg-blue-600 transition"
          >
            Student
          </Link>
          <Link
            to="/register/donor"
            className="px-6 py-3 bg-purple-500 text-white rounded-xl w-56 text-center font-medium hover:bg-purple-600 transition"
          >
            Donor
          </Link>
          <Link
            to="/register/admin"
            className="px-6 py-3 bg-red-500 text-white rounded-xl w-56 text-center font-medium hover:bg-red-600 transition"
          >
            Admin
          </Link>

          <p className="mt-5 text-sm text-gray-700">
            Already have an account?{" "}
            <button
              onClick={() => setMode("login")}
              className="text-blue-600 font-medium hover:underline"
            >
              Login here
            </button>
          </p>

          <p className="mt-2 text-sm text-gray-500">
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
