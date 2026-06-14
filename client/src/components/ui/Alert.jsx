const TONES = {
  info:     { bg: 'var(--color-blue-50)',     border: 'var(--color-blue-200)',      accent: 'var(--color-blue-500)',     title: 'var(--color-blue-800)',     body: 'var(--color-blue-700)' },
  success:  { bg: 'var(--color-emerald-bg)',  border: 'var(--color-emerald-border)', accent: 'var(--color-emerald-solid)', title: 'var(--color-emerald-text)', body: 'var(--color-emerald-700)' },
  warning:  { bg: 'var(--color-amber-bg)',    border: 'var(--color-amber-border)',   accent: 'var(--color-amber-solid)',  title: 'var(--color-amber-text)',   body: 'var(--color-amber-700)' },
  danger:   { bg: 'var(--color-red-bg)',      border: 'var(--color-red-border)',     accent: 'var(--color-red-solid)',    title: 'var(--color-red-text)',     body: 'var(--color-red-600)' },
  telegram: { bg: 'var(--color-cyan-bg)',     border: 'var(--color-cyan-border)',    accent: 'var(--color-cyan-solid)',   title: 'var(--color-cyan-text)',    body: 'var(--color-cyan-600)' },
};

export default function Alert({ tone = 'info', icon, title, children, action, onClick, className = '' }) {
  const t = TONES[tone] ?? TONES.info;
  return (
    <div
      onClick={onClick}
      className={className}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        background: t.bg,
        border: `1px solid ${t.border}`,
        borderLeft: `3px solid ${t.accent}`,
        borderRadius: 'var(--radius-lg)',
        padding: '12px 14px',
        cursor: onClick ? 'pointer' : 'default',
        fontFamily: 'var(--font-sans)',
      }}
    >
      {icon && <span style={{ fontSize: 17, flexShrink: 0, lineHeight: 1.2 }}>{icon}</span>}
      <div style={{ flex: 1, minWidth: 0 }}>
        {title && (
          <p style={{ margin: 0, fontSize: 'var(--text-card)', fontWeight: 'var(--weight-bold)', color: t.title, marginBottom: children ? 2 : 0 }}>
            {title}
          </p>
        )}
        {children && (
          <p style={{ margin: 0, fontSize: 'var(--text-small)', color: t.body, lineHeight: 'var(--leading-snug)' }}>
            {children}
          </p>
        )}
      </div>
      {action && <div style={{ flexShrink: 0 }}>{action}</div>}
    </div>
  );
}
