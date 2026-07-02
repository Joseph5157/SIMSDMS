import { useState, useEffect } from 'react';

const ACCENTS = {
  green:   { bar: 'var(--color-emerald-solid)', bg: 'var(--color-emerald-bg)',  text: 'var(--color-emerald-text)', border: 'var(--color-emerald-tint)' },
  yellow:  { bar: 'var(--color-amber-solid)',   bg: 'var(--color-amber-bg)',    text: 'var(--color-amber-text)',   border: 'var(--color-amber-tint)' },
  red:     { bar: 'var(--color-red-solid)',     bg: 'var(--color-red-bg)',      text: 'var(--color-red-text)',     border: 'var(--color-red-tint)' },
  blue:    { bar: 'var(--color-blue-500)',      bg: 'var(--color-blue-50)',     text: 'var(--color-blue-800)',     border: 'var(--color-blue-200)' },
  purple:  { bar: 'var(--color-purple-solid)',  bg: 'var(--color-purple-bg)',   text: 'var(--color-purple-text)',  border: 'var(--color-purple-tint)' },
  default: { bar: 'var(--border-strong)', bg: 'var(--surface-card)', text: 'var(--text-primary)', border: 'var(--border)' },
};

export default function StatCard({ label, value, sub, accent = 'default', icon, onClick }) {
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
    <div
      onClick={onClick}
      className={`relative rounded-[var(--radius-xl)] overflow-hidden min-h-24 flex flex-col justify-start gap-2 font-[var(--font-sans)] ${onClick ? 'transition-transform hover:-translate-y-px cursor-pointer' : ''}`}
      style={{
        border: `1px solid ${c.border}`,
        backgroundColor: c.bg,
        padding: '14px 16px 14px 20px',
        boxShadow: 'var(--shadow-stat)',
      }}
    >
      {/* Left accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1"
        style={{
          backgroundColor: c.bar,
          borderRadius: 'var(--radius-xl) 0 0 var(--radius-xl)',
        }}
      />

      {/* Label */}
      <p
        className="m-0 text-[length:var(--text-micro)] font-[600] uppercase tracking-[0.06em] flex items-center gap-1"
        style={{ color: 'var(--color-slate-400)' }}
      >
        {icon && <span className="text-[13px] shrink-0">{icon}</span>}
        <span className="leading-[1.3]">{label}</span>
      </p>

      {/* Value */}
      <p
        className="m-0 text-[length:var(--text-stat)] font-[800] leading-none tracking-[var(--tracking-tight)]"
        style={{ color: c.text }}
      >
        {display}
      </p>

      {/* Sub */}
      {sub && (
        <p
          className="m-0 mt-0.5 text-[length:var(--text-micro)] opacity-65"
          style={{ color: c.text }}
        >
          {sub}
        </p>
      )}
    </div>
  );
}
