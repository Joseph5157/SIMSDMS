export default function StatCard({ label, value, sub, accent, icon }) {
  const colors = {
    green:   { bar: '#10b981', bg: '#f0fdf4', text: '#065f46', border: '#a7f3d0' },
    yellow:  { bar: '#f59e0b', bg: '#fffbeb', text: '#92400e', border: '#fde68a' },
    red:     { bar: '#ef4444', bg: '#fef2f2', text: '#991b1b', border: '#fecaca' },
    blue:    { bar: '#3b82f6', bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe' },
    default: { bar: '#94a3b8', bg: '#ffffff', text: '#0f172a', border: '#e2e8f0' },
  };

  const c = colors[accent] ?? colors.default;

  return (
    <div style={{
      position: 'relative',
      borderRadius: 14,
      border: `1px solid ${c.border}`,
      backgroundColor: c.bg,
      padding: '16px 16px 16px 20px',
      overflow: 'hidden',
      minHeight: 90,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
    }}>
      <div style={{
        position: 'absolute',
        left: 0, top: 0, bottom: 0,
        width: 4,
        backgroundColor: c.bar,
        borderRadius: '14px 0 0 14px',
      }} />
      <p style={{
        fontSize: 11, fontWeight: 600, color: '#94a3b8',
        textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6,
      }}>
        {icon && <span style={{ marginRight: 4 }}>{icon}</span>}
        {label}
      </p>
      <p style={{
        fontSize: 34, fontWeight: 800, color: c.text,
        lineHeight: 1, marginBottom: 2,
      }}>
        {value ?? '—'}
      </p>
      {sub && (
        <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{sub}</p>
      )}
    </div>
  );
}
