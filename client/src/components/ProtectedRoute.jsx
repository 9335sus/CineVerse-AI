import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';

export default function ProtectedRoute({ children, role }) {
  const { user, ready } = useSelector((s) => s.auth);
  const loc = useLocation();
  if (!ready) return null;
  if (!user) return <Navigate to="/login" state={{ from: loc.pathname + loc.search }} replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return children;
}
