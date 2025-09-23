// src/components/DashboardLayout.jsx
import { useAuth } from "../context/AuthContext";
import React, { useEffect, useState } from "react";

const DashboardLayout = ({ title, children }) => {
  const { logout, user } = useAuth();

  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    try {
      const saved = localStorage.getItem("theme:dark");
      const prefers = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const enabled = saved === 'true' || (saved === null && prefers);
      setIsDark(enabled);
      document.documentElement.classList.toggle('dark', enabled);
    } catch {}
  }, []);
  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
    try { localStorage.setItem('theme:dark', String(next)); } catch {}
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:bg-slate-950 dark:from-slate-950 dark:via-slate-950 dark:to-slate-950">
      <header className="fixed top-0 left-0 right-0 w-full h-14 sm:h-16 lg:h-20 px-3 sm:px-4 lg:px-6 border-b border-slate-200 bg-white/95 backdrop-blur z-40 dark:bg-slate-900/95 dark:border-slate-800">
        <div className="w-full h-full flex flex-col justify-center">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-base sm:text-lg lg:text-xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100">{title}</h1>
            <button onClick={toggleTheme} className="btn btn-ghost">
              {isDark ? 'Light Mode' : 'Dark Mode'}
            </button>
          </div>
          <div className="mt-0.5">
            <p className="text-slate-600 text-[12px] sm:text-[13px] dark:text-slate-300">
              Welcome, <span className="font-semibold text-slate-800 dark:text-slate-100">{user?.name || "User"}</span> 👋
              <span className="ml-2 text-slate-500 dark:text-slate-400">Role: {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : "N/A"}</span>
            </p>
            {(user?.role === "admin" || user?.role === "student") && user?.isApproved === false && (
              <div className="mt-1 alert alert-warn">
                Awaiting approval. Some features are disabled until your account is verified.
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="w-full px-4 sm:px-6 lg:px-10 pt-16 sm:pt-20 lg:pt-24 pb-16">
        {children}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 w-full h-12 px-3 sm:px-4 lg:px-6 flex items-center justify-center bg-slate-50/95 border-t border-slate-200 text-center dark:bg-slate-900/95 dark:border-slate-800">
        {(user?.role === "admin" || user?.role === "student") && user?.isApproved === false && (
          <div className="mb-4 alert alert-warn">
            <p className="font-medium">Account Pending Approval</p>
            <p>Please wait for approval from {user?.role === "admin" ? "Super Admin" : "your University Admin"} to access all features.</p>
          </div>
        )}
        <button
          onClick={logout}
          className="btn btn-secondary"
        >
          Logout
        </button>
      </footer>
    </div>
  );
};

export default DashboardLayout;
