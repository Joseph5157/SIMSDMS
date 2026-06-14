import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, GraduationCap, Calendar, CalendarDays,
  ClipboardCheck, AlertTriangle, Tag, ArrowLeftRight, Mail, BarChart3,
  Zap, KeyRound, ScrollText, LogOut, X, ChevronRight,
} from 'lucide-react';
import { ROUTES, ROLES } from '../utils/constants';
import { useLogout } from '../hooks/useAuth';

const adminLinks = [
  { to: ROUTES.ADMIN_DASHBOARD,       label: 'Dashboard',       icon: LayoutDashboard, emoji: '📊' },
  { to: ROUTES.ADMIN_USERS,           label: 'Users',           icon: Users,           emoji: '👥' },
  { to: ROUTES.ADMIN_STUDENTS,        label: 'Students',        icon: GraduationCap,   emoji: '🎓' },
  { to: ROUTES.ADMIN_CALENDAR,        label: 'Calendar',        icon: Calendar,        emoji: '📅' },
  { to: ROUTES.ADMIN_DUTY_SLOTS,      label: 'Duty Slots',      icon: CalendarDays,    emoji: '📆' },
  { to: ROUTES.ADMIN_ATTENDANCE,      label: 'Attendance',      icon: ClipboardCheck,  emoji: '✅' },
  { to: ROUTES.ADMIN_VIOLATIONS,      label: 'Violations',      icon: AlertTriangle,   emoji: '⚠️' },
  { to: ROUTES.ADMIN_VIOLATION_TYPES, label: 'Viol. Types',     icon: Tag,             emoji: '🏷️' },
  { to: ROUTES.ADMIN_COVER_REQUESTS,  label: 'Cover Requests',  icon: ArrowLeftRight,  emoji: '🔄' },
  { to: ROUTES.ADMIN_MESSAGES,        label: 'Messages',        icon: Mail,            emoji: '✉️' },
  { to: ROUTES.ADMIN_REPORTS,         label: 'Reports',         icon: BarChart3,       emoji: '📊' },
];

const facultyLinks = [
  { to: ROUTES.FACULTY_DASHBOARD,      label: 'Dashboard',      icon: LayoutDashboard, emoji: '📊' },
  { to: ROUTES.FACULTY_SLOTS,          label: 'My Slots',       icon: CalendarDays,    emoji: '📆' },
  { to: ROUTES.FACULTY_ATTENDANCE,     label: 'Attendance',     icon: ClipboardCheck,  emoji: '✅' },
  { to: ROUTES.FACULTY_VIOLATIONS,     label: 'Violations',     icon: AlertTriangle,   emoji: '⚠️' },
  { to: ROUTES.FACULTY_COVER_REQUESTS, label: 'Cover Requests', icon: ArrowLeftRight,  emoji: '🔄' },
  { to: ROUTES.FACULTY_MESSAGES,       label: 'Messages',       icon: Mail,            emoji: '✉️' },
];

const superAdminExtra = [
  { to: ROUTES.SUPER_ADMIN_DASHBOARD, label: 'SA Dashboard',  icon: Zap,        emoji: '⚡' },
  { to: ROUTES.SUPER_ADMIN_SESSIONS,  label: 'Sessions',      icon: KeyRound,   emoji: '🔑' },
  { to: ROUTES.SUPER_ADMIN_AUDIT,     label: 'Audit Logs',    icon: ScrollText, emoji: '📋' },
];

function getRoleLabel(role) {
  if (role === ROLES.SUPER_ADMIN) return 'Super Admin';
  if (role === ROLES.ADMIN)       return 'Admin Panel';
  if (role === ROLES.FACULTY)     return 'Faculty Portal';
  return '';
}

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

/* ── Desktop nav link ── */
function DesktopNavLink({ to, icon: Icon, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => [
        'flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium mb-0.5',
        'transition-colors duration-150',
        isActive
          ? 'bg-blue-600 text-white shadow-sm'
          : 'text-slate-400 hover:text-white hover:bg-slate-800',
      ].join(' ')}
    >
      <Icon size={15} strokeWidth={2} className="flex-shrink-0" />
      <span className="truncate">{label}</span>
    </NavLink>
  );
}

export default function Sidebar({ user }) {
  const logout = useLogout();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const links =
    user?.role === ROLES.FACULTY
      ? facultyLinks
      : user?.role === ROLES.SUPER_ADMIN
      ? [...adminLinks, ...superAdminExtra]
      : adminLinks;

  return (
    <>
      {/* ── Desktop sidebar ───────────────────────── */}
      <aside
        className="hidden md:flex flex-col shrink-0"
        style={{
          width: 'var(--sidebar-w)',
          height: '100vh',
          position: 'sticky',
          top: 0,
          backgroundColor: 'var(--surface-sidebar)',
          borderRight: '1px solid var(--surface-sidebar-hover)',
          zIndex: 40,
        }}
      >
        {/* Brand */}
        <div style={{
          padding: '16px 16px 14px',
          borderBottom: '1px solid var(--surface-sidebar-hover)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <div style={{
              width: 28, height: 28,
              borderRadius: 'var(--radius-md)',
              background: 'var(--brand-gradient)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, flexShrink: 0,
            }}>
              🎓
            </div>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-on-dark)' }}>SIMS DMS</p>
          </div>
          <p style={{ fontSize: 11, color: 'var(--color-sidebar-text)', paddingLeft: 36 }}>
            {getRoleLabel(user?.role)}
          </p>
        </div>

        {/* Nav links */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 10px' }}>
          {links.map((link) => (
            <DesktopNavLink key={link.to} {...link} />
          ))}
        </nav>

        {/* User block */}
        <div style={{
          padding: '12px 10px',
          borderTop: '1px solid var(--surface-sidebar-hover)',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '6px 10px', marginBottom: 4,
          }}>
            <div style={{
              width: 30, height: 30,
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'rgba(37,99,235,0.2)',
              border: '1px solid var(--brand)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, color: 'var(--color-blue-400)',
              flexShrink: 0,
            }}>
              {getInitials(user?.name)}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{
                fontSize: 12, fontWeight: 600, color: 'var(--text-on-dark)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {user?.name}
              </p>
            </div>
          </div>
          <button
            onClick={() => logout.mutate()}
            style={{
              width: '100%',
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 10px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(239,68,68,0.25)',
              backgroundColor: 'rgba(239,68,68,0.1)',
              cursor: 'pointer',
              fontSize: 12,
              color: 'var(--color-red-tint)',
              fontWeight: 500,
              transition: 'all var(--dur-fast)',
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--color-red-solid)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = 'var(--color-red-tint)'; }}
          >
            <LogOut size={13} strokeWidth={2} />
            Log out
          </button>
        </div>
      </aside>

      {/* ── Mobile backdrop ────────────────────────── */}
      {drawerOpen && (
        <div
          className="md:hidden"
          style={{
            position: 'fixed', inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 30,
            backdropFilter: 'blur(2px)',
          }}
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* ── Mobile drawer ──────────────────────────── */}
      <div
        className="md:hidden"
        style={{
          position: 'fixed',
          bottom: 60,
          left: 0, right: 0,
          backgroundColor: 'var(--surface-sidebar)',
          borderRadius: 'var(--radius-3xl) var(--radius-3xl) 0 0',
          borderTop: '1px solid var(--surface-sidebar-hover)',
          zIndex: 40,
          transform: drawerOpen ? 'translateY(0)' : 'translateY(100%)',
          transition: `transform var(--dur-sheet) var(--ease-sheet)`,
          maxHeight: 'calc(100vh - 100px)',
          overflowY: 'auto',
          paddingBottom: 16,
        }}
      >
        {/* Handle */}
        <div style={{
          width: 36, height: 4, backgroundColor: 'var(--color-slate-700)',
          borderRadius: 2, margin: '12px auto 0',
        }} />

        {/* User info */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 16px 12px',
          borderBottom: '1px solid var(--surface-sidebar-hover)',
          marginTop: 8,
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: 'var(--radius-full)',
            background: 'var(--brand-gradient-deep)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0,
          }}>
            {getInitials(user?.name)}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-on-dark)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.name}
            </p>
            <p style={{ fontSize: 11, color: 'var(--color-sidebar-text)' }}>{getRoleLabel(user?.role)}</p>
          </div>
          <button
            onClick={() => setDrawerOpen(false)}
            style={{ color: 'var(--color-sidebar-text)', background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', borderRadius: 'var(--radius-sm)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* 3-col grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '1px',
          backgroundColor: 'var(--surface-sidebar-hover)',
          margin: '12px 12px 0',
          borderRadius: 'var(--radius-2xl)',
          overflow: 'hidden',
        }}>
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={() => setDrawerOpen(false)}
              style={({ isActive }) => ({
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '14px 8px',
                backgroundColor: isActive ? 'rgba(37,99,235,0.2)' : 'var(--surface-sidebar)',
                gap: 5,
                textDecoration: 'none',
                borderBottom: isActive ? `2px solid var(--color-blue-500)` : '2px solid transparent',
              })}
            >
              <span style={{ fontSize: 20 }}>{link.emoji}</span>
              <span style={{
                fontSize: 9, fontWeight: 600, color: 'var(--color-sidebar-text)',
                textTransform: 'uppercase', letterSpacing: 'var(--tracking-label)',
                textAlign: 'center', lineHeight: 1.2,
              }}>
                {link.label}
              </span>
            </NavLink>
          ))}
        </div>

        {/* Logout */}
        <button
          onClick={() => { logout.mutate(); setDrawerOpen(false); }}
          style={{
            width: 'calc(100% - 24px)',
            margin: '10px 12px 0',
            padding: '11px',
            backgroundColor: 'var(--surface-sidebar-hover)',
            color: 'var(--color-red-solid)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid rgba(239,68,68,0.2)',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          <LogOut size={14} />
          Log out
        </button>
      </div>

      {/* ── Mobile bottom tab bar ──────────────────── */}
      <nav
        className="md:hidden"
        style={{
          display: 'flex',
          position: 'fixed',
          bottom: 0, left: 0, right: 0,
          height: 'var(--tabbar-h)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          backgroundColor: 'var(--surface-sidebar)',
          borderTop: '1px solid var(--surface-sidebar-hover)',
          zIndex: 50,
          alignItems: 'stretch',
        }}
      >
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
              color: isActive ? 'var(--color-blue-400)' : 'var(--color-sidebar-text)',
              fontSize: 'var(--text-nano)',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: 'var(--tracking-label)',
              textDecoration: 'none',
              borderTop: isActive ? `2px solid var(--color-blue-500)` : '2px solid transparent',
              transition: `color var(--dur-fast)`,
            })}
          >
            <span style={{ fontSize: 18 }}>{link.emoji}</span>
            <span>{link.label.split(' ')[0]}</span>
          </NavLink>
        ))}
        {/* More button */}
        <button
          onClick={() => setDrawerOpen(true)}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            color: drawerOpen ? 'var(--color-blue-400)' : 'var(--color-sidebar-text)',
            fontSize: 'var(--text-nano)',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: 'var(--tracking-label)',
            background: 'none',
            border: 'none',
            borderTop: drawerOpen ? `2px solid var(--color-blue-500)` : '2px solid transparent',
            cursor: 'pointer',
            transition: `color var(--dur-fast)`,
          }}
        >
          <span style={{ fontSize: 18 }}>☰</span>
          <span>More</span>
        </button>
      </nav>
    </>
  );
}
