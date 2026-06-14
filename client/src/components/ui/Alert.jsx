const TONES = {
  info:     { bg: 'var(--blue-50)',     border: 'var(--blue-200)',      accent: 'var(--blue-500)',     title: 'var(--blue-800)',     body: 'var(--blue-700)' },
  success:  { bg: 'var(--emerald-bg)',  border: 'var(--emerald-border)', accent: 'var(--emerald-solid)', title: 'var(--emerald-text)', body: '#047857' },
  warning:  { bg: 'var(--amber-bg)',    border: 'var(--amber-border)',   accent: 'var(--amber-solid)',  title: 'var(--amber-text)',   body: '#b45309' },
  danger:   { bg: 'var(--red-bg)',      border: 'var(--red-border)',     accent: 'var(--red-solid)',    title: 'var(--red-text)',     body: '#dc2626' },
  telegram: { bg: 'var(--cyan-bg)',     border: 'var(--cyan-border)',    accent: 'var(--cyan-solid)',   title: 'var(--cyan-text)',    body: '#0891b2' },
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
