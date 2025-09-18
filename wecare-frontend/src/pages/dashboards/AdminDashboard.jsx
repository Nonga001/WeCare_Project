// src/pages/dashboards/AdminDashboard.jsx
import DashboardLayout from "../../components/DashboardLayout";
import { NavLink, Outlet } from "react-router-dom";

const AdminDashboard = () => {
  return (
    <DashboardLayout title="Admin Dashboard 🔑">
      <nav className="mb-6 flex flex-wrap gap-2">
        <NavLink to="/dashboard/admin" end className={({isActive})=>`px-4 py-2 rounded-xl text-sm font-medium ${isActive?"bg-slate-900 text-white":"bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"}`}>Home</NavLink>
        <NavLink to="/dashboard/admin/profile" className={({isActive})=>`px-4 py-2 rounded-xl text-sm font-medium ${isActive?"bg-slate-900 text-white":"bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"}`}>Profile</NavLink>
        <NavLink to="/dashboard/admin/verify" className={({isActive})=>`px-4 py-2 rounded-xl text-sm font-medium ${isActive?"bg-slate-900 text-white":"bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"}`}>Student Verification</NavLink>
        <NavLink to="/dashboard/admin/aid" className={({isActive})=>`px-4 py-2 rounded-xl text-sm font-medium ${isActive?"bg-slate-900 text-white":"bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"}`}>Aid Management</NavLink>
        <NavLink to="/dashboard/admin/reports" className={({isActive})=>`px-4 py-2 rounded-xl text-sm font-medium ${isActive?"bg-slate-900 text-white":"bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"}`}>Reports</NavLink>
        <NavLink to="/dashboard/admin/notifications" className={({isActive})=>`px-4 py-2 rounded-xl text-sm font-medium ${isActive?"bg-slate-900 text-white":"bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"}`}>Notifications</NavLink>
      </nav>
      <Outlet />
    </DashboardLayout>
  );
};

export default AdminDashboard;
