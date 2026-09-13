# 030-B — Frontend Page and Route Matrix

Baseline: `21a7ca5f56dfd67118e6530e3f925e5607688656` on `audit/design-system-030`.

Method: every page file and every route declaration in `client/src/App.jsx` was enumerated. Counts are lexical opening-tag counts in the baseline source unless described otherwise. This inventory records implementation facts, not desired architecture.

## Route/access map

| Route | Access | Page component | Main layout |
| --- | --- | --- | --- |
| `/login` | Public | `LoginPage` | Custom auth layout |
| `/` | Public/auth-aware redirect | `AppRoutes` redirect | None |
| `/change-password` | Authenticated | `ChangePasswordPage` | Custom auth layout |
| `/notifications` | Authenticated | `NotificationsPage` | `Layout` |
| `/admin/dashboard` | Admin, Super Admin | `AdminDashboardPage` | `Layout` |
| `/admin/users` | Admin, Super Admin | `UsersPage` | `Layout` |
| `/admin/students` | Admin, Super Admin | `StudentsPage` | `Layout` |
| `/admin/calendar` | Admin, Super Admin | `CalendarPage` | `Layout` |
| `/admin/duty-slots` | Admin, Super Admin | `DutySlotsPage` | `Layout` |
| `/admin/attendance` | Admin, Super Admin | `AttendanceLivePage` | `Layout` |
| `/admin/violations` | Admin, Super Admin | `ViolationsPage` | `Layout` |
| `/admin/flagged-violations` | Admin, Super Admin | `FlaggedViolationsPage` | `Layout` |
| `/admin/settings` | Admin, Super Admin | `SettingsPage` | `Layout` |
| `/admin/messages` | Admin, Super Admin | `MessagesPage` | `Layout` |
| `/admin/reports` | Admin, Super Admin | `ReportsPage` | `Layout` |
| `/faculty/dashboard` | Faculty | `DashboardPage` | `Layout` |
| `/faculty/slots` | Faculty | `SlotPickerPage` | `Layout` |
| `/faculty/all-duties` | Faculty | `AllFacultyDutiesPage` | `Layout` |
| `/faculty/attendance` | Faculty | `AttendancePage` | `Layout` |
| `/faculty/violations` | Faculty | `ViolationRecorderPage` | `Layout` |
| `/faculty/messages` | Faculty | `MessagesPage` | `Layout` |
| `/super-admin/dashboard` | Super Admin | `SuperAdminDashboardPage` | `Layout` |
| `/super-admin/audit` | Super Admin | `AuditLogsPage` | `Layout` |
| `*` | Any | Redirect to `/` | None |

All 21 page files are reachable through a declared route. `MessagesPage` serves two routes. No standalone `/admin/duty-timing-settings` route exists; duty timing is implemented inside Settings with a modal. The existing E2E spec nevertheless references that standalone path. `/notifications` is routed but is not present in the role navigation arrays; the shell exposes `NotificationBell`, whose visible action navigates to role-specific Messages instead.

## Admin page implementation matrix

| Page | Third-party UI imports | Shared/custom components | Controls and data views | State and responsive strategy |
| --- | --- | --- | --- | --- |
| Dashboard | Tabler icons | `Layout`; `Card`/`CardHeader`/`CardBody` (3 groups); `StatCard` ×3; `Badge` ×2; local `Alert` ×2; `Skeleton` ×3 | Native `<select>` ×1; raw buttons ×2; no table/overlay | Responsive `sm`/`md` grids; custom hero/summary sections; skeleton loading and inline alerts; no `PageHeader` |
| Live Attendance | Mantine `Select`, `TextInput` | `Layout`, `PageHeader`, `Breadcrumb`, `Badge` ×2, `FormModal`, custom toast | No raw/native controls; no table | `sm`/`lg` responsive card grids; text loading; override form in `FormModal` |
| Calendar | Mantine `Button` ×6, `TextInput`, `Select` ×3, `NumberInput`; no external icon library | `Layout`, `PageHeader`, `Breadcrumb`, `Badge`, `FormModal` ×2, `ConfirmDialog`, shared `Table` | Raw buttons ×4: previous/next month plus day-cell implementations; shared table ×1 | Separate `sm:hidden` mobile day buttons and `hidden sm:block` calendar grid; text loading; modal forms and confirmation |
| Duty Slots | Mantine `Button` ×3, `Select` ×4, `Modal`, `Textarea`; `AppButton` ×1 | `Layout`, `PageHeader`, `Breadcrumb`, `Badge` ×3, `MobileList`, `ResponsiveDataView`, shared `Table`, custom toast | No raw/native controls; shared table ×1; direct Mantine modal ×1 | Only page using `ResponsiveDataView`; `md` table/mobile-list pair; `EmptyRow` ×2, `ErrorRow`, `ErrorBlock`; keyboard-inset hook used for reassignment modal |
| Flagged Violations | Mantine `Button` ×5, `Select` ×6 | `Layout`, `PageHeader`, `Breadcrumb`, `Badge` ×2, shared `Table`, `ConfirmDialog`, `ResolveFlagModal` | No raw/native controls; shared table ×1 | Hand-built `md:hidden` mobile cards plus `hidden md:block` table; duplicated text/table loading and empty states; `ErrorRow` |
| Reports | Mantine hook `useMediaQuery`; no Mantine Core page import | `Layout`, `PageHeader`, `Breadcrumb`, `Badge` ×3, shared `Table` ×14, `ResponsiveSheet`, custom toast | Raw buttons ×10; native inputs ×7; native selects ×11; custom absolute student-results dropdown | Secondary report output uses a mobile `ResponsiveSheet` at 639 px and desktop inline panel; report tables use shared horizontal-scroll `Table`; text loading, `ErrorBlock`, `EmptyRow` ×11 |
| Settings | Mantine `Tabs`, `Button` ×8, `Select` ×2, `TextInput` ×2, `Tooltip`; Tabler icons | `Layout`, `PageHeader`, `Breadcrumb`, shared `Table` ×2, `Badge` ×4, `ConfirmDialog`, `ViolationTypeDrawer`, `DutyTimingSettingsModal` | Raw buttons ×2 for active/inactive reveal; no native controls | Violation types use hand-built mobile cards plus desktop table; inactive desktop rows use a second conditional table; text/row loading and shared error states |
| Students | Mantine `Button` ×8, `Checkbox`; AppField family | `Layout`, `PageHeader`, `Breadcrumb`, shared `Table`, `AppSelect` ×4, `AppTextInput` ×2, `Badge` ×2, `FormModal` ×2, `ConfirmDialog` ×2, `Pagination`, two ResponsiveSheet-backed drawers | Raw button ×1; native input ×1 and native select ×2 in page filters | Hand-built `md:hidden` cards plus desktop table; card/table skeleton variants; shared row/block errors; fixed responsive bulk-action bar |
| Users | Mantine `Button` ×3, `ActionIcon` ×2, `Menu`, direct `Modal`, `Text`, `Group` | `Layout`, `PageHeader`, `Breadcrumb`, shared `Table` ×2, `Badge` ×7, local `Alert`, `ConfirmDialog` ×5, `Pagination`, `CreateUserDrawer` | Native input ×1 and selects ×2; no raw buttons in page file | Users have `md` mobile-card/desktop-table pair; pending invites remain a separate shared horizontal-scroll table at all widths; direct Mantine menus/modal; text/row/block states |
| Violations | Mantine `Button` ×7, `Select` ×3, `useMediaQuery`; Mantine Charts | `Layout`, `PageHeader`, `Breadcrumb`, shared `Table`, `Badge` ×5, `StatCard` ×7, `ConfirmDialog`, `Pagination`, `RecordViolationModal`, `TrendBreakdownDrawer` | Native inputs ×2; native selects ×6; one raw HTML `<table>` inside analytics detail; shared table ×1 | 767 px JS chart sizing; `md` mobile-card/desktop-table record list; `sm`/`lg` analytics grids; chart containers with horizontal overflow; shared row/block errors |

## Faculty page implementation matrix

| Page | Third-party UI imports | Shared/custom components | Controls and data views | State and responsive strategy |
| --- | --- | --- | --- | --- |
| Dashboard | Mantine `Button` ×6; Tabler `IconRefresh` | `Layout`, `Badge` ×5, local `Alert` ×2, `Skeleton` ×5, custom toast, `RecordViolationModal`, `MyViolationsSummary`, `RequestReassignmentModal`, `PendingReassignmentRequests` | Raw buttons ×2 (`Dismiss`, `All slots →`); no table in page | Custom dashboard sections/hero; one overflow region; skeletons, alerts, toast; ResponsiveSheet behavior inherited through child workflows; no `PageHeader` |
| My Slots | Mantine `Button` ×2 | `Layout`, `Badge`, `Skeleton` ×4, custom toast | Raw buttons ×3: month pair and calendar day cell | `md:max-w` calendar; one responsive utility; local calendar conditional states; no `PageHeader` |
| All Faculty Duties | Mantine `TextInput`, `Select` | `Layout`, `PageHeader`, shared `Table`, `Badge` ×2 | Raw buttons ×3: month pair and Retry; shared table ×1 | Hand-built `md:hidden` agenda/cards plus `hidden md:block` table; parallel mobile text state and desktop `EmptyRow`/`ErrorRow` |
| Attendance | Mantine `Button`; Tabler `IconClipboardList` | `Layout`, `PageHeader`, `Card`/`CardBody`, `Badge` ×2, `StatCard` ×5, `EmptyState`, `Skeleton` | Raw month buttons ×2; no table | `sm`/`lg` stat/card grids; shared skeleton and the only `EmptyState` consumer |
| Student Violations | Mantine `Button` | `Layout`, `PageHeader`, `MyViolationsTable`, `RecordViolationModal` | No raw/native controls in page; child table and form implementations | Page itself has no responsive utilities; behavior delegated to shared/feature components |

## Shared, auth, and Super Admin page implementation matrix

| Page/route | Third-party UI imports | Shared/custom components | Controls and data views | State and responsive strategy |
| --- | --- | --- | --- | --- |
| Messages (`/admin/messages`, `/faculty/messages`) | Mantine `Button` ×4 | `Layout`, `PageHeader`, `Pagination`, custom toast, `ComposeDrawer` | Raw buttons ×4: mobile back, desktop close, message-row selector, tabs | `sm` master/detail switch; mobile hides list while viewing; text loading/error/retry; compose uses `ResponsiveSheet` |
| Notifications | Mantine `Button` ×4; TanStack Query | `Layout`, `PageHeader` appears in two conditional branches, `Breadcrumb`, shared `Table`, `Pagination`, custom toast, `TableRowSkeleton` | Raw filter button ×1; shared table ×1 | No breakpoint utilities in page; table uses shared horizontal-scroll fallback; row skeleton/`EmptyRow` |
| Login | Tabler eye icons | Local `Alert`, logo image | Native inputs ×2; raw buttons ×2 (password reveal and submit) | Extensive `sm` responsive auth layout; 5 inline styles; no `Layout`/`PageHeader` |
| Change Password | TanStack Query | Local `Alert` ×2 | Native inputs ×3; raw submit/cancel buttons ×2 | Custom fixed-width auth card; no breakpoint utility; 4 inline styles; no `Layout`/`PageHeader` |
| Super Admin Dashboard | Router navigation | `Layout`, `PageHeader`, `StatCard` ×4, local `Alert` | Raw `View all →` button ×1 | Two-to-four-column `sm` stat grid; shared query states through Alert/StatCard |
| Audit Logs | Mantine `TextInput` ×3, `Button` ×2 | `Layout`, `PageHeader`, shared `Table`, `Pagination`, custom toast | No raw/native controls; shared table ×1 | Hand-built `md:hidden` cards plus desktop table; text/row/block loading and error states |

## Page-level third-party import facts

- `@mantine/core` is imported directly by 16 of 21 page files.
- `@mantine/hooks` is imported directly by `ReportsPage` and `ViolationsPage`.
- `@mantine/charts` is imported directly only by `ViolationsPage`.
- No page imports Radix Dialog or Framer Motion directly.
- Tabler icons are imported by five page files: Admin Dashboard, Settings, Login, Faculty Attendance, and Faculty Dashboard.
- No page imports Recharts directly.

## Reachability and feature-gating notes

- No unreferenced page component was found.
- Admin pages are also available to Super Admin through the route guard and shared admin navigation.
- `NotificationsPage` is route-reachable but has no navigation-array entry.
- `DutyTimingSettingsModal` is reachable through Settings, not through the path used by the existing Playwright spec.
- Conditional sections include pending invites, inactive violation-type rows, analytics drill-downs, report result panels/sheets, and role-specific shell navigation. They were recorded and not removed.
