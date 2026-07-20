import * as Dialog from '@radix-ui/react-dialog';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { IconX } from '@tabler/icons-react';
import { useMediaQuery } from '@mantine/hooks';
import useKeyboardInset from '../../hooks/useKeyboardInset';

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

// ── Size → desktop max-width ─────────────────────────────────────────────
// 'md' (520px) matches SheetModal/BottomDrawer's previous hardcoded width
// exactly, so existing callers that don't pass `size` see no visual change.
const SIZE_MAX_WIDTH = { sm: 420, md: 520, lg: 640, xl: 760 };

// ── ResponsiveSheet ──────────────────────────────────────────────────────
/**
 * Canonical overlay for "mobile sheet / desktop centered dialog" — the single
 * component feature code should reach for instead of branching on isMobile to
 * pick between two different overlay libraries (the exact pattern this
 * replaces). Built on Radix Dialog + Framer Motion internally; consumers never
 * import Radix, Framer, or Vaul directly (see CONSTITUTION.md §2).
 *
 * Supersedes BottomDrawer (vaul) and SheetModal (Radix/Framer prototype) —
 * both kept temporarily for their remaining, not-yet-migrated consumers. Same
 * open/onClose/title/subtitle/children/footer contract those two share, plus:
 *
 *   size        — 'sm' | 'md' (default) | 'lg' | 'xl' — desktop dialog width
 *   mobileMode  — 'sheet' (default, partial-height + drag-to-dismiss) |
 *                 'fullscreen' (full viewport, no drag — for long workflows)
 *   confirmClose — when true, dismiss gestures (backdrop click, Escape, the
 *                 X button, drag-to-dismiss) call `onDismissAttempt` instead
 *                 of `onClose`, so a caller with unsaved form state can show
 *                 its own confirmation before actually closing. Default
 *                 (unset/false) is unchanged: dismiss gestures call `onClose`
 *                 directly, exactly like BottomDrawer/SheetModal always have.
 */
export default function ResponsiveSheet({
  open, onClose, title, subtitle, children, footer,
  size = 'md', mobileMode = 'sheet', confirmClose = false, onDismissAttempt,
}) {
  const isMobile = useMediaQuery('(max-width: 639px)');
  const kbInset = useKeyboardInset();
  const dragControls = useDragControls();
  const isFullscreen = isMobile && mobileMode === 'fullscreen';
  const maxWidth = SIZE_MAX_WIDTH[size] ?? SIZE_MAX_WIDTH.md;

  const requestClose = () => {
    if (confirmClose && onDismissAttempt) onDismissAttempt();
    else if (!confirmClose) onClose();
    // confirmClose && !onDismissAttempt: no-op — nothing was wired up to
    // handle the attempt, so dismiss gestures are safely swallowed rather
    // than silently discarding unsaved state.
  };

  // Mobile slides up from the bottom edge and (in 'sheet' mode) can be flung
  // down to dismiss. 'fullscreen' mode has no drag — it's for tasks long
  // enough that an accidental swipe shouldn't discard them. Desktop is
  // always a centered dialog with a soft fade/scale, regardless of mode.
  const variants = isMobile
    ? { initial: { y: '100%' }, animate: { y: 0 }, exit: { y: '100%' } }
    : { initial: { opacity: 0, scale: 0.96, y: 8 }, animate: { opacity: 1, scale: 1, y: 0 }, exit: { opacity: 0, scale: 0.96, y: 8 } };

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && requestClose()}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-[110]"
                style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />
            </Dialog.Overlay>

            <Dialog.Content asChild forceMount aria-describedby={undefined}>
              <motion.div
                className={
                  isFullscreen
                    ? 'fixed inset-0 sm:m-auto sm:w-[90vw] z-[111] flex flex-col outline-none h-full sm:h-auto sm:max-h-[85dvh] sm:rounded-[20px] shadow-[0_20px_60px_rgba(0,0,0,0.25)]'
                    : 'fixed bottom-0 left-0 right-0 sm:inset-0 sm:m-auto sm:w-[90vw] z-[111] flex flex-col outline-none max-h-[94dvh] sm:max-h-[85dvh] rounded-t-[20px] sm:rounded-[20px] shadow-[0_-8px_40px_rgba(0,0,0,0.18)] sm:shadow-[0_20px_60px_rgba(0,0,0,0.25)]'
                }
                style={{
                  backgroundColor: 'var(--surface-card)',
                  // Tailwind can't generate a class from an interpolated arbitrary
                  // value, so the desktop max-width is set here instead — driven
                  // by the same `isMobile` check the rest of this component uses.
                  ...(!isMobile && { maxWidth }),
                  // Lift above the on-screen keyboard and shrink to what remains,
                  // keeping the same ~6dvh top breathing room as max-h-[94dvh].
                  // No-op on desktop (kbInset is always 0) and in fullscreen mode.
                  ...(!isFullscreen && kbInset > 0 && { bottom: kbInset, maxHeight: `calc(94dvh - ${kbInset}px)` }),
                }}
                variants={variants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ type: 'spring', damping: 34, stiffness: 340 }}
                // Drag-to-dismiss on mobile 'sheet' mode only, and only when
                // started from the handle, so body scrolling is never hijacked.
                drag={isMobile && !isFullscreen ? 'y' : false}
                dragListener={false}
                dragControls={dragControls}
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 0, bottom: 0.5 }}
                onDragEnd={(_e, info) => {
                  if (info.offset.y > 120 || info.velocity.y > 500) requestClose();
                }}
              >
                {/* Drag handle — 'sheet' mode only */}
                {!isFullscreen && (
                  <div
                    className="w-9 h-1 rounded-sm mx-auto mt-3 shrink-0 sm:hidden"
                    style={{ backgroundColor: 'var(--border)', touchAction: 'none', cursor: 'grab' }}
                    onPointerDown={(e) => isMobile && dragControls.start(e)}
                  />
                )}

                {/* Header */}
                <div
                  className="flex items-center justify-between shrink-0"
                  style={{ padding: '14px 20px 12px', borderBottom: '1px solid var(--divider)' }}
                >
                  <div className="min-w-0">
                    <Dialog.Title className="text-[length:var(--text-page-title)] font-extrabold text-[color:var(--text-primary)] m-0">
                      {title}
                    </Dialog.Title>
                    {subtitle && (
                      <p className="text-[length:var(--text-small)] text-[color:var(--text-muted)] mt-px">
                        {subtitle}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={requestClose}
                    aria-label="Close"
                    className="w-11 h-11 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-page)] flex items-center justify-center cursor-pointer text-[color:var(--text-secondary)] shrink-0 ml-3"
                  >
                    <IconX size={16} stroke={2} />
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
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
