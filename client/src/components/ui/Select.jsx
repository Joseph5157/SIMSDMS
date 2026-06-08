import { cn } from '@/lib/utils';

export default function Select({ label, error, children, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
          {label}
        </label>
      )}
      <select
        className={cn(
          'h-12 w-full rounded-xl border bg-slate-50 px-4 text-[15px] text-slate-900',
          'appearance-none outline-none transition-all duration-150',
          'focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          error ? 'border-red-400 focus:ring-red-200' : 'border-slate-200',
          className
        )}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2 4l4 4 4-4' stroke='%2394a3b8' fill='none' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 14px center',
        }}
        {...props}
      >
        {children}
      </select>
      {error && (
        <span className="text-[12px] text-red-500 mt-0.5">{error}</span>
      )}
    </div>
  );
}
