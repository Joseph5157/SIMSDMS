export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  FACULTY: 'faculty',
};

export const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  // Admin
  ADMIN_DASHBOARD:        '/admin/dashboard',
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
  SUPER_ADMIN_DASHBOARD:  '/super-admin/dashboard',
  SUPER_ADMIN_SESSIONS:   '/super-admin/sessions',
  SUPER_ADMIN_AUDIT:      '/super-admin/audit',
};

export const STATUS_COLORS = {
  active:          'bg-green-100 text-green-700',
  inactive:        'bg-slate-100 text-slate-500',
  pending:         'bg-amber-100 text-amber-700',
  open:            'bg-blue-100 text-blue-700',
  covered:         'bg-green-100 text-green-700',
  expired:         'bg-red-100 text-red-600',
  cancelled:       'bg-slate-100 text-slate-500',
  cover_pending:   'bg-orange-100 text-orange-600',
  scheduled:       'bg-blue-100 text-blue-700',
  completed:       'bg-green-100 text-green-700',
  absent:          'bg-red-100 text-red-600',
  normal:          'bg-green-100 text-green-700',
  late:            'bg-amber-100 text-amber-600',
  hidden:          'bg-slate-100 text-slate-500',
  flagged:         'bg-amber-100 text-amber-700',
  not_checked_in:  'bg-slate-100 text-slate-500',
  checked_in:      'bg-blue-100 text-blue-700',
  checked_out:     'bg-green-100 text-green-700',
};

export const ROLE_COLORS = {
  super_admin: 'bg-purple-100 text-purple-700',
  admin:       'bg-amber-100 text-amber-700',
  faculty:     'bg-blue-100 text-blue-700',
};
