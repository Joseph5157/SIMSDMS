# 030-B — Full Code & Component Inventory Closure Report

Date: 2026-09-12

Status: complete; awaiting owner review/sign-off

Authorized phase: 030-B only

## 1. Baseline and branch confirmation

| Item | Verified state |
| --- | --- |
| Audit branch | `audit/design-system-030` |
| Audit HEAD | `21a7ca5f56dfd67118e6530e3f925e5607688656` |
| Local `main` | `21a7ca5f56dfd67118e6530e3f925e5607688656` |
| Relationship | Audit branch remains exactly at the signed-off main baseline; audit artifacts are untracked documentation |
| Product-code changes | None |
| Frozen candidate commits | Excluded from baseline; no candidate branch/commit operation was performed in 030-B |
| Unrelated stash | No stash command was executed; it remained untouched |

The pre-existing untracked `.claude/settings.local.json` and `LEARNING_GUIDE.md` remain unrelated and untouched.

## 2. Scope completed

The complete current frontend source tree was included in the static inventory: 99 files under `client/src`, including 21 page files, 40 component files, all 18 files recursively under `components/ui`, hooks, utilities (including the separate `lib/utils.ts` helper), route composition, global CSS, and the Mantine theme/provider.

The following required deliverables are complete:

1. [030-B-page-route-matrix.md](./030-B-page-route-matrix.md) — all route declarations and every page, with access/layout, dependencies, controls, data views, overlays, state patterns, icons, and responsive strategies.
2. [030-B-component-primitive-inventory.md](./030-B-component-primitive-inventory.md) — every shared UI/component file, feature components, and button/form/overlay/table implementation matrices.
3. [030-B-styling-tokens-responsive-assets.md](./030-B-styling-tokens-responsive-assets.md) — styling mechanisms, literal values, tokens, breakpoints, responsive behavior, typography, icons/assets, and charts.
4. [030-B-dependency-state-duplication-register.md](./030-B-dependency-state-duplication-register.md) — direct dependency use, feedback/loading/empty/error states, parallel implementation register, Reports-specific strategies, and unresolved verification questions.
5. This closure report.

## 3. Page and route result

- 24 route declarations were inventoried: public/auth routes, shared authenticated routes, faculty routes, admin routes, super-admin routes, and catch-all behavior.
- All 21 page files have at least one declared route. No statically unreachable page component was found.
- All 19 non-auth page files use Layout. Login and Change Password are the two auth-page exceptions.
- Notifications is routed and conditionally laid out but is not present in the static role navigation arrays.
- `/admin/duty-timing-settings` is absent as a route; duty timing settings are exposed as a Settings modal workflow.
- Role aliases and dual-route cases are recorded explicitly in the route matrix rather than collapsed into page counts.

## 4. Central primitive counts

Counts in this table are confirmed lexical JSX/source counts unless stated otherwise. Wrapper-internal occurrences are excluded where the label says “direct/outside wrapper.”

| Area | Implementation | Confirmed evidence |
| --- | --- | ---: |
| Buttons | AppButton consumers | 1 instance / 1 file |
| Buttons | Mantine Button outside AppButton | 70 instances / 19 files |
| Buttons | Mantine ActionIcon outside AppButton | 2 instances / 1 file |
| Buttons | Raw `<button>` | 82 instances / 32 files |
| Navigation links | Router Link / NavLink templates | 1 / 2 |
| External action-styled link | `<a>` | 1 legitimate external destination |
| Selects | AppSelect | 7 instances / 3 files |
| Selects | Direct Mantine Select | 21 instances / 8 files |
| Selects | Native `<select>` | 23 instances / 6 files |
| Text input | AppTextInput | 2 instances |
| Text input | Direct Mantine TextInput | 19 instances / 10 files |
| Number input | AppNumberInput | 0 consumers |
| Number input | Direct Mantine NumberInput | 2 instances |
| Native fields | `<input>` | 25 actual JSX tags / 11 files |
| Text areas | Mantine / native | 2 / 1 |
| Other fields | Mantine Checkbox / Switch | 7 / 1 |
| Overlays | ResponsiveSheet | 10 instances |
| Overlays | FormModal | 8 instances / 6 files |
| Overlays | ConfirmDialog | 12 instances / 7 files |
| Overlays | Direct feature Mantine Modal | 2 instances |
| Overlays | Mantine Drawer | 1 shell implementation |
| Tables | Shared Table | 27 instances / 12 files |
| Tables | ResponsiveDataView | 1 instance |
| Tables | Raw HTML table | 1 instance |
| State | EmptyRow / ErrorRow / ErrorBlock | 31 / 9 / 7 |
| State | Custom Alert | 13 instances / 7 files |
| State | Toast calls | 100 lexical calls / 25 files |
| State | Shared Skeleton consumer calls | 17, plus CardSkeleton 1 and TableRowSkeleton 2 |
| State | Literal loading labels | 26 / 15 files |
| Layout | PageHeader | 17 instances / 16 pages |
| Metrics/status | StatCard / Badge / Pagination | 23 / 46 / 8 |

The raw-button inventory separates semantic links from actions and records shared sheet-footer controls, shell/chrome controls, calendar/navigation controls, tabs/selectors, dismiss controls, and composite button semantics. Runtime accessibility behavior is intentionally left for browser verification.

## 5. Shared component result

- All 18 shared UI/utility-layer files were inventoried by purpose, implementation technology, styling, behavior/accessibility dependency, consumers, and parallel feature paths.
- All 40 files under the full component tree have at least one importer. No unreferenced component file was found by static import-path search.
- Shared abstractions coexist with direct library and native implementations. The factual pairs and exact counts are in the parallel-implementation register; no preferred implementation was selected.
- Radix Dialog and Framer Motion feature-code imports were not found. Their direct imports are confined to ResponsiveSheet and StudentSearchOverlay.
- Reports has 14 shared-Table JSX branches in ReportSection and retains horizontal-scroll table behavior on mobile in the baseline. No frozen mobile-card work is included.

## 6. Dependency usage result

| Dependency | Direct production import evidence |
| --- | ---: |
| `@mantine/core` | 34 files |
| `@mantine/hooks` | 6 files |
| `@mantine/charts` | 1 file |
| `@mantine/notifications` | **zero direct usage found** |
| `@radix-ui/react-dialog` | 2 files |
| `framer-motion` | 2 files |
| `@tabler/icons-react` | 16 files; 40 unique symbols / 53 named imports |
| `recharts` | **zero direct usage found** |
| `clsx` | 1 file |
| `tailwind-merge` | 1 file |
| `@fontsource-variable/geist` | **zero direct usage found** |
| `@tanstack/react-query` | 19 files |
| `axios` | 1 file |

Public Sans and DM Mono font imports are duplicated between `main.jsx` and `index.css`. The dependency register records responsibilities and direct locations only; it does not classify any dependency as required, redundant, legacy, or removable.

## 7. Styling, token, responsive, type, asset, and chart result

- 1,117 `className` attributes across 49 files; 158 inline style attributes across 36; 9 Mantine `styles` objects across 6.
- One CSS Module is used by Layout; global tokens/styles live primarily in `index.css`.
- 1,707 CSS custom-property references across 56 files; `index.css` contains 312 token-definition occurrences and 211 unique variable names.
- 404 hex literals across 9 files and 58 rgb/rgba/hsl values across 11; detailed concentrations are documented.
- 1,622 bracket-utility occurrences/258 unique strings: 1,270 occurrences/129 unique token-backed strings and 352 occurrences/129 unique other bracket strings.
- 151 Tailwind breakpoint-prefix occurrences across 27 files; 6 CSS media queries across 2 files; 5 Mantine `useMediaQuery` files.
- Breakpoints currently appear through 639/640, 767/768, Tailwind breakpoint utilities, Mantine `sm`, and the ResponsiveDataView class map. No breakpoint CSS variable was found.
- Safe-area handling appears 8 times across 5 files; visualViewport is used by the keyboard-inset hook; no production `matchMedia` call was found.
- Public Sans and DM Mono are loaded and applied; the Geist variable package has zero direct imports. Both token-backed and literal pixel font-size utilities are present and counted.
- Tabler is the primary icon import. Two inline SVG avatar components, three logo `<img>` uses, CSS visuals, and approximate Unicode-symbol evidence are separately recorded.
- Violations is the only chart-using page: one Mantine LineChart and two Mantine BarCharts. Direct Recharts usage was not found, and no app chart wrapper was found.

## 8. Commands and analysis methods

Read-only commands and scripts used during 030-B included:

```text
Get-Content <audit-roadmap and 030-A artifacts>
Get-ChildItem client/src -Recurse -File
Get-ChildItem client/src/pages -Recurse -File
Get-ChildItem client/src/components -Recurse -File
Get-Content / Select-String across App.jsx, routes, components, pages, CSS, manifests
PowerShell regex Match/Matches enumeration for JSX tags, imports, className/style usage,
CSS variables, colors, breakpoints, media queries, typography, icons, and asset references
git branch --show-current
git rev-parse HEAD
git rev-parse main
git status --short
git diff --name-status
git diff --check
```

`rg` was unavailable in this environment, so PowerShell recursive enumeration, `Select-String`, and .NET regular expressions were used. Counts were cross-checked against source snippets where regex ambiguity could change a category. One apparent native-input match in a JavaScript comment was excluded, producing 25 actual JSX input tags rather than the uncorrected lexical 26.

Build, lint, unit/integration, and Playwright commands were not rerun in 030-B: their signed-off results belong to 030-A, while 030-B’s work is static inventory. No server/browser was started.

## 9. Evidence limitations and unresolved verification

- Static counts do not equal runtime multiplicity for mapped/conditional JSX.
- Dynamic role/data conditions and actual visual behavior require later authorized browser verification.
- Regex cannot provide a trustworthy exact accessibility count for dynamic attributes; rendered DOM/keyboard testing is required.
- Runtime overflow, focus, stacking, touch targets, console warnings, and failed network behavior were not tested in this phase.
- Unicode symbol counts are approximate and deliberately not represented as exact rendered emoji counts.
- Static zero-reference asset/dependency evidence does not establish removability or exclude transitive/dynamic use.
- Documentation correctness, dependency classification, visual judgment, architecture choices, and remediation are outside 030-B.

No inventory prerequisite was blocked. Tooling limitations are recorded above.

## 10. Files changed during 030-B

Added audit evidence/documentation only:

- `specs/030-design-system-audit-cleanup/030-B-page-route-matrix.md`
- `specs/030-design-system-audit-cleanup/030-B-component-primitive-inventory.md`
- `specs/030-design-system-audit-cleanup/030-B-styling-tokens-responsive-assets.md`
- `specs/030-design-system-audit-cleanup/030-B-dependency-state-duplication-register.md`
- `specs/030-design-system-audit-cleanup/030-B-closure.md`

No application source, stylesheet, test, route, configuration, dependency manifest, token definition, or existing design documentation was modified. No commit or push was performed.

## 11. Hard stop

030-B is complete. No dependency/architecture classification, Playwright audit, visual judgment, documentation truth audit, cleanup, or remediation was begun. **030-C has not begun.**
