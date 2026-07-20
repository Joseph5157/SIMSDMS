// ── Mobile list primitives ──────────────────────────────────────────────
// Formalizes the card-list pattern that DutySlotsPage's mobile view already
// used well (per the audit: "substantially better than squeezing a table
// onto a phone screen") but hand-rolled with inline styles — every page that
// needs the same "rounded card, title/subtitle row, status badge, one
// action" shape was reinventing its own markup. These primitives are that
// shape, reusable, on semantic tokens instead of inline styles.

export function MobileSectionHeader({ children, count }) {
  return (
    <p
      style={{
        fontSize: 'var(--text-small)', fontWeight: 'var(--weight-bold)',
        color: 'var(--text-muted)', textTransform: 'uppercase',
        letterSpacing: 'var(--tracking-wide)', marginBottom: 8,
      }}
    >
      {children}{count != null ? ` (${count})` : ''}
    </p>
  );
}

export function MobileList({ children }) {
  return (
    <div
      style={{
        backgroundColor: 'var(--surface-card)', borderRadius: 'var(--radius-2xl)',
        border: '1px solid var(--border)', overflow: 'hidden', marginBottom: 16,
      }}
    >
      {children}
    </div>
  );
}

export function MobileListItemHeader({ title, subtitle, leading }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
      {leading}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 'var(--text-card-lg)', fontWeight: 'var(--weight-semibold)',
          color: 'var(--text-primary)', marginBottom: subtitle ? 2 : 0,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {title}
        </p>
        {subtitle && (
          <p style={{ fontSize: 'var(--text-small)', color: 'var(--text-muted)' }}>{subtitle}</p>
        )}
      </div>
    </div>
  );
}

export function MobileListItemMeta({ children }) {
  return (
    <p style={{ fontSize: 'var(--text-small)', color: 'var(--text-muted)', marginTop: 2 }}>
      {children}
    </p>
  );
}

export function MobileListItemStatus({ children }) {
  return <div style={{ flexShrink: 0 }}>{children}</div>;
}

export function MobileListItemActions({ children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
      {children}
    </div>
  );
}

/**
 * MobileListItem — one row. Either pass title/subtitle/status/action for the
 * common case, or compose the primitives above via `children` for anything
 * that needs more control than the flat prop shape gives.
 */
export function MobileListItem({ title, subtitle, leading, status, action, onClick, children, isLast = false }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px', backgroundColor: 'var(--surface-card)',
        borderBottom: isLast ? 'none' : '1px solid var(--border)', gap: 12,
        cursor: onClick ? 'pointer' : 'default',
        minHeight: 'var(--control-min)',
      }}
    >
      {children ?? (
        <>
          <MobileListItemHeader title={title} subtitle={subtitle} leading={leading} />
          {(status || action) && (
            <MobileListItemActions>
              {status && <MobileListItemStatus>{status}</MobileListItemStatus>}
              {action}
            </MobileListItemActions>
          )}
        </>
      )}
    </div>
  );
}
