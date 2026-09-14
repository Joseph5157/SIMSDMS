# 030-B — Component and UI Primitive Inventory

Baseline: `21a7ca5f56dfd67118e6530e3f925e5607688656`.

Counts below are exact lexical JSX opening-tag counts or exact importing-file counts unless marked approximate. Wrapper-internal instances are separated from feature consumers where relevant.

## Shared UI layer: all 18 files

| File/export | Purpose | Implementation and styling | Consumers / usage | Parallel feature implementation facts |
| --- | --- | --- | --- | --- |
| `Alert` | Inline semantic feedback with five tones | Custom React markup; Tailwind classes plus token-driven inline style; no third-party dependency; optional click/action | 7 importing files; 13 local-Alert JSX instances | `FormModal` separately uses Mantine `Alert`; `OfflineBanner` is custom markup; pages also use plain text/error blocks |
| `AppButton` | App action wrapper with primary/secondary/danger/ghost/icon variants | Wraps Mantine `Button` and `ActionIcon`; inline token styles; icon variant requires `aria-label` | 1 consumer (`DutySlotsPage`), 1 consumer instance | Feature source contains 70 direct Mantine `Button` instances outside this wrapper and 82 raw buttons |
| `AppField` | AppSelect/AppTextInput/AppNumberInput family | Thin Mantine `Select`, `TextInput`, `NumberInput` wrappers; `AppSelect` disables portal by default | 3 importing files; `AppSelect` ×7, `AppTextInput` ×2, `AppNumberInput` ×0 | Direct feature use: Mantine Select ×21, TextInput ×19, NumberInput ×2; native input/select also present |
| `Badge` | Status and role labels | Custom `<span>`; constants-based Tailwind class maps plus inline letter spacing | 17 importing files; 46 JSX instances | Other pill/span status treatments exist, including Reports active-student breakdown and local counters |
| `ConfirmDialog` | Confirmation modal | Wraps Mantine `Modal`, `Text`, `Group`, and two Mantine Buttons; modal behavior/accessibility supplied by Mantine | 7 importing files; 12 instances | Direct Mantine modals also occur in Duty Slots and Users; ResponsiveSheet is a separate overlay family |
| `EmptyState` | Page/card empty placeholder | Mantine `Center`, `Stack`, `Text` plus custom icon/emoji circle and inline styles | 1 consumer and 1 instance (`Faculty Attendance`) | `EmptyRow` occurs 31 times; many pages use ad hoc text/card empty states |
| `FormModal` | Create/edit form modal with mobile fullscreen mode, error region, sticky footer | Mantine compound `Modal`, Buttons, Stack/Group, direct Mantine Alert; Mantine `useMediaQuery` at 640 px; inline styles and safe-area footer | 6 importing files; 8 instances | Ten ResponsiveSheet consumers and two direct feature Mantine modals provide parallel overlay paths |
| `FacultyAvatarIcons` | Two custom faculty avatar glyphs | Two inline SVG components using currentColor and forwarded SVG props | 1 consumer (`utils/avatars.js`) | Admin/Super Admin avatars use Tabler icons; fallback uses text initials |
| `MobileList` family | Reusable mobile list/container/item/header/meta/status/action primitives | Custom div/p markup; 10 inline style attributes using tokens | 1 consumer (`DutySlotsPage`) and 1 rendered list/item template | At least seven pages implement hand-built mobile card/list branches without this family |
| `Pagination` | Previous/numeric/next pagination and range text | Mantine Group/Text with 3 raw buttons; local `btnBase` style object plus per-state inline styles | 7 importing files; 8 instances | No other named pagination abstraction found; page filters reset pagination locally |
| `ResponsiveDataView` | CSS-selectable mobile/desktop dual tree | Custom React wrapper with static Tailwind `sm`/`md`/`lg` class map | 1 consumer/instance (`DutySlotsPage`) | Flagged Violations, Settings, Students, Users, Violations, All Faculty Duties, and Audit Logs hand-build comparable breakpoint branches |
| `ResponsiveSheet` | Mobile bottom/fullscreen sheet and desktop dialog | Radix Dialog + Framer Motion + Mantine `useMediaQuery`; Tailwind and inline styles; keyboard inset and drag controls; focus/dismiss semantics from Radix | 10 importing files; 10 instances | Feature code does not directly import Radix/Framer. `StudentSearchOverlay` is a second shared Radix/Framer overlay; Mantine modal/drawer paths remain |
| `Skeleton` family | Generic, table-row, and card loading placeholders | Custom div/table markup; Tailwind pulse; width/height inline props | 8 importing files; 17 consumer `<Skeleton>` calls plus `CardSkeleton` ×1 and `TableRowSkeleton` ×2 | 26 literal Loading labels remain across 15 files; loading rows and custom spinners also exist |
| `StatCard` | Numeric/status metric card with optional click behavior | Custom React; token accent map, Tailwind and inline styles; requestAnimationFrame number tween; keyboard activation when clickable | 5 importing files; 23 instances | Dashboard/report pages also contain raw metric tiles and custom summary cards |
| `StudentSearchOverlay` | Nested full-screen/mobile student search and desktop command panel | Direct Radix Dialog + Framer Motion; Mantine hooks; Tabler icons; native input/buttons; explicit focus management and state rows | 1 consumer/instance (`RecordViolationModal`) | Reports contains a separate custom absolute student-search dropdown |
| `Table` family | Horizontal-scroll data table, cells, clickable rows, empty/error rows/blocks | Wraps Mantine Table/Paper/Text/Center/Stack/Button; Tailwind cell styling; clickable `Tr` adds role, keyboard handler, tabIndex | 12 importing files; 27 `<Table>` instances; `EmptyRow` ×31, `ErrorRow` ×9, `ErrorBlock` ×7 | One raw HTML table remains in Violations; multiple hand-built mobile card counterparts; report tables share this horizontal-scroll fallback |
| `Toast` | Global transient feedback provider/hook | Custom React context; token-driven inline styles; ARIA alert/live region; timer dismissal; raw close button | Provider in `App`; hook imported by 25 other files; 100 lexical `toast({...})` calls in 25 files | Mantine Notifications package has zero direct usage; inline Alerts and banners are separate patterns |
| `UserAvatar` | Selected avatar or initials fallback | Custom div; avatar registry; inline size/gradient styles | 2 consumers (`Layout`, `ProfileDrawer`) | Custom SVG faculty icons, Tabler role icons, and initials share the avatar registry |

## Layout and shell primitives

| Export/component | Purpose | Technology | Usage evidence |
| --- | --- | --- | --- |
| `Layout` | Role-aware desktop sidebar, mobile drawer/header/bottom navigation, profile and notifications | Mantine AppShell/Drawer/layout primitives; Mantine disclosure hook; Router NavLink; Tabler icons; CSS Module, Tailwind, and inline styles | Imported by all 19 non-auth page files; 20 JSX branches because Notifications has conditional layouts |
| `PageHeader` | Centered, operational, or compact page heading | Mantine Title/Text/Group/Box/Stack plus Tailwind | 17 instances across 16 page files; Admin Dashboard, Faculty Dashboard, and Slot Picker use custom headings instead |
| `Card` | Bordered card shell | Mantine Paper wrapper | 5 lexical instances: 3 Admin Dashboard, 1 Faculty Attendance, 1 internal to ResponsiveDataView input JSX text is not a render of Card; four page-rendered uses |
| `CardHeader` | Card section heading/action | Mantine Box/Group/Text | 3 instances, all Admin Dashboard |
| `CardBody` | Card content padding | Mantine Box | 4 instances across Admin Dashboard and Faculty Attendance |
| `Breadcrumb` | Linked page hierarchy | Router `Link`, semantic nav/ol | 10 consumer files; 11 instances because Notifications has conditional branches |
| `NotificationBell` | Unread indicator and custom dropdown | React state/refs, Tabler bell, raw buttons, positioned Tailwind/token surface | One shell consumer; one trigger plus one “View all messages” action |
| `ProfileDrawer` | Profile/avatar/preferences workflow | ResponsiveSheet, raw controls/buttons, Tabler icons | One shell consumer |
| `ProtectedRoute` | Auth/role route guard and loading gate | React Router; custom animated spinner | Three guard groups plus shared/auth use in `App` |
| `ErrorBoundary` | Fatal React render fallback | React class boundary; raw reload button | One root consumer in `App` |
| `OfflineBanner` | Offline/sync status banner in baseline | Custom React, static style object, raw dismiss button | One root consumer in `App`; frozen candidate implementation excluded |
| `PWAUpdatePrompt` | Service-worker update/reload feedback | `virtual:pwa-register/react` plus custom toast | One root consumer in `App` |

## Feature component layer

| Component | Purpose/technology | Consumers | Notable UI facts |
| --- | --- | ---: | --- |
| `DutyTimingSettingsModal` | Duty time editing through `FormModal`; Mantine Tooltip/native time input; Tabler info icon | Settings ×1 | One native time input |
| `ResolveFlagModal` | Flag resolution form through `FormModal`; direct Mantine TextInput | Flagged Violations ×1 | Shared modal path |
| `TrendBreakdownDrawer` | Analytics drill-down via `ResponsiveSheet` | Violations ×1 | Raw shared-style Close button; text loading |
| `ComposeDrawer` | Message compose via `ResponsiveSheet` | Messages ×1 | Native select/input/textarea; two shared-style raw footer buttons |
| `CreateUserDrawer` | Invite workflow via `ResponsiveSheet` | Users ×1 | Mantine TextInputs; six raw buttons; one external Telegram anchor styled as action |
| `StudentDetailsDrawer` | Student details/violations via `ResponsiveSheet` | Students ×1 | Badge ×2; raw shared-style Close; plain loading text |
| `UploadStudentsDrawer` | Spreadsheet upload/preview via `ResponsiveSheet` | Students ×1 | Mantine Checkbox; native file input; four raw buttons; extensive inline styles |
| `ViolationTypeDrawer` | Create/edit violation type via `ResponsiveSheet` | Settings ×1 | Direct Mantine TextInput/NumberInput; two raw footer buttons |
| `MyViolationsSummary` | Faculty metric summary and navigation | Faculty Dashboard ×1 | StatCard ×4, Skeleton, raw “View all →” |
| `MyViolationsTable` | Faculty violation list/edit actions | Violation Recorder ×1 | Shared Table, Mantine fields/buttons, FormModal, ConfirmDialog, Pagination |
| `PendingReassignmentRequests` | Request list/actions | Faculty Dashboard ×1 | Mantine Buttons; Skeleton loading |
| `RecordViolationModal` | Student violation workflow | Admin Violations, Faculty Dashboard, Violation Recorder | ResponsiveSheet, StudentSearchOverlay, AppSelect ×2, direct Mantine TextInput/Checkbox/Switch, four raw buttons |
| `RequestReassignmentModal` | Reassignment request workflow | Faculty Dashboard ×1 | ResponsiveSheet, AppSelect, direct Mantine Textarea, two raw footer buttons |

All 40 component files have at least one current importer. No unreferenced component file was found by import-path search.

## Button implementation matrix

| Implementation | Confirmed evidence | Locations/consumers | Notes |
| --- | --- | --- | --- |
| `AppButton` consumer usage | 1 instance in 1 file | `DutySlotsPage` | Wrapper itself contains one Mantine Button and one ActionIcon branch |
| Direct Mantine `<Button>` outside `AppButton` | 70 instances in 19 files | Shared wrappers/components and 15 page files | Overall lexical total is 71 including AppButton’s internal Button |
| Direct Mantine `<ActionIcon>` outside `AppButton` | 2 instances in 1 file | `UsersPage` row menus | Overall total is 3 including AppButton’s internal ActionIcon |
| Raw `<button>` | 82 instances in 32 files | 24 page-level instances across 13 pages; 58 component-level instances across 19 components | Includes action buttons, composite widgets, navigation chrome, calendar cells, tabs, dismiss buttons, and sheet footers |
| Shared ResponsiveSheet footer-style raw buttons | 17 rendered button instances across 9 consumer files: 9 cancel/close and 8 primary/action | Compose, Create User, Record Violation, Request Reassignment, Profile, Student Details, Upload Students, Violation Type, Trend Breakdown | `cancelBtnStyle`/`primaryBtnStyle` references also include imports/definitions; rendered-button count was classified from each button tag |
| Raw icon-only/dismiss/navigation controls | Present in Layout, NotificationBell, OfflineBanner, ResponsiveSheet, StudentSearchOverlay, Toast, Login, Faculty Dashboard, Reports | Representative: shell menu/theme/logout, password eye, X/dismiss, chevrons | Attribute regex undercounts when JSX expressions contain `>`; locations were verified from button snippets rather than presenting a false exact accessibility count |
| Router links | `Link` ×1; `RouterNavLink` ×2 templates | Breadcrumb and Layout | Semantic navigation; mapped arrays expand these templates at runtime |
| External anchor styled as action | 1 | Create User “Open Telegram” | Has `_blank` and `noopener noreferrer`; destination is an external link rather than an in-app mutation |
| Div/table-row action semantics | `StatCard` and shared `Tr` conditionally use `role="button"`, tabIndex, and keyboard activation | StatCard consumers; clickable Students rows | Separate from native button count |

Raw-button location totals by file are preserved in the command evidence summarized by the closure report. Representative categories:

- Calendar/navigation/day cells: Calendar ×4, All Faculty Duties ×2 month controls, Faculty Attendance ×2, Slot Picker ×3.
- Sheet/form footers: 17 instances using the ResponsiveSheet style exports.
- Segmented/tabs/selectors: Reports mode/report selectors, Notifications filters, Messages tabs/message rows, Create User role cards.
- Navigation/action links rendered as buttons: dashboard “View all” actions, retry, change-student, mobile back/close.
- App shell/chrome: Layout ×4, NotificationBell ×2, ResponsiveSheet close, Toast dismiss, OfflineBanner dismiss.

## Form and input implementation matrix

| Implementation | Confirmed JSX count | Files | Notes |
| --- | ---: | ---: | --- |
| `AppSelect` | 7 | 3 | Record Violation ×2, Request Reassignment ×1, Students ×4 |
| `AppTextInput` | 2 | 1 | Students |
| `AppNumberInput` | 0 consumer instances | 0 | Export exists and wraps Mantine NumberInput |
| Direct Mantine `Select` outside wrapper | 21 | 8 | My Violations, Attendance Live, Calendar, Duty Slots, Flagged, Settings, Violations, All Faculty Duties |
| Direct Mantine `TextInput` outside wrapper | 19 | 10 | Admin/feature forms and filters |
| Direct Mantine `NumberInput` outside wrapper | 2 | 2 | Violation Type Drawer and Calendar |
| Mantine `Textarea` | 2 | 2 | Request Reassignment and Duty Slots |
| Mantine `Checkbox` | 7 | 3 | Upload, Record Violation, Students |
| Mantine `Switch` | 1 | 1 | Record Violation |
| Native `<input>` | 25 actual JSX instances | 11 | Search, auth, profile, file/time/date, and report filters; one extra lexical `<input>` occurrence exists only in a utility comment and is excluded |
| Native `<select>` | 23 | 6 | Compose, Admin Dashboard, Reports, Students, Users, Violations |
| Native `<textarea>` | 1 | 1 | Compose Drawer |
| Native `<label>` | 8 | 5 | Compose, Profile, Upload, Login, Change Password |
| Native `<form>` | 7 | 7 | Compose, Create User, Profile, FormModal, Violation Type, Login, Change Password |

Locally constructed native-control styles include `selectCls` in Reports/Users/Violations, `inputClassName`/`inputInline` in Profile, and form-specific class arrays in both auth pages.

## Overlay implementation matrix

| Implementation | Usage | Direct dependency boundary |
| --- | --- | --- |
| `ResponsiveSheet` | 10 consumers/instances | Radix Dialog and Framer Motion imported only inside ResponsiveSheet |
| `StudentSearchOverlay` | 1 consumer/instance | Second shared overlay importing Radix/Framer directly for nested dialog behavior |
| `FormModal` | 8 instances in 6 files | Wraps Mantine compound Modal; uses Mantine hook for fullscreen mobile |
| `ConfirmDialog` | 12 instances in 7 files | Wraps Mantine Modal |
| Direct feature Mantine Modal | 2 instances | Duty Slots reassignment and Users reset-password result |
| Mantine Drawer | 1 instance | Layout mobile navigation |
| Mantine Menu dropdown | 2 menu templates | Users row/invite actions |
| Custom positioned dropdowns | 2 | NotificationBell dropdown; Reports student search results |

No page or feature component imports Radix Dialog or Framer Motion directly. Both direct import sites are under `components/ui`.

## Table and data-view implementation matrix

| Implementation | Evidence | Strategy |
| --- | --- | --- |
| Shared `Table` | 27 instances across 12 files | Mantine Table inside `Table.ScrollContainer`, default min width 500 |
| `ResponsiveDataView` | 1 instance | Duty Slots mobile `MobileList`/desktop Table pair at `md` |
| Hand-built mobile-card/desktop-table pairs | 7 pages | Flagged Violations, Settings violation types, Students, Users user list, Violations record list, All Faculty Duties, Audit Logs |
| Shared table without a page-level card counterpart | Present | Calendar’s unassigned table; Users pending invites; Notifications; My Violations; Reports tables; conditional inactive Settings table is desktop-only inside the desktop branch |
| Raw HTML `<table>` | 1 | Violations analytics heatmap/detail table inside an overflow container |
| Mantine Table direct feature usage | 0 | Mantine Table is encapsulated as `MTable` in shared `Table.jsx` |
| Shared `EmptyRow` | 31 instances across 11 files | Loading or empty table row |
| Shared `ErrorRow` | 9 across 8 files | Table request error |
| Shared `ErrorBlock` | 7 across 7 files | Non-table/card error |

### ReportsPage rendering catalog

`ReportsPage` defines 2 primary report cards and 15 secondary report definitions.

- Both primary cards support monthly/yearly/overall/daily/weekly modes and delegate result rows to the same `ReportSection('student-violations')` shared-table branch.
- Secondary IDs: monthly attendance, late arrivals, absent faculty, auto clock-outs, faculty activity, type breakdown, pending fines, flagged violations, duty coverage, unassigned faculty, duty reassignments, completion rate, upload history, active students, and attendance overrides.
- `ReportSection` contains 14 shared `<Table>` JSX implementations: 13 secondary/result branches plus the shared student-violations branch. Late arrivals and auto clock-outs share one table branch; duty reassignments renders two separate tables; duty coverage and active students use non-table summaries.
- At mobile width the selected secondary report content is placed in `ResponsiveSheet`; at desktop it appears in an inline panel. The underlying shared tables retain horizontal-scroll behavior. No report result uses `ResponsiveDataView` in this baseline.
- Reports also has a separate native-control filter system, raw mode/action buttons, and a custom absolute student result dropdown.

No frozen report mobile-card change is present or continued in this inventory.
