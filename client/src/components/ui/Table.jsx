export function Table({ children, className = '' }) {
  return (
    <div className={`overflow-x-auto -mx-4 md:mx-0 md:rounded-xl border-y md:border border-slate-200 md:shadow-sm ${className}`}>
      <table className="min-w-full divide-y divide-slate-100">{children}</table>
    </div>
  );
}

export function Th({ children, className = '' }) {
  return (
    <th className={`text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-50 px-3 py-3 text-left whitespace-nowrap ${className}`}>
      {children}
    </th>
  );
}

export function Td({ children, className = '' }) {
  return (
    <td className={`text-[13px] text-slate-700 px-3 py-3 ${className}`}>
      {children}
    </td>
  );
}

export function Tr({ children, className = '', onClick }) {
  return (
    <tr
      onClick={onClick}
      className={`border-b border-slate-50 hover:bg-blue-50/40 transition-colors ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {children}
    </tr>
  );
}

export function EmptyRow({ cols, message = 'No records found.' }) {
  return (
    <tr>
      <td colSpan={cols} className="text-[13px] text-slate-400 text-center py-12">
        <div className="flex flex-col items-center gap-2">
          <span className="text-2xl">📭</span>
          <span>{message}</span>
        </div>
      </td>
    </tr>
  );
}
