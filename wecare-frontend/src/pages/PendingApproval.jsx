import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const PendingApproval = () => {
  const { user } = useAuth();
  const roleLabel = user?.role === "admin" ? "Super Admin" : "University Admin";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-50 via-white to-amber-50 px-4">
      <div className="w-full max-w-lg bg-white border border-amber-200 rounded-2xl shadow p-8 text-center">
        <h1 className="text-2xl font-bold text-amber-800 mb-3">Account Pending Approval</h1>
        <p className="text-amber-700 mb-6">
          Your account has been created but is awaiting approval by {roleLabel}.
          You can log in, but access to dashboard features is restricted until approval.
        </p>
        <div className="space-x-3">
          <Link to="/" className="inline-block px-5 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-700">Home</Link>
          <Link to={`/login/${user?.role || "student"}`} className="inline-block px-5 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200">Back to Login</Link>
        </div>
      </div>
    </div>
  );
};

export default PendingApproval;


