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
          width: 220,
          height: '100vh',
          position: 'sticky',
          top: 0,
          backgroundColor: '#0f172a',
          borderRight: '1px solid #1e293b',
          zIndex: 40,
        }}
      >
        {/* Brand */}
        <div style={{
          padding: '16px 16px 14px',
          borderBottom: '1px solid #1e293b',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <div style={{
              width: 28, height: 28,
              borderRadius: 8,
              background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, flexShrink: 0,
            }}>
              🎓
            </div>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9' }}>SIMS DMS</p>
          </div>
          <p style={{ fontSize: 11, color: '#475569', paddingLeft: 36 }}>
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
          borderTop: '1px solid #1e293b',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '6px 10px', marginBottom: 4,
          }}>
            <div style={{
              width: 30, height: 30,
              borderRadius: '50%',
              backgroundColor: '#1e3a5f',
              border: '1px solid #2563eb',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, color: '#60a5fa',
              flexShrink: 0,
            }}>
              {getInitials(user?.name)}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{
                fontSize: 12, fontWeight: 600, color: '#e2e8f0',
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
              borderRadius: 8,
              border: '1px solid #dc2626/30',
              backgroundColor: '#7f1d1d',
              cursor: 'pointer',
              fontSize: 12,
              color: '#fecaca',
              fontWeight: 500,
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#dc2626'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#7f1d1d'; e.currentTarget.style.color = '#fecaca'; }}
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
          backgroundColor: '#0f172a',
          borderRadius: '20px 20px 0 0',
          borderTop: '1px solid #1e293b',
          zIndex: 40,
          transform: drawerOpen ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
          maxHeight: 'calc(100vh - 100px)',
          overflowY: 'auto',
          paddingBottom: 16,
        }}
      >
        {/* Handle */}
        <div style={{
          width: 36, height: 4, backgroundColor: '#334155',
          borderRadius: 2, margin: '12px auto 0',
        }} />

        {/* User info */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 16px 12px',
          borderBottom: '1px solid #1e293b',
          marginTop: 8,
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: '50%',
            background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0,
          }}>
            {getInitials(user?.name)}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.name}
            </p>
            <p style={{ fontSize: 11, color: '#475569' }}>{getRoleLabel(user?.role)}</p>
          </div>
          <button
            onClick={() => setDrawerOpen(false)}
            style={{ color: '#475569', background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', borderRadius: 6 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* 3-col grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '1px',
          backgroundColor: '#1e293b',
          margin: '12px 12px 0',
          borderRadius: 16,
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
                backgroundColor: isActive ? '#1e3a5f' : '#0f172a',
                gap: 5,
                textDecoration: 'none',
                borderBottom: isActive ? '2px solid #3b82f6' : '2px solid transparent',
              })}
            >
              <span style={{ fontSize: 20 }}>{link.emoji}</span>
              <span style={{
                fontSize: 9, fontWeight: 600, color: '#64748b',
                textTransform: 'uppercase', letterSpacing: '0.06em',
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
            backgroundColor: '#1e293b',
            color: '#ef4444',
            borderRadius: 12,
            border: '1px solid #dc2626/20',
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
          height: 60,
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          backgroundColor: '#0f172a',
          borderTop: '1px solid #1e293b',
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
              color: isActive ? '#60a5fa' : '#475569',
              fontSize: 8,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              textDecoration: 'none',
              borderTop: isActive ? '2px solid #3b82f6' : '2px solid transparent',
              transition: 'color 0.15s',
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
            color: drawerOpen ? '#60a5fa' : '#475569',
            fontSize: 8,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            background: 'none',
            border: 'none',
            borderTop: drawerOpen ? '2px solid #3b82f6' : '2px solid transparent',
            cursor: 'pointer',
            transition: 'color 0.15s',
          }}
        >
          <span style={{ fontSize: 18 }}>☰</span>
          <span>More</span>
        </button>
      </nav>
    </>
  );
}
