const variants = {
  primary:   'bg-blue-600 text-white hover:bg-blue-700 shadow-sm disabled:opacity-50',
  secondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 shadow-xs disabled:opacity-50',
  danger:    'bg-red-100 text-red-600 hover:bg-red-200 disabled:opacity-50',
  ghost:     'text-slate-600 hover:bg-slate-100 disabled:opacity-50',
};

const sizes = {
  default: 'px-[14px] py-[7px] text-[13px]',
  sm:      'px-[10px] py-[4px] text-[12px]',
};

export default function Button({ children, variant = 'primary', size = 'default', className = '', loading, ...props }) {
  return (
    <button
      className={`rounded-[8px] font-medium inline-flex items-center gap-1.5 transition-colors ${sizes[size] ?? sizes.default} ${variants[variant]} ${className}`}
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
