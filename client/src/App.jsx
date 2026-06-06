import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import LoginPage from './pages/auth/LoginPage';
import UsersPage from './pages/admin/UsersPage';
import DashboardPage from './pages/faculty/DashboardPage';
import SessionResetPage from './pages/super-admin/SessionResetPage';
import ProtectedRoute from './components/ProtectedRoute';
import { useCurrentUser } from './hooks/useAuth';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

function AppRoutes() {
  const { data: user, isLoading } = useCurrentUser();

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute user={user} isLoading={isLoading} />}>
        <Route path="/dashboard" element={
          <Navigate to={user?.role === 'faculty' ? '/faculty/dashboard' : '/admin/users'} replace />
        } />
        <Route path="/faculty/dashboard" element={<DashboardPage />} />
      </Route>

      <Route element={<ProtectedRoute user={user} isLoading={isLoading} />}>
        <Route path="/admin/users" element={<UsersPage />} />
        <Route path="/admin/sessions" element={<SessionResetPage />} />
      </Route>

      <Route path="/" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
