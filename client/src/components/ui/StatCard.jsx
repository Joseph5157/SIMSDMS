import { useState, useEffect } from 'react';

const ACCENTS = {
  green:   { bar: 'var(--color-emerald-solid)', bg: 'var(--color-emerald-bg)',  text: 'var(--color-emerald-text)', border: 'var(--color-emerald-tint)' },
  yellow:  { bar: 'var(--color-amber-solid)',   bg: 'var(--color-amber-bg)',    text: 'var(--color-amber-text)',   border: 'var(--color-amber-tint)' },
  red:     { bar: 'var(--color-red-solid)',     bg: 'var(--color-red-bg)',      text: 'var(--color-red-text)',     border: 'var(--color-red-tint)' },
  blue:    { bar: 'var(--color-blue-500)',      bg: 'var(--color-blue-50)',     text: 'var(--color-blue-800)',     border: 'var(--color-blue-200)' },
  purple:  { bar: 'var(--color-purple-solid)',  bg: 'var(--color-purple-bg)',   text: 'var(--color-purple-text)',  border: 'var(--color-purple-tint)' },
  default: { bar: 'var(--border-strong)', bg: 'var(--surface-card)', text: 'var(--text-primary)', border: 'var(--border)' },
};

export default function StatCard({ label, value, sub, accent = 'default', icon }) {
  const c = ACCENTS[accent] ?? ACCENTS.default;
  const isNumber = typeof value === 'number';
  const [display, setDisplay] = useState(isNumber ? 0 : value);

  useEffect(() => {
    if (!isNumber || value === 0) { setDisplay(value ?? '—'); return; }
    const duration = 600;
    const start = performance.now();
    function tick(now) {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setDisplay(Math.round(eased * value));
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [value, isNumber]);

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
      justifyContent: 'flex-start',
      gap: 8,
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
        fontSize: 'var(--text-micro)', fontWeight: 600, color: 'var(--color-slate-400)',
        textTransform: 'uppercase', letterSpacing: '0.06em',
        display: 'flex', alignItems: 'center', gap: 4,
      }}>
        {icon && <span style={{ fontSize: 13, flexShrink: 0 }}>{icon}</span>}
        <span style={{ lineHeight: 1.3 }}>{label}</span>
      </p>

      {/* Value */}
      <p style={{
        margin: 0,
        fontSize: 'var(--text-stat)', fontWeight: 800, color: c.text,
        lineHeight: 1, letterSpacing: 'var(--tracking-tight)',
      }}>
        {display}
      </p>

      {/* Sub */}
      {sub && (
        <p style={{ margin: 0, fontSize: 'var(--text-micro)', color: c.text, opacity: 0.65, marginTop: 2 }}>
          {sub}
        </p>
      )}
    </div>
  );
}
