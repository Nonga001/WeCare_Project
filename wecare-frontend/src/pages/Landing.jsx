import { useEffect, useState } from "react";
import momReading from "../assets/mom daughter read books.jpeg";
import { Link } from "react-router-dom";

const Landing = () => {
  const [mode, setMode] = useState(""); // "", "login", or "register"
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 10);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="w-full h-screen bg-gradient-to-br from-amber-50 via-white to-stone-50 grid grid-rows-2 lg:grid-rows-1 lg:grid-cols-2">
      {/* Left: Full-height image */}
      <div className="relative w-full h-full order-1 lg:order-1">
        <img
          src={momReading}
          alt="Mother and daughter reading books"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/20" />
      </div>

      {/* Right: Content */}
      <div className="order-2 lg:order-2 flex items-center justify-center w-full px-6 lg:px-12 py-8 lg:py-0 bg-gradient-to-br from-amber-100 via-amber-50 to-amber-200">
        <div className={`max-w-xl lg:max-w-2xl w-full border border-amber-200 bg-white/40 shadow-xl rounded-2xl p-6 lg:p-10 backdrop-blur-sm ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'} transition-all duration-700`}>
          <h1 className={`mb-6 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'} transition-all duration-700 delay-100`}>
            <span className="relative inline-block">
              <span className="block text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight bg-gradient-to-r from-amber-800 via-amber-700 to-stone-800 bg-clip-text text-transparent drop-shadow lg:whitespace-nowrap">
                Welcome to WeCare
              </span>
              <span className="absolute left-0 -bottom-2 h-2 w-full rounded-full bg-gradient-to-r from-amber-400 via-amber-500 to-amber-300"></span>
            </span>
          </h1>
          <p className={`text-base sm:text-lg text-stone-700/90 mb-8 leading-relaxed ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'} transition-all duration-700 delay-150`}>
            WeCare connects <span className="text-amber-800 font-semibold">student moms</span>, <span className="text-amber-800 font-semibold">donors</span>, and <span className="text-amber-800 font-semibold">universities</span>
            to provide <span className="text-amber-900 font-semibold">aid</span> and <span className="text-amber-900 font-semibold">emergency support</span>. Join us today to make a difference.
          </p>

          <ul className={`space-y-2 mb-8 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'} transition-all duration-700 delay-200`}>
            <li className="flex items-center gap-3 text-stone-700">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-600 text-white text-sm">✓</span>
              Fast, real-time updates and notifications
            </li>
            <li className="flex items-center gap-3 text-stone-700">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-600 text-white text-sm">✓</span>
              Simple onboarding for students, donors, and admins
            </li>
            <li className="flex items-center gap-3 text-stone-700">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-600 text-white text-sm">✓</span>
              Transparent reporting and secure access
            </li>
          </ul>

      {/* Show both buttons only if no mode selected */}
      {mode === "" && (
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <button
            onClick={() => setMode("login")}
            className="px-8 py-3 bg-amber-700 text-white font-semibold rounded-xl shadow hover:bg-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-300 active:bg-amber-900 transition-transform duration-200 ease-out hover:scale-[1.03] active:scale-95"
          >
            Login
          </button>
          <button
            onClick={() => setMode("register")}
            className="px-8 py-3 bg-stone-800 text-white font-semibold rounded-xl shadow hover:bg-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-300 active:bg-black transition-transform duration-200 ease-out hover:scale-[1.03] active:scale-95"
          >
            Register
          </button>
        </div>
      )}

      {/* Login Options */}
      {mode === "login" && (
        <div className="flex flex-col items-start gap-3">
          <h2 className="text-2xl font-semibold mb-4 text-stone-800">Login as:</h2>
          <Link
            to="/login/student"
            className="px-6 py-3 bg-amber-700 text-white rounded-xl w-56 text-center font-medium hover:bg-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-300 transition-transform duration-200 hover:scale-[1.02]"
          >
            Student
          </Link>
          <Link
            to="/login/donor"
            className="px-6 py-3 bg-stone-800 text-white rounded-xl w-56 text-center font-medium hover:bg-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-300 transition-transform duration-200 hover:scale-[1.02]"
          >
            Donor
          </Link>
          <Link
            to="/login/admin"
            className="px-6 py-3 bg-amber-600 text-white rounded-xl w-56 text-center font-medium hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-200 transition-transform duration-200 hover:scale-[1.02]"
          >
            Admin
          </Link>

          <p className="mt-5 text-sm text-stone-700">
            Don’t have an account?{" "}
            <button
              onClick={() => setMode("register")}
              className="text-amber-700 font-medium hover:underline"
            >
              Register here
            </button>
          </p>

          <p className="mt-2 text-sm text-stone-500">
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
        <div className="flex flex-col items-start gap-3">
          <h2 className="text-2xl font-semibold mb-4 text-stone-800">Register as:</h2>
          <Link
            to="/register/student"
            className="px-6 py-3 bg-amber-700 text-white rounded-xl w-56 text-center font-medium hover:bg-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-300 transition-transform duration-200 hover:scale-[1.02]"
          >
            Student
          </Link>
          <Link
            to="/register/donor"
            className="px-6 py-3 bg-stone-800 text-white rounded-xl w-56 text-center font-medium hover:bg-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-300 transition-transform duration-200 hover:scale-[1.02]"
          >
            Donor
          </Link>
          <Link
            to="/register/admin"
            className="px-6 py-3 bg-amber-600 text-white rounded-xl w-56 text-center font-medium hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-200 transition-transform duration-200 hover:scale-[1.02]"
          >
            Admin
          </Link>

          <p className="mt-5 text-sm text-stone-700">
            Already have an account?{" "}
            <button
              onClick={() => setMode("login")}
              className="text-amber-700 font-medium hover:underline"
            >
              Login here
            </button>
          </p>

          <p className="mt-2 text-sm text-stone-500">
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
      </div>
    </div>
  );
};

export default Landing;
