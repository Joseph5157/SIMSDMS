import { cn } from '@/lib/utils';

export default function Input({ label, error, hint, className = '', ...props }) {
  const errorId = `error-${props.id || Math.random().toString(36).slice(2, 9)}`;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.08em]">
          {label}
        </label>
      )}
      <input
        className={cn(
          'h-11 w-full rounded-xl border bg-white px-4 text-[14px] text-slate-900',
          'placeholder:text-slate-400 outline-none transition-all duration-150',
          'focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-50',
          error
            ? 'border-red-600 bg-red-50 focus:ring-red-600/20'
            : 'border-slate-200 hover:border-slate-300',
          className
        )}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        {...props}
      />
      {error && (
        <span id={errorId} role="alert" className="text-[11px] text-red-600 font-medium">{error}</span>
      )}
      {hint && !error && (
        <span className="text-[11px] text-slate-400">{hint}</span>
      )}
    </div>
  );
}
