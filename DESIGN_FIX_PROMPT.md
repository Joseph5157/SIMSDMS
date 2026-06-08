# SIMS DMS — Design Quality Fix
# Paste this ENTIRE file as your message to Claude Code

The SIMS DMS UI looks basic because StatCard is defined 3 separate times
inside individual page files, so redesigning one doesn't affect the others.
I need you to:

1. Create ONE shared StatCard component
2. Replace all 3 local StatCard definitions with imports of the shared one
3. Upgrade the shared UI components (Table, Button, Badge, Layout)
4. Apply proper design to the dashboard panels

Do all of this now. Here are the exact changes:

---

## STEP 1 — Create client/src/components/ui/StatCard.jsx

Create this file (it does not exist yet):

```jsx
const ACCENTS = {
  green:  { bg: 'bg-emerald-50',  border: 'border-emerald-200', text: 'text-emerald-700', bar: 'bg-emerald-500' },
  yellow: { bg: 'bg-amber-50',    border: 'border-amber-200',   text: 'text-amber-700',   bar: 'bg-amber-500'   },
  red:    { bg: 'bg-red-50',      border: 'border-red-200',     text: 'text-red-700',     bar: 'bg-red-500'     },
  blue:   { bg: 'bg-blue-50',     border: 'border-blue-200',    text: 'text-blue-700',    bar: 'bg-blue-500'    },
  default:{ bg: 'bg-white',       border: 'border-slate-200',   text: 'text-slate-900',   bar: 'bg-slate-300'   },
};

export default function StatCard({ label, value, sub, accent, icon }) {
  const a = ACCENTS[accent] ?? ACCENTS.default;
  return (
    <div className={`relative rounded-xl border ${a.border} ${a.bg} p-5 overflow-hidden`}>
      {/* Colored left bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${a.bar} rounded-l-xl`} />
      <div className="pl-2">
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
          {icon && <span className="mr-1">{icon}</span>}
          {label}
        </p>
        <p className={`text-3xl font-bold ${a.text} leading-none mb-1`}>
          {value ?? '—'}
        </p>
        {sub && (
          <p className="text-[11px] text-slate-400 mt-1.5">{sub}</p>
        )}
      </div>
    </div>
  );
}
```

---

## STEP 2 — Update client/src/pages/admin/AdminDashboardPage.jsx

At the top of the file, add this import:
  import StatCard from '../../components/ui/StatCard';

Then DELETE the entire local StatCard function definition (lines 8-27
approximately, everything from `function StatCard` to its closing `}`).

Then update the StatCard usages to add icons:
  <StatCard label="Active faculty" value={activeFaculty} accent="green" icon="👥" />
  <StatCard label="Pending approvals" value={pendingCount} accent={pendingCount > 0 ? 'yellow' : 'default'} sub={pendingCount > 0 ? 'Needs action' : 'All clear'} icon="⏳" />
  <StatCard label="Open cover requests" value={openCoverCount} accent={openCoverCount > 0 ? 'yellow' : 'default'} icon="🔄" />
  <StatCard label="Flagged violations" value={flaggedCount} accent={flaggedCount > 0 ? 'red' : 'default'} sub={flaggedCount > 0 ? 'Awaiting review' : 'None pending'} icon="⚑" />

Then upgrade the two panel cards from plain boxes to proper cards.

Find:
  <div className="grid grid-cols-2 gap-6 mb-6">
Change to:
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">

Find the Today's attendance panel:
  <div className="bg-white rounded-xl border border-gray-200 p-5">
    <p className="text-sm font-semibold text-gray-700 mb-3">
      Today's attendance
Change to:
  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
    <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
      <p className="text-[13px] font-semibold text-slate-900">📋 Today's attendance</p>

Find the Open cover requests panel (the second div in that grid):
  <div className="bg-white rounded-xl border border-gray-200 p-5">
    <p className="text-sm font-semibold text-gray-700 mb-3">Open cover requests
Change to:
  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
    <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
      <p className="text-[13px] font-semibold text-slate-900">🔄 Open cover requests</p>

---

## STEP 3 — Update client/src/pages/faculty/DashboardPage.jsx

Add import at top:
  import StatCard from '../../components/ui/StatCard';

DELETE the local function StatCard definition.

Update usages:
  <StatCard label="Slots this month" value={slots.length} accent="blue" icon="🗓" />
  <StatCard label="Violations recorded" value={violationsData?.meta?.total ?? 0} accent="default" icon="⚠️" />
  <StatCard label="Unread messages" value={unread} accent={unread > 0 ? 'yellow' : 'default'} icon="✉️" />

---

## STEP 4 — Update client/src/pages/super-admin/SuperAdminDashboardPage.jsx

Add import at top:
  import StatCard from '../../components/ui/StatCard';

DELETE the local function StatCard definition.

---

## STEP 5 — Upgrade client/src/components/ui/Table.jsx

Replace the entire file with:

```jsx
export function Table({ children, className = '' }) {
  return (
    <div className={`overflow-x-auto rounded-xl border border-slate-200 shadow-sm ${className}`}>
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
```

---

## STEP 6 — Upgrade client/src/components/Layout.jsx

Replace entire file with:

```jsx
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
```

---

## STEP 7 — Upgrade client/src/components/ui/Button.jsx

Replace entire file with:

```jsx
const variants = {
  primary:   'bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow disabled:opacity-50',
  secondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 shadow-sm disabled:opacity-50',
  danger:    'bg-red-600 text-white hover:bg-red-700 shadow-sm disabled:opacity-50',
  ghost:     'text-slate-600 hover:bg-slate-100 disabled:opacity-50',
  success:   'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm disabled:opacity-50',
};

const sizes = {
  default: 'px-4 py-2 text-[13px]',
  sm:      'px-3 py-1.5 text-[12px]',
  lg:      'px-5 py-2.5 text-[14px]',
};

export default function Button({
  children, variant = 'primary', size = 'default',
  className = '', loading, ...props
}) {
  return (
    <button
      className={`rounded-lg font-medium inline-flex items-center gap-1.5 transition-all duration-150 ${sizes[size] ?? sizes.default} ${variants[variant]} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  );
}
```

---

## STEP 8 — Update client/src/utils/constants.js

Find STATUS_COLORS and replace with:

```js
export const STATUS_COLORS = {
  active:          'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200',
  inactive:        'bg-slate-100 text-slate-500',
  pending:         'bg-amber-100 text-amber-700 ring-1 ring-amber-200',
  open:            'bg-blue-100 text-blue-700 ring-1 ring-blue-200',
  covered:         'bg-emerald-100 text-emerald-700',
  expired:         'bg-red-100 text-red-600',
  cancelled:       'bg-slate-100 text-slate-500',
  cover_pending:   'bg-orange-100 text-orange-600 ring-1 ring-orange-200',
  scheduled:       'bg-blue-100 text-blue-700',
  completed:       'bg-emerald-100 text-emerald-700',
  absent:          'bg-red-100 text-red-600 ring-1 ring-red-200',
  normal:          'bg-emerald-100 text-emerald-700',
  late:            'bg-amber-100 text-amber-700 ring-1 ring-amber-200',
  hidden:          'bg-slate-100 text-slate-400 line-through',
  flagged:         'bg-amber-100 text-amber-700 ring-1 ring-amber-200',
  not_checked_in:  'bg-slate-100 text-slate-500',
  checked_in:      'bg-blue-100 text-blue-700 ring-1 ring-blue-200',
  checked_out:     'bg-emerald-100 text-emerald-700',
};

export const ROLE_COLORS = {
  super_admin: 'bg-purple-100 text-purple-700 ring-1 ring-purple-200',
  admin:       'bg-amber-100 text-amber-700 ring-1 ring-amber-200',
  faculty:     'bg-blue-100 text-blue-700 ring-1 ring-blue-200',
};
```

---

## STEP 9 — Update client/src/index.css

Find and replace the body rule:

```css
body {
  font-family: system-ui, -apple-system, sans-serif;
  font-size: 15px;
  line-height: 1.6;
  color: #0f172a;
  background-color: #f8fafc;
}
```

---

After all 9 steps are done, rebuild and redeploy.
These changes affect every page because they touch the shared components
that all pages use: Layout, Table, Button, Badge (via constants), and StatCard.
