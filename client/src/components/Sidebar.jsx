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

      {/* Desktop sidebar — fixed on desktop */}
      <aside className="hidden md:flex w-[220px] bg-slate-900 text-slate-300 flex-col h-screen fixed md:sticky top-0 left-0 z-40 shrink-0 transition-all duration-300 border-r border-slate-800">

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

      {/* Mobile bottom sheet drawer */}
      <div
        className="md:hidden"
        style={{
          position: 'fixed',
          bottom: 60,
          left: 0,
          right: 0,
          backgroundColor: '#1e293b',
          borderRadius: '20px 20px 0 0',
          zIndex: 40,
          transform: open ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          maxHeight: '70vh',
          overflowY: 'auto',
          paddingBottom: 8,
        }}
      >
        {/* Handle bar */}
        <div style={{
          width: 36, height: 4, backgroundColor: '#475569',
          borderRadius: 2, margin: '12px auto 4px',
        }} />

        {/* User info strip */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 16px 14px',
          borderBottom: '1px solid #334155',
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            backgroundColor: '#3b82f6',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0,
          }}>
            {getInitials(user?.name)}
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.name}
            </p>
            <p style={{ fontSize: 11, color: '#64748b' }}>
              {getRoleSubtitle(user?.role)}
            </p>
          </div>
          <button
            onClick={() => setOpen(false)}
            style={{ marginLeft: 'auto', color: '#64748b', background: 'none',
              border: 'none', fontSize: 20, cursor: 'pointer', padding: 4 }}
          >
            ✕
          </button>
        </div>

        {/* 3-column grid of nav items */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 1,
          backgroundColor: '#334155',
          margin: '12px 12px 4px',
          borderRadius: 16,
          overflow: 'hidden',
        }}>
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={() => setOpen(false)}
              style={({ isActive }) => ({
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '14px 8px',
                backgroundColor: isActive ? '#2563eb' : '#1e293b',
                gap: 6,
                textDecoration: 'none',
              })}
            >
              <span style={{ fontSize: 22 }}>{link.emoji}</span>
              <span style={{
                fontSize: 10, fontWeight: 600, color: '#94a3b8',
                textTransform: 'uppercase', letterSpacing: '0.05em',
                textAlign: 'center', lineHeight: 1.2,
              }}>
                {link.label}
              </span>
            </NavLink>
          ))}
        </div>

        {/* Logout button */}
        <button
          onClick={() => { logout.mutate(); setOpen(false); }}
          style={{
            width: 'calc(100% - 24px)',
            margin: '8px 12px 4px',
            padding: '12px',
            backgroundColor: '#dc2626',
            color: '#fff',
            borderRadius: 12,
            border: 'none',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Log out
        </button>
      </div>

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
