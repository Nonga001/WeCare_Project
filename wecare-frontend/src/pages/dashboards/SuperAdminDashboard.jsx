import DashboardLayout from "../../components/DashboardLayout";
import { Outlet } from "react-router-dom";

const SuperAdminDashboard = () => {
  return (
    <DashboardLayout title="Super Admin Dashboard 🛡️">
      <div className="w-full">
        <div className="mt-6">
          <Outlet />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SuperAdminDashboard;


