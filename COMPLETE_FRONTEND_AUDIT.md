# SIMS DMS — Complete Frontend Architecture Audit
**Senior Full-Stack, Mobile UX & Product Review**

---

## EXECUTIVE SUMMARY

Your app has **3 critical issues** causing the "flash" and visual inconsistencies users are reporting:

1. **Hydration Flash** — User state isn't persisted, causing 1-2 second delay before redirect
2. **Typography Chaos** — Font sizes and weights vary across pages, breaking visual hierarchy
3. **Color Inconsistency** — Mix of CSS variables and hardcoded hex values, especially in dashboards

**Impact**: Users see loading spinner → then correct content. Dashboards briefly render old design then snap to new. Forms feel inconsistent.

---

# ISSUE CATALOG

## TIER 1 — CRITICAL (Fix FIRST)

### ISSUE 1.1: Flash on Initial Page Load (Hydration Problem)

**Priority**: 🔴 **CRITICAL** — Affects every user every time  
**Severity**: High impact on UX, medium complexity to fix

**Problem**:
1. User visits app or returns from login
2. `useCurrentUser()` hook in `App.jsx` returns undefined while loading
3. `AppRoutes` shows `isLoading ? null : render`, so screen is blank
4. After 200-500ms, query resolves → page redirects to dashboard
5. **Result**: White screen flash, then sudden redirect

**Why it matters**:
- Looks broken to users
- Tests in Chrome DevTools show a blank page before redirect
- Mobile users especially notice the delay
- Creates impression of slow app

**Where it happens**:
- `client/src/App.jsx` — AppRoutes function, line ~37
- `client/src/hooks/useAuth.js` — useCurrentUser(), no persistence
- Every page load, every login redirect

**Root cause**:
```javascript
// App.jsx, AppRoutes
const { data: user, isLoading } = useCurrentUser();

return (
  <Routes>
    {/* ... routes ... */}
    <Route path="/" element={
      isLoading ? null :  // ← Blank page while loading
      !user ? <Navigate to="/login" replace /> :
      // ... redirect logic
    } />
```

useCurrentUser() has NO persistence strategy. If user refreshes, we lose all state and must fetch again.

**Exact fix**:

1. Create `client/src/lib/auth.js`:
```javascript
// Auth state persistence layer
export function saveUserToStorage(user) {
  if (user) {
    sessionStorage.setItem('sims_user_cached', JSON.stringify(user));
  }
}

export function loadUserFromStorage() {
  const cached = sessionStorage.getItem('sims_user_cached');
  return cached ? JSON.parse(cached) : null;
}

export function clearUserStorage() {
  sessionStorage.removeItem('sims_user_cached');
}
```

2. Update `client/src/hooks/useAuth.js`:
```javascript
// Add at top
import { loadUserFromStorage, saveUserToStorage } from '../lib/auth';

export function useCurrentUser() {
  const cachedUser = loadUserFromStorage();
  
  return useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const res = await api.get('/users/me');
      saveUserToStorage(res.data);
      return res.data;
    },
    initialData: cachedUser, // ← Use cached data immediately
    retry: false,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ email, password }) => 
      api.post('/auth/login', { email, password }),
    onSuccess: (res) => {
      saveUserToStorage(res.data); // ← Save when login succeeds
      qc.setQueryData(['currentUser'], res.data);
    },
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/auth/logout'),
    onSuccess: () => {
      clearUserStorage(); // ← Clear when logout
      qc.clear();
      window.location.href = '/login';
    },
  });
}
```

3. Update `client/src/pages/auth/LoginPage.jsx` to use the hook:
```javascript
// Replace the manual setLoading/navigate with useLogin hook
import { useLogin } from '../../hooks/useAuth';

export default function LoginPage() {
  const login = useLogin();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    try {
      const res = await login.mutateAsync({ email, password });
      if (res.must_change_password) {
        navigate('/change-password', { replace: true });
      } else if (res.role === 'faculty') {
        navigate('/faculty/dashboard', { replace: true });
      } else {
        navigate('/admin/dashboard', { replace: true });
      }
    } catch (err) {
      setError('Invalid email or password.');
    }
  }

  return (
    // ... form
    <button disabled={login.isPending}>
      {login.isPending ? 'Signing in...' : 'Sign in'}
    </button>
  );
}
```

**Expected result**: 
- Cached user loads instantly
- No blank screen
- Query still fetches fresh data in background
- If session expired, auto-redirect to login

**Files affected**:
- `client/src/lib/auth.js` — NEW file
- `client/src/hooks/useAuth.js` — Update useCurrentUser, useLogin, useLogout
- `client/src/pages/auth/LoginPage.jsx` — Use useLogin hook
- `client/src/App.jsx` — No change needed (fix is in the hook)

---

### ISSUE 1.2: Modal Content Padding Missing

**Priority**: 🔴 **CRITICAL** — Affects all forms in modals

**Problem**:
```javascript
// Modal.jsx
<DialogContent className="...">
  <DialogHeader className="px-6 py-5 ...">...</DialogHeader>
  <div className="overflow-y-auto flex-1 p-0 flex flex-col gap-0">
    {children}
  </div>
</DialogContent>
```

Modal body has `p-0` (no padding). Form inputs inside have no padding. Forms are cramped against edges on mobile.

**Why it matters**:
- Touch targets too close together (44px tap target size is the minimum)
- Form fields look wrong on mobile
- Inputs appear cut off

**Where it happens**:
- Every modal: Add User, Promote Student, Record Violation, etc.
- `client/src/components/ui/Modal.jsx`, line ~30

**Exact fix**:
```javascript
// client/src/components/ui/Modal.jsx
export default function Modal({ open, onClose, title, size = 'md', children }) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className={cn(
          widths[size],
          'max-h-[92vh] overflow-hidden flex flex-col',
          'rounded-2xl p-0 gap-0 border border-slate-200 shadow-modal bg-white'
        )}
        showCloseButton={false}
      >
        <DialogHeader className="px-6 py-5 border-b border-slate-200 shrink-0">
          <DialogTitle className="text-[15px] font-bold text-slate-900">
            {title}
          </DialogTitle>
        </DialogHeader>
        {/* FIX: Add padding here */}
        <div className="overflow-y-auto flex-1 px-6 py-5 flex flex-col gap-4">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

Change from:
- `p-0 flex flex-col gap-0` 
To:
- `px-6 py-5 flex flex-col gap-4`

This aligns with the header padding and gives forms breathing room.

**Files affected**:
- `client/src/components/ui/Modal.jsx` — Update line ~30

---

### ISSUE 1.3: Faculty Dashboard Color Hardcoded (Not Using Design System)

**Priority**: 🔴 **CRITICAL** — Breaks design consistency

**Problem**:
```javascript
// client/src/pages/faculty/DashboardPage.jsx, line ~72
<div style={{
  borderRadius: 'var(--radius-2xl)', 
  padding: 16,
  background: 'linear-gradient(135deg, var(--blue-50), #eef2ff)',  // ← HARDCODED #eef2ff
  border: '1px solid var(--blue-200)',
}}>
```

Uses CSS variable for blue-50, but hardcodes indigo-50 (#eef2ff) as gradient stop.

**Why it matters**:
- If design system colors change, this gradient doesn't update
- Inconsistent with the rest of the app (all other gradients use variables)
- Creates visual discontinuity

**Exact fix**:
```javascript
// client/src/pages/faculty/DashboardPage.jsx, line ~72
<div style={{
  borderRadius: 'var(--radius-2xl)', 
  padding: 16,
  background: 'linear-gradient(135deg, var(--color-blue-50), var(--color-indigo-100))',
  border: '1px solid var(--color-blue-200)',
}}>
```

Map the hardcoded colors to CSS variables from index.css:
- `#eef2ff` = `var(--color-indigo-100)` (add this to index.css if missing)

**Files affected**:
- `client/src/pages/faculty/DashboardPage.jsx` — Line ~72, change hardcoded hex to CSS variable
- `client/src/index.css` — Add `--color-indigo-100: #e0e7ff;` if missing

---

### ISSUE 1.4: ProtectedRoute Loading Indicator Too Minimal

**Priority**: 🔴 **CRITICAL** — Confuses users on slow networks

**Problem**:
```javascript
// client/src/components/ProtectedRoute.jsx, line ~8
if (isLoading) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
```

Shows only a tiny spinner on a blank page. User doesn't know if app is loading or frozen.

**Why it matters**:
- On 3G networks, loading takes 2-3 seconds
- User thinks app is broken
- No context about what's being loaded

**Exact fix**:
```javascript
// client/src/components/ProtectedRoute.jsx
export default function ProtectedRoute({ user, isLoading, requiredRoles }) {
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="flex flex-col items-center gap-4">
          {/* Animated spinner */}
          <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          {/* Status text */}
          <div className="text-center">
            <p className="text-sm font-medium text-slate-900">Verifying access</p>
            <p className="text-xs text-slate-500 mt-1">Please wait…</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (user.must_change_password && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  if (requiredRoles && !requiredRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="text-4xl mb-4">🔐</div>
          <p className="text-xl font-semibold text-red-600 mb-2">Access Denied</p>
          <p className="text-slate-500 text-sm">Your role (<span className="font-medium">{user.role}</span>) doesn't have access to this page.</p>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
```

**Files affected**:
- `client/src/components/ProtectedRoute.jsx` — Replace loading indicator

---

## TIER 2 — HIGH (Fix NEXT)

### ISSUE 2.1: Inconsistent Title Sizes Across Pages

**Priority**: 🟠 **HIGH** — Breaks visual hierarchy

**Problem**:
- LoginPage: `font-size: 28px` (h1)
- AdminDashboard: `text-lg` (18px via Tailwind)
- StudentsPage: `text-lg` (18px)
- PageHeader: `text-lg` (18px)

Page titles should be consistent size.

**Why it matters**:
- Visual hierarchy is broken
- Users don't know which sections are most important
- Different pages feel disconnected

**Exact fix**:

1. Update `client/src/components/Layout.jsx`:
```javascript
export function PageHeader({ title, subtitle, action }) {
  return (
    <div style={{ borderBottom: '1px solid var(--border)', minWidth: 0 }}>
      <div className="flex items-center justify-between gap-3 mb-6 pb-4">
        <div className="min-w-0 flex-1">
          {/* Change from text-lg to text-xl */}
          <h1 className="text-xl font-bold text-slate-900 truncate leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-slate-400 mt-1 truncate">{subtitle}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}
```

2. Update `client/src/pages/admin/AdminDashboardPage.jsx`:
```javascript
// Change from text-lg (18px) to match PageHeader
<h1 className="text-xl font-bold text-slate-900 truncate leading-tight">
  {`Good ${getGreeting()}, ${user?.name?.split(' ')[0]}`}
</h1>
```

3. Create a Typography Scale guide:

Add to `client/src/index.css`:
```css
/* Typography hierarchy */
h1, .h1 {
  font-size: var(--text-display);    /* 28px */
  font-weight: var(--weight-extra);  /* 800 */
  line-height: var(--leading-tight); /* 1.2 */
}

h2, .h2 {
  font-size: var(--text-h2);        /* 22px */
  font-weight: var(--weight-bold);  /* 700 */
  line-height: var(--leading-snug); /* 1.4 */
}

h3, .h3 {
  font-size: var(--text-page-title); /* 18px */
  font-weight: var(--weight-bold);   /* 700 */
}

.page-title {
  font-size: var(--text-page-title); /* 18px */
  font-weight: var(--weight-bold);   /* 700 */
  color: var(--text-primary);
}

.card-title {
  font-size: var(--text-card-lg);   /* 15px */
  font-weight: var(--weight-bold);  /* 700 */
}

.section-title {
  font-size: var(--text-card);      /* 13px */
  font-weight: var(--weight-bold);  /* 700 */
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
}
```

**Files affected**:
- `client/src/components/Layout.jsx` — PageHeader, Card, CardHeader
- `client/src/pages/admin/AdminDashboardPage.jsx` — Title styling
- `client/src/pages/faculty/DashboardPage.jsx` — Title styling
- `client/src/index.css` — Add typography scale

---

### ISSUE 2.2: No Loading Skeletons for Data Tables

**Priority**: 🟠 **HIGH** — Users don't know if app is loading

**Problem**:
```javascript
// client/src/pages/admin/StudentsPage.jsx
const { data, isLoading } = useStudents({ ... });

return (
  <>
    {isLoading && <div ...>Loading…</div>}
    {!isLoading && !data?.data?.length && <div ...>No students</div>}
    {data?.data?.map((s) => <StudentCard ... />)}
  </>
);
```

Shows "Loading…" text. On slow networks, this is confusing. Users want to see the table skeleton.

**Why it matters**:
- Better perceived performance
- Users see WHERE data will appear
- Smoother transition when data arrives

**Exact fix**:

1. Create `client/src/components/ui/Skeleton.jsx`:
```javascript
export default function Skeleton({ className = '', width = '100%', height = '16px' }) {
  return (
    <div
      className={`bg-slate-200 rounded animate-pulse ${className}`}
      style={{ width, height }}
    />
  );
}

// Export row skeleton for tables
export function TableRowSkeleton({ cols = 5 }) {
  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50/50">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton height="16px" width={Math.random() * 40 + 60 + '%'} />
        </td>
      ))}
    </tr>
  );
}

// Export card skeleton for mobile
export function CardSkeleton() {
  return (
    <div className="border-b border-slate-50 py-3 px-4">
      <Skeleton height="18px" width="60%" className="mb-2" />
      <Skeleton height="14px" width="80%" className="mb-3" />
      <Skeleton height="14px" width="50%" />
    </div>
  );
}
```

2. Update `client/src/pages/admin/StudentsPage.jsx`:
```javascript
import Skeleton, { CardSkeleton, TableRowSkeleton } from '../../components/ui/Skeleton';

export default function StudentsPage({ user }) {
  const { data, isLoading } = useStudents({ ... });

  return (
    <>
      {/* Mobile skeleton */}
      <div className="md:hidden">
        {isLoading && (
          <div style={{ ... }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        )}
        {!isLoading && !data?.data?.length && (
          <EmptyState message="No students found." />
        )}
        {data?.data?.map((s) => <StudentCard key={s.id} student={s} ... />)}
      </div>

      {/* Desktop table skeleton */}
      <Table>
        <thead>
          <tr>
            <Th>Name</Th>
            <Th>Reg. Number</Th>
            <Th>Course</Th>
            <Th>Status</Th>
            <Th>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {isLoading && Array.from({ length: 10 }).map((_, i) => (
            <TableRowSkeleton key={i} cols={5} />
          ))}
          {!isLoading && !data?.data?.length && (
            <EmptyRow cols={5} message="No students found." />
          )}
          {data?.data?.map((s) => (
            <Tr key={s.id}>
              <Td>{s.student_name}</Td>
              <Td>{s.registration_number}</Td>
              <Td>{s.course}</Td>
              <Td><Badge status={s.status} /></Td>
              <Td>
                <Button size="sm" onClick={() => { /* ... */ }}>
                  Edit
                </Button>
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>
    </>
  );
}
```

**Files affected**:
- `client/src/components/ui/Skeleton.jsx` — NEW file
- `client/src/pages/admin/StudentsPage.jsx` — Add skeleton loading
- `client/src/pages/admin/UsersPage.jsx` — Add skeleton loading
- `client/src/pages/faculty/CoverRequestsPage.jsx` — Add skeleton loading
- (All data pages that use tables)

---

### ISSUE 2.3: Button Size Inconsistency on Mobile

**Priority**: 🟠 **HIGH** — Touch targets too small in some places

**Problem**:
```javascript
// client/src/components/ui/Button.jsx
const sizes = {
  xs:      'h-7 px-2.5 text-[11px] rounded-md',      // 28px — too small
  sm:      'h-8 px-3 text-[12px] rounded-lg',        // 32px — too small
  default: 'min-h-[44px] sm:min-h-0 sm:h-10 px-4 ...',  // 44px on mobile ✓
  lg:      'h-12 px-6 text-[15px] rounded-xl',       // 48px ✓
};
```

Buttons use `min-h-[44px]` on mobile for default size, but `xs` and `sm` are only 28-32px.

Mobile guidelines require 44px × 44px minimum tap targets.

**Why it matters**:
- Users miss clicking small buttons
- Accessibility violation
- Frustrating on phones

**Exact fix**:
```javascript
// client/src/components/ui/Button.jsx
const sizes = {
  // On mobile, xs/sm should still be 44px minimum
  xs:      'h-9 sm:h-7 px-3 text-[11px] rounded-md',
  sm:      'h-10 sm:h-8 px-3.5 text-[12px] rounded-lg',
  default: 'min-h-[44px] sm:h-10 px-4 text-[13px] rounded-xl',
  lg:      'min-h-[48px] sm:h-12 px-6 text-[15px] rounded-xl',
};
```

On mobile: `h-9` (36px) and `h-10` (40px) are still below 44px. Use padding or full height:

Better approach:
```javascript
const sizes = {
  // 44px minimum on all screens for mobile-first
  xs:      'h-9 px-3 text-[11px] sm:h-7 sm:px-2.5',
  sm:      'h-10 px-3.5 text-[12px] sm:h-8 sm:px-3',
  default: 'h-11 px-4 text-[13px] sm:h-10 sm:px-3.5',
  lg:      'h-12 px-6 text-[15px] sm:h-11 sm:px-5',
};
```

Or keep semantic sizes and enforce 44px minimum:
```javascript
const baseStyles = 'inline-flex items-center justify-center gap-1.5 rounded-xl font-semibold transition-all duration-150 outline-none select-none focus-visible:ring-2 focus-visible:ring-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none';

const sizes = {
  xs:      'px-3 py-2 text-[11px]',  // Will be 44px tall with padding
  sm:      'px-3.5 py-2.5 text-[12px]',
  default: 'px-4 py-3 text-[13px]',
  lg:      'px-6 py-3 text-[15px]',
};

// Calculate minimum height
className={cn(
  baseStyles,
  'min-h-[44px] min-w-[44px]',  // Always at least 44px
  sizes[size],
  variants[variant],
  className
)}
```

**Files affected**:
- `client/src/components/ui/Button.jsx` — Update size definitions

---

### ISSUE 2.4: No Color Consistency in Cards and Panels

**Priority**: 🟠 **HIGH** — Confusing visual design

**Problem**:
Faculty Dashboard "Today's duty" panel:
```javascript
background: 'linear-gradient(135deg, var(--blue-50), #eef2ff)',
```

Other panels use solid colors or different gradients. No consistency.

Admin Dashboard stat cards use inline styles with hardcoded colors in some places.

**Why it matters**:
- Design looks chaotic
- Hard to maintain
- Confusing information hierarchy

**Exact fix**:

Create `client/src/components/ui/Panel.jsx`:
```javascript
export default function Panel({ 
  children, 
  accent = 'blue',  // blue | emerald | amber | red | purple
  className = '',
  interactive = false 
}) {
  const accents = {
    blue:    { bg: 'var(--blue-50)', border: 'var(--blue-200)', text: 'var(--blue-800)' },
    emerald: { bg: 'var(--emerald-bg)', border: 'var(--emerald-border)', text: 'var(--emerald-text)' },
    amber:   { bg: 'var(--amber-bg)', border: 'var(--amber-border)', text: 'var(--amber-text)' },
    red:     { bg: 'var(--red-bg)', border: 'var(--red-border)', text: 'var(--red-text)' },
    purple:  { bg: 'var(--purple-bg)', border: 'var(--purple-border)', text: 'var(--purple-text)' },
  };

  const a = accents[accent] ?? accents.blue;

  return (
    <div
      className={cn(
        'rounded-2xl border px-4 py-4 transition-all duration-150',
        interactive && 'cursor-pointer hover:shadow-md',
        className
      )}
      style={{
        backgroundColor: a.bg,
        borderColor: a.border,
        color: a.text,
      }}
    >
      {children}
    </div>
  );
}
```

Use in Faculty Dashboard:
```javascript
<Panel accent="blue">
  <p style={{ fontSize: 'var(--text-card)', fontWeight: 'var(--weight-bold)', marginBottom: 2 }}>
    You have duty today
  </p>
  <p style={{ fontSize: 'var(--text-small)' }}>
    {todaySlot.duty_type}
  </p>
</Panel>
```

**Files affected**:
- `client/src/components/ui/Panel.jsx` — NEW file
- `client/src/pages/faculty/DashboardPage.jsx` — Use Panel component
- `client/src/pages/admin/AdminDashboardPage.jsx` — Use Panel for info boxes

---

## TIER 3 — MEDIUM (Fix AFTER CRITICAL)

### ISSUE 3.1: Input Error Styling Uses Hardcoded Red

**Priority**: 🟡 **MEDIUM** — Breaks design consistency

**Problem**:
```javascript
// client/src/components/ui/Input.jsx
error
  ? 'border-red-solid bg-red-bg/30 focus:ring-red-solid/15'  // ← Uses --red-solid var
  : 'border-slate-200 hover:border-slate-300',
```

Uses custom CSS variable `--red-solid` which maps to `#ef4444`. Other components use `#dc2626` for error states.

**Why it matters**:
- Inconsistent error color across the app
- If you change the error color in design, this won't update
- Mixing color systems

**Exact fix**:
```javascript
// client/src/components/ui/Input.jsx
error
  ? 'border-red-600 bg-red-50 focus:ring-red-600/20'
  : 'border-slate-200 hover:border-slate-300',
```

And in `client/src/index.css`, standardize error colors:
```css
:root {
  --color-error:        #dc2626;  /* red-600 */
  --color-error-bg:     #fef2f2;  /* red-50 */
  --color-error-text:   #991b1b;  /* red-900 */
  --color-error-border: #fecaca;  /* red-200 */
}
```

**Files affected**:
- `client/src/components/ui/Input.jsx` — Use red-600 instead of --red-solid
- `client/src/index.css` — Add standardized error colors

---

### ISSUE 3.2: Select Component Missing Mobile Styling

**Priority**: 🟡 **MEDIUM** — Select dropdowns hard to use on mobile

**Problem**:
```javascript
// client/src/components/ui/Select.jsx
export default function Select({ label, error, children, className = '', ...props }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && <label ...>{label}</label>}
      <select style={{ height: 48, ... }}>
        {children}
      </select>
    </div>
  );
}
```

Uses native `<select>` with inline styles. On mobile, this works but doesn't match button styling.

**Why it matters**:
- Select doesn't match Input styling (Input is 44px, Select is 48px)
- On mobile, native select is actually better UX, but inconsistency confuses users
- Should have matching focus states

**Exact fix**:
```javascript
// client/src/components/ui/Select.jsx
import { cn } from '@/lib/utils';

export default function Select({ 
  label, 
  error, 
  children, 
  className = '', 
  ...props 
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.08em]">
          {label}
        </label>
      )}
      <select
        className={cn(
          'h-11 w-full rounded-xl border bg-white px-4 text-[14px] text-slate-900',
          'placeholder:text-slate-400 outline-none transition-all duration-150',
          'appearance-none cursor-pointer',
          'focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-50',
          error
            ? 'border-red-600 bg-red-50 focus:ring-red-600/20'
            : 'border-slate-200 hover:border-slate-300',
          className
        )}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2 4l4 4 4-4' stroke='%2394a3b8' fill='none' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 14px center',
          paddingRight: '36px',
        }}
        {...props}
      >
        {children}
      </select>
      {error && (
        <span className="text-[11px] text-red-600 font-medium">{error}</span>
      )}
    </div>
  );
}
```

Now Select matches Input styling: same height (44px), same focus ring, same error state.

**Files affected**:
- `client/src/components/ui/Select.jsx` — Update to match Input styling

---

### ISSUE 3.3: Alert Component Color Inconsistency

**Priority**: 🟡 **MEDIUM** — Uses hardcoded colors instead of design tokens

**Problem**:
```javascript
// client/src/components/ui/Alert.jsx
const TONES = {
  info: { 
    bg: 'var(--blue-50)',
    border: 'var(--blue-200)',
    accent: 'var(--blue-500)',
    title: 'var(--blue-800)',
    body: 'var(--blue-700)'  // ← Uses --blue-700 which doesn't exist as var
  },
```

Mixing CSS variables with color names that don't exist in the token system.

**Why it matters**:
- `--blue-700` isn't defined in index.css
- Browser falls back to inherited value, breaking color
- Inconsistent with design system

**Exact fix**:
```javascript
// client/src/components/ui/Alert.jsx
const TONES = {
  info: {
    bg: 'var(--color-blue-50)',
    border: 'var(--color-blue-200)',
    accent: 'var(--color-blue-500)',
    title: 'var(--color-blue-800)',
    body: 'var(--color-blue-700)'  // Now matches index.css
  },
  success: {
    bg: 'var(--color-emerald-bg)',
    border: 'var(--color-emerald-border)',
    accent: 'var(--color-emerald-solid)',
    title: 'var(--color-emerald-text)',
    body: 'var(--color-emerald-600)'
  },
  // ... etc
};
```

And verify all color names exist in `client/src/index.css` under @theme.

**Files affected**:
- `client/src/components/ui/Alert.jsx` — Use `var(--color-*)` instead of `var(--*)`
- `client/src/index.css` — Verify all color tokens are defined

---

## TIER 4 — LOW (Enhancement)

### ISSUE 4.1: No Offline Support (PWA Incomplete)

**Priority**: 🔵 **LOW** — Enhancement, not critical

**Problem**:
- `index.html` has `<meta name="mobile-web-app-capable" content="yes">`
- `vite.config.js` has VitePWA with workbox
- But no cache strategy for API calls
- Users can't use app offline

**Exact fix**:
See FEATURE IMPROVEMENTS section below (Feature 10).

---

### ISSUE 4.2: Toast Component Not Dismissable

**Priority**: 🔵 **LOW** — UX polish

**Problem**:
Toast notifications don't have a close button or auto-dismiss timer.

**Exact fix**:
```javascript
// client/src/components/ui/Toast.jsx
// Add auto-dismiss timer
useEffect(() => {
  if (!toast) return;
  const timer = setTimeout(() => setToast(null), 3000); // 3 second auto-dismiss
  return () => clearTimeout(timer);
}, [toast]);
```

---

### ISSUE 4.3: Sidebar Not Responsive at 768px Breakpoint

**Priority**: 🔵 **LOW** — Mobile devices under 768px don't have sidebar

**Problem**:
- Sidebar hidden on mobile (`hidden md:flex`)
- No mobile navigation drawer implemented

**Exact fix**:
See FEATURE IMPROVEMENTS section below (Feature 8 — Mobile Navigation Drawer).

---

# TOP 10 URGENT FIXES

**Apply these in order. Each depends on the prior fixes to test correctly.**

## Fix 1: Hydration Flash (1.1)
**Time: 30 min | Impact: Massive UX improvement**
- Files: `client/src/lib/auth.js` (NEW), `client/src/hooks/useAuth.js`, `client/src/pages/auth/LoginPage.jsx`
- Steps: Create auth.js → Update useCurrentUser hook → Test login flow
- Test: Refresh page after login → should NOT flash or blank

## Fix 2: Modal Padding (1.2)
**Time: 5 min | Impact: Immediate UX improvement**
- Files: `client/src/components/ui/Modal.jsx`
- Change: `p-0 gap-0` → `px-6 py-5 gap-4`
- Test: Open any modal, verify form fields have breathing room

## Fix 3: Faculty Dashboard Color (1.3)
**Time: 10 min | Impact: Design consistency**
- Files: `client/src/pages/faculty/DashboardPage.jsx`, `client/src/index.css`
- Change: `#eef2ff` → `var(--color-indigo-100)`
- Test: Change a color in index.css, verify dashboard updates

## Fix 4: ProtectedRoute Loading (1.4)
**Time: 15 min | Impact: Better perceived performance**
- Files: `client/src/components/ProtectedRoute.jsx`
- Add: Spinner + status text + background gradient
- Test: Go to a protected route while not logged in, verify loading state

## Fix 5: Typography Hierarchy (2.1)
**Time: 25 min | Impact: Visual hierarchy clarity**
- Files: `client/src/components/Layout.jsx`, `client/src/index.css`
- Add: Typography scale classes (h1, h2, h3, .page-title, etc.)
- Update: All page titles to use consistent size
- Test: All dashboards should have same title styling

## Fix 6: Table Skeletons (2.2)
**Time: 45 min | Impact: Better loading UX**
- Files: `client/src/components/ui/Skeleton.jsx` (NEW), all data pages
- Create: Skeleton, CardSkeleton, TableRowSkeleton components
- Update: StudentsPage, UsersPage, and all table-based pages
- Test: Slow network → should see skeleton loader

## Fix 7: Button Size Consistency (2.3)
**Time: 10 min | Impact: Mobile accessibility**
- Files: `client/src/components/ui/Button.jsx`
- Update: Ensure all buttons are min-h-[44px] on mobile
- Test: All buttons clickable on mobile (no tiny buttons)

## Fix 8: Input Error Styling (3.1)
**Time: 5 min | Impact: Design consistency**
- Files: `client/src/components/ui/Input.jsx`, `client/src/index.css`
- Change: `--red-solid` → `--color-error` (red-600)
- Test: Fill form with invalid data, verify error state color

## Fix 9: Select Component Styling (3.2)
**Time: 15 min | Impact: Form consistency**
- Files: `client/src/components/ui/Select.jsx`
- Update: Match Input styling (44px height, focus states, error styling)
- Test: Select should look like Input when focused

## Fix 10: Alert Colors (3.3)
**Time: 10 min | Impact: Design token consistency**
- Files: `client/src/components/ui/Alert.jsx`, `client/src/index.css`
- Update: Use `var(--color-*)` instead of `var(--*)`
- Verify: All color tokens exist in index.css
- Test: Alert components display correct colors

---

# TOP 10 FEATURE IMPROVEMENTS

**These are NOT bugs, but enhancements that will improve UX significantly.**

## Feature 1: Data Persistence Cache
**Priority**: 🔴 **CRITICAL** | Effort: Medium (3 hours)

**What**: Cache API responses to localStorage with TTL  
**Why**: Offline browsing, faster page loads, less API calls

**How**:
```javascript
// client/src/lib/cache.js
export const CACHE_TTL = {
  USER: 5 * 60 * 1000,        // 5 min
  STUDENTS: 10 * 60 * 1000,   // 10 min
  DUTY_SLOTS: 30 * 60 * 1000, // 30 min
};

export function getCacheKey(key) {
  const cached = localStorage.getItem(`cache_${key}`);
  if (!cached) return null;
  const { data, timestamp } = JSON.parse(cached);
  if (Date.now() - timestamp > CACHE_TTL[key]) {
    localStorage.removeItem(`cache_${key}`);
    return null;
  }
  return data;
}

export function setCacheKey(key, data) {
  localStorage.setItem(`cache_${key}`, JSON.stringify({
    data,
    timestamp: Date.now(),
  }));
}
```

Use in hooks:
```javascript
export function useStudents({ ... }) {
  const cached = getCacheKey('STUDENTS');
  return useQuery({
    queryKey: ['students', ...],
    queryFn: async () => { ... },
    initialData: cached,
    onSuccess: (data) => setCacheKey('STUDENTS', data),
  });
}
```

---

## Feature 2: Skeleton Loaders for All Data Pages
**Priority**: 🟠 **HIGH** | Effort: Medium (4 hours)

**What**: Show placeholder content while loading  
**Why**: Better perceived performance, less jarring UX

**Files**:
- `client/src/components/ui/Skeleton.jsx` (NEW)
- All pages: StudentsPage, UsersPage, ViolationsPage, AttendanceLivePage, etc.

---

## Feature 3: Confirmation Dialogs
**Priority**: 🟠 **HIGH** | Effort: Small (2 hours)

**What**: Reusable confirmation dialog component  
**Why**: Prevent accidental data deletion

**How**:
```javascript
// client/src/components/ui/ConfirmDialog.jsx
export default function ConfirmDialog({ 
  open, 
  onConfirm, 
  onCancel, 
  title, 
  message, 
  isDangerous = false 
}) {
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <p className="text-slate-600 text-[13px] leading-snug">{message}</p>
      <div className="flex justify-end gap-2 mt-6">
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button 
          variant={isDangerous ? 'danger' : 'primary'} 
          onClick={onConfirm}>
          Confirm
        </Button>
      </div>
    </Modal>
  );
}
```

Use in pages:
```javascript
const [confirmDelete, setConfirmDelete] = useState(null);

<ConfirmDialog
  open={!!confirmDelete}
  onConfirm={() => handleDelete(confirmDelete)}
  onCancel={() => setConfirmDelete(null)}
  title="Delete Student"
  message={`Are you sure you want to delete ${confirmDelete?.name}?`}
  isDangerous
/>
```

---

## Feature 4: Search Debounce
**Priority**: 🟠 **HIGH** | Effort: Small (1 hour)

**What**: Add debounce to search inputs  
**Why**: Reduce API calls during typing

**How**:
```javascript
// client/src/hooks/useDebounce.js
import { useState, useEffect } from 'react';

export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}
```

Use in pages:
```javascript
const [search, setSearch] = useState('');
const debouncedSearch = useDebounce(search, 500);
const { data } = useStudents({ search: debouncedSearch });
```

---

## Feature 5: Breadcrumb Navigation
**Priority**: 🟡 **MEDIUM** | Effort: Medium (2 hours)

**What**: Show path hierarchy (Admin > Users > Edit John)  
**Why**: Helps users understand where they are

**How**:
```javascript
// client/src/components/Breadcrumb.jsx
export default function Breadcrumb({ items }) {
  return (
    <nav className="flex items-center gap-2 text-xs text-slate-500">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          {i > 0 && <span>/</span>}
          {item.href ? (
            <NavLink to={item.href} className="text-blue-600 hover:underline">
              {item.label}
            </NavLink>
          ) : (
            <span>{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
}
```

---

## Feature 6: Dark Mode
**Priority**: 🟡 **MEDIUM** | Effort: Large (6 hours)

**What**: Toggle between light and dark themes  
**Why**: Better for night usage, user preference

**How**:
Already have dark mode variables in index.css. Just need:
1. Theme toggle button in Sidebar
2. Persist preference to localStorage
3. Apply dark class to html element

```javascript
// client/src/lib/theme.js
export function getTheme() {
  return localStorage.getItem('theme') ?? 'light';
}

export function setTheme(theme) {
  localStorage.setItem('theme', theme);
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

// Call in App.jsx on load
useEffect(() => {
  setTheme(getTheme());
}, []);
```

---

## Feature 7: Accessibility (a11y) Audit
**Priority**: 🟡 **MEDIUM** | Effort: Medium (4 hours)

**What**: Fix accessibility issues  
**Why**: Legal compliance, better UX for all users

**Issues to fix**:
1. Add aria-labels to icon buttons
2. Add aria-live to toast notifications
3. Add role="alert" to error messages
4. Ensure focus indicators visible
5. Test with screen readers

---

## Feature 8: Mobile Navigation Drawer
**Priority**: 🟡 **MEDIUM** | Effort: Medium (3 hours)

**What**: Mobile bottom sheet for navigation  
**Why**: Desktop sidebar doesn't work on mobile

**How**:
```javascript
// client/src/components/MobileNav.jsx
export default function MobileNav() {
  const [open, setOpen] = useState(false);
  
  return (
    <>
      {/* Bottom tab bar on mobile */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 border-t border-slate-200 bg-white flex justify-around">
        {adminLinks.slice(0, 4).map((link) => (
          <NavLink key={link.to} to={link.to} className={...}>
            {link.emoji}
          </NavLink>
        ))}
        <button onClick={() => setOpen(true)} className="...">
          ⋯
        </button>
      </div>

      {/* Drawer */}
      {open && <BottomSheet onClose={() => setOpen(false)}>
        {/* All nav links grid */}
      </BottomSheet>}
    </>
  );
}
```

---

## Feature 9: Notification Bell / Inbox
**Priority**: 🟡 **MEDIUM** | Effort: Medium (4 hours)

**What**: Real-time notifications for urgent items  
**Why**: Alerts admins to pending approvals

**How**:
Use WebSocket or Server-Sent Events (SSE) for real-time updates:
```javascript
// client/src/hooks/useNotifications.js
export function useNotifications() {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const eventSource = new EventSource('/api/notifications');
    
    eventSource.onmessage = (event) => {
      const notification = JSON.parse(event.data);
      setNotifications((prev) => [notification, ...prev]);
    };

    return () => eventSource.close();
  }, []);

  return notifications;
}
```

---

## Feature 10: Offline Support (Complete PWA)
**Priority**: 🟡 **MEDIUM** | Effort: Large (6 hours)

**What**: App works without internet (read-only)  
**Why**: Users can view cached data offline

**How**:
1. Service worker already installed (via VitePWA)
2. Cache API responses in service worker
3. Show "Offline mode" banner
4. Disable create/edit/delete when offline

```javascript
// client/src/hooks/useOffline.js
export function useOnline() {
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return online;
}
```

Show banner:
```javascript
const online = useOnline();
{!online && (
  <Alert tone="warning" icon="📡">
    You're offline. Read-only mode.
  </Alert>
)}
```

---

# IMPLEMENTATION ROADMAP

## Week 1 (Critical Fixes)
- [ ] Day 1: Fix hydration flash (Issue 1.1)
- [ ] Day 2: Fix modal padding (Issue 1.2) + ProtectedRoute (Issue 1.4)
- [ ] Day 3: Fix Faculty Dashboard color (Issue 1.3)
- [ ] Day 4: Typography hierarchy (Issue 2.1)
- [ ] Day 5: Button sizing (Issue 2.3)

## Week 2 (High Priority)
- [ ] Day 1-2: Skeleton loaders (Issue 2.2)
- [ ] Day 3: Input error styling (Issue 3.1)
- [ ] Day 4: Select component (Issue 3.2)
- [ ] Day 5: Alert colors (Issue 3.3)

## Week 3-4 (Features)
- [ ] Week 3: Confirmation dialogs + search debounce
- [ ] Week 4: Dark mode + accessibility audit

---

# CLAUDE CODE INSTRUCTIONS

### Session 1: Apply Critical Fixes

```
You are a senior React/Tailwind architect fixing a mobile-first education app (SIMS DMS).

CRITICAL: Apply these fixes in order:

1. CREATE client/src/lib/auth.js with user persistence:
   - saveUserToStorage(user) — persist to sessionStorage
   - loadUserFromStorage() — restore on app load
   - clearUserStorage() — clear on logout

2. UPDATE client/src/hooks/useAuth.js:
   - Modify useCurrentUser() to use initialData from loadUserFromStorage()
   - Add saveUserToStorage() call in useLogin onSuccess
   - Add clearUserStorage() call in useLogout onSuccess

3. FIX client/src/components/ui/Modal.jsx:
   - Change modal body from p-0 gap-0 to px-6 py-5 gap-4

4. FIX client/src/pages/faculty/DashboardPage.jsx:
   - Replace hardcoded #eef2ff with var(--color-indigo-100)

5. IMPROVE client/src/components/ProtectedRoute.jsx:
   - Replace minimal spinner with contextual loading UI
   - Add "Verifying access…" text
   - Add gradient background

After each change:
- Show me the updated code
- Tell me which file was modified
- Test by navigating to a protected route while logged out

Do not move to the next session until all 5 fixes are confirmed.
```

### Session 2: High Priority Fixes

```
Continue with high-priority fixes:

1. CREATE client/src/components/ui/Skeleton.jsx:
   - Base Skeleton component
   - TableRowSkeleton(cols)
   - CardSkeleton()

2. UPDATE client/src/pages/admin/StudentsPage.jsx:
   - Add loading state with TableRowSkeleton
   - Add mobile loading with CardSkeleton
   - Test: npm run dev, go to /admin/students with network throttling

3. FIX client/src/components/ui/Button.jsx:
   - Ensure all sizes have min-h-[44px] on mobile
   - Test: All buttons clickable on 390px viewport

4. FIX client/src/components/ui/Input.jsx:
   - Change error color from --red-solid to red-600
   - Verify consistency

5. ADD to client/src/index.css:
   - Add --color-indigo-100: #e0e7ff
   - Add typography scale classes (h1, h2, .page-title)

Test each change before moving to next.
```

---

# TESTING CHECKLIST

After applying fixes, test with this checklist:

### Mobile (390px)
- [ ] Login page → dashboard loads without flash
- [ ] Open modal → form inputs visible and have padding
- [ ] All buttons are at least 44px tall
- [ ] Table shows skeleton loaders while loading
- [ ] All text visible without horizontal scroll

### Desktop (1200px+)
- [ ] Sidebar visible on left
- [ ] All page titles same size
- [ ] Modals centered and padded correctly
- [ ] Tables render with proper spacing

### Network Throttling
- [ ] Slow 3G: Skeleton loaders visible for 2+ seconds
- [ ] Page remains usable while loading
- [ ] No blank screens or long delays

### Responsive
- [ ] 375px (iPhone SE) — all interactive elements clickable
- [ ] 768px (iPad) — transitions to tablet layout
- [ ] 1024px (iPad Pro) — desktop-like experience

---

# DESIGN SYSTEM TOKENS (Reference)

All CSS variables are defined in `client/src/index.css`. Use these consistently:

**Colors** — Typography colors:
- `var(--text-primary)` — #0f172a (dark text)
- `var(--text-secondary)` — #475569 (muted text)
- `var(--text-muted)` — #94a3b8 (very muted)

**Colors** — Status badges:
- `var(--emerald-solid)` — #10b981 (success/active)
- `var(--amber-solid)` — #f59e0b (warning/pending)
- `var(--red-solid)` — #ef4444 (danger/error)
- `var(--color-blue-500)` — #3b82f6 (info)

**Spacing** — Consistent padding/margin:
- `var(--space-3)` — 12px
- `var(--space-4)` — 16px
- `var(--space-6)` — 24px

**Typography** — Font sizes:
- `var(--text-display)` — 28px (h1)
- `var(--text-page-title)` — 18px (page title)
- `var(--text-card-lg)` — 15px (card title)
- `var(--text-body)` — 14px (body text)
- `var(--text-card)` — 13px (secondary)
- `var(--text-small)` — 12px (caption)

**Radius** — Border radius:
- `var(--radius-lg)` — 12px (inputs, buttons)
- `var(--radius-xl)` — 14px (cards)
- `var(--radius-2xl)` — 16px (panels)

---

# DEPLOYMENT CHECKLIST

Before pushing to production:

- [ ] All critical issues (TIER 1) are fixed
- [ ] Mobile viewport test on real device
- [ ] Network throttling test (Slow 3G)
- [ ] Build succeeds: `npm run build`
- [ ] No console errors in DevTools
- [ ] Accessibility check: keyboard navigation works
- [ ] Cross-browser test: Chrome, Safari, Firefox
- [ ] All forms submit successfully
- [ ] No data loss on page refresh
