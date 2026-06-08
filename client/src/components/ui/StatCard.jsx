export default function StatCard({ label, value, sub, accent }) {
  const accentBorder = accent === 'red'    ? 'border-l-red-500'
                     : accent === 'yellow' ? 'border-l-amber-500'
                     : accent === 'green'  ? 'border-l-green-500'
                     : 'border-l-slate-200';

  const accentBg = accent === 'red'    ? 'bg-red-50'
                 : accent === 'yellow' ? 'bg-amber-50'
                 : accent === 'green'  ? 'bg-green-50'
                 : 'bg-white';

  return (
    <div className={`rounded-xl border border-slate-200 shadow-sm p-5 border-l-4 ${accentBorder} ${accentBg}`}>
      <p className="text-[12px] font-semibold text-slate-500 uppercase tracking-wide mb-3">{label}</p>
      <p className="text-3xl font-bold text-slate-900">{value ?? '—'}</p>
      {sub && <p className="text-[12px] text-slate-500 mt-2">{sub}</p>}
    </div>
  );
}
