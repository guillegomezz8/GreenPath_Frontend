import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthProvider';
import { normalizeRoleType } from '@/components/Utils';

const getHomePathByRole = (user) => {
  const roleType = normalizeRoleType(user?.role_type);
  if (roleType === "client") return "/my-requests";
  if (roleType === "worker") return "/routes";
  return "/dashboard";
};

export const UserRoute = ({ redirectPath = '/socialLogin', children }) => {
  const { authenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  if (!authenticated) return <Navigate to={redirectPath} replace />;

  return children || <Outlet />;
};

export const GuestRoute = ({ redirectPath, children }) => {
  const { authenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (authenticated) return <Navigate to={redirectPath || getHomePathByRole(user)} replace />;

  return children || <Outlet />;
};

export const RoleRoute = ({ allowedRoles = [], fallbackPath, children }) => {
  const { authenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!authenticated) return <Navigate to="/socialLogin" replace />;

  const roleType = normalizeRoleType(user?.role_type);
  if (allowedRoles.length > 0 && !allowedRoles.includes(roleType)) {
    return <Navigate to={fallbackPath || getHomePathByRole(user)} replace />;
  }

  return children || <Outlet />;
};

