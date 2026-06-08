import Sidebar from './Sidebar';

export default function Layout({ user, children }) {
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar user={user} />
      <main className="flex-1 overflow-y-auto h-full" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div style={{
          paddingTop: 'max(56px, calc(env(safe-area-inset-top) + 16px))',
          paddingLeft: 'max(16px, env(safe-area-inset-left))',
          paddingRight: 'max(16px, env(safe-area-inset-right))',
          paddingBottom: 'max(96px, calc(env(safe-area-inset-bottom) + 80px))',
          minWidth: 0,
          minHeight: '100%',
        }}>
          {children}
        </div>
      </main>
    </div>
  );
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-center justify-between mb-5 gap-2 pb-4 border-b border-slate-200"
      style={{ minWidth: 0, width: '100%' }}>
      <div className="min-w-0 flex-1">
        <h1 className="text-[17px] font-bold text-slate-900 truncate" style={{ paddingLeft: 0 }}>{title}</h1>
        {subtitle && (
          <p className="text-[12px] text-slate-400 mt-0.5 truncate">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
