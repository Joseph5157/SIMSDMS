# 030-C — Dependency & Design-System Architecture Audit Closure

Date: 2026-09-12

Status: complete; awaiting owner review/sign-off

Authorized phase: 030-C only

## 1. Baseline and freeze confirmation

| Item | Verified state |
| --- | --- |
| Audit branch | `audit/design-system-030` |
| Product baseline / audit HEAD | `21a7ca5f56dfd67118e6530e3f925e5607688656` |
| Local `main` | Same SHA |
| Product-code changes | None |
| Existing documentation changes | None |
| Frozen remediation work | Excluded; no frozen branch/commit command was executed |
| Unrelated stash | No stash command was executed |

Pre-existing `.claude/settings.local.json` and `LEARNING_GUIDE.md` remain unrelated and untouched. The signed-off 030-A/030-B artifacts and roadmap remain untracked audit documentation alongside the new 030-C artifacts.

## 2. Deliverables completed

1. [030-C-intended-actual-historical-architecture.md](./030-C-intended-actual-historical-architecture.md)
   - intended-versus-actual responsibility matrix
   - evidence-label discipline
   - documentation/history layers
   - Spec 012/025 comparison and July initiative result
2. [030-C-dependency-and-wrapper-responsibility.md](./030-C-dependency-and-wrapper-responsibility.md)
   - dependency responsibility, resolution, encapsulation, overlap, reach, and change-impact map
   - Mantine responsibility analysis by component family
   - wrapper adoption/bypass/API-coverage matrix
3. [030-C-pattern-ownership-overlap-risk.md](./030-C-pattern-ownership-overlap-risk.md)
   - overlay, form, action, table/data, state/feedback, token, and responsive ownership analysis
   - exact raw-button semantic classification
   - architecture overlap register
   - architecture risk register
   - questions for 030-D and Spec 031
4. This closure report.

## 3. Required conclusions

### 1. Is the project using too many UI libraries?

**Conclusion:** mostly a reasonable hybrid stack with inconsistent boundaries, not evidence that library count alone is the defect.

- Mantine and Tailwind are both broad, deliberately assigned different primary responsibilities.
- Tabler is the broad icon dependency.
- Radix and Framer are narrowly encapsulated overlay implementation details.
- Recharts is not a second direct chart implementation: it is the installed peer/runtime required by Mantine Charts.
- Mantine Notifications and Geist have zero direct production imports; this is manifest/current-use uncertainty, not an automatic removal conclusion.
- The architectural inconsistency is concentrated in wrapper adoption, native/direct-control choice, state rendering, responsive data coordination, and token synchronization.

### 2. Broad dependencies versus encapsulated details

| Reach | Dependencies / layers |
| --- | --- |
| Broad application dependencies | React, Mantine Core (34 files), Tailwind (1,117 className attributes/49 files), Tabler (16 files), TanStack Query (19 files), React Router |
| Narrow but current feature responsibility | Mantine Charts (one page), Mantine Hooks (six files), PWA register (one component), Axios (one shared client) |
| Narrow encapsulated implementation details | Radix Dialog and Framer Motion, each imported only by ResponsiveSheet and StudentSearchOverlay |
| Peer/runtime without direct feature imports | Recharts 3.9.2; Mantine Charts declares `recharts >=3.2.1` and npm resolves the client’s version as the peer |
| Zero direct production usage found | Mantine Notifications, Geist variable font |
| Utility declaration with zero downstream adoption | `cn()` combines clsx/tailwind-merge but has no production caller; clsx is also transitive for Mantine/Recharts |

### 3. Canonical wrappers that are truly established

- ResponsiveSheet: 10 consumers for responsive task overlays.
- FormModal: 8 instances/6 files for conventional forms.
- ConfirmDialog: 12 instances/7 files for confirmation, with one `window.confirm` bypass retained in Notifications’ disabled implementation branch.
- Shared Table: 27 instances/12 files; no direct feature Mantine Table.
- Toast: 25 hook consumers and 100 lexical calls.
- PageHeader: 17 instances/16 pages.
- Badge: 46 instances/17 files.
- Pagination: 8 instances/7 files.
- StatCard: 23 instances/5 files in its specialized metric role.
- EmptyRow/ErrorRow/ErrorBlock are established within table/data contexts.

Alert and Skeleton have meaningful but non-exclusive/partial adoption.

### 4. Wrappers that exist mostly in name or have little adoption

- AppButton: one consumer.
- AppNumberInput: zero consumers.
- AppTextInput: two consumers and no behavior beyond passing props to Mantine.
- ResponsiveDataView and MobileList: one Duty Slots consumer each.
- EmptyState: one consumer.
- Layout Card family: four page-rendered uses.
- AppSelect is not merely nominal—it adds overlay portal behavior—but remains partial at seven uses across three files.

### 5. Genuine responsibility duplication

- Standard actions: AppButton, direct Mantine Button, and 32 raw conventional-action templates perform overlapping jobs.
- Forms: wrappers, direct Mantine fields, and native/local controls overlap for selects/text inputs without one complete authoritative selection rule.
- Responsive dual-tree coordination: ResponsiveDataView versus seven local card/table visibility pairs.
- Transient feedback domain: active custom Toast versus installed, unused Mantine Notifications.
- Token sources: active Tailwind/CSS values and Mantine color arrays require manual synchronization; unused raw `:root` ramp aliases duplicate active values.
- Loading/general empty presentation: shared components and local text/card paths overlap in some contexts.
- Confirmation: ConfirmDialog is established, while one source-level `window.confirm` remains in the statically disabled Notifications implementation branch.

### 6. Similar-looking implementations with meaningfully different roles

- ConfirmDialog, FormModal, ResponsiveSheet, Layout Drawer, and Mantine Menu are not interchangeable; confirmation, conventional form, responsive task, navigation, and anchored-menu responsibilities differ.
- EmptyState and EmptyRow represent the same concept in incompatible page/card versus table-row containers.
- Skeleton, mutation spinners, route/loading spinners, and minimal loading text serve different timing/layout needs, although some list-page cases still overlap.
- Raw calendar cells, tabs, disclosure controls, pagination, and list options are composite controls rather than ordinary CTAs.
- The Violations raw table is an analytical structure, not a second general table component.
- Recharts is an underlying peer for Mantine Charts, not a parallel direct chart API in current feature code.

### 7. Where the July architecture initiative held

- Mantine behavior/Tailwind presentation hybrid remains in production.
- Vaul and Lucide are absent from the installed tree.
- ESLint blocks deprecated/direct overlay imports and allows only ResponsiveSheet and the documented nested StudentSearchOverlay exception.
- Radix/Framer imports are contained to those two shared files.
- ResponsiveSheet has broad adoption; old drawer/sheet component files are absent.
- Tabler is the only directly imported third-party icon library.
- PageHeader variants and the 768 px shell breakpoint correction remain.
- Mantine’s global Button theme applies the 44 px minimum.
- Shared Table, ConfirmDialog, Toast, Badge, and several other app primitives remain broadly used.

### 8. Where it drifted or was never fully adopted

- Representative-first AppButton, AppField, MobileList, ResponsiveDataView, and EmptyState work did not become broad universal adoption.
- The later migration handoff explicitly retained page-level Mantine filters, green Mantine Buttons, bespoke auth controls, and sheet-specific raw controls, but current governance does not express every boundary clearly.
- Mantine Notifications never became the feedback owner; custom Toast remained canonical.
- The nested StudentSearchOverlay exception is in source/ESLint/history but not in Constitution/CLAUDE’s simplified wording.
- Existing architecture/mobile documents retain pre-build and target language after implementation.
- Root raw palette aliases remain defined despite zero real `var()` consumers.
- One coherent 768 px shell/content boundary exists, but overlay and behavior boundaries also use 639/640 and 767/768.

### 9. Questions requiring 030-D

- Rendered roles/names, focus visibility, and keyboard behavior of raw/composite controls.
- Nested overlay focus trapping/return, dismiss behavior, and z-index stacking.
- Exact behavior at 639, 640, 767, and 768 px.
- Actual mobile usability of horizontal-scroll tables and parity of local table/card views.
- Reachability/readability of loading, empty, error, retry, offline, sync, and toast states in light/dark themes.
- Custom NotificationBell/Reports dropdown keyboard and dismissal behavior.
- Visual agreement of mixed Mantine/Tailwind theme values.
- Whether duplicate font imports create duplicate built/browser work.

### 10. Questions deferred to Spec 031

- Future Mantine-direct versus wrapper policy.
- Future status/API of AppButton/AppField/ResponsiveDataView.
- Which conventional raw actions should share a primitive and which composite controls remain native.
- Final overlay task-assignment rules.
- Future token synchronization and breakpoint vocabulary.
- Dependency classifications/actions after direct, peer, and runtime evidence.
- Whether a chart wrapper is warranted.
- Target state/feedback conventions and migration sequencing.
- Any choice involving Mantine reduction/replacement, pure React/Tailwind, shadcn, 21st.dev, or Design System V2.

No future architecture was selected.

## 4. Architecture risk summary

The detailed register records 12 risks:

- **High:** minimally adopted canonical action wrapper across a large action surface.
- **High:** manually synchronized active theme-color sources.
- **Medium:** ambiguous form-wrapper boundary.
- **Medium:** limited ResponsiveDataView adoption across seven local dual-tree pages.
- **Medium:** layered breakpoint boundaries and one-pixel cutoff uncertainty.
- **Medium:** overlay governance text versus nested-dialog exception.
- **Medium:** uneven state-component adoption/completeness.
- **Medium:** mixed current/target/stale architecture documentation.
- **Low:** installed dependencies/helpers with zero direct/downstream source use.
- **Low:** unused raw palette alias layer.
- **Low:** duplicate font entry-point imports.
- **Low:** feature-gated browser confirmation bypass.

Severity reflects potential architectural impact and reach, not authorization to remediate.

## 5. Commands and evidence methods

Read-only work included:

```text
Get-Content audit-roadmap.md and all 030-A/030-B artifacts
Get-Content / Select-String across current frontend source and relevant architecture history
Read CONSTITUTION.md §2, project structure/governance/history sections
Read CLAUDE.md, docs/UI_ARCHITECTURE.md, docs/MOBILE_PATTERNS.md
Read Spec 012 handoff and Spec 025 plan/handoff
Read design-system skill SKILL.md, readme, manifest, selected token/component sources
Read historical FRONTEND_ARCHITECTURE_AUDIT.md, archived mobile guidance, and color-system notes
Read installed @mantine/charts and recharts package metadata
npm.cmd ls recharts @mantine/charts --all
npm.cmd explain recharts
npm.cmd explain clsx
npm.cmd explain tailwind-merge
npm.cmd explain @fontsource-variable/geist
npm.cmd explain @mantine/notifications
npm.cmd ls vaul lucide-react --all
PowerShell source enumeration/regex for imports, raw-button semantics, token consumers, and ownership evidence
git branch --show-current
git rev-parse HEAD
git rev-parse main
git status --short --untracked-files=all
git diff --name-status
git diff --check
```

`rg` remains unavailable, so PowerShell `Get-ChildItem`, `Select-String`, and .NET regex were used. The raw-button classification was based on every complete button tag/body, not only keyword matching. One exploratory Mantine import aggregation regex crossed statement boundaries and produced invalid output; it was discarded and not used as evidence. Existing signed-off 030-B counts and direct source inspection are the evidence source for Mantine component reach.

No build, lint, test, server, browser, or Playwright command was needed or run in 030-C. Package-tree commands were read-only and used to resolve Recharts/utility dependency relationships.

## 6. Files changed during 030-C

Added Spec 030 audit evidence only:

- `specs/030-design-system-audit-cleanup/030-C-intended-actual-historical-architecture.md`
- `specs/030-design-system-audit-cleanup/030-C-dependency-and-wrapper-responsibility.md`
- `specs/030-design-system-audit-cleanup/030-C-pattern-ownership-overlap-risk.md`
- `specs/030-design-system-audit-cleanup/030-C-closure.md`

No application code, styles, tests, dependencies, configuration, routes, existing architecture/design documentation, historical spec, frozen commit, or stash was modified. No commit or push was performed.

## 7. Hard stop

030-C is complete. No browser or Playwright audit was started. No documentation correction, visual audit, cleanup, package change, component migration, architecture choice, or remediation was performed. **030-D has not begun.**
