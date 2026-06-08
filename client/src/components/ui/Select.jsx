export default function Select({ label, error, children, className = '', ...props }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && (
        <label style={{
          fontSize: 11,
          fontWeight: 700,
          color: '#64748b',
          textTransform: 'uppercase',
          letterSpacing: '0.07em',
        }}>
          {label}
        </label>
      )}
      <select
        style={{
          height: 48,
          fontSize: 15,
          borderRadius: 12,
          paddingLeft: 14,
          paddingRight: 14,
          border: error ? '2px solid #f87171' : '1.5px solid #e2e8f0',
          backgroundColor: '#f8fafc',
          color: '#0f172a',
          outline: 'none',
          width: '100%',
          appearance: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 14px center',
        }}
        className={className}
        {...props}
      >
        {children}
      </select>
      {error && (
        <span style={{ fontSize: 12, color: '#ef4444' }}>{error}</span>
      )}
    </div>
  );
}
