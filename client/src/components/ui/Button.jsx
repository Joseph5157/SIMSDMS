const variants = {
  primary:   'bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow disabled:opacity-50',
  secondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 shadow-sm disabled:opacity-50',
  danger:    'bg-red-600 text-white hover:bg-red-700 shadow-sm disabled:opacity-50',
  ghost:     'text-slate-600 hover:bg-slate-100 disabled:opacity-50',
  success:   'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm disabled:opacity-50',
};

const sizes = {
  default: 'px-4 py-2 text-[13px]',
  sm:      'px-3 py-1.5 text-[12px]',
  lg:      'px-5 py-2.5 text-[14px]',
};

export default function Button({
  children, variant = 'primary', size = 'default',
  className = '', loading, ...props
}) {
  return (
    <button
      className={`rounded-lg font-medium inline-flex items-center gap-1.5 transition-all duration-150 ${sizes[size] ?? sizes.default} ${variants[variant]} ${className}`}
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
