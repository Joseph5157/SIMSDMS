import Sidebar from './Sidebar';

export default function Layout({ user, children }) {
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar user={user} />
      <main className="flex-1 overflow-y-auto h-full">
        <div className="px-4 md:px-6 pt-14 md:pt-6 pb-24 md:pb-8">
          {children}
        </div>
      </main>
    </div>
  );
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-center justify-between mb-5 gap-2 pb-4 border-b border-slate-200">
      <div className="min-w-0 flex-1">
        <h1 className="text-[17px] font-bold text-slate-900 truncate">{title}</h1>
        {subtitle && (
          <p className="text-[12px] text-slate-400 mt-0.5 truncate">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
