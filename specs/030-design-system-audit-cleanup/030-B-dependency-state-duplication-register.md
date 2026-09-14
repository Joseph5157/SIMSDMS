# 030-B — Dependency, State-Pattern, and Parallel-Implementation Register

Baseline: `21a7ca5f56dfd67118e6530e3f925e5607688656`.

This is a direct-usage map, not a dependency-responsibility decision. “Zero direct usage found” means no matching production source import was found; it does not classify a package as removable or account for transitive use.

## Direct frontend dependency usage map

Versions below are declared ranges from `client/package.json`.

| Dependency | Declared version | Direct production usage evidence | Current responsibility / locations |
| --- | --- | ---: | --- |
| `@mantine/core` | `^9.3.1` | 34 importing files | App theme/provider; shell/layout; shared button/field/table/modal/card/empty-state primitives; direct page form controls, buttons, cards, modals, tooltips, layout/text primitives |
| `@mantine/hooks` | `^9.3.1` | 6 importing files | Disclosure state in Layout; media queries in FormModal, ResponsiveSheet, StudentSearchOverlay, Reports, and Violations |
| `@mantine/charts` | `^9.3.1` | 1 importing file | Three charts in `ViolationsPage.jsx`: one LineChart and two BarCharts |
| `@mantine/notifications` | `^9.3.1` | **zero direct usage found** | Installed and its package styles are not imported; app feedback uses the custom Toast provider |
| `@radix-ui/react-dialog` | `^1.1.19` | 2 importing files | Dialog/focus/dismiss semantics inside `ResponsiveSheet.jsx` and `StudentSearchOverlay.jsx` |
| `framer-motion` | `^12.42.2` | 2 importing files | Sheet/dialog animation and drag behavior in the same two shared UI files |
| `@tabler/icons-react` | `^3.44.0` | 16 importing files; 40 unique named icons, 53 named imports | Navigation, controls, statuses, search, form affordances, role/avatar display |
| `recharts` | `^3.9.2` | **zero direct usage found** | No direct production source import; transitive relationship is outside this phase |
| `clsx` | `^2.1.1` | 1 importing file | Used only by `src/lib/utils.ts` to define `cn()` |
| `tailwind-merge` | `^3.6.0` | 1 importing file | Used only by `src/lib/utils.ts` to define `cn()` |
| `tailwindcss` | `^4.3.0` | CSS/build integration rather than JS feature imports | Imported by `index.css`; provides primary utility/theme styling |
| `@tailwindcss/vite` | `^4.3.0` | Vite configuration use | Tailwind Vite plugin |
| `@fontsource/public-sans` | `^5.3.0` | 10 side-effect import statements across 2 files | Five weights imported in both `main.jsx` and `index.css`; global sans face |
| `@fontsource/dm-mono` | `^5.2.7` | 2 side-effect import statements across 2 files | Weight 400 imported in both `main.jsx` and `index.css`; mono face |
| `@fontsource-variable/geist` | `^5.2.9` | **zero direct usage found** | No production source import discovered |
| `@tanstack/react-query` | `^5.101.0` | 19 importing files | Query provider/dev data fetching, mutation, cache invalidation, loading/error state |
| `axios` | `^1.17.0` | 1 importing file | Shared HTTP client and interceptors in `utils/api.js` |
| `react-router-dom` | `^7.17.0` | App/router plus pages, layout, and route-aware components | Routes, guards, navigation links, redirects, location/navigation hooks |
| `virtual:pwa-register/react` (from `vite-plugin-pwa`) | `^1.3.0` plugin package | 1 importing file | Service-worker update/offline readiness state in `PWAUpdatePrompt.jsx` |

`cn()` is exported from `src/lib/utils.ts`; zero production consumers of that export were found. This records the current import graph only.

### Mantine direct-use distribution

Mantine Core’s 34 importing files span both shared infrastructure and feature code. Shared wrappers do not fully mediate Mantine usage:

- Shared/UI and shell implementations include AppButton, AppField, ConfirmDialog, EmptyState, FormModal, Pagination, Table, Layout, and PageHeader/Card primitives.
- Direct feature instances include 70 Mantine Buttons outside AppButton, 21 Selects outside AppSelect, 19 TextInputs outside AppTextInput, 2 NumberInputs outside AppNumberInput, 2 ActionIcons outside AppButton, 2 direct feature Modals, 2 Textareas, 7 Checkboxes, and 1 Switch.
- Mantine Drawer occurs in Layout; Mantine Table is encapsulated by the shared Table family.
- Feature code has no direct Radix Dialog or Framer Motion imports; those dependencies are confined to the two shared overlay implementations named above.

## Feedback and state-pattern inventory

| State area | Implementation | Usage evidence / locations | Parallel implementation facts |
| --- | --- | --- | --- |
| Transient success/error feedback | Custom `ToastProvider` / `useToast` | Provider in App; hook in 25 consumer files; 100 lexical `toast({...})` calls | Mantine Notifications has zero direct imports |
| Inline alert feedback | Custom `Alert` | 13 JSX instances across 7 importing files | FormModal uses Mantine Alert directly; pages also render local text/banner blocks |
| Form-modal error feedback | Mantine Alert inside FormModal | One wrapper implementation used by 8 FormModal instances | Separate from custom Alert implementation |
| Offline state | Custom `OfflineBanner` | Root-level App consumer; static style object and raw dismiss control | Frozen candidate commit is excluded from baseline and was not inspected |
| PWA update state | PWA registration + custom toast | Root-level `PWAUpdatePrompt` | Update/reload surfaced through app toast rather than Mantine Notifications |
| Table empty state | Shared `EmptyRow` | 31 JSX instances across 11 files | Page/card empty text and EmptyState also occur |
| Table error/retry state | Shared `ErrorRow` and `ErrorBlock` | ErrorRow 9 across 8 files; ErrorBlock 7 across 7 files | Query/page-local errors also render inline Alerts or text |
| General empty state | Shared `EmptyState` | 1 consumer/instance, Faculty Attendance | Hand-built empty rows/cards/messages remain on other pages |
| Skeleton loading | Shared Skeleton family | Imported by 8 files; 17 consumer Skeleton calls, CardSkeleton 1, TableRowSkeleton 2 | Literal loading labels and spinners coexist |
| Literal loading copy | Text such as “Loading…” | 26 occurrences across 15 files | Exact lexical count includes variants in conditional branches |
| Drawer loading spinner | Shared `DrawerSpinner` path | 6 consumer calls | Other spinner markup exists outside this helper |
| Other spinners | Border/animation markup | `ProtectedRoute`, ResponsiveSheet internal busy state, StudentSearchOverlay | No Mantine Loader JSX usage found |
| Fatal render error | `ErrorBoundary` fallback | Root wrapper; raw reload button | Distinct from request/query errors |
| Search overlay states | Local StudentSearchOverlay rows | Idle/prompt, loading, empty, error, results | Reports implements a separate local student-search dropdown/state path |

## Factual parallel-implementation register

This register deliberately does not label a path preferred, obsolete, or a removal candidate.

| Area | Implementation A | Parallel implementation(s) | Evidence |
| --- | --- | --- | --- |
| Buttons | AppButton wrapper | Direct Mantine Button/ActionIcon; raw buttons; button-like interactive div/rows | AppButton 1 consumer; Mantine Button 70 outside wrapper; ActionIcon 2 outside wrapper; raw button 82 across 32 files |
| Selects | AppSelect | Direct Mantine Select; native select | AppSelect 7/3 files; direct Mantine Select 21/8 files; native select 23/6 files |
| Text inputs | AppTextInput | Direct Mantine TextInput; native input; page-local class controls | AppTextInput 2; direct Mantine TextInput 19; actual native input tags 25/11 files |
| Number inputs | AppNumberInput | Direct Mantine NumberInput; native typed input | AppNumberInput zero consumers; direct Mantine NumberInput 2 |
| Text areas | Direct Mantine Textarea | Native textarea | Mantine 2; native 1 |
| Labels/form structure | Mantine field labels/wrappers | Native labels/forms; page-local label markup | Native form 7, label 8; both shared and direct Mantine field paths present |
| Cards | Shared Layout Card/Paper wrapper | Mantine Paper and raw div card shells; StatCard; mobile list cards | Four page-rendered Card instances; StatCard 23; numerous class-based shells |
| Tables | Shared Mantine-backed Table | One raw HTML table; local card lists; ResponsiveDataView | Shared Table 27/12 files; raw table 1 in Violations; one ResponsiveDataView; seven hand-built table/card page pairs |
| Mobile list/card adaptation | ResponsiveDataView + MobileList | Seven page-local breakpoint/card implementations | Shared pair used only by Duty Slots; seven page list recorded in component inventory |
| Modal/dialog | FormModal/ConfirmDialog on Mantine | Two direct feature Mantine Modals; Layout Drawer; ResponsiveSheet/StudentSearchOverlay on Radix | FormModal 8, ConfirmDialog 12, direct feature Modal 2, ResponsiveSheet 10, StudentSearchOverlay 1 |
| Student search overlay | Shared StudentSearchOverlay | Reports local absolute dropdown | Radix/Framer shared overlay versus page-local positioned dropdown |
| Alerts | Custom Alert | Mantine Alert inside FormModal; OfflineBanner; local text errors | Custom Alert 13, wrapper-specific Mantine Alert, custom banner |
| Toast/notification feedback | Custom Toast | PWA prompt feeding Toast; Mantine Notifications package with zero direct use | Toast provider + 25 hook consumers |
| Loading | Skeleton family | Literal loading copy; DrawerSpinner; local animated spinners | Counts in state inventory above |
| Empty states | EmptyState | EmptyRow; local empty text/cards/search rows | EmptyState 1; EmptyRow 31; local variants in pages/overlays |
| Page headings | Shared PageHeader | Native/local headings on Admin Dashboard, Faculty Dashboard, Slot Picker | PageHeader 17 across 16 pages; native heading tags 15 across 9 files |
| Styling | Tailwind/token utilities | Mantine props/styles; inline styles; CSS Module; global CSS | 1,117 className attributes; 158 inline styles; 9 Mantine styles objects; one CSS Module |
| Color definitions | CSS/Tailwind tokens | Mantine theme ramps; raw local color values | 404 hex literals across 9 files; repeated representation described in styling artifact |
| Responsive boundary | Tailwind/Mantine `sm` and layout CSS | 639/640 hook boundaries; 767/768 page/CSS boundaries | Five media-query hook files, six CSS media queries, 151 breakpoint prefixes |
| Icons | Tabler icons | Inline SVG avatar icons; Unicode symbols/emoji; CSS visuals/images | 16 Tabler importers; 2 inline SVGs; approximate Unicode scan and image map in styling artifact |
| Charts | Mantine Charts directly in Violations | No app chart wrapper; Recharts zero direct imports | 1 LineChart, 2 BarCharts in one page |

## Reports rendering strategies

Reports is cataloged separately because it contains multiple report families and local rendering paths:

- Two primary report cards and 15 secondary report definitions are present.
- Primary/individual flows support monthly, yearly, overall, daily, and weekly modes, and feed the student-violations ReportSection table.
- ReportSection contains 14 shared-Table JSX branches: 13 secondary/result table implementations plus the student-violations table.
- Late-arrivals and auto-clockout share one table branch; duty reassignments renders two tables.
- Duty coverage and active students use non-table summary presentations.
- At max-width 639 px, the selected secondary report result appears inside ResponsiveSheet; desktop renders it inline.
- Report tables continue to use the shared horizontal-scroll Table path on mobile; no ResponsiveDataView/table-to-card transformation is present in the baseline.
- The frozen Student Violation Report candidate remediation is not part of this inventory and was not inspected.

## Unresolved questions for later verification

These are evidence limits or browser/runtime questions, not design decisions:

1. Static JSX counts do not reveal how many mapped or conditional instances render for real datasets and roles.
2. Runtime role/data/feature conditions may make some reachable routes or states rare; all declared routes were statically inventoried, but runtime reachability is reserved for browser verification.
3. Visual quality and usability of horizontal scrolling, table/card switches, sheets, dialogs, bottom navigation, and safe-area handling require 030-D viewport testing.
4. The accessibility behavior of raw/composite controls requires rendered DOM and keyboard testing; regex cannot reliably count dynamic `aria-label` expressions containing JSX operators.
5. Console warnings, failed requests, focus trapping, and overlay stacking require runtime verification.
6. Static zero-reference asset results do not exclude dynamically constructed asset paths.
7. Approximate Unicode-symbol counts cannot distinguish visible emoji from comments and non-emoji symbols.
8. Dependency responsibility, overlap, transitive use, and package classifications belong to 030-C and are intentionally not resolved here.
9. Whether code/documentation statements agree belongs to 030-F; documentation was not treated as implementation truth in this inventory.
