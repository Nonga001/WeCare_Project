// src/pages/dashboards/DonorDashboard.jsx
import DashboardLayout from "../../components/DashboardLayout";
import { Outlet } from "react-router-dom";

const DonorDashboard = () => {
  return (
    <DashboardLayout title="Donor Dashboard 💰">
      <div className="w-full">
        <div className="mt-6">
          <Outlet />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DonorDashboard;
