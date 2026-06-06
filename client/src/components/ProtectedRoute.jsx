// Phase D — full implementation
import { Navigate, Outlet } from 'react-router-dom';

export default function ProtectedRoute({ user, isLoading, requiredRole }) {
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (requiredRole && user.role !== requiredRole) {
    return <div className="p-6 text-red-600">Access denied.</div>;
  }
  return <Outlet />;
}
