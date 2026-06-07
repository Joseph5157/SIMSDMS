export default function Input({ label, error, className = '', ...props }) {
  return (
    <div className="flex flex-col">
      {label && <label className="text-[12px] font-semibold text-slate-600 mb-1.5">{label}</label>}
      <input
        className={`border rounded-[8px] px-3 py-[9px] text-[13px] text-slate-900 w-full focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${error ? 'border-red-400' : 'border-slate-200'} ${className}`}
        {...props}
      />
      {error && <span className="text-[11px] text-red-600 mt-1">{error}</span>}
    </div>
  );
}

export function Select({ label, error, children, className = '', ...props }) {
  return (
    <div className="flex flex-col">
      {label && <label className="text-[12px] font-semibold text-slate-600 mb-1.5">{label}</label>}
      <select
        className={`border rounded-[8px] px-3 py-[9px] text-[13px] text-slate-900 bg-white w-full focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${error ? 'border-red-400' : 'border-slate-200'} ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && <span className="text-[11px] text-red-600 mt-1">{error}</span>}
    </div>
  );
}
