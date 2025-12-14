import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin) {
    // Handle both roles (array) and role (string) for backward compatibility
    const userRoles = user?.roles || (user?.role ? [user.role] : []);
    const hasAdminRole = Array.isArray(userRoles) 
      ? userRoles.includes('ADMIN') 
      : userRoles === 'ADMIN' || user?.role === 'ADMIN';
    
    if (!hasAdminRole) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
