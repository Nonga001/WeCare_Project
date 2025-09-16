import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";

import Landing from "../pages/Landing";
import Login from "../pages/auth/Login";
import RegisterStudent from "../pages/auth/RegisterStudent";
import RegisterDonor from "../pages/auth/RegisterDonor";
import RegisterAdmin from "../pages/auth/RegisterAdmin";

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register/student" element={<RegisterStudent />} />
        <Route path="/register/donor" element={<RegisterDonor />} />
        <Route path="/register/admin" element={<RegisterAdmin />} />

        {/* Protected dashboards */}
        <Route
          path="/student"
          element={
            <ProtectedRoute allowedRoles={["student"]}>
              <h1>Student Dashboard</h1>
            </ProtectedRoute>
          }
        />
        <Route
          path="/donor"
          element={
            <ProtectedRoute allowedRoles={["donor"]}>
              <h1>Donor Dashboard</h1>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <h1>Admin Dashboard</h1>
            </ProtectedRoute>
          }
        />
        <Route
          path="/super"
          element={
            <ProtectedRoute allowedRoles={["super_admin"]}>
              <h1>Super Admin Dashboard</h1>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;
