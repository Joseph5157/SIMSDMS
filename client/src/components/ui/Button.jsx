import { cn } from '@/lib/utils';

const variants = {
  primary:   'bg-blue-600 text-white hover:bg-blue-700 shadow-sm',
  secondary: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
  danger:    'bg-red-600 text-white hover:bg-red-700 shadow-sm',
  ghost:     'text-slate-600 hover:bg-slate-100',
  success:   'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm',
};

const sizes = {
  default: 'h-10 px-4 text-[13px]',
  sm:      'h-8 px-3 text-[12px]',
  lg:      'h-12 px-6 text-[15px]',
};

function Button({
  children, variant = 'primary', size = 'default',
  loading, className = '', ...props
}) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold',
        'transition-all duration-150 outline-none',
        'focus-visible:ring-2 focus-visible:ring-blue-500/30',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant] ?? variants.primary,
        sizes[size] ?? sizes.default,
        className
      )}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  );
}

export { Button };
export default Button;
