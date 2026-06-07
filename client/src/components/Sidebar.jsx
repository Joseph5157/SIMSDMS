import { NavLink } from 'react-router-dom';
import { ROUTES, ROLES } from '../utils/constants';
import { useLogout } from '../hooks/useAuth';

const adminLinks = [
  { to: ROUTES.ADMIN_DASHBOARD,       label: 'Dashboard',       emoji: '🏠' },
  { to: ROUTES.ADMIN_USERS,           label: 'Users',           emoji: '👥' },
  { to: ROUTES.ADMIN_STUDENTS,        label: 'Students',        emoji: '🎓' },
  { to: ROUTES.ADMIN_CALENDAR,        label: 'Calendar',        emoji: '📅' },
  { to: ROUTES.ADMIN_DUTY_SLOTS,      label: 'Duty Slots',      emoji: '🗓' },
  { to: ROUTES.ADMIN_ATTENDANCE,      label: 'Attendance',      emoji: '✅' },
  { to: ROUTES.ADMIN_VIOLATIONS,      label: 'Violations',      emoji: '⚠️' },
  { to: ROUTES.ADMIN_VIOLATION_TYPES, label: 'Violation Types', emoji: '🏷' },
  { to: ROUTES.ADMIN_COVER_REQUESTS,  label: 'Cover Requests',  emoji: '🔄' },
  { to: ROUTES.ADMIN_MESSAGES,        label: 'Messages',        emoji: '✉️' },
  { to: ROUTES.ADMIN_REPORTS,         label: 'Reports',         emoji: '📊' },
];

const facultyLinks = [
  { to: ROUTES.FACULTY_DASHBOARD,      label: 'Dashboard',      emoji: '🏠' },
  { to: ROUTES.FACULTY_SLOTS,          label: 'My Slots',       emoji: '🗓' },
  { to: ROUTES.FACULTY_ATTENDANCE,     label: 'Attendance',     emoji: '✅' },
  { to: ROUTES.FACULTY_VIOLATIONS,     label: 'Violations',     emoji: '⚠️' },
  { to: ROUTES.FACULTY_COVER_REQUESTS, label: 'Cover Requests', emoji: '🔄' },
  { to: ROUTES.FACULTY_MESSAGES,       label: 'Messages',       emoji: '✉️' },
];

const superAdminExtra = [
  { to: ROUTES.SUPER_ADMIN_DASHBOARD, label: 'SA Dashboard',  emoji: '⚡' },
  { to: ROUTES.SUPER_ADMIN_SESSIONS,  label: 'Session Reset', emoji: '🔑' },
  { to: ROUTES.SUPER_ADMIN_AUDIT,     label: 'Audit Logs',    emoji: '📋' },
];

function getRoleSubtitle(role) {
  if (role === ROLES.SUPER_ADMIN) return 'Super Admin';
  if (role === ROLES.ADMIN)       return 'Admin Panel';
  if (role === ROLES.FACULTY)     return 'Faculty';
  return '';
}

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

export default function Sidebar({ user }) {
  const logout = useLogout();

  const links =
    user?.role === ROLES.FACULTY
      ? facultyLinks
      : user?.role === ROLES.SUPER_ADMIN
      ? [...adminLinks, ...superAdminExtra]
      : adminLinks;

  return (
    <aside className="w-[220px] bg-slate-900 text-slate-300 flex flex-col h-screen sticky top-0 shrink-0">
      {/* Brand */}
      <div className="px-5 py-4 border-b border-slate-800">
        <p className="text-white font-semibold text-[14px]">SIMS DMS</p>
        <p className="text-slate-400 text-[11px] mt-0.5">{getRoleSubtitle(user?.role)}</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-[8px] text-[13px] transition-colors mb-0.5 ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`
            }
          >
            <span>{link.emoji}</span>
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User block */}
      <div className="px-3 py-4 border-t border-slate-800">
        <div className="flex items-center gap-2.5 px-2 mb-1">
          <div className="w-8 h-8 bg-slate-700 text-white text-[11px] font-semibold rounded-full flex items-center justify-center shrink-0">
            {getInitials(user?.name)}
          </div>
          <p className="text-[12px] text-slate-300 truncate">{user?.name}</p>
        </div>
        <button
          onClick={() => logout.mutate()}
          className="w-full text-left px-3 py-2 text-[12px] text-slate-400 hover:text-white hover:bg-slate-800 rounded-[8px] transition-colors mt-1"
        >
          Log out
        </button>
      </div>
    </aside>
  );
}
