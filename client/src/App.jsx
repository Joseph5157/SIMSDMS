import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from './components/ui/Toast';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import OfflineBanner from './components/OfflineBanner';
import { useCurrentUser } from './hooks/useAuth';
import { initializeTheme } from './lib/theme';
import { ROLES } from './utils/constants';

import LoginPage          from './pages/auth/LoginPage';
import ChangePasswordPage from './pages/auth/ChangePasswordPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import UsersPage          from './pages/admin/UsersPage';
import StudentsPage       from './pages/admin/StudentsPage';
import CalendarPage       from './pages/admin/CalendarPage';
import DutySlotsPage      from './pages/admin/DutySlotsPage';
import AttendanceLivePage from './pages/admin/AttendanceLivePage';
import ViolationsPage     from './pages/admin/ViolationsPage';
import ViolationTypesPage from './pages/admin/ViolationTypesPage';
import CoverRequestsAdminPage from './pages/admin/CoverRequestsPage';
import ReportsPage        from './pages/admin/ReportsPage';

import DashboardPage          from './pages/faculty/DashboardPage';
import SlotPickerPage         from './pages/faculty/SlotPickerPage';
import AttendancePage         from './pages/faculty/AttendancePage';
import ViolationRecorderPage  from './pages/faculty/ViolationRecorderPage';
import FacultyCoverRequestsPage from './pages/faculty/CoverRequestsPage';

import MessagesPage     from './pages/shared/MessagesPage';
import NotificationsPage from './pages/NotificationsPage';
import SuperAdminDashboardPage from './pages/super-admin/SuperAdminDashboardPage';
import SessionResetPage from './pages/super-admin/SessionResetPage';
import AuditLogsPage    from './pages/super-admin/AuditLogsPage';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
});

function AppRoutes() {
  const { data: user, isLoading } = useCurrentUser();

  const isFaculty = user?.role === ROLES.FACULTY;

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Root redirect */}
      <Route path="/" element={
        isLoading ? null :
        !user ? <Navigate to="/login" replace /> :
        user.must_change_password ? <Navigate to="/change-password" replace /> :
        isFaculty ? <Navigate to="/faculty/dashboard" replace /> :
        <Navigate to="/admin/dashboard" replace />
      } />

      {/* Change password route — authenticated users only */}
      <Route element={<ProtectedRoute user={user} isLoading={isLoading} />}>
        <Route path="/change-password" element={<ChangePasswordPage />} />
      </Route>

      {/* Shared authenticated routes */}
      <Route element={<ProtectedRoute user={user} isLoading={isLoading} />}>
        <Route path="/notifications"          element={<NotificationsPage user={user} />} />
      </Route>

      {/* Admin routes — Admin and Super Admin only */}
      <Route element={<ProtectedRoute user={user} isLoading={isLoading} requiredRoles={['admin', 'super_admin']} />}>
        <Route path="/admin/dashboard"        element={<AdminDashboardPage user={user} />} />
        <Route path="/admin/users"            element={<UsersPage user={user} />} />
        <Route path="/admin/students"         element={<StudentsPage user={user} />} />
        <Route path="/admin/calendar"         element={<CalendarPage user={user} />} />
        <Route path="/admin/duty-slots"       element={<DutySlotsPage user={user} />} />
        <Route path="/admin/attendance"       element={<AttendanceLivePage user={user} />} />
        <Route path="/admin/violations"       element={<ViolationsPage user={user} />} />
        <Route path="/admin/violation-types"  element={<ViolationTypesPage user={user} />} />
        <Route path="/admin/cover-requests"   element={<CoverRequestsAdminPage user={user} />} />
        <Route path="/admin/messages"         element={<MessagesPage user={user} />} />
        <Route path="/admin/reports"          element={<ReportsPage user={user} />} />
      </Route>

      {/* Faculty routes — Faculty only */}
      <Route element={<ProtectedRoute user={user} isLoading={isLoading} requiredRoles={['faculty']} />}>
        <Route path="/faculty/dashboard"      element={<DashboardPage user={user} />} />
        <Route path="/faculty/slots"          element={<SlotPickerPage user={user} />} />
        <Route path="/faculty/attendance"     element={<AttendancePage user={user} />} />
        <Route path="/faculty/violations"     element={<ViolationRecorderPage user={user} />} />
        <Route path="/faculty/cover-requests" element={<FacultyCoverRequestsPage user={user} />} />
        <Route path="/faculty/messages"       element={<MessagesPage user={user} />} />
      </Route>

      {/* Super Admin routes — Super Admin only */}
      <Route element={<ProtectedRoute user={user} isLoading={isLoading} requiredRoles={['super_admin']} />}>
        <Route path="/super-admin/dashboard"  element={<SuperAdminDashboardPage user={user} />} />
        <Route path="/super-admin/sessions"   element={<SessionResetPage user={user} />} />
        <Route path="/super-admin/audit"      element={<AuditLogsPage user={user} />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  useEffect(() => {
    initializeTheme();
  }, []);

  // Service worker disabled during active development to prevent stale cache issues
  // TODO: Re-enable after layout/styling changes stabilize
  // useEffect(() => {
  //   if ('serviceWorker' in navigator) {
  //     navigator.serviceWorker
  //       .register('/service-worker.js')
  //       .then((reg) => {
  //         console.log('Service Worker registered:', reg);
  //       })
  //       .catch((err) => {
  //         console.warn('Service Worker registration failed:', err);
  //       });
  //   }
  // }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ErrorBoundary>
          <OfflineBanner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </ErrorBoundary>
      </ToastProvider>
    </QueryClientProvider>
  );
}
