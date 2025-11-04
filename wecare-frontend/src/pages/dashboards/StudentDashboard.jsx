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
        <div className="mt-6">
          <Outlet />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default StudentDashboard;
