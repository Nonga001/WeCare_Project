// src/components/DashboardLayout.jsx
import { useAuth } from "../context/AuthContext";
import React from "react";

const DashboardLayout = ({ title, children }) => {
  const { logout, user } = useAuth();

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <header className="w-full px-4 sm:px-6 lg:px-10 py-6 sm:py-8 border-b border-slate-200 bg-white/70 backdrop-blur">
        <div className="w-full">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-800 text-center sm:text-left">{title}</h1>
          <div className="mt-2 text-center sm:text-left">
            <p className="text-slate-600">
              Welcome, <span className="font-semibold text-slate-800">{user?.name || "User"}</span> 👋
            </p>
            <p className="text-sm text-slate-500">Role: {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : "N/A"}</p>
            {(user?.role === "admin" || user?.role === "student") && user?.isApproved === false && (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-900 px-3 py-2 text-sm">
                Awaiting approval. Some features are disabled until your account is verified.
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="w-full px-4 sm:px-6 lg:px-10 py-6 sm:py-8">
        {children}
      </main>

      <footer className="w-full px-4 sm:px-6 lg:px-10 py-6 bg-slate-50/80 border-t border-slate-200 text-center">
        {(user?.role === "admin" || user?.role === "student") && user?.isApproved === false && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 text-amber-900 px-4 py-3 text-sm">
            <p className="font-medium">Account Pending Approval</p>
            <p>Please wait for approval from {user?.role === "admin" ? "Super Admin" : "your University Admin"} to access all features.</p>
          </div>
        )}
        <button
          onClick={logout}
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-rose-500 text-white font-medium shadow hover:bg-rose-600 active:bg-rose-700 transition-colors duration-150"
        >
          Logout
        </button>
      </footer>
    </div>
  );
};

export default DashboardLayout;
