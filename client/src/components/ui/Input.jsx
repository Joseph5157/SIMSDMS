import { Input as ShadInput } from '@/components/ui/input';

export default function Input({ label, error, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-[12px] font-semibold text-slate-600">
          {label}
        </label>
      )}
      <ShadInput
        className={`${error ? 'border-red-400 focus-visible:ring-red-200' : ''} ${className}`}
        {...props}
      />
      {error && (
        <span className="text-[11px] text-red-600">{error}</span>
      )}
    </div>
  );
}
