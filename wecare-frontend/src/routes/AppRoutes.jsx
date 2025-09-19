import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";

import Landing from "../pages/Landing";
import PendingApproval from "../pages/PendingApproval";
import RegisterStudent from "../pages/auth/RegisterStudent";
import RegisterDonor from "../pages/auth/RegisterDonor";
import RegisterAdmin from "../pages/auth/RegisterAdmin";
import LoginAdmin from "../pages/auth/LoginAdmin";
import LoginDonor from "../pages/auth/LoginDonor";
import LoginStudent from "../pages/auth/LoginStudent";

// Import dashboards
import StudentDashboard from "../pages/dashboards/StudentDashboard";
import StudentHome from "../pages/dashboards/student/StudentHome";
import StudentProfile from "../pages/dashboards/student/StudentProfile";
import StudentAid from "../pages/dashboards/student/StudentAid";
import StudentSupport from "../pages/dashboards/student/StudentSupport";
import DonorDashboard from "../pages/dashboards/DonorDashboard";
import AdminDashboard from "../pages/dashboards/AdminDashboard";
import SuperAdminDashboard from "../pages/dashboards/SuperAdminDashboard";
import SuperAdminHome from "../pages/dashboards/superadmin/SuperAdminHome";
import SuperAdminProfile from "../pages/dashboards/superadmin/SuperAdminProfile";
import SuperAdminUsers from "../pages/dashboards/superadmin/SuperAdminUsers";
import SuperAdminSettings from "../pages/dashboards/superadmin/SuperAdminSettings";
import SuperAdminAnalytics from "../pages/dashboards/superadmin/SuperAdminAnalytics";
import DonorHome from "../pages/dashboards/donor/DonorHome";
import DonorProfile from "../pages/dashboards/donor/DonorProfile";
import Donations from "../pages/dashboards/donor/Donations";
import DonorReports from "../pages/dashboards/donor/DonorReports";
import BrowseRequests from "../pages/dashboards/donor/BrowseRequests";
import AdminHome from "../pages/dashboards/admin/AdminHome";
import AdminProfile from "../pages/dashboards/admin/AdminProfile";
import AdminVerify from "../pages/dashboards/admin/AdminVerify";
import AdminAid from "../pages/dashboards/admin/AdminAid";
import AdminReports from "../pages/dashboards/admin/AdminReports";
import AdminNotifications from "../pages/dashboards/admin/AdminNotifications";
import StudentNotifications from "../pages/dashboards/student/StudentNotifications";
import SuperAdminNotifications from "../pages/dashboards/superadmin/SuperAdminNotifications";

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Landing />} />
        <Route path="/login/student" element={<LoginStudent />} />
        <Route path="/login/donor" element={<LoginDonor />} />
        <Route path="/login/admin" element={<LoginAdmin />} />
        <Route path="/pending-approval" element={<PendingApproval />} />

        <Route path="/register/student" element={<RegisterStudent />} />
        <Route path="/register/donor" element={<RegisterDonor />} />
        <Route path="/register/admin" element={<RegisterAdmin />} />

        {/* Protected dashboards */}
        <Route
          path="/dashboard/student"
          element={
            <ProtectedRoute allowedRoles={["student", "superadmin"]}>
              <StudentDashboard />
            </ProtectedRoute>
          }
        >
          <Route index element={<StudentHome />} />
          <Route path="profile" element={<StudentProfile />} />
          <Route path="aid" element={<StudentAid />} />
          <Route path="support" element={<StudentSupport />} />
          <Route path="notifications" element={<StudentNotifications />} />
        </Route>
        <Route
          path="/dashboard/donor"
          element={
            <ProtectedRoute allowedRoles={["donor", "superadmin"]}>
              <DonorDashboard />
            </ProtectedRoute>
          }
        >
          <Route index element={<DonorHome />} />
          <Route path="profile" element={<DonorProfile />} />
          <Route path="donations" element={<Donations />} />
          <Route path="reports" element={<DonorReports />} />
          <Route path="browse" element={<BrowseRequests />} />
        </Route>
        <Route
          path="/dashboard/admin"
          element={
            <ProtectedRoute allowedRoles={["admin", "superadmin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminHome />} />
          <Route path="profile" element={<AdminProfile />} />
          <Route path="verify" element={<AdminVerify />} />
          <Route path="aid" element={<AdminAid />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="notifications" element={<AdminNotifications />} />
        </Route>
        <Route
          path="/dashboard/superadmin"
          element={
            <ProtectedRoute allowedRoles={["superadmin"]}>
              <SuperAdminDashboard />
            </ProtectedRoute>
          }
        >
          <Route index element={<SuperAdminHome />} />
          <Route path="profile" element={<SuperAdminProfile />} />
          <Route path="users" element={<SuperAdminUsers />} />
          <Route path="settings" element={<SuperAdminSettings />} />
          <Route path="analytics" element={<SuperAdminAnalytics />} />
          <Route path="notifications" element={<SuperAdminNotifications />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;
