import { NavLink } from 'react-router-dom';
import { X, LogOut } from 'lucide-react';
import { useLogout } from '../hooks/useAuth';
import { cycleTheme, getThemeIcon, getThemeLabel } from '../lib/theme';
import { ROLES } from '../utils/constants';

function getRoleLabel(role) {
  if (role === ROLES.SUPER_ADMIN) return 'Super Admin';
  if (role === ROLES.ADMIN) return 'Admin Panel';
  if (role === ROLES.FACULTY) return 'Faculty Portal';
  return '';
}

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

export default function MobileNav({ open, onClose, links, user, themeIcon }) {
  const logout = useLogout();

  return (
    <>
      {/* ── Mobile backdrop ────────────────────────── */}
      {open && (
        <div
          className="md:hidden"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 30,
            backdropFilter: 'blur(2px)',
          }}
          onClick={onClose}
          role="presentation"
          aria-hidden="true"
        />
      )}

      {/* ── Mobile drawer ──────────────────────────── */}
      <div
        className="md:hidden"
        style={{
          position: 'fixed',
          bottom: 60,
          left: 0,
          right: 0,
          backgroundColor: 'var(--surface-sidebar)',
          borderRadius: 'var(--radius-3xl) var(--radius-3xl) 0 0',
          borderTop: '1px solid var(--surface-sidebar-hover)',
          zIndex: 40,
          transform: open ? 'translateY(0)' : 'translateY(100%)',
          transition: `transform var(--dur-sheet) var(--ease-sheet)`,
          maxHeight: 'calc(100vh - 100px)',
          overflowY: 'auto',
          paddingBottom: 16,
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Extended navigation"
        hidden={!open}
      >
        {/* Handle */}
        <div style={{
          width: 36,
          height: 4,
          backgroundColor: 'var(--color-slate-700)',
          borderRadius: 2,
          margin: '12px auto 0',
        }} />

        {/* User info */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '12px 16px 12px',
          borderBottom: '1px solid var(--surface-sidebar-hover)',
          marginTop: 8,
        }}>
          <div style={{
            width: 38,
            height: 38,
            borderRadius: 'var(--radius-full)',
            background: 'var(--brand-gradient-deep)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 13,
            fontWeight: 700,
            color: '#fff',
            flexShrink: 0,
          }}>
            {getInitials(user?.name)}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--text-on-dark)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {user?.name}
            </p>
            <p style={{ fontSize: 11, color: 'var(--color-sidebar-text)' }}>
              {getRoleLabel(user?.role)}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close navigation drawer"
            style={{
              color: 'var(--color-sidebar-text)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 4,
              display: 'flex',
              borderRadius: 'var(--radius-sm)',
              transition: 'color var(--dur-fast)',
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-on-dark)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-sidebar-text)'}
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
              onClick={onClose}
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
                transition: 'all var(--dur-fast)',
              })}
            >
              <span style={{ fontSize: 20 }}>{link.emoji}</span>
              <span style={{
                fontSize: 9,
                fontWeight: 600,
                color: 'var(--color-sidebar-text)',
                textTransform: 'uppercase',
                letterSpacing: 'var(--tracking-label)',
                textAlign: 'center',
                lineHeight: 1.2,
              }}>
                {link.label}
              </span>
            </NavLink>
          ))}
        </div>

        {/* Theme toggle hidden - dark mode disabled for now */}
        {/* <button
          onClick={() => cycleTheme()}
          aria-label={`Toggle theme: currently ${getThemeLabel()}`}
          title={`Theme: ${getThemeLabel()}`}
          style={{
            width: 'calc(100% - 24px)',
            margin: '10px 12px 0',
            padding: '11px',
            backgroundColor: 'var(--surface-sidebar-hover)',
            color: 'var(--color-blue-400)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid rgba(96,165,250,0.2)',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            transition: 'all var(--dur-fast)',
          }}
        >
          <span style={{ fontSize: 16 }}>{themeIcon}</span>
          Theme: {getThemeLabel()}
        </button> */}

        {/* Logout */}
        <button
          onClick={() => {
            logout.mutate();
            onClose();
          }}
          aria-label="Log out from the application"
          style={{
            width: 'calc(100% - 24px)',
            margin: '6px 12px 0',
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
            transition: 'all var(--dur-fast)',
          }}
        >
          <LogOut size={14} />
          Log out
        </button>
      </div>
    </>
  );
}
