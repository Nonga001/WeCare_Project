// src/pages/dashboards/StudentDashboard.jsx
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import DashboardLayout from "../../components/DashboardLayout";

const StudentDashboard = () => {
  const { user } = useAuth();
  const isVerified = user?.isApproved === true;

  return (
    <DashboardLayout title="Student Dashboard 🎓">
      <div className="w-full">
        <nav className="flex flex-wrap gap-2 sm:gap-3 mb-6">
          <NavLink
            to="/dashboard/student"
            end
            onClick={(e) => { if (!isVerified) e.preventDefault(); }}
            className={({ isActive }) =>
              `px-4 py-2 rounded-xl text-sm font-medium transition ${
                isActive
                  ? "bg-blue-600 text-white shadow"
                  : `${!isVerified ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed" : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"}`
              }`
            }
          >
            Home
          </NavLink>
          <NavLink
            to="/dashboard/student/profile"
            onClick={(e) => { if (!isVerified) e.preventDefault(); }}
            className={({ isActive }) =>
              `px-4 py-2 rounded-xl text-sm font-medium transition ${
                isActive
                  ? "bg-blue-600 text-white shadow"
                  : `${!isVerified ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed" : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"}`
              }`
            }
          >
            Profile
          </NavLink>
          <NavLink
            to="/dashboard/student/aid"
            onClick={(e) => { if (!isVerified) e.preventDefault(); }}
            className={({ isActive }) =>
              `px-4 py-2 rounded-xl text-sm font-medium transition ${
                isActive
                  ? "bg-blue-600 text-white shadow"
                  : `${!isVerified ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed" : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"}`
              }`
            }
          >
            Aid Requests
          </NavLink>
          <NavLink
            to="/dashboard/student/support"
            onClick={(e) => { if (!isVerified) e.preventDefault(); }}
            className={({ isActive }) =>
              `px-4 py-2 rounded-xl text-sm font-medium transition ${
                isActive
                  ? "bg-blue-600 text-white shadow"
                  : `${!isVerified ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed" : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"}`
              }`
            }
          >
            Peer Support
          </NavLink>
          <NavLink
            to="/dashboard/student/notifications"
            className={({ isActive }) =>
              `px-4 py-2 rounded-xl text-sm font-medium transition ${
                isActive
                  ? "bg-blue-600 text-white shadow"
                  : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
              }`
            }
          >
            Notifications
          </NavLink>
        </nav>

        <div className="">
          <Outlet />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default StudentDashboard;
