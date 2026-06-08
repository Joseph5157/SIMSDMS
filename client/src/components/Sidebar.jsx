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
  { to: ROUTES.ADMIN_DASHBOARD,       label: 'Dashboard',       icon: LayoutDashboard, emoji: '📊' },
  { to: ROUTES.ADMIN_USERS,           label: 'Users',           icon: Users, emoji: '👥' },
  { to: ROUTES.ADMIN_STUDENTS,        label: 'Students',        icon: GraduationCap, emoji: '🎓' },
  { to: ROUTES.ADMIN_CALENDAR,        label: 'Calendar',        icon: Calendar, emoji: '📅' },
  { to: ROUTES.ADMIN_DUTY_SLOTS,      label: 'Duty Slots',      icon: CalendarDays, emoji: '📆' },
  { to: ROUTES.ADMIN_ATTENDANCE,      label: 'Attendance',      icon: ClipboardCheck, emoji: '✓' },
  { to: ROUTES.ADMIN_VIOLATIONS,      label: 'Violations',      icon: AlertTriangle, emoji: '⚠️' },
  { to: ROUTES.ADMIN_VIOLATION_TYPES, label: 'Violation Types', icon: Tag, emoji: '🏷️' },
  { to: ROUTES.ADMIN_COVER_REQUESTS,  label: 'Cover Requests',  icon: ArrowLeftRight, emoji: '🔄' },
  { to: ROUTES.ADMIN_MESSAGES,        label: 'Messages',        icon: Mail, emoji: '✉️' },
  { to: ROUTES.ADMIN_REPORTS,         label: 'Reports',         icon: BarChart3, emoji: '📊' },
];

const facultyLinks = [
  { to: ROUTES.FACULTY_DASHBOARD,      label: 'Dashboard',      icon: LayoutDashboard, emoji: '📊' },
  { to: ROUTES.FACULTY_SLOTS,          label: 'My Slots',       icon: CalendarDays, emoji: '📆' },
  { to: ROUTES.FACULTY_ATTENDANCE,     label: 'Attendance',     icon: ClipboardCheck, emoji: '✓' },
  { to: ROUTES.FACULTY_VIOLATIONS,     label: 'Violations',     icon: AlertTriangle, emoji: '⚠️' },
  { to: ROUTES.FACULTY_COVER_REQUESTS, label: 'Cover Requests', icon: ArrowLeftRight, emoji: '🔄' },
  { to: ROUTES.FACULTY_MESSAGES,       label: 'Messages',       icon: Mail, emoji: '✉️' },
];

const superAdminExtra = [
  { to: ROUTES.SUPER_ADMIN_DASHBOARD, label: 'SA Dashboard',  icon: Zap, emoji: '⚡' },
  { to: ROUTES.SUPER_ADMIN_SESSIONS,  label: 'Session Reset', icon: KeyRound, emoji: '🔑' },
  { to: ROUTES.SUPER_ADMIN_AUDIT,     label: 'Audit Logs',    icon: ScrollText, emoji: '📋' },
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

      {/* Mobile bottom tab bar */}
      <nav style={{
        display: 'flex',
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 60,
        backgroundColor: '#0f172a',
        borderTop: '1px solid #1e293b',
        zIndex: 50,
        alignItems: 'stretch',
      }} className="md:hidden">
        {links.slice(0, 5).map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            style={({ isActive }) => ({
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              color: isActive ? '#60a5fa' : '#64748b',
              fontSize: 9,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              textDecoration: 'none',
              borderTop: isActive ? '2px solid #3b82f6' : '2px solid transparent',
            })}
          >
            <span style={{ fontSize: 18 }}>{link.emoji}</span>
            <span>{link.label.split(' ')[0]}</span>
          </NavLink>
        ))}
        {/* More button that opens the drawer */}
        <button
          onClick={() => setOpen(true)}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            color: '#64748b',
            fontSize: 9,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            background: 'none',
            border: 'none',
            borderTop: '2px solid transparent',
            cursor: 'pointer',
          }}
        >
          <span style={{ fontSize: 18 }}>☰</span>
          <span>More</span>
        </button>
      </nav>
    </>
  );
}
