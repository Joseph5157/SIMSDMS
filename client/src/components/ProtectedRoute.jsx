import { Navigate, Outlet, useLocation } from 'react-router-dom';

export default function ProtectedRoute({ user, isLoading, requiredRoles }) {
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;

  // If user must change password and is not already on the change-password page, redirect
  if (user.must_change_password && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  if (requiredRoles && !requiredRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <p className="text-2xl font-semibold text-red-600 mb-2">Access Denied</p>
          <p className="text-slate-500 text-sm">Your role (<span className="font-medium">{user.role}</span>) does not have permission to view this page.</p>
        </div>
      </div>
    );
  }
  return <Outlet />;
}
