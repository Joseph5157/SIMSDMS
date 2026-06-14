import { Navigate, Outlet, useLocation } from 'react-router-dom';

export default function ProtectedRoute({ user, isLoading, requiredRoles }) {
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="flex flex-col items-center gap-4">
          {/* Animated spinner */}
          <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          {/* Status text */}
          <div className="text-center">
            <p className="text-sm font-medium text-slate-900">Verifying access</p>
            <p className="text-xs text-slate-500 mt-1">Please wait…</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  // If user must change password and is not already on the change-password page, redirect
  if (user.must_change_password && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  if (requiredRoles) {
    const userRole = user.role?.toLowerCase();
    const hasAccess = requiredRoles.some(role => role.toLowerCase() === userRole);
    if (!hasAccess) {
      return (
        <div className="min-h-dvh flex items-center justify-center bg-slate-50">
          <div className="text-center">
            <div className="text-4xl mb-4">🔐</div>
            <p className="text-xl font-semibold text-red-600 mb-2">Access Denied</p>
            <p className="text-slate-500 text-sm">Your role (<span className="font-medium">{user.role}</span>) doesn't have access to this page.</p>
          </div>
        </div>
      );
    }
  }

  return <Outlet />;
}
