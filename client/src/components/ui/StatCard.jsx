const ACCENTS = {
  green:  { bg: 'bg-emerald-50',  border: 'border-emerald-200', text: 'text-emerald-700', bar: 'bg-emerald-500' },
  yellow: { bg: 'bg-amber-50',    border: 'border-amber-200',   text: 'text-amber-700',   bar: 'bg-amber-500'   },
  red:    { bg: 'bg-red-50',      border: 'border-red-200',     text: 'text-red-700',     bar: 'bg-red-500'     },
  blue:   { bg: 'bg-blue-50',     border: 'border-blue-200',    text: 'text-blue-700',    bar: 'bg-blue-500'    },
  default:{ bg: 'bg-white',       border: 'border-slate-200',   text: 'text-slate-900',   bar: 'bg-slate-300'   },
};

export default function StatCard({ label, value, sub, accent, icon }) {
  const a = ACCENTS[accent] ?? ACCENTS.default;
  return (
    <div className={`relative rounded-xl border ${a.border} ${a.bg} p-5 overflow-hidden`}>
      {/* Colored left bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${a.bar} rounded-l-xl`} />
      <div className="pl-2">
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
          {icon && <span className="mr-1">{icon}</span>}
          {label}
        </p>
        <p className={`text-3xl font-bold ${a.text} leading-none mb-1`}>
          {value ?? '—'}
        </p>
        {sub && (
          <p className="text-[11px] text-slate-400 mt-1.5">{sub}</p>
        )}
      </div>
    </div>
  );
}
