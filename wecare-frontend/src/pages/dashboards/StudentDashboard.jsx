// src/pages/dashboards/StudentDashboard.jsx
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import DashboardLayout from "../../components/DashboardLayout";

const StudentDashboard = () => {
  const { user } = useAuth();
  // Temporary placeholder until wired to API
  const isVerified = false;

  return (
    <DashboardLayout title="Student Dashboard 🎓">
      <div className="w-full">
        {!isVerified && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 p-4 text-sm">
            Your account is pending verification. Profile, aid requests, and peer support are limited until approval.
          </div>
        )}
        <nav className="flex flex-wrap gap-2 sm:gap-3 mb-6">
          <NavLink
            to="/dashboard/student"
            end
            className={({ isActive }) =>
              `px-4 py-2 rounded-xl text-sm font-medium transition ${
                isActive
                  ? "bg-blue-600 text-white shadow"
                  : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
              }`
            }
          >
            Home
          </NavLink>
          <NavLink
            to="/dashboard/student/profile"
            className={({ isActive }) =>
              `px-4 py-2 rounded-xl text-sm font-medium transition ${
                isActive
                  ? "bg-blue-600 text-white shadow"
                  : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
              }`
            }
          >
            Profile
          </NavLink>
          <NavLink
            to="/dashboard/student/aid"
            onClick={(e) => { if (!isVerified && user?.role === "student") e.preventDefault(); }}
            aria-disabled={!isVerified && user?.role === "student"}
            className={({ isActive }) =>
              `px-4 py-2 rounded-xl text-sm font-medium transition ${
                isActive
                  ? "bg-blue-600 text-white shadow"
                  : `${!isVerified && user?.role === "student" ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed" : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"}`
              }`
            }
          >
            Aid Requests
          </NavLink>
          <NavLink
            to="/dashboard/student/support"
            onClick={(e) => { if (!isVerified && user?.role === "student") e.preventDefault(); }}
            aria-disabled={!isVerified && user?.role === "student"}
            className={({ isActive }) =>
              `px-4 py-2 rounded-xl text-sm font-medium transition ${
                isActive
                  ? "bg-blue-600 text-white shadow"
                  : `${!isVerified && user?.role === "student" ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed" : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"}`
              }`
            }
          >
            Peer Support
          </NavLink>
        </nav>

        <div className="">
          {!isVerified && user?.role === "student" ? (
            // Only restrict certain sections when unverified; allow Home and Profile
            window.location.pathname.endsWith("/aid") || window.location.pathname.endsWith("/support") ? (
              <div className="rounded-xl border border-slate-200 p-6 text-slate-700 text-sm">
                Your account is pending verification. You’ll gain access to this section after approval by your University Admin.
              </div>
            ) : (
              <Outlet />
            )
          ) : (
            <Outlet />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default StudentDashboard;
