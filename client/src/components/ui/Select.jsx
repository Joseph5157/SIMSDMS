export default function Select({
  label,
  error,
  className = '',
  children,
  ...props
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-[12px] font-semibold text-slate-600">
          {label}
        </label>
      )}
      <select
        className={`border rounded-lg px-3 py-2 text-[13px] text-slate-900 bg-white w-full focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${error ? 'border-red-400' : 'border-slate-200'} ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && (
        <span className="text-[11px] text-red-600">{error}</span>
      )}
    </div>
  );
}
