import { Drawer } from 'vaul';
import { X } from 'lucide-react';

// ── Spinner for primary action buttons ─────────────────────────────────────
export function DrawerSpinner() {
  return (
    <span
      className="w-3.5 h-3.5 shrink-0 rounded-full animate-spin"
      style={{
        border: '2px solid rgba(255,255,255,0.4)',
        borderTopColor: '#fff',
      }}
    />
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
    background: disabled ? 'var(--color-blue-300)' : 'var(--brand-gradient-deep)',
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
        <Drawer.Overlay
          className="fixed inset-0 z-[110]"
          style={{
            backgroundColor: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(2px)',
          }}
        />

        <Drawer.Content
          className="fixed bottom-0 left-0 right-0 sm:inset-0 sm:m-auto sm:w-[90vw] sm:max-w-[520px] z-[111] flex flex-col outline-none max-h-[94dvh] sm:max-h-[85dvh] rounded-t-[20px] sm:rounded-[20px] shadow-[0_-8px_40px_rgba(0,0,0,0.18)] sm:shadow-[0_20px_60px_rgba(0,0,0,0.25)]"
          style={{
            backgroundColor: 'var(--surface-card)',
          }}
        >

          {/* Drag handle */}
          <div
            className="w-9 h-1 rounded-sm mx-auto mt-3 shrink-0 sm:hidden"
            style={{ backgroundColor: 'var(--border)' }}
          />

          {/* Header */}
          <div
            className="flex items-center justify-between shrink-0"
            style={{ padding: '14px 20px 12px', borderBottom: '1px solid var(--divider)' }}
          >
            <div className="min-w-0">
              <Drawer.Title
                className="text-[length:var(--text-page-title)] font-extrabold text-[color:var(--text-primary)] m-0"
              >
                {title}
              </Drawer.Title>
              {subtitle && (
                <p className="text-[length:var(--text-small)] text-[color:var(--text-muted)] mt-px">
                  {subtitle}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="w-11 h-11 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-page)] flex items-center justify-center cursor-pointer text-[color:var(--text-secondary)] shrink-0 ml-3"
            >
              <X size={16} strokeWidth={2} />
            </button>
          </div>

          {/* Scrollable body */}
          <div className="overflow-y-auto flex-1 min-h-0" style={{ WebkitOverflowScrolling: 'touch' }}>
            {children}
          </div>

          {/* Sticky footer */}
          {footer && (
            <div
              className="flex gap-2.5 shrink-0 bg-[var(--surface-card)]"
              style={{
                padding: '12px 20px',
                paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
                borderTop: '1px solid var(--divider)',
              }}
            >
              {footer}
            </div>
          )}

        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
