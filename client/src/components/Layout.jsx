import Sidebar from './Sidebar';
// NotificationBell hidden — backend notifications module not yet implemented
// TODO: restore <NotificationBell /> here once /api/notifications routes exist

export default function Layout({ user, children }) {
  return (
    <div className="flex h-dvh bg-slate-50 overflow-hidden">
      <Sidebar user={user} />
      <main
        className="flex-1 overflow-y-auto h-full relative"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div className="page-content">
          {children}
        </div>
      </main>
    </div>
  );
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div
      className="flex items-center justify-between gap-3 mb-6 pb-4"
      style={{ borderBottom: '1px solid var(--border)', minWidth: 0 }}
    >
      <div className="min-w-0 flex-1">
        <h1 className="text-lg font-bold text-slate-900 truncate leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs text-slate-400 mt-0.5 truncate">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/* ── Section card ── */
export function Card({ children, className = '' }) {
  return (
    <div className={`card overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ children, action }) {
  return (
    <div className="card-header flex items-center justify-between gap-2">
      <p className="text-[13px] font-semibold text-slate-700">{children}</p>
      {action}
    </div>
  );
}

export function CardBody({ children, className = '' }) {
  return (
    <div className={`p-4 ${className}`}>
      {children}
    </div>
  );
}
