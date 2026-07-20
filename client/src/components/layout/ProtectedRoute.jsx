import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

// Wrap any route element that requires login:
// <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  // While we're still checking localStorage/verifying the token, don't
  // redirect yet - that would bounce a logged-in user to /login for a
  // split second on every refresh.
  if (loading) {
    return <div className="route-loading">Loading…</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
