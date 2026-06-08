import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, GraduationCap, Calendar, CalendarDays,
  ClipboardCheck, AlertTriangle, Tag, ArrowLeftRight, Mail, BarChart3,
  Zap, KeyRound, ScrollText, X
} from 'lucide-react';
import { ROUTES, ROLES } from '../utils/constants';
import { useLogout } from '../hooks/useAuth';

const adminLinks = [
  { to: ROUTES.ADMIN_DASHBOARD,       label: 'Dashboard',       icon: LayoutDashboard },
  { to: ROUTES.ADMIN_USERS,           label: 'Users',           icon: Users },
  { to: ROUTES.ADMIN_STUDENTS,        label: 'Students',        icon: GraduationCap },
  { to: ROUTES.ADMIN_CALENDAR,        label: 'Calendar',        icon: Calendar },
  { to: ROUTES.ADMIN_DUTY_SLOTS,      label: 'Duty Slots',      icon: CalendarDays },
  { to: ROUTES.ADMIN_ATTENDANCE,      label: 'Attendance',      icon: ClipboardCheck },
  { to: ROUTES.ADMIN_VIOLATIONS,      label: 'Violations',      icon: AlertTriangle },
  { to: ROUTES.ADMIN_VIOLATION_TYPES, label: 'Violation Types', icon: Tag },
  { to: ROUTES.ADMIN_COVER_REQUESTS,  label: 'Cover Requests',  icon: ArrowLeftRight },
  { to: ROUTES.ADMIN_MESSAGES,        label: 'Messages',        icon: Mail },
  { to: ROUTES.ADMIN_REPORTS,         label: 'Reports',         icon: BarChart3 },
];

const facultyLinks = [
  { to: ROUTES.FACULTY_DASHBOARD,      label: 'Dashboard',      icon: LayoutDashboard },
  { to: ROUTES.FACULTY_SLOTS,          label: 'My Slots',       icon: CalendarDays },
  { to: ROUTES.FACULTY_ATTENDANCE,     label: 'Attendance',     icon: ClipboardCheck },
  { to: ROUTES.FACULTY_VIOLATIONS,     label: 'Violations',     icon: AlertTriangle },
  { to: ROUTES.FACULTY_COVER_REQUESTS, label: 'Cover Requests', icon: ArrowLeftRight },
  { to: ROUTES.FACULTY_MESSAGES,       label: 'Messages',       icon: Mail },
];

const superAdminExtra = [
  { to: ROUTES.SUPER_ADMIN_DASHBOARD, label: 'SA Dashboard',  icon: Zap },
  { to: ROUTES.SUPER_ADMIN_SESSIONS,  label: 'Session Reset', icon: KeyRound },
  { to: ROUTES.SUPER_ADMIN_AUDIT,     label: 'Audit Logs',    icon: ScrollText },
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
  const [open, setOpen] = useState(false);

  const links =
    user?.role === ROLES.FACULTY
      ? facultyLinks
      : user?.role === ROLES.SUPER_ADMIN
      ? [...adminLinks, ...superAdminExtra]
      : adminLinks;

  return (
    <>
      {/* Mobile backdrop — closes sidebar when tapped */}
      {open && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Hamburger button — visible only on mobile */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden fixed top-3 left-3 z-50 w-9 h-9 bg-slate-900 text-white rounded-lg flex items-center justify-center shadow-lg hover:bg-slate-800 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Sidebar — drawer on mobile, fixed on desktop */}
      <aside className={`${
        open ? 'flex' : 'hidden'
      } md:flex w-[220px] bg-slate-900 text-slate-300 flex-col h-screen fixed md:sticky top-0 left-0 z-40 shrink-0 transition-all duration-300 border-r border-slate-800`}>

        {/* Close button — visible only on mobile */}
        <button
          onClick={() => setOpen(false)}
          className="md:hidden absolute top-3 right-3 text-slate-400 hover:text-white p-1"
        >
          <X size={20} strokeWidth={2} />
        </button>

        {/* Brand */}
        <div className="px-5 py-4 border-b border-slate-800 mt-10 md:mt-0">
          <p className="text-white font-semibold text-[14px]">SIMS DMS</p>
          <p className="text-slate-400 text-[11px] mt-0.5">{getRoleSubtitle(user?.role)}</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-colors mb-0.5 ${
                  isActive
                    ? 'bg-blue-600/90 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`
              }
            >
              <link.icon size={16} strokeWidth={1.75} className="flex-shrink-0" />
              <span>{link.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User block */}
        <div className="px-3 py-4 border-t border-slate-800">
          <div className="flex items-center gap-2.5 px-2 mb-1">
            <div className="w-8 h-8 bg-slate-700 text-white text-[11px] font-semibold rounded-full flex items-center justify-center flex-shrink-0">
              {getInitials(user?.name)}
            </div>
            <p className="text-[12px] text-slate-300 truncate">{user?.name}</p>
          </div>
          <button
            onClick={() => logout.mutate()}
            className="w-full text-left px-3 py-2 text-[12px] text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors mt-1"
          >
            Log out
          </button>
        </div>
      </aside>
    </>
  );
}
