import { cn } from '@/lib/utils';

export default function Select({ label, error, className = '', children, ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.08em]">
          {label}
        </label>
      )}
      <select
        className={cn(
          'h-11 w-full rounded-xl border bg-white px-4 text-[14px] text-slate-900',
          'outline-none appearance-none transition-all duration-150',
          'focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          error ? 'border-red-solid' : 'border-slate-200 hover:border-slate-300',
          className
        )}
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center' }}
        {...props}
      >
        {children}
      </select>
      {error && (
        <span className="text-[11px] text-red-500 font-medium">{error}</span>
      )}
    </div>
  );
}
