export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  FACULTY: 'faculty',
};

export const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  // Admin
  ADMIN_USERS:            '/admin/users',
  ADMIN_STUDENTS:         '/admin/students',
  ADMIN_CALENDAR:         '/admin/calendar',
  ADMIN_DUTY_SLOTS:       '/admin/duty-slots',
  ADMIN_ATTENDANCE:       '/admin/attendance',
  ADMIN_VIOLATIONS:       '/admin/violations',
  ADMIN_VIOLATION_TYPES:  '/admin/violation-types',
  ADMIN_COVER_REQUESTS:   '/admin/cover-requests',
  ADMIN_MESSAGES:         '/admin/messages',
  ADMIN_REPORTS:          '/admin/reports',
  // Faculty
  FACULTY_DASHBOARD:      '/faculty/dashboard',
  FACULTY_SLOTS:          '/faculty/slots',
  FACULTY_ATTENDANCE:     '/faculty/attendance',
  FACULTY_VIOLATIONS:     '/faculty/violations',
  FACULTY_COVER_REQUESTS: '/faculty/cover-requests',
  FACULTY_MESSAGES:       '/faculty/messages',
  // Super Admin
  SUPER_ADMIN_SESSIONS:   '/super-admin/sessions',
  SUPER_ADMIN_AUDIT:      '/super-admin/audit',
};

export const STATUS_COLORS = {
  active:       'bg-green-100 text-green-800',
  inactive:     'bg-gray-100 text-gray-600',
  pending:      'bg-yellow-100 text-yellow-800',
  open:         'bg-blue-100 text-blue-800',
  covered:      'bg-green-100 text-green-800',
  expired:      'bg-red-100 text-red-600',
  cancelled:    'bg-gray-100 text-gray-500',
  cover_pending:'bg-orange-100 text-orange-800',
  scheduled:    'bg-blue-100 text-blue-800',
  completed:    'bg-green-100 text-green-800',
  absent:       'bg-red-100 text-red-700',
  normal:       'bg-green-100 text-green-800',
  late:         'bg-yellow-100 text-yellow-800',
  hidden:       'bg-gray-100 text-gray-500',
};
