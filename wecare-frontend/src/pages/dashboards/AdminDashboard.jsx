// src/pages/dashboards/AdminDashboard.jsx
import DashboardLayout from "../../components/DashboardLayout";
import { Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const AdminDashboard = () => {
  const { user } = useAuth();
  const isApproved = user?.isApproved === true;

  return (
    <DashboardLayout title="Admin Dashboard 🔑">
      <div className="w-full">
        <div className="mt-6">
          <Outlet />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
