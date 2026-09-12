import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MantineProvider, createTheme, Button } from '@mantine/core';
import { ToastProvider } from './components/ui/Toast';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import OfflineBanner from './components/OfflineBanner';
import PWAUpdatePrompt from './components/PWAUpdatePrompt';
import { useCurrentUser } from './hooks/useAuth';
import { initializeTheme, getEffectiveTheme } from './lib/theme';
import { mantineColors } from './lib/theme-tokens';
import { ROLES } from './utils/constants';
import simsLogo from './assets/sims-logo.png';
import { APP_SHORT_NAME } from './utils/branding';

import LoginPage          from './pages/auth/LoginPage';
import ChangePasswordPage from './pages/auth/ChangePasswordPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import UsersPage          from './pages/admin/UsersPage';
import StudentsPage       from './pages/admin/StudentsPage';
import CalendarPage       from './pages/admin/CalendarPage';
import SettingsPage from './pages/admin/SettingsPage';
import DutySlotsPage      from './pages/admin/DutySlotsPage';
import AttendanceLivePage from './pages/admin/AttendanceLivePage';
import ViolationsPage     from './pages/admin/ViolationsPage';
import FlaggedViolationsPage from './pages/admin/FlaggedViolationsPage';
import ReportsPage        from './pages/admin/ReportsPage';

import DashboardPage          from './pages/faculty/DashboardPage';
import SlotPickerPage         from './pages/faculty/SlotPickerPage';
import AllFacultyDutiesPage   from './pages/faculty/AllFacultyDutiesPage';
import AttendancePage         from './pages/faculty/AttendancePage';
import ViolationRecorderPage  from './pages/faculty/ViolationRecorderPage';

import MessagesPage     from './pages/shared/MessagesPage';
import NotificationsPage from './pages/NotificationsPage';
import SuperAdminDashboardPage from './pages/super-admin/SuperAdminDashboardPage';
import AuditLogsPage    from './pages/super-admin/AuditLogsPage';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
});

// ── Mantine theme wired to the DS token ramp (source of truth: index.css @theme) ──
// Color literals live in ./lib/theme-tokens.js (the one adapter — see its own
// header comment for the full per-shade mapping to index.css @theme). Shade
// index 6 == the DS "-600" step; index 5 == the "-solid"/"-500" step.
const mantineTheme = createTheme({
  primaryColor: 'blue',
  // Light: blue[6] #2563eb == --brand. Dark: blue[5] #3b82f6 == dark-mode --brand.
  primaryShade: { light: 6, dark: 5 },
  defaultRadius: 'md',
  colors: mantineColors,
  components: {
    // Mantine's size ramp tops out at md=42px; xs/sm are 30/36px — all below the
    // 44px touch-target floor. Enforce --control-min on every Button root so
    // Flag/Delete (xs), Check In (sm) and md actions clear the minimum app-wide.
    // Width is unaffected, so wide/fullWidth buttons look identical.
    Button: Button.extend({ styles: { root: { minHeight: 'var(--control-min)' } } }),
  },
});

function SplashScreen() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-[var(--surface-page)]">
      <div className="flex flex-col items-center gap-5 animate-pulse">
        <img src={simsLogo} alt="SIMS" className="w-16 h-16 rounded-xl object-contain" />
        <div className="text-center">
          <p className="text-lg font-bold text-[var(--text-primary)] tracking-tight">{APP_SHORT_NAME}</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">Loading…</p>
        </div>
      </div>
    </div>
  );
}

function AppRoutes() {
  const { data: user, isLoading } = useCurrentUser();

  const isFaculty = user?.role === ROLES.FACULTY;

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Root redirect */}
      <Route path="/" element={
        isLoading ? <SplashScreen /> :
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
        <Route path="/admin/flagged-violations" element={<FlaggedViolationsPage user={user} />} />
        <Route path="/admin/settings"         element={<SettingsPage user={user} />} />
        <Route path="/admin/messages"         element={<MessagesPage user={user} />} />
        <Route path="/admin/reports"          element={<ReportsPage user={user} />} />
      </Route>

      {/* Faculty routes — Faculty only */}
      <Route element={<ProtectedRoute user={user} isLoading={isLoading} requiredRoles={['faculty']} />}>
        <Route path="/faculty/dashboard"      element={<DashboardPage user={user} />} />
        <Route path="/faculty/slots"          element={<SlotPickerPage user={user} />} />
        <Route path="/faculty/all-duties"     element={<AllFacultyDutiesPage user={user} />} />
        <Route path="/faculty/attendance"     element={<AttendancePage user={user} />} />
        <Route path="/faculty/violations"     element={<ViolationRecorderPage user={user} />} />
        <Route path="/faculty/messages"       element={<MessagesPage user={user} />} />
      </Route>

      {/* Super Admin routes — Super Admin only */}
      <Route element={<ProtectedRoute user={user} isLoading={isLoading} requiredRoles={['super_admin']} />}>
        <Route path="/super-admin/dashboard"  element={<SuperAdminDashboardPage user={user} />} />
        <Route path="/super-admin/audit"      element={<AuditLogsPage user={user} />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  const [colorScheme, setColorScheme] = useState(getEffectiveTheme);

  useEffect(() => {
    initializeTheme();
    const handleThemeChange = () => setColorScheme(getEffectiveTheme());
    window.addEventListener('themechange', handleThemeChange);
    return () => window.removeEventListener('themechange', handleThemeChange);
  }, []);

  return (
    <MantineProvider
      forceColorScheme={colorScheme}
      theme={mantineTheme}
    >
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <PWAUpdatePrompt />
          <ErrorBoundary>
            <OfflineBanner />
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </ErrorBoundary>
        </ToastProvider>
      </QueryClientProvider>
    </MantineProvider>
  );
}
