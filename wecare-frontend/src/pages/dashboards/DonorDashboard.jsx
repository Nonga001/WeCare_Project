// src/pages/dashboards/DonorDashboard.jsx
import DashboardLayout from "../../components/DashboardLayout";
import { NavLink, Outlet } from "react-router-dom";

const DonorDashboard = () => {
  return (
    <DashboardLayout title="Donor Dashboard 💰">
      <nav className="mb-6 flex flex-wrap gap-2">
        <NavLink to="/dashboard/donor" end className={({isActive})=>`px-4 py-2 rounded-xl text-sm font-medium ${isActive?"bg-slate-900 text-white":"bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"}`}>Home</NavLink>
        <NavLink to="/dashboard/donor/profile" className={({isActive})=>`px-4 py-2 rounded-xl text-sm font-medium ${isActive?"bg-slate-900 text-white":"bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"}`}>Profile</NavLink>
        <NavLink to="/dashboard/donor/donations" className={({isActive})=>`px-4 py-2 rounded-xl text-sm font-medium ${isActive?"bg-slate-900 text-white":"bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"}`}>Donations</NavLink>
        <NavLink to="/dashboard/donor/browse" className={({isActive})=>`px-4 py-2 rounded-xl text-sm font-medium ${isActive?"bg-slate-900 text-white":"bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"}`}>Browse Requests</NavLink>
        <NavLink to="/dashboard/donor/reports" className={({isActive})=>`px-4 py-2 rounded-xl text-sm font-medium ${isActive?"bg-slate-900 text-white":"bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"}`}>Reports</NavLink>
      </nav>
      <Outlet />
    </DashboardLayout>
  );
};

export default DonorDashboard;
