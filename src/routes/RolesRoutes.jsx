import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthProvider';

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

export const GuestRoute = ({ redirectPath = '/clients', children }) => {
  const { authenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (authenticated) return <Navigate to={redirectPath} replace />;

  return children || <Outlet />;
};