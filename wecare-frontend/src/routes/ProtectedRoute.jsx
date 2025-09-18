import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = useAuth();

  if (!user) return <Navigate to="/" />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" />;
  }

  // Gate unapproved users (admins and students) from dashboards/actions
  if ((user.role === "admin" || user.role === "student") && user.isApproved === false) {
    return <Navigate to="/pending-approval" />;
  }

  return children;
};

export default ProtectedRoute;