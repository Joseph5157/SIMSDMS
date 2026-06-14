const ACCENTS = {
  green:   { bar: 'var(--color-emerald-solid)', bg: 'var(--color-emerald-bg)',  text: 'var(--color-emerald-text)', border: 'var(--color-emerald-tint)' },
  yellow:  { bar: 'var(--color-amber-solid)',   bg: 'var(--color-amber-bg)',    text: 'var(--color-amber-text)',   border: 'var(--color-amber-tint)' },
  red:     { bar: 'var(--color-red-solid)',     bg: 'var(--color-red-bg)',      text: 'var(--color-red-text)',     border: 'var(--color-red-tint)' },
  blue:    { bar: 'var(--color-blue-500)',      bg: 'var(--color-blue-50)',     text: 'var(--color-blue-800)',     border: 'var(--color-blue-200)' },
  purple:  { bar: 'var(--color-purple-solid)',  bg: 'var(--color-purple-bg)',   text: 'var(--color-purple-text)',  border: 'var(--color-purple-tint)' },
  default: { bar: '#cbd5e1',                     bg: '#ffffff',                  text: '#0f172a',                   border: '#e2e8f0' },
};

export default function StatCard({ label, value, sub, accent = 'default', icon }) {
  const c = ACCENTS[accent] ?? ACCENTS.default;

  return (
    <div style={{
      position: 'relative',
      borderRadius: 'var(--radius-xl)',
      border: `1px solid ${c.border}`,
      backgroundColor: c.bg,
      padding: '14px 16px 14px 20px',
      overflow: 'hidden',
      minHeight: 96,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      boxShadow: 'var(--shadow-stat)',
      fontFamily: 'var(--font-sans)',
    }}>
      {/* Left accent bar */}
      <div style={{
        position: 'absolute',
        left: 0, top: 0, bottom: 0,
        width: 4,
        backgroundColor: c.bar,
        borderRadius: 'var(--radius-xl) 0 0 var(--radius-xl)',
      }} />

      {/* Label */}
      <p style={{
        margin: 0,
        fontSize: 11, fontWeight: 600, color: 'var(--color-slate-400)',
        textTransform: 'uppercase', letterSpacing: '0.06em',
        display: 'flex', alignItems: 'center', gap: 4,
      }}>
        {icon && <span style={{ fontSize: 13, flexShrink: 0 }}>{icon}</span>}
        <span style={{ lineHeight: 1.3 }}>{label}</span>
      </p>

      {/* Value */}
      <p style={{
        margin: 0,
        fontSize: 36, fontWeight: 800, color: c.text,
        lineHeight: 1, letterSpacing: 'var(--tracking-tight)',
      }}>
        {value ?? '—'}
      </p>

      {/* Sub */}
      {sub && (
        <p style={{ margin: 0, fontSize: 11, color: c.text, opacity: 0.65, marginTop: 2 }}>
          {sub}
        </p>
      )}
    </div>
  );
}
