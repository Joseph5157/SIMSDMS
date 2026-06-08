import Sidebar from './Sidebar';

export default function Layout({ user, children }) {
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar user={user} />
      <main className="flex-1 overflow-y-auto h-full">
        <div className="max-w-7xl mx-auto px-4 md:px-6 pt-14 md:pt-6 pb-8 min-w-0">
          {children}
        </div>
      </main>
    </div>
  );
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between mb-6 gap-3 min-w-0 pb-4 border-b border-slate-200">
      <div className="min-w-0 flex-1">
        <h1 className="text-[18px] font-bold text-slate-900 tracking-tight truncate">{title}</h1>
        {subtitle && (
          <p className="text-[12px] text-slate-400 mt-0.5 truncate">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
