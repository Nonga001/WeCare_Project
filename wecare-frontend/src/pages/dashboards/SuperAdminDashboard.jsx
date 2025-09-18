import DashboardLayout from "../../components/DashboardLayout";
import { NavLink, Outlet } from "react-router-dom";

const SuperAdminDashboard = () => {
  return (
    <DashboardLayout title="Super Admin Dashboard 🛡️">
      <nav className="mb-6 flex flex-wrap gap-2">
        <NavLink to="/dashboard/superadmin" end className={({isActive})=>`px-4 py-2 rounded-xl text-sm font-medium ${isActive?"bg-slate-900 text-white":"bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"}`}>Home</NavLink>
        <NavLink to="/dashboard/superadmin/profile" className={({isActive})=>`px-4 py-2 rounded-xl text-sm font-medium ${isActive?"bg-slate-900 text-white":"bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"}`}>Profile</NavLink>
        <NavLink to="/dashboard/superadmin/users" className={({isActive})=>`px-4 py-2 rounded-xl text-sm font-medium ${isActive?"bg-slate-900 text-white":"bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"}`}>User Management</NavLink>
        <NavLink to="/dashboard/superadmin/settings" className={({isActive})=>`px-4 py-2 rounded-xl text-sm font-medium ${isActive?"bg-slate-900 text-white":"bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"}`}>System Settings</NavLink>
        <NavLink to="/dashboard/superadmin/analytics" className={({isActive})=>`px-4 py-2 rounded-xl text-sm font-medium ${isActive?"bg-slate-900 text-white":"bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"}`}>Analytics</NavLink>
        <NavLink to="/dashboard/superadmin/notifications" className={({isActive})=>`px-4 py-2 rounded-xl text-sm font-medium ${isActive?"bg-slate-900 text-white":"bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"}`}>Notifications</NavLink>
      </nav>
      <Outlet />
    </DashboardLayout>
  );
};

export default SuperAdminDashboard;


