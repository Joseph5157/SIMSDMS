# UX Fix Implementation Plan

**Source:** `UX_AUDIT.md`
**Branch:** Create `ux-polish` from `001-auth-user-accounts`
**Approach:** 4 sprints, each commit-ready. No new dependencies unless noted.

---

## Sprint 1 — Quick Wins (15 items, ~2-3 hours)

Low effort, high visibility. Every item is a single-file change.

---

### Task 1.1 — Login page tagline and context
**File:** `client/src/pages/auth/LoginPage.jsx`
**Audit ref:** C1, U1
**What to do:**
1. Below the "SIMS DMS" title, add a subtitle: `"Discipline duty tracking for SIMS College of Pharmacy"`
2. Style it: `font-size: var(--text-small)`, `color: var(--text-muted)`, `margin-top: 4px`, `letter-spacing: 0.01em`
3. Below the subtitle, add a second line: `"Sign in to manage your duty schedule, attendance, and violations"`
4. Style it: `font-size: var(--text-micro)`, `color: var(--text-muted)`, `opacity: 0.7`, `margin-top: 8px`
**Done when:** Login page shows what the app does before the user types anything.

---

### Task 1.2 — Fix bottom nav active color
**File:** `client/src/components/Layout.module.css`
**Audit ref:** C3
**What to do:**
1. Find every instance of `#60a5fa` in Layout.module.css and Layout.jsx
2. Replace with `var(--brand)` (which is `#2563eb`)
3. Change stroke-width for active icons from `2` to `2.5`
4. Change stroke-width for inactive icons from `1.5` to `1.5` (keep same)
**Done when:** Active bottom tab icon is the same blue as sidebar active state.

---

### Task 1.3 — Use design system gradient on faculty hero
**File:** `client/src/pages/faculty/DashboardPage.jsx`
**Audit ref:** C5
**What to do:**
1. Find `background: linear-gradient(135deg, #2563eb, #4f46e5)` inline style
2. Replace with `background: var(--brand-gradient-deep)`
3. Add `overflow: hidden` to the hero container div (clips the decorative circle)
4. Change "Check In" button background from `rgba(255,255,255,0.2)` to `rgba(255,255,255,0.25)` and add `border: '1px solid rgba(255,255,255,0.3)'`
**Done when:** Hero uses the design token and CTA button has better contrast.

---

### Task 1.4 — Add loading skeletons to both dashboards
**Files:** `client/src/pages/faculty/DashboardPage.jsx`, `client/src/pages/admin/AdminDashboardPage.jsx`
**Audit ref:** C7
**What to do:**
1. Import `Skeleton` and `CardSkeleton` from `../components/ui/Skeleton`
2. In **faculty DashboardPage**, if `isLoading` from the duty slots query:
   - Show a skeleton hero card: `<div className="rounded-2xl bg-slate-200 animate-pulse" style={{height: 160, marginBottom: 16}} />`
   - Show 3 stat card skeletons: `<div className="grid grid-cols-3 gap-3 mb-4">{[1,2,3].map(i => <Skeleton key={i} style={{height: 96, borderRadius: 'var(--radius-xl)'}} />)}</div>`
   - Show 2 card skeletons for upcoming + messages
3. In **admin AdminDashboardPage**, if `isLoading`:
   - Show 4 stat card skeletons in a `grid grid-cols-2 gap-3 mb-4`
   - Show 2 card skeletons for the sections below
**Done when:** Both dashboards show shaped loading placeholders instead of blank white.

---

### Task 1.5 — Replace emoji empty states with icons + CTAs
**File:** `client/src/components/ui/EmptyState.jsx`
**Audit ref:** H4
**What to do:**
1. Import `Inbox` icon from `lucide-react` as the default icon (replaces the emoji)
2. Change the component to accept an optional `icon` prop (a Lucide icon component) alongside the existing `emoji` prop
3. If `icon` is provided, render: `<icon size={48} strokeWidth={1.5} style={{color: 'var(--text-muted)', opacity: 0.5}} />`
4. If only `emoji` is provided, keep current behavior (backward compatible)
5. Change opacity from `0.4` to `0.5` on the emoji
6. If `action` prop is provided, render it as a button below the message (already supported, just verify it works)
7. Update callers that pass obvious emoji to use icons instead:
   - `📭` → `Inbox` (messages empty)
   - `📋` → `ClipboardList` (lists empty)
   - `🔔` → `Bell` (notifications empty)
**Done when:** Empty states use Lucide icons and look intentional, not placeholder-y.

---

### Task 1.6 — Fix font sizes to use design tokens
**Files:** All components using hardcoded px font sizes
**Audit ref:** H1
**What to do — mapping table:**
| Hardcoded | Replace with | CSS variable |
|-----------|-------------|-------------|
| `fontSize: 10` or `text-[10px]` | `fontSize: 'var(--text-micro)'` or `text-[11px]` | `--text-micro: 11px` |
| `fontSize: 11` or `text-[11px]` | `fontSize: 'var(--text-micro)'` | `--text-micro: 11px` |
| `fontSize: 12` or `text-[12px]` | `fontSize: 'var(--text-small)'` | `--text-small: 12px` |
| `fontSize: 13` or `text-[13px]` | `fontSize: 'var(--text-card)'` | `--text-card: 13px` |
| `fontSize: 14` | `fontSize: 'var(--text-body)'` | `--text-body: 14px` |
| `fontSize: 15` | `fontSize: 'var(--text-card-lg)'` | `--text-card-lg: 15px` |
| `fontSize: 17` or `fontSize: 18` | `fontSize: 'var(--text-page-title)'` | `--text-page-title: 18px` |
| `fontSize: 20` or `fontSize: 22` | `fontSize: 'var(--text-h2)'` | `--text-h2: 22px` |
| `fontSize: 36` or `fontSize: 40` | `fontSize: 'var(--text-stat)'` | `--text-stat: 40px` |

**Priority files (do these first):**
1. `Badge.jsx` — change `text-[11px]` to `text-[12px]` (accessibility minimum)
2. `StatCard.jsx` — replace all hardcoded fontSize values with CSS vars
3. `Table.jsx` — Th fontSize 10 → `var(--text-micro)`, Td fontSize 13 → `var(--text-card)`
4. `Alert.jsx` — use `var(--text-card)` and `var(--text-small)`
5. `NotificationBell.jsx` — replace all hardcoded font sizes

**Do NOT change:** Mantine component `size` props (those are Mantine's scale, not raw px).
**Done when:** No hardcoded px font sizes remain in component files.

---

### Task 1.7 — Fix border radius to use design tokens
**Files:** All components using hardcoded borderRadius px values
**Audit ref:** H2
**What to do — mapping table:**
| Hardcoded | Replace with | Token |
|-----------|-------------|-------|
| `borderRadius: 4` | `borderRadius: 'var(--radius-sm)'` | 6px |
| `borderRadius: 6` | `borderRadius: 'var(--radius-sm)'` | 6px |
| `borderRadius: 8` | `borderRadius: 'var(--radius-md)'` | 8px |
| `borderRadius: 10` | `borderRadius: 'var(--radius-lg)'` | 12px |
| `borderRadius: 12` | `borderRadius: 'var(--radius-lg)'` | 12px |
| `borderRadius: 14` | `borderRadius: 'var(--radius-xl)'` | 14px |
| `borderRadius: 16` | `borderRadius: 'var(--radius-2xl)'` | 16px |
| `borderRadius: 20` | `borderRadius: 'var(--radius-3xl)'` | 20px |
| `borderRadius: 28` | `borderRadius: 'var(--radius-sheet)'` | 28px |

**Priority files:** StatCard.jsx, Alert.jsx, LoginPage.jsx, ChangePasswordPage.jsx, all drawer components.
**Done when:** No hardcoded borderRadius numbers remain. All use `var(--radius-*)`.

---

### Task 1.8 — Add ARIA labels to calendar dates
**Files:** `client/src/pages/admin/CalendarPage.jsx`, `client/src/pages/faculty/SlotPickerPage.jsx`
**Audit ref:** H10
**What to do:**
1. On every calendar date `<button>`, add `aria-label` with the full date string:
   ```jsx
   aria-label={`${new Date(year, month, day).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`}
   ```
2. For SlotPickerPage, append state to the label:
   - If picked: ` — picked`
   - If blocked: ` — blocked`
   - If past: ` — past`
   - If available: ` — available`
3. Add `aria-pressed={isSelected}` on the selected date button
4. Add `aria-disabled="true"` on past/blocked dates (in addition to visual styling)
**Done when:** Screen readers announce "Wednesday, 25 June 2026 — available" on each date.

---

### Task 1.9 — Add ARIA roles to tab components
**Files:** `client/src/pages/shared/MessagesPage.jsx`, `client/src/pages/faculty/CoverRequestsPage.jsx`
**Audit ref:** H9
**What to do:**
1. On the tab bar container div, add `role="tablist"`
2. On each tab button, add:
   - `role="tab"`
   - `aria-selected={isActive}`
   - `tabIndex={isActive ? 0 : -1}`
   - `id={`tab-${tabName}`}`
3. On each tab panel div (the content below), add:
   - `role="tabpanel"`
   - `aria-labelledby={`tab-${tabName}`}`
**Done when:** Tab components pass ARIA tab pattern requirements.

---

### Task 1.10 — Faculty zero-state dashboard guidance
**File:** `client/src/pages/faculty/DashboardPage.jsx`
**Audit ref:** U2
**What to do:**
1. Detect zero state: no `todaySlot` AND `slots` array is empty (or all zeros in stats)
2. When in zero state, instead of empty stat cards, show an onboarding card:
   ```jsx
   <div style={{
     background: 'var(--surface-card)',
     border: '1px solid var(--border)',
     borderRadius: 'var(--radius-xl)',
     padding: '24px 20px',
     textAlign: 'center'
   }}>
     <p style={{fontSize: 'var(--text-h2)', marginBottom: 8}}>Welcome to SIMS DMS</p>
     <p style={{fontSize: 'var(--text-card)', color: 'var(--text-secondary)', lineHeight: 1.5}}>
       You don't have any duty slots assigned yet.<br/>
       Your admin will open the scheduling window and notify you via Telegram.
     </p>
   </div>
   ```
3. Keep the stat cards below with zeros — just add the guidance card above them
**Done when:** New faculty members see context instead of a wall of zeros.

---

### Task 1.11 — Check-in toast confirmation
**File:** `client/src/pages/faculty/AttendancePage.jsx`
**Audit ref:** U4
**What to do:**
1. Import `useToast` from `../components/ui/Toast`
2. In the check-in mutation's `onSuccess` callback, add:
   ```jsx
   toast({ message: `Checked in at ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`, type: 'success' })
   ```
3. Same for check-out:
   ```jsx
   toast({ message: `Checked out at ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`, type: 'success' })
   ```
**Done when:** Faculty see a clear toast notification after checking in/out.

---

### Task 1.12 — Surface cover request count on dashboard
**File:** `client/src/pages/faculty/DashboardPage.jsx`
**Audit ref:** U6
**What to do:**
1. The dashboard already has a cover request alert section — verify it shows the count of open broadcasts
2. If there are open cover broadcasts (not posted by the current user), show an Alert (tone="warning"):
   `"X cover requests need volunteers — tap to help"`
3. Make the alert clickable — navigate to `/faculty/cover-requests` on tap
4. In the bottom nav Layout.jsx, consider adding a badge dot on the Menu hamburger when there are open cover requests (optional, only if not too complex)
**Done when:** Faculty see pending cover requests without opening the hamburger menu.

---

### Task 1.13 — Invalidate messages cache after send
**File:** `client/src/hooks/useMessages.js`
**Audit ref:** U7
**What to do:**
1. In the `useSendMessage` mutation's `onSuccess`, add:
   ```jsx
   queryClient.invalidateQueries({ queryKey: ['messages'] })
   queryClient.invalidateQueries({ queryKey: ['inbox'] })
   queryClient.invalidateQueries({ queryKey: ['sent'] })
   ```
2. This ensures the Sent tab shows the new message immediately without manual refresh
**Done when:** After sending a message and switching to Sent tab, the message appears instantly.

---

### Task 1.14 — Notification dropdown mobile fix
**File:** `client/src/components/NotificationBell.jsx`
**Audit ref:** H5
**What to do:**
1. Add a media check: if `window.innerWidth < 640`, navigate to `/notifications` instead of opening the dropdown
2. Use `useNavigate()` from react-router-dom (likely already imported)
3. On the bell button click handler:
   ```jsx
   if (window.innerWidth < 640) {
     navigate('/notifications');
     return;
   }
   // existing dropdown toggle logic
   ```
4. On desktop, keep the dropdown but change `maxHeight` from `500px` to `min(500px, 70vh)`
**Done when:** Mobile users go to the full notifications page. Desktop users get a capped dropdown.

---

### Task 1.15 — Reports page category grouping
**File:** `client/src/pages/admin/ReportsPage.jsx`
**Audit ref:** H6
**What to do:**
1. Add a `group` field to each item in the REPORTS constant array:
   - `"Attendance"`: monthly-attendance, late-arrivals, auto-clockout, absent-faculty
   - `"Faculty"`: faculty-activity, duty-coverage, unassigned-faculty, completion-rate
   - `"Violations"`: violation-types, pending-fines, flagged-violations
   - `"Coverage"`: cover-requests
   - `"Students"`: active-students, student-violations, upload-history
2. Group the REPORTS array by `group`
3. Render section headers above each group:
   ```jsx
   <p style={{
     fontSize: 'var(--text-micro)',
     fontWeight: 700,
     textTransform: 'uppercase',
     letterSpacing: 'var(--tracking-wide)',
     color: 'var(--text-muted)',
     marginBottom: 8,
     marginTop: 20
   }}>{groupName}</p>
   ```
4. Keep the existing card grid within each group
**Done when:** Reports are organized into labeled categories instead of a flat wall.

---

## Sprint 2 — Core UX Fixes (9 items, ~3-4 hours)

Requires more thought. Touches interaction patterns.

---

### Task 2.1 — Replace row action menus with Mantine Menu
**File:** `client/src/pages/admin/UsersPage.jsx`
**Audit ref:** C4
**What to do:**
1. Import `{ Menu }` from `@mantine/core`
2. Replace the custom `RowMenu` component with:
   ```jsx
   <Menu shadow="md" width={180} position="bottom-end">
     <Menu.Target>
       <button className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100">
         <MoreHorizontal size={16} />
       </button>
     </Menu.Target>
     <Menu.Dropdown>
       <Menu.Item onClick={...}>Deactivate</Menu.Item>
       <Menu.Item onClick={...}>Reset Password</Menu.Item>
       <Menu.Divider />
       <Menu.Item color="red" onClick={...}>Delete</Menu.Item>
     </Menu.Dropdown>
   </Menu>
   ```
3. Remove the old RowMenu component and the document click-outside useEffect
4. Check if any other pages have similar custom dropdown menus — apply same fix
**Done when:** Row menus are keyboard accessible, properly positioned, and focus-trapped.

---

### Task 2.2 — Improve slot picker mobile experience
**File:** `client/src/pages/faculty/SlotPickerPage.jsx`
**Audit ref:** C6
**What to do:**
1. **Increase dot size:** Change morning/afternoon dots from 8px to 12px, add padding to make tap target 44px min
2. **Move legend to top:** Move the color legend from below the calendar to directly above the calendar grid (below the month selector, above the day-of-week headers)
3. **Inline the legend:** Make it a compact horizontal flex row:
   ```jsx
   <div style={{display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12}}>
     <span style={{display: 'flex', alignItems: 'center', gap: 4, fontSize: 'var(--text-small)'}}>
       <span style={{width: 10, height: 10, borderRadius: '50%', background: '#3b82f6'}} /> Morning
     </span>
     // ... afternoon, picked, past
   </div>
   ```
4. **Selected date feedback:** When a date is tapped, add a brief scale animation via inline style transition:
   ```jsx
   style={{ transition: 'transform 0.15s ease, background-color 0.15s ease' }}
   ```
   On the selected date, add `transform: 'scale(1.05)'`
**Done when:** Dots are easy to tap, legend is always visible, selection feels responsive.

---

### Task 2.3 — Simplify violation recording form
**File:** `client/src/pages/faculty/ViolationRecorderPage.jsx`
**Audit ref:** U5
**What to do:**
1. **Auto-select duty slot:** If the faculty has exactly one active/in-progress duty slot today, pre-select it in the `duty_slot_id` dropdown. If only one option, hide the dropdown entirely and show it as a read-only label.
2. **Collapse optional fields:** Wrap the "Remarks" field in an expandable section. Show a "Add notes (optional)" link that reveals the textarea on tap. Default to collapsed.
3. **Auto-fill fine:** When a violation type is selected, auto-fill `fine_amount` from the type's `default_fine`. Already partially done — verify it works and that the field is read-only unless the user explicitly taps to override.
4. **Field order:** Reorder to: Student → Violation Type → (Fine auto-fills) → [optional: Remarks]. Move duty slot to the top as a static label if auto-selected.
**Done when:** Recording a violation takes 2-3 taps for the common case (pick student, pick type, submit).

---

### Task 2.4 — Proper pagination with page numbers
**File:** `client/src/components/ui/Pagination.jsx`
**Audit ref:** H8
**What to do:**
1. Calculate page numbers to show (max 7 visible: 1, 2, ..., current-1, current, current+1, ..., last)
2. Render page number buttons between Prev and Next:
   ```jsx
   {pages.map(p => (
     p === '...' ? <span key={p} style={{padding: '0 4px', color: 'var(--text-muted)'}}>...</span> :
     <button key={p} onClick={() => onPage(p)}
       style={{
         width: 32, height: 32, borderRadius: 'var(--radius-md)',
         fontSize: 'var(--text-card)', fontWeight: p === page ? 700 : 400,
         background: p === page ? 'var(--brand)' : 'transparent',
         color: p === page ? 'white' : 'var(--text-secondary)',
         border: 'none', cursor: 'pointer'
       }}>
       {p}
     </button>
   ))}
   ```
3. Keep "Showing X-Y of Z" text
4. Keep Prev/Next disabled states
**Done when:** Pagination shows clickable page numbers with ellipsis for large page counts.

---

### Task 2.5 — Message thread sender distinction
**File:** `client/src/pages/shared/MessagesPage.jsx`
**Audit ref:** H7
**What to do:**
1. Above each message bubble (or at least the first in a consecutive sequence from the same sender), show the sender name:
   ```jsx
   <p style={{fontSize: 'var(--text-small)', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 2}}>
     {msg.sender_id === currentUser.id ? 'You' : msg.sender_name}
   </p>
   ```
2. Show a timestamp on each individual message (not just the thread header):
   ```jsx
   <p style={{fontSize: 'var(--text-micro)', color: 'var(--text-muted)', marginTop: 4}}>
     {new Date(msg.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
   </p>
   ```
**Done when:** Each message bubble shows who sent it and when.

---

### Task 2.6 — Auto-select current slot in violation form
**File:** `client/src/pages/faculty/ViolationRecorderPage.jsx`
**Audit ref:** U5 (supports Task 2.3)
**What to do:**
1. When the RecordModal opens, check if there's a duty slot with today's date and the current session (morning if before noon, afternoon otherwise)
2. If exactly one match, set `duty_slot_id` form state to that slot's ID
3. Show the slot as a non-editable label at the top of the form: "Recording for: Morning Session, 25 Jun 2026"
4. If multiple slots match (unlikely) or none match, show the dropdown as before
**Done when:** Faculty don't have to manually pick their current duty slot.

---

### Task 2.7 — Improve violation type management UX
**File:** `client/src/pages/admin/ViolationTypesPage.jsx`
**Audit ref:** (general UX)
**What to do:**
1. Add `aria-label` to Edit, Deactivate, Delete buttons: `aria-label={`Edit ${type.name}`}` etc.
2. Disable Delete button visually (not just hidden) for system types, with tooltip: "System types cannot be deleted"
3. Show deactivated types in a separate section below active ones, with a "Show deactivated" toggle
**Done when:** Violation type management has clear affordances and accessibility.

---

### Task 2.8 — Add breadcrumbs to all admin sub-pages
**Files:** All admin pages that don't have breadcrumbs
**Audit ref:** N9
**What to do:**
1. Import `Breadcrumb` from `../components/Breadcrumb`
2. Add breadcrumbs to these admin pages (above PageHeader):
   - UsersPage: `Admin → Users`
   - CalendarPage: `Admin → Calendar`
   - DutySlotsPage: `Admin → Duty Slots`
   - AttendanceLivePage: `Admin → Live Attendance`
   - ViolationsPage: `Admin → Violations`
   - ViolationTypesPage: `Admin → Violation Types`
   - CoverRequestsPage: `Admin → Cover Requests`
   - ReportsPage: `Admin → Reports`
3. Format: `[{label: 'Admin', href: '/admin/dashboard'}, {label: 'Page Name'}]`
**Done when:** Every admin page shows its location in the hierarchy.

---

### Task 2.9 — Upload student error details
**File:** `client/src/components/UploadStudentsDrawer.jsx`
**Audit ref:** N10
**What to do:**
1. If the upload result has `errors` array with length > 0, show a collapsible section below the success summary
2. Default collapsed. Toggle button: "Show X errors"
3. When expanded, render a simple list:
   ```jsx
   {errors.map((err, i) => (
     <div key={i} style={{
       display: 'flex', justifyContent: 'space-between',
       padding: '6px 0', borderBottom: '1px solid var(--divider)',
       fontSize: 'var(--text-small)'
     }}>
       <span style={{color: 'var(--text-secondary)'}}>Row {err.row}</span>
       <span style={{color: 'var(--danger)'}}>{err.reason}</span>
     </div>
   ))}
   ```
**Done when:** Faculty can see exactly which rows failed and why without re-downloading anything.

---

## Sprint 3 — System-Level Refactors (3 items, ~4-6 hours)

Larger changes that touch multiple files. Do these after Sprints 1-2 are stable.

---

### Task 3.1 — Extract shared BottomDrawer component
**Files:** Create `client/src/components/ui/BottomDrawer.jsx`, then refactor CreateUserDrawer, ComposeDrawer, UploadStudentsDrawer, ViolationTypeDrawer
**Audit ref:** C8
**What to do:**
1. Create `BottomDrawer.jsx` that encapsulates the shared pattern:
   ```jsx
   export default function BottomDrawer({ open, onClose, title, subtitle, children, footer }) {
     // Vaul.Root + Vaul.Portal + Vaul.Overlay + Vaul.Content
     // Standardized: drag handle 36x4, header with title/subtitle/close,
     // scrollable body, sticky footer with safe-area padding
   }
   ```
2. Standard dimensions:
   - Drag handle: `width: 36, height: 4, background: var(--border)`, borderRadius full
   - Header padding: `20px 20px 0`
   - Close button: `32x32`, border `var(--border)`, bg `var(--surface-page)`
   - Body: `padding: 16px 20px 8px`, `overflow-y: auto`, `flex: 1`
   - Footer: `padding: 12px 20px`, sticky, safe-area bottom padding
   - Max height: `94vh`
   - Border radius: `var(--radius-sheet)` top corners only
3. Refactor each existing drawer to use `<BottomDrawer>`:
   - Move only the form/content JSX into `children`
   - Move cancel/submit buttons into `footer`
   - Delete all duplicated drawer chrome code
**Done when:** All 4 drawers use the shared component. Drawer appearance is pixel-identical across the app.

---

### Task 3.2 — Migrate LoginPage and ChangePasswordPage from inline styles to Tailwind
**Files:** `client/src/pages/auth/LoginPage.jsx`, `client/src/pages/auth/ChangePasswordPage.jsx`
**Audit ref:** C2
**What to do:**
1. These are the first-impression pages. Convert all inline `style={{}}` to Tailwind utility classes.
2. Key mappings for these pages:
   - `minHeight: '100dvh'` → `min-h-dvh`
   - `background: 'var(--surface-sidebar)'` → `bg-[var(--surface-sidebar)]`
   - `padding: '72px 24px 40px'` → `pt-[72px] px-6 pb-10`
   - `borderRadius: 'var(--radius-sheet) var(--radius-sheet) 0 0'` → `rounded-t-[var(--radius-sheet)]`
   - `fontSize: 'var(--text-card)'` → `text-[length:var(--text-card)]`
   - Focus/hover states: convert `onFocus`/`onBlur` inline style toggles to `focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20` Tailwind classes
3. Remove all `onMouseEnter`/`onMouseLeave` handlers that simulate hover — replace with `hover:` Tailwind variants
4. Remove all `onFocus`/`onBlur` handlers that simulate focus — replace with `focus:` Tailwind variants
**Done when:** Auth pages have zero inline styles. Hover/focus states work via CSS, not JS.

---

### Task 3.3 — Migrate dashboard pages from inline styles to Tailwind
**Files:** `client/src/pages/faculty/DashboardPage.jsx`, `client/src/pages/admin/AdminDashboardPage.jsx`, `client/src/pages/super-admin/SuperAdminDashboardPage.jsx`
**Audit ref:** C2
**What to do:**
1. Same approach as Task 3.2 — convert all inline styles to Tailwind
2. Replace `onMouseEnter`/`onMouseLeave` hover handlers with `hover:` variants
3. Replace hardcoded hex colors with CSS variable references via Tailwind arbitrary values:
   - `color: '#0f172a'` → `text-slate-900` (Tailwind built-in, matches your token)
   - `background: 'var(--surface-card)'` → `bg-[var(--surface-card)]`
   - `border: '1px solid var(--border)'` → `border border-[var(--border)]`
4. For the admin quick action buttons that use `onMouseEnter`/`onMouseLeave` for hover effects: replace with Tailwind `hover:border-blue-500 hover:-translate-y-px` classes (or the appropriate color per action)
**Done when:** All 3 dashboard pages have zero inline styles.

---

## Sprint 4 — Polish & Delight (7 items, ~2-3 hours)

Optional but makes the app feel alive. Pick from this list based on time.

---

### Task 4.1 — Enable dark mode toggle
**Files:** `client/src/lib/theme.js`, `client/src/components/Layout.jsx`
**Audit ref:** N1
**What to do:**
1. In `theme.js`, remove the override that forces light mode. The `getTheme()` function has a comment "dark mode temporarily disabled" — remove the early return.
2. In `Layout.jsx` sidebar, add a theme toggle button above the logout button:
   ```jsx
   <button onClick={cycleTheme} className={styles.navItem}>
     {getThemeIcon()} {getThemeLabel()}
   </button>
   ```
3. Verify the dark mode CSS variables in index.css render correctly on all pages
**Done when:** Users can toggle between light, dark, and system theme.

---

### Task 4.2 — Button press feedback on mobile
**Files:** All button elements after Tailwind migration (Sprint 3)
**Audit ref:** N4
**What to do:**
1. Add `active:scale-[0.97] active:opacity-90 transition-transform` to all primary action buttons
2. Target: submit buttons, check-in/out buttons, nav buttons, action menu items
3. Don't add to: pagination buttons, filter dropdowns, tab buttons (these should be subtle)
**Done when:** Tapping buttons on mobile gives a visible press-down feedback.

---

### Task 4.3 — Animated stat card numbers
**File:** `client/src/components/ui/StatCard.jsx`
**Audit ref:** N5
**What to do:**
1. Add a simple count-up effect. On mount, animate from 0 to the value:
   ```jsx
   const [display, setDisplay] = useState(0);
   useEffect(() => {
     if (typeof value !== 'number') { setDisplay(value); return; }
     const duration = 500;
     const start = performance.now();
     const step = (now) => {
       const progress = Math.min((now - start) / duration, 1);
       setDisplay(Math.floor(progress * value));
       if (progress < 1) requestAnimationFrame(step);
     };
     requestAnimationFrame(step);
   }, [value]);
   ```
2. Render `{display}` instead of `{value}`
3. Only animate number values, pass through strings unchanged
**Done when:** Dashboard stat numbers count up from 0 on page load.

---

### Task 4.4 — Page fade transition
**File:** `client/src/App.jsx`
**Audit ref:** N2
**What to do:**
1. Wrap the route `<Outlet />` in Layout.jsx with a CSS transition:
   ```jsx
   <div style={{animation: 'fadeIn 0.15s ease'}}>
     <Outlet />
   </div>
   ```
2. Add the keyframe to `index.css`:
   ```css
   @keyframes fadeIn {
     from { opacity: 0; transform: translateY(4px); }
     to { opacity: 1; transform: translateY(0); }
   }
   ```
3. No new dependencies needed — pure CSS animation triggered on route change
**Done when:** Page transitions have a subtle 150ms fade-in.

---

### Task 4.5 — Quick-add mode for violation recorder
**File:** `client/src/pages/faculty/ViolationRecorderPage.jsx`
**Audit ref:** N7
**What to do:**
1. Add a toggle switch in the RecordModal header: "Quick add" (default off)
2. When quick-add is on:
   - On successful submit, don't close the modal
   - Clear the student field and remarks
   - Keep duty_slot_id and violation_type_id selected
   - Show a toast: "Violation recorded for {student name}"
   - Focus the student search input
3. When quick-add is off: current behavior (close modal on success)
**Done when:** Faculty can record 5 violations in a row without reopening the modal.

---

### Task 4.6 — Admin dashboard sparkline badge
**File:** `client/src/pages/admin/AdminDashboardPage.jsx`
**Audit ref:** N8
**What to do:**
1. If `completionRate` data is available from the reports hook, calculate week-over-week change
2. Show a small badge next to the attendance stat:
   - Up: `+X%` in emerald
   - Down: `-X%` in red
   - Flat: `—` in slate
3. Style: `fontSize: 'var(--text-micro)'`, inline flex with small arrow icon
4. If no comparison data available, don't show the badge (graceful degradation)
**Done when:** Admin sees attendance trend at a glance.

---

### Task 4.7 — Auto clock-out warning on faculty dashboard
**File:** `client/src/pages/faculty/DashboardPage.jsx`
**Audit ref:** U8
**What to do:**
1. If the faculty is checked in but hasn't checked out, and the session end time is within 15 minutes:
   - Show a warning Alert (tone="warning") on the dashboard:
   - "Your duty session ends in X minutes. Check out before auto clock-out."
2. Calculate remaining time: `session_end_time - Date.now()`
3. If already auto-clocked out (check `auto_out === true` on today's attendance), show an info Alert:
   - "You were auto-clocked out at {time}. Contact admin if this was an error."
**Done when:** Faculty get visible warnings about impending auto clock-out.

---

## Execution Notes

1. **Commit after each task.** Message format: `ux: {task description}` (e.g., `ux: add login page tagline and context`)
2. **Test on mobile viewport** (375px width) after every UI change. Chrome DevTools → Toggle Device → iPhone SE.
3. **Don't install new npm packages** unless explicitly noted. Everything uses existing deps (Mantine, Tailwind, Lucide, Vaul, React Query).
4. **Don't touch backend.** This is purely frontend polish.
5. **Run `npm run build`** after Sprint 3 to verify no Tailwind class purging issues.
