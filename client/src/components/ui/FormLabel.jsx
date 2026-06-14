export default function FormLabel({ children, required = false, ...props }) {
  return (
    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.08em]" {...props}>
      {children}
      {required && <span className="text-red-600 ml-1">*</span>}
    </label>
  );
}
