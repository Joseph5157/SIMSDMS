import Sidebar from './Sidebar';

export default function Layout({ user, children }) {
  return (
    <div className="flex h-screen bg-[#f5f5f5] overflow-hidden">
      <Sidebar user={user} />
      <main className="flex-1 overflow-y-auto h-full">
        <div className="max-w-7xl mx-auto px-4 md:px-6 pt-14 md:pt-6 pb-6 min-w-0">{children}</div>
      </main>
    </div>
  );
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between mb-6 gap-2 min-w-0">
      <div className="min-w-0 flex-1">
        <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
        {subtitle && <p className="text-[13px] text-slate-500 mt-1">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}
