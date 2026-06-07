export function Table({ children, className = '' }) {
  return (
    <div className={`overflow-x-auto rounded-[10px] border border-slate-200 ${className}`}>
      <table className="min-w-full divide-y divide-slate-100">{children}</table>
    </div>
  );
}

export function Th({ children, className = '' }) {
  return (
    <th className={`text-[11px] font-semibold text-slate-500 uppercase tracking-[.04em] bg-slate-50 px-3 py-2.5 text-left ${className}`}>
      {children}
    </th>
  );
}

export function Td({ children, className = '' }) {
  return (
    <td className={`text-[13px] text-slate-700 px-3 py-2.5 whitespace-nowrap ${className}`}>
      {children}
    </td>
  );
}

export function Tr({ children, className = '' }) {
  return (
    <tr className={`hover:bg-slate-50 ${className}`}>
      {children}
    </tr>
  );
}

export function EmptyRow({ cols, message = 'No records found.' }) {
  return (
    <tr>
      <td colSpan={cols} className="text-[13px] text-slate-400 text-center py-10">{message}</td>
    </tr>
  );
}
