import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, GraduationCap, Calendar, CalendarDays,
  ClipboardCheck, AlertTriangle, Tag, ArrowLeftRight, Mail, BarChart3,
  Zap, KeyRound, ScrollText, LogOut, X, ChevronRight,
} from 'lucide-react';
import { ROUTES, ROLES } from '../utils/constants';
import { useLogout } from '../hooks/useAuth';
import { cycleTheme, getThemeIcon, getThemeLabel } from '../lib/theme';
import MobileNav from './MobileNav';

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
  const [themeIcon, setThemeIcon] = useState('🖥️');

  useEffect(() => {
    setThemeIcon(getThemeIcon());
    const handleThemeChange = () => setThemeIcon(getThemeIcon());
    window.addEventListener('themechange', handleThemeChange);
    return () => window.removeEventListener('themechange', handleThemeChange);
  }, []);

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
          zIndex: 10,
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
        <nav aria-label="Main navigation" style={{ flex: 1, overflowY: 'auto', padding: '8px 10px' }}>
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
          {/* Theme toggle hidden - dark mode disabled for now */}
          {/* <button
            onClick={() => cycleTheme()}
            aria-label={`Toggle theme: currently ${getThemeLabel()}`}
            title={`Theme: ${getThemeLabel()}`}
            style={{
              width: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '8px 10px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(96,165,250,0.25)',
              backgroundColor: 'rgba(96,165,250,0.1)',
              cursor: 'pointer',
              fontSize: 12,
              color: 'var(--color-blue-400)',
              fontWeight: 500,
              transition: 'all var(--dur-fast)',
              marginBottom: 6,
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(96,165,250,0.2)'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(96,165,250,0.1)'; }}
          >
            <span style={{ fontSize: 14 }}>{themeIcon}</span>
            Theme
          </button> */}
          <button
            onClick={() => logout.mutate()}
            aria-label="Log out from the application"
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

      {/* ── Mobile nav drawer ──────────────────────── */}
      <MobileNav
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        links={links}
        user={user}
        themeIcon={themeIcon}
      />

      {/* ── Mobile bottom tab bar ──────────────────── */}
      <nav
        aria-label="Mobile navigation"
        className="md:hidden"
        style={{
          display: 'flex',
          position: 'fixed',
          bottom: 0, left: 0, right: 0,
          height: 'var(--tabbar-h)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          backgroundColor: 'var(--surface-sidebar)',
          borderTop: '1px solid var(--surface-sidebar-hover)',
          zIndex: 20,
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
