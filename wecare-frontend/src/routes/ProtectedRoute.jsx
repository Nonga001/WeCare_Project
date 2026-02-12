import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useState, useEffect } from "react";
import { getSystemConfig } from "../services/configService";

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [configLoading, setConfigLoading] = useState(true);

  useEffect(() => {
    const checkMaintenance = async () => {
      try {
        const config = await getSystemConfig();
        setMaintenanceMode(config.maintenanceMode || false);
      } catch (err) {
        console.error("Failed to check maintenance mode:", err);
      } finally {
        setConfigLoading(false);
      }
    };
    checkMaintenance();
  }, []);

  if (loading || configLoading) return null;
  
  // Maintenance mode check - redirect everyone except superadmin
  if (maintenanceMode && user?.role !== "superadmin") {
    return <Navigate to="/maintenance" />;
  }

  if (!user) return <Navigate to="/" />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" />;
  }

  return children;
};

export default ProtectedRoute;