import { Navigate, Outlet } from 'react-router-dom';

export default function ProtectedRoute({ user, isLoading, requiredRoles }) {
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (requiredRoles && !requiredRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-2xl font-semibold text-red-600 mb-2">Access Denied</p>
          <p className="text-gray-500 text-sm">Your role (<span className="font-medium">{user.role}</span>) does not have permission to view this page.</p>
        </div>
      </div>
    );
  }
  return <Outlet />;
}
