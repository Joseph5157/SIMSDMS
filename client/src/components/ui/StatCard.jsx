const ACCENTS = {
  green:   { bar: '#10b981', bg: '#f0fdf4', text: '#065f46', sub: '#6ee7b7', border: '#d1fae5' },
  yellow:  { bar: '#f59e0b', bg: '#fffbeb', text: '#92400e', sub: '#fcd34d', border: '#fde68a' },
  red:     { bar: '#ef4444', bg: '#fef2f2', text: '#991b1b', sub: '#fca5a5', border: '#fecaca' },
  blue:    { bar: '#3b82f6', bg: '#eff6ff', text: '#1e40af', sub: '#93c5fd', border: '#bfdbfe' },
  purple:  { bar: '#8b5cf6', bg: '#f5f3ff', text: '#5b21b6', sub: '#c4b5fd', border: '#ddd6fe' },
  default: { bar: '#94a3b8', bg: '#ffffff', text: '#0f172a', sub: '#cbd5e1', border: '#e2e8f0' },
};

export default function StatCard({ label, value, sub, accent = 'default', icon }) {
  const c = ACCENTS[accent] ?? ACCENTS.default;

  return (
    <div style={{
      position: 'relative',
      borderRadius: 14,
      border: `1px solid ${c.border}`,
      backgroundColor: c.bg,
      padding: '14px 16px 14px 20px',
      overflow: 'hidden',
      minHeight: 96,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.04)',
    }}>
      {/* Left accent bar */}
      <div style={{
        position: 'absolute',
        left: 0, top: 0, bottom: 0,
        width: 4,
        backgroundColor: c.bar,
        borderRadius: '14px 0 0 14px',
      }} />

      {/* Label */}
      <p style={{
        fontSize: 11, fontWeight: 600, color: '#94a3b8',
        textTransform: 'uppercase', letterSpacing: '0.07em',
        display: 'flex', alignItems: 'center', gap: 4,
      }}>
        {icon && <span style={{ fontSize: 13 }}>{icon}</span>}
        {label}
      </p>

      {/* Value */}
      <p style={{
        fontSize: 36, fontWeight: 800, color: c.text,
        lineHeight: 1, letterSpacing: '-0.02em',
      }}>
        {value ?? '—'}
      </p>

      {/* Sub */}
      {sub && (
        <p style={{ fontSize: 11, color: c.text, opacity: 0.65, marginTop: 2 }}>
          {sub}
        </p>
      )}
    </div>
  );
}
