export default function EmptyState({ emoji, title, subtitle }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      {emoji && <span style={{ fontSize: 48 }}>{emoji}</span>}
      <div className="text-center">
        <p className="text-[15px] font-semibold text-slate-900 mb-1">{title}</p>
        {subtitle && <p className="text-[13px] text-slate-500 max-w-sm">{subtitle}</p>}
      </div>
    </div>
  );
}
