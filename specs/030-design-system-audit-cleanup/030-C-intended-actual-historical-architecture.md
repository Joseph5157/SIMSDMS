# 030-C — Intended, Actual, and Historical UI Architecture

Baseline product SHA: `21a7ca5f56dfd67118e6530e3f925e5607688656`

Audit branch: `audit/design-system-030`

## Evidence labels

- **Confirmed fact** — current source, manifest, installed package metadata, or signed-off 030-A/030-B evidence.
- **Documented intent** — a rule or target stated by current project documentation.
- **Historical intent** — a prior audit, prototype, plan, or handoff; it is not treated as current truth.
- **Inference** — the most likely explanation supported by source/history, explicitly labeled.
- **Unresolved** — requires runtime evidence or an owner/Spec 031 decision.

## Intended-vs-actual responsibility matrix

| Concern | Intended owner | Current owner(s) | Evidence | Drift / uncertainty |
| --- | --- | --- | --- | --- |
| Application framework/state | React; TanStack Query for API state | React, TanStack Query, local React state | Constitution §2; Query imported by 19 production files; App provides QueryClient | Boundary is broadly intact. Local UI state appropriately remains in components; runtime query-state behavior is for 030-D. |
| Shell/layout | Tailwind for responsive layout; CSS Modules for complex shell; Mantine AppShell/Drawer behavior | Layout uses Mantine AppShell/Drawer, one CSS Module, Tailwind, and inline values | `UI_ARCHITECTURE.md` §1; Layout imported by all 19 non-auth pages; 23 CSS-module references | Intended hybrid is present. Static and runtime styles remain mixed inside the shell; whether each is justified is not determined here. |
| Interactive controls | Mantine behavior, preferably reached through shared controls where an equivalent exists | Mantine Core is broad (34 files); AppButton/AppField coexist with direct Mantine and native controls | Constitution §2; CLAUDE UI rules; AppButton 1, direct Button 70 outside it, raw button 82; AppSelect 7/direct Select 21/native select 23 | Responsibility owner is clear at library level but not consistently clear at wrapper level. Historical conventions explicitly retained direct page filters, green Mantine buttons, bespoke auth controls, and raw sheet footer buttons. |
| Forms | Mantine accessible fields; AppField family intended to encode app-specific overlay/mobile defaults | AppField wrappers, direct Mantine fields, native fields, local labels/styles | `UI_ARCHITECTURE.md` §3/§6 and Spec 025; current counts in 030-B | AppSelect has a distinct overlay portal rule; AppTextInput is pass-through; AppNumberInput has no consumers. Documents alternate between broad “canonical AppField” wording and narrower overlay-specific historical practice. |
| Desktop/modal overlays | Mantine Modal for conventional dialogs/forms/confirmation | FormModal, ConfirmDialog, two direct feature Mantine Modals, Layout Drawer, Mantine Menu | Constitution §2; `UI_ARCHITECTURE.md` §2; source | These are not all the same use case. FormModal and ConfirmDialog specialize Mantine Modal; direct modals cover feature-specific result/reassignment flows. Runtime focus/stacking remains unverified. |
| Responsive mobile/desktop overlays | ResponsiveSheet; Radix Dialog + Framer Motion internal | ResponsiveSheet (10), plus specialized StudentSearchOverlay (1), both importing Radix/Framer | Source, ESLint exceptions, Spec 025 handoff | Encapsulation largely held. Constitution says Radix/Framer solely inside ResponsiveSheet, while code/ESLint/handoff explicitly allow StudentSearchOverlay as a nested-dialog exception. |
| Tables/data presentation | Shared Table for table semantics/scroll; explicit mobile strategy chosen by data type; ResponsiveDataView for dual trees | Shared Table 27; ResponsiveDataView 1; one raw table; seven local mobile-card/table pairs; report scroll tables | `MOBILE_PATTERNS.md`; ResponsiveDataView/Table source comments; 030-B | Shared Table is established. ResponsiveDataView was intended as the reusable dual-tree coordinator but did not become the general implementation for the seven comparable local pairs. It was never intended to replace every simple/analytical table. |
| Feedback | Historical docs contain two targets: Mantine notifications in overlay table, but custom Toast and Alert described as already canonical | Custom Toast is broad (25 hook consumers, 100 calls); custom Alert has 13 uses; Mantine Alert only inside FormModal; Notifications package has zero direct use | `UI_ARCHITECTURE.md` §§2–3; Spec 025 handoff; source | Intra-document intent conflicts. Actual ownership is custom Toast for transient feedback and custom Alert for inline feedback; Mantine Alert is wrapper-local. |
| Empty/error/loading state | Reuse existing state components; list/data screens should cover loading, empty, error/retry, offline/sync | EmptyState, EmptyRow, ErrorRow, ErrorBlock, Skeleton family, literal loading text, custom spinners, ErrorBoundary, OfflineBanner | `MOBILE_PATTERNS.md`; 030-B state inventory | Responsibilities differ by container, but adoption is uneven. General EmptyState is used once and 26 literal loading labels remain. Actual completeness must be tested in 030-D. |
| Icons | Tabler as the sole default; no new Lucide | Tabler in 16 files; two app-specific inline SVG avatar icons; Unicode symbols; CSS visuals | Constitution §2; ESLint restriction; 030-B | Library consolidation held: Lucide is absent. Constitution permits Tabler as default rather than banning functional emoji/custom assets; older design skill still describes Lucide/emoji rules and is historical. |
| Motion | Restrained motion; Radix/Framer internal to overlay implementation | Framer only in ResponsiveSheet and StudentSearchOverlay; CSS animations; StatCard number tween and hover lift | UI architecture rules, design-skill historical guide, source | Dependency boundary held. Whether individual motion is meaningful or decorative belongs to 030-D/030-E. |
| Charts | No separate governance rule beyond current Mantine stack | Mantine Charts used directly by Violations; Recharts satisfies its peer runtime; no app chart wrapper | Constitution history mentions Mantine chart behavior; installed package metadata; `npm explain recharts` | Narrow, page-local responsibility. Whether a wrapper is needed is a Spec 031 question, not an audit conclusion. |
| Styling | Tailwind for responsive layout/spacing/custom presentation; Mantine for component behavior; CSS Module for shell; inline only for runtime-computed values | 1,117 className attributes, 158 inline styles, 9 Mantine style objects, one CSS Module, global CSS | CLAUDE and `UI_ARCHITECTURE.md`; 030-B | Hybrid ownership is real. Static inline values remain in shared primitives and special surfaces, including historically deliberate exceptions; the “runtime only” rule does not describe all current source. |
| Tokens/themes | Tailwind `@theme` for utilities; `:root` semantic variables for non-Tailwind contexts; Mantine theme synchronized to DS palette | `index.css` plus `App.jsx` `createTheme`, dark overrides, and local literal/computed styles | `UI_ARCHITECTURE.md` §4; App sync comment; 030-B | Some duplication is required by consumption mechanisms, while Mantine’s 72 hardcoded hex values are a hand-synchronized second representation. Color-system notes say the larger unification was intentionally declined. |
| Responsive breakpoints | A primary 768 px mobile-shell/data boundary; 360/390/412/768/1024 test widths | Tailwind breakpoints, CSS 767/768, Mantine `sm`, hook boundaries at 639/640 and 767, component-local JS | `MOBILE_PATTERNS.md`; source; 030-B | Shell has a coherent 768 px cutoff after July fix. Overlay 639/640 and chart 767 boundaries mean no single universal breakpoint model owns every responsive concern. |
| Typography | Current production tokens use Public Sans + DM Mono | Public Sans/DM Mono loaded in both `main.jsx` and `index.css`; token and literal sizes coexist | Constitution v3.27 history; current source | Production font ownership is clear. The design-system skill remains on DM Sans and is a historical/prototype snapshot. |

## Documentation and history layers

| Source | Role at time written | Architecture intent captured | Current relationship |
| --- | --- | --- | --- |
| `FRONTEND_ARCHITECTURE_AUDIT.md` | Early pre-Mantine/shadcn-era audit | One styling system per component; shadcn dialog/button proposals; mobile-first testing | **Historical only.** Its shadcn component tree and proposed ownership are absent from current production and superseded by the Mantine hybrid. |
| `MOBILE_DESIGN_RULES.md` | Pre-Mantine mobile rules, later archived | Mobile-first, card lists, 44 px targets, bottom navigation | Archive header says Mantine superseded its components. Some behavioral principles survived, but several implementation statements do not match current source. |
| Spec 012 handoff | July consistency/accessibility audit and fixes | Token correctness, dark-mode safety, keyboard rows, query states, Alert reuse; explicitly deferred broad button/loading consolidation | Many fixes remain visible: shared Tr keyboard handling, Alert adoption, token corrections. Its deferred inconsistencies are still visible in 030-B counts. |
| Spec 025 plan | July controlled-hybrid initiative | Keep Mantine + Tailwind; build wrappers representative-first; consolidate overlays/icons; explicit mobile strategies; enforcement | This is the clearest historical architecture blueprint. It records targets as phases, not proof of present adoption. |
| Spec 025 handoff | Implementation/completion record | ResponsiveSheet, wrapper creation, page migrations, Tabler/Vaul cleanup, ESLint restrictions, 768 px fix | Most infrastructure claims are confirmed in current source. It also records deliberate exceptions that explain some current bypasses. |
| Constitution §2 (v3.28 document; UI rules introduced v3.17) | Enforced current project summary | Mantine behavior, Tailwind layout, Radix/Framer internal, Tabler default | Broad stack description matches production. Vaul/Lucide wording describes a removal still scheduled although both are now absent. StudentSearchOverlay exception is not reflected in the “solely” wording. Detailed truth classification is reserved for 030-F. |
| `docs/UI_ARCHITECTURE.md` | Detailed policy from Spec 025 Phase 1 | Tool ownership, canonical overlays/controls/data views/tokens, prohibited imports | Mixes current policy, pre-build state, targets, and later annotations. Useful for intent, not reliable alone as current-state evidence. |
| `docs/MOBILE_PATTERNS.md` | Mobile policy/decision table | 768 px shell boundary, explicit data strategy, sheets, safe areas, required states | 768 px rule matches shell; “PageHeader not built” does not match source; table strategies remain mixed. Truth corrections wait for 030-F/G. |
| `CLAUDE.md` | Agent-facing condensed policy | Shared components; Mantine behavior; Tailwind layout; no direct Radix/Framer; explicit mobile strategy | Current enforcement intent, but its wording omits the StudentSearchOverlay exception and does not describe all existing bypasses. |
| `.claude/skills/SIMS DMS Design System/` | Prototype/artifact design kit built from an older branch | DM Sans, Lucide desktop icons, functional emoji, standalone token/component bundle, mobile-card presentation | Separate prototype bundle, not imported by production. It conflicts with current Public Sans/Tabler/logo implementation and is evidence of earlier visual intent only. |
| `specs/color-system-notes.md` | Deferred token backlog | Three color representations, naming differences, Mantine sync risk, intentional decision not to refactor at that stage | Closely describes current token ownership and explicitly says its future changes are unscheduled. Some “dead raw ramp” details require a later truth audit rather than assumption. |

## Spec 025: intended result versus current result

### Problems it intended to solve

Confirmed historical intent from the plan:

1. Preserve the Mantine/Tailwind hybrid while assigning each tool a defined job.
2. Collapse five overlay paths into a responsive shared boundary.
3. Move feature code off Vaul/direct overlay-library imports.
4. Standardize new icon work on Tabler and remove Lucide after migration.
5. Introduce AppButton, AppField, MobileList, PageHeader variants, and ResponsiveDataView through representative screens before broader rollout.
6. Align the shell breakpoint and add enforcement after migrations.

### What remains standardized today

- **Confirmed:** Radix and Framer are limited to two shared UI files; no page/feature direct imports exist.
- **Confirmed:** ESLint prohibits Radix/Framer/Vaul/Lucide imports outside the two documented overlay exceptions.
- **Confirmed:** Vaul and Lucide are absent from the installed dependency tree.
- **Confirmed:** Tabler is the only third-party icon library directly imported.
- **Confirmed:** ResponsiveSheet has 10 consumers and owns mobile/desktop overlay switching, drag, dismiss, safe-area, and keyboard-inset behavior.
- **Confirmed:** PageHeader variants exist and the shell cutover is aligned at 768 px.
- **Confirmed:** shared Table, ConfirmDialog, Toast, Badge, PageHeader, and Pagination have multi-screen adoption.
- **Confirmed:** the Mantine provider enforces a 44 px minimum height on every Mantine Button.

### What drifted or never reached broad adoption

- **Confirmed:** AppButton has one consumer while 70 Mantine Buttons outside it and 82 raw buttons remain.
- **Confirmed:** AppNumberInput has no consumers; AppTextInput has two; AppSelect has seven while direct/native alternatives remain broad.
- **Confirmed:** ResponsiveDataView/MobileList remain single-screen patterns while seven pages independently implement comparable table/card splits.
- **Confirmed:** EmptyState is used once and Skeleton adoption coexists with 26 literal loading labels.
- **Confirmed:** custom Toast, not Mantine Notifications, owns transient app feedback despite one policy table naming Mantine notifications.
- **Confirmed:** the intended one-line constitutional overlay boundary does not include the StudentSearchOverlay exception enforced in source.
- **Inference:** representative-first components were delivered, but later screen work focused largely on inline-style and legacy-dependency cleanup rather than universal wrapper conversion. The handoff explicitly retained page-level Mantine filters, success buttons, and raw sheet footer controls, supporting this explanation.

### ResponsiveDataView conclusion

**Historical intent:** ResponsiveDataView was built as the canonical coordinator when a screen intentionally renders separate mobile and desktop trees. Spec 025 called Duty Slots the representative migration and deferred broader rollout.

**Actual:** it has one consumer; seven pages implement the same CSS-visible dual-tree concept locally. Shared Table remains canonical for scrollable/simple table cases, so ResponsiveDataView was never intended to replace every table.

**Inference:** its single-screen reach is more consistent with incomplete adoption than with a documented Duty-Slots-only scope. The component API accepts arbitrary prebuilt mobile/desktop JSX specifically to accommodate varied page grouping, which weakens the explanation that other screens could not use it. Whether each local pair benefits from the abstraction remains a Spec 031 decision.

## Architecture-level conclusion

SIMS DMS is not currently a random collection of interchangeable UI libraries. It is a **reasonable controlled hybrid stack whose top-level responsibilities are mostly coherent but whose application-wrapper boundaries are inconsistently adopted and inconsistently documented**.

- Mantine, Tailwind, TanStack Query, and Tabler are broad application dependencies.
- Radix Dialog and Framer Motion are narrow overlay implementation details with enforced boundaries.
- Mantine Charts is narrow page functionality; Recharts is its confirmed peer/runtime requirement.
- Multiple superficially similar implementations often serve different roles: inline alerts versus transient toast, confirmation versus long-form responsive tasks, table-row empty/error states versus page empty states, and table scroll versus table/card transformation.
- Genuine duplication exists where the same action/field/data-view responsibility has wrapper, direct-library, and native/local paths without one consistently applied rule.

This conclusion describes the baseline. It does not select a future architecture.
