import { cn } from '@/lib/utils';

export default function Input({ label, error, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
          {label}
        </label>
      )}
      <input
        className={cn(
          'h-12 w-full rounded-xl border bg-slate-50 px-4 text-[15px] text-slate-900',
          'placeholder:text-slate-400 outline-none transition-all duration-150',
          'focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          error ? 'border-red-400 focus:ring-red-200' : 'border-slate-200',
          className
        )}
        {...props}
      />
      {error && (
        <span className="text-[12px] text-red-500 mt-0.5">{error}</span>
      )}
    </div>
  );
}
