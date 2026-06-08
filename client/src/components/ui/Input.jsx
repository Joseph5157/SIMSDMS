import { Input as ShadInput } from '@/components/ui/input';

export default function Input({ label, error, className = '', ...props }) {
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
      <ShadInput
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
        }}
        className={className}
        {...props}
      />
      {error && (
        <span style={{ fontSize: 12, color: '#ef4444' }}>{error}</span>
      )}
    </div>
  );
}
