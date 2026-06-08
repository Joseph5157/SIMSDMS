import Sidebar from './Sidebar';

export default function Layout({ user, children }) {
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar user={user} />
      <main className="flex-1 overflow-y-auto h-full">
        <div className="max-w-7xl mx-auto px-4 md:px-6 pt-14 md:pt-6 pb-6">{children}</div>
      </main>
    </div>
  );
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-[16px] font-semibold text-slate-900">{title}</h1>
        {subtitle && <p className="text-[12px] text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
