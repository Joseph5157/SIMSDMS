import { cn } from '@/lib/utils';

const variants = {
  primary:   'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 shadow-sm',
  secondary: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 active:bg-slate-100',
  danger:    'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 shadow-sm',
  ghost:     'text-slate-600 hover:bg-slate-100 active:bg-slate-200',
  success:   'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm',
  outline:   'border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100',
};

const sizes = {
  xs:      'h-7 px-2.5 text-[11px] rounded-md',
  sm:      'h-8 px-3 text-[12px] rounded-lg',
  default: 'h-10 px-4 text-[13px] rounded-xl',
  lg:      'h-12 px-6 text-[15px] rounded-xl',
};

function Button({
  children,
  variant = 'primary',
  size = 'default',
  loading,
  icon,
  className = '',
  ...props
}) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-1.5 font-semibold',
        'transition-all duration-150 outline-none select-none',
        'focus-visible:ring-2 focus-visible:ring-blue-500/30',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
        variants[variant] ?? variants.primary,
        sizes[size] ?? sizes.default,
        className
      )}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin flex-shrink-0" />
      ) : icon ? (
        <span className="flex-shrink-0">{icon}</span>
      ) : null}
      {children}
    </button>
  );
}

export { Button };
export default Button;
