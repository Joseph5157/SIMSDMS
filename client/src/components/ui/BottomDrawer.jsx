import { Drawer } from 'vaul';
import { X } from 'lucide-react';

// ── Spinner for primary action buttons ─────────────────────────────────────
export function DrawerSpinner() {
  return (
    <span style={{
      width: 14, height: 14, flexShrink: 0,
      border: '2px solid rgba(255,255,255,0.4)',
      borderTopColor: '#fff', borderRadius: 'var(--radius-full)',
      animation: 'spin 0.7s linear infinite',
    }} />
  );
}

// ── Reusable footer button styles ──────────────────────────────────────────
export const cancelBtnStyle = {
  flex: 1, height: 48, borderRadius: 'var(--radius-xl)',
  border: '1.5px solid var(--border)', backgroundColor: 'var(--surface-page)',
  fontSize: 'var(--text-body)', fontWeight: 700,
  color: 'var(--text-secondary)', cursor: 'pointer',
  fontFamily: 'inherit',
};

export function primaryBtnStyle(disabled) {
  return {
    flex: 2, height: 48, borderRadius: 'var(--radius-xl)', border: 'none',
    background: disabled ? '#93c5fd' : 'var(--brand-gradient-deep)',
    fontSize: 'var(--text-body)', fontWeight: 700, color: 'var(--text-on-dark)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    boxShadow: disabled ? 'none' : '0 4px 14px rgba(37,99,235,0.3)',
    transition: 'all 0.15s',
    fontFamily: 'inherit',
  };
}

// ── BottomDrawer ───────────────────────────────────────────────────────────
/**
 * Shared bottom-sheet chrome for all drawer components.
 *
 * Props:
 *   open       — boolean
 *   onClose    — () => void   called when drawer closes
 *   title      — string       shown in drawer header
 *   subtitle   — string?      optional secondary line
 *   children   — ReactNode    scrollable body content
 *   footer     — ReactNode?   sticky footer; wrap Cancel + Submit in a Fragment
 */
export default function BottomDrawer({ open, onClose, title, subtitle, children, footer }) {
  return (
    <Drawer.Root open={open} onOpenChange={(v) => !v && onClose()} shouldScaleBackground>
      <Drawer.Portal>
        <Drawer.Overlay style={{
          position: 'fixed', inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(2px)',
          zIndex: 39,
        }} />

        <Drawer.Content style={{
          position: 'fixed',
          bottom: 0, left: 0, right: 0,
          zIndex: 40,
          backgroundColor: 'var(--surface-card)',
          borderRadius: '20px 20px 0 0',
          maxHeight: '94vh',
          display: 'flex', flexDirection: 'column',
          outline: 'none',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.18)',
        }}>

          {/* Drag handle */}
          <div style={{
            width: 36, height: 4,
            backgroundColor: 'var(--border)',
            borderRadius: 2,
            margin: '12px auto 0', flexShrink: 0,
          }} />

          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 20px 12px',
            borderBottom: '1px solid var(--divider)', flexShrink: 0,
          }}>
            <div style={{ minWidth: 0 }}>
              <Drawer.Title style={{
                fontSize: 'var(--text-page-title)', fontWeight: 800,
                color: 'var(--text-primary)', margin: 0,
              }}>
                {title}
              </Drawer.Title>
              {subtitle && (
                <p style={{ fontSize: 'var(--text-small)', color: 'var(--text-muted)', marginTop: 1 }}>
                  {subtitle}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              style={{
                width: 32, height: 32, borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border)', backgroundColor: 'var(--surface-page)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'var(--text-secondary)', flexShrink: 0, marginLeft: 12,
              }}
            >
              <X size={16} strokeWidth={2} />
            </button>
          </div>

          {/* Scrollable body */}
          <div style={{ overflowY: 'auto', flex: 1, WebkitOverflowScrolling: 'touch' }}>
            {children}
          </div>

          {/* Sticky footer */}
          {footer && (
            <div style={{
              padding: '12px 20px',
              paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
              borderTop: '1px solid var(--divider)',
              display: 'flex', gap: 10, flexShrink: 0,
              backgroundColor: 'var(--surface-card)',
            }}>
              {footer}
            </div>
          )}

        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
