// src/pages/dashboards/AdminDashboard.jsx
import DashboardLayout from "../../components/DashboardLayout";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const AdminDashboard = () => {
  const { user } = useAuth();
  const isApproved = user?.isApproved === true;

  return (
    <DashboardLayout title="Admin Dashboard 🔑">
      <nav className="mb-6 flex flex-wrap justify-end lg:justify-center gap-2">
        <NavLink 
          to="/dashboard/admin" 
          end 
          onClick={(e) => { if (!isApproved) e.preventDefault(); }}
          className={({isActive})=>`px-4 py-2 rounded-xl text-sm font-medium ${isActive?"bg-slate-900 text-white":`${!isApproved ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700" : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"}`}`}
        >
          Home
        </NavLink>
        <NavLink 
          to="/dashboard/admin/profile" 
          onClick={(e) => { if (!isApproved) e.preventDefault(); }}
          className={({isActive})=>`px-4 py-2 rounded-xl text-sm font-medium ${isActive?"bg-slate-900 text-white":`${!isApproved ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700" : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"}`}`}
        >
          Profile
        </NavLink>
        <NavLink 
          to="/dashboard/admin/verify" 
          onClick={(e) => { if (!isApproved) e.preventDefault(); }}
          className={({isActive})=>`px-4 py-2 rounded-xl text-sm font-medium ${isActive?"bg-slate-900 text-white":`${!isApproved ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700" : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"}`}`}
        >
          Student Verification
        </NavLink>
        <NavLink 
          to="/dashboard/admin/aid" 
          onClick={(e) => { if (!isApproved) e.preventDefault(); }}
          className={({isActive})=>`px-4 py-2 rounded-xl text-sm font-medium ${isActive?"bg-slate-900 text-white":`${!isApproved ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700" : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"}`}`}
        >
          Aid Management
        </NavLink>
        <NavLink 
          to="/dashboard/admin/groups" 
          onClick={(e) => { if (!isApproved) e.preventDefault(); }}
          className={({isActive})=>`px-4 py-2 rounded-xl text-sm font-medium ${isActive?"bg-slate-900 text-white":`${!isApproved ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700" : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"}`}`}
        >
          Groups
        </NavLink>
        <NavLink 
          to="/dashboard/admin/reports" 
          onClick={(e) => { if (!isApproved) e.preventDefault(); }}
          className={({isActive})=>`px-4 py-2 rounded-xl text-sm font-medium ${isActive?"bg-slate-900 text-white":`${!isApproved ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700" : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"}`}`}
        >
          Reports
        </NavLink>
        <NavLink 
          to="/dashboard/admin/notifications" 
          onClick={(e) => { if (!isApproved) e.preventDefault(); }}
          className={({isActive})=>`px-4 py-2 rounded-xl text-sm font-medium ${isActive?"bg-slate-900 text-white":`${!isApproved ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700" : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"}`}`}
        >
          Notifications
        </NavLink>
      </nav>
      <Outlet />
    </DashboardLayout>
  );
};

export default AdminDashboard;
