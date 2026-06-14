export function Table({ children, className = '' }) {
  return (
    <div className={`overflow-x-auto rounded-lg border border-slate-200 shadow-card bg-white ${className}`}>
      <table className="min-w-full divide-y divide-slate-100">
        {children}
      </table>
    </div>
  );
}

export function Th({ children, className = '' }) {
  return (
    <th className={`text-[10px] font-bold text-slate-400 uppercase tracking-[0.08em] bg-slate-50 px-4 py-3 text-left whitespace-nowrap ${className}`}>
      {children}
    </th>
  );
}

export function Td({ children, className = '' }) {
  return (
    <td className={`text-[13px] text-slate-700 px-4 py-3 border-b border-divider last:border-0 ${className}`}>
      {children}
    </td>
  );
}

export function Tr({ children, className = '', onClick }) {
  return (
    <tr
      onClick={onClick}
      className={`transition-colors duration-100 ${
        onClick ? 'cursor-pointer hover:bg-blue-50/50 active:bg-blue-50' : 'hover:bg-slate-50/50'
      } ${className}`}
    >
      {children}
    </tr>
  );
}

export function EmptyRow({ cols, message = 'No records found.' }) {
  return (
    <tr>
      <td colSpan={cols} className="py-14 text-center">
        <div className="flex flex-col items-center gap-2">
          <span className="text-3xl opacity-40">📭</span>
          <span className="text-[13px] text-slate-400">{message}</span>
        </div>
      </td>
    </tr>
  );
}
