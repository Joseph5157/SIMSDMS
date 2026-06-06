import { NavLink } from 'react-router-dom';
import { ROUTES, ROLES } from '../utils/constants';
import { useLogout } from '../hooks/useAuth';

const adminLinks = [
  { to: ROUTES.ADMIN_USERS,           label: 'Users' },
  { to: ROUTES.ADMIN_STUDENTS,        label: 'Students' },
  { to: ROUTES.ADMIN_CALENDAR,        label: 'Calendar' },
  { to: ROUTES.ADMIN_DUTY_SLOTS,      label: 'Duty Slots' },
  { to: ROUTES.ADMIN_ATTENDANCE,      label: 'Attendance' },
  { to: ROUTES.ADMIN_VIOLATIONS,      label: 'Violations' },
  { to: ROUTES.ADMIN_VIOLATION_TYPES, label: 'Violation Types' },
  { to: ROUTES.ADMIN_COVER_REQUESTS,  label: 'Cover Requests' },
  { to: ROUTES.ADMIN_MESSAGES,        label: 'Messages' },
  { to: ROUTES.ADMIN_REPORTS,         label: 'Reports' },
];

const facultyLinks = [
  { to: ROUTES.FACULTY_DASHBOARD,      label: 'Dashboard' },
  { to: ROUTES.FACULTY_SLOTS,          label: 'My Slots' },
  { to: ROUTES.FACULTY_ATTENDANCE,     label: 'Attendance' },
  { to: ROUTES.FACULTY_VIOLATIONS,     label: 'Violations' },
  { to: ROUTES.FACULTY_COVER_REQUESTS, label: 'Cover Requests' },
  { to: ROUTES.FACULTY_MESSAGES,       label: 'Messages' },
];

const superAdminExtra = [
  { to: ROUTES.SUPER_ADMIN_SESSIONS, label: 'Session Reset' },
  { to: ROUTES.SUPER_ADMIN_AUDIT,    label: 'Audit Logs' },
];

export default function Sidebar({ user }) {
  const logout = useLogout();

  const links =
    user?.role === ROLES.FACULTY
      ? facultyLinks
      : user?.role === ROLES.SUPER_ADMIN
      ? [...adminLinks, ...superAdminExtra]
      : adminLinks;

  return (
    <aside className="w-56 bg-slate-900 text-slate-300 flex flex-col h-screen sticky top-0">
      <div className="px-5 py-5 border-b border-slate-700">
        <p className="text-white font-semibold text-sm leading-tight">SIMS DMS</p>
        <p className="text-slate-400 text-xs mt-0.5">Discipline Management</p>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors mb-0.5 ${
                isActive ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-300'
              }`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-slate-700">
        <p className="text-xs text-slate-400 truncate px-2 mb-2">{user?.name}</p>
        <button
          onClick={() => logout.mutate()}
          className="w-full text-left px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
        >
          Log out
        </button>
      </div>
    </aside>
  );
}
