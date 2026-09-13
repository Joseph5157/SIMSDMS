# Spec 031 — Architecture Options Decision Proposal

Status: owner-approved architecture direction; no implementation authorised.
Evidence: closed Spec 030, baseline `21a7ca5f56dfd67118e6530e3f925e5607688656`.

## Decision

**Recommend Option A: retain the current Mantine + Tailwind hybrid and tighten its boundaries selectively.**

This is the lowest-risk path that directly addresses the actual drift found in Spec 030. It preserves the current working shell, accessibility behavior, responsive transitions, and established shared primitives, while making ownership rules explicit where inconsistency has real cost. It does not presume that more wrappers, less Mantine, or a library replacement is inherently better.

## Option comparison

| Option | Main idea | Benefits | Risks | Migration cost | Accessibility risk | Recommendation |
| --- | --- | --- | --- | --- | --- | --- |
| **A — Keep hybrid, tighten boundaries** | Retain Mantine for accessible behavior and Tailwind/CSS tokens for layout/presentation; retain contained Radix/Framer; make only valuable app primitives canonical. | Preserves the audited working system; directly addresses wrapper/token/state drift; lowest bundle and regression disruption; compatible with selective future 21st.dev use. | Requires disciplined rules and enforcement; does not create a single-library mental model. | Low–medium, staged. | Low if existing shared behavior is retained and D-02 is explicitly fixed/tested later. | **Preferred.** |
| **B — More Mantine-centric** | Make Mantine the primary path for most interactive controls/surfaces and reduce native/custom variants. | Clearer common behavior for controls, forms, overlays, focus, and dark-mode integration; fewer feature-level styling decisions. | High migration reach across 34 importing files; may reduce operational density/control-specific behavior; does not inherently solve token sync or Reports visual density. | Medium–high. | Medium: replacing working responsive sheets, Table, native specialized inputs, or shell patterns could regress behavior. | Viable only if owner prioritises uniform library APIs over migration cost; not preferred on current evidence. |
| **C — Reduced-Mantine / app-owned React + Tailwind** | Retain Mantine only where behavior is difficult to replace; move more visual primitives to application ownership. | Maximum control over tokens, visual language, and selective component sourcing; can reduce long-term API coupling. | Rebuilds currently working accessibility, menus, modal/drawer lifecycle, form behavior, tables, theme integration, and dark mode; high test burden; larger risk than the audit justifies. | High. | High until every replacement is proven. | Not recommended now; reserve as a future reconsideration only if Option A cannot control drift. |

No Option D is supported by the audit. A new component system or a 21st.dev-led architecture would be a speculative fourth path rather than evidence-backed remediation of the observed problems.

## Why Option A wins

1. **The foundation works.** 030-D completed 58 role/route captures with no primary-route crash, root-document overflow, or severe dark-mode unreadability. Four representative data views transition correctly at 767/768. Replacing broad foundations would create risk without evidence of commensurate benefit.
2. **The drift is selective.** The key architecture problems are low adoption of AppButton/AppField/ResponsiveDataView, manual token synchronization, uneven state patterns, and ambiguous direct/native boundaries—not a collision between Mantine, Tailwind, Radix, Framer, and Tabler.
3. **Existing shared primitives have real value.** Shared Table, ResponsiveSheet, ConfirmDialog, Toast, PageHeader, Badge, StatCard, and Pagination already have meaningful reach and encode behavior or shared operational language worth preserving.
4. **The confirmed defects are local and solvable under the hybrid.** Reports mobile clipping, Admin Dashboard invalid nesting, overlay focus return, and selected target-size issues do not require a framework replacement.
5. **It protects operational work.** Dense tables/lists, semantic status language, role shell/navigation, Faculty duty priority, and dark mode are evidence-backed strengths; a large migration would risk them.

## Proposed future architecture boundaries

### Keep unchanged as current foundations

- React/Vite, React Router, TanStack Query, Tailwind, Mantine Core/Hooks, and the existing Mantine Charts/Recharts peer relationship.
- Public Sans as UI typography, DM Mono for mono usage, Tabler as the third-party icon library, and the SIMS logo/semantic status language.
- Shared Layout, current role/permission behavior, dark-mode support, and browser-confirmed 767/768 table/card transition behavior.
- Radix Dialog + Framer Motion as internal shared-overlay infrastructure only, including the bounded StudentSearchOverlay nested-overlay exception until a later approved change.
- Shared Table, ResponsiveSheet, FormModal, ConfirmDialog, Toast, Alert, PageHeader, Badge, StatCard, and Pagination as existing foundations.

### Become canonical application boundaries

| Area | Proposed canonical boundary | Reason |
| --- | --- | --- |
| Conventional application actions | `AppButton` for new feature-level primary, secondary, destructive, and icon actions after its contract is explicitly completed for needed variants. | It is the clearest place to centralize semantic variants, loading/disabled behavior, accessible icon naming, and control geometry. It must not be forced onto composite/shell controls. |
| Overlay task families | `ResponsiveSheet` for contextual/mobile-first task flows; `FormModal` for structured create/edit forms; `ConfirmDialog` for confirmations. | These have distinct established contracts. Direct replacement of one with another should require a documented exception. |
| Tables | Shared `Table` for tabular data, including table-specific empty/error/retry states. | It is already broad and centralizes table semantics/scroll behavior. |
| Transient / inline feedback | Custom `Toast` for transient feedback; custom `Alert` for inline contextual feedback; existing table state primitives in table contexts. | This reflects active source use; Mantine Notifications is not the current feedback owner. |
| Common page/status/metric language | PageHeader, Badge, StatCard, and Pagination for their respective established jobs. | They already carry real cross-product conventions and should not be duplicated casually. |
| Tokens / visual styling | Application semantic CSS/Tailwind tokens as the authored source, with a deliberately maintained Mantine theme adapter rather than parallel independent palettes. | Directly addresses the actual sync risk while preserving Mantine’s theme API requirements. |

### Direct third-party and native exceptions

| Pattern | Proposed allowed use | Boundary |
| --- | --- | --- |
| Direct Mantine controls | Standard non-overlay forms/filters and library-specific primitives where no application wrapper adds distinct behavior. | Use Mantine semantics; do not create a thin wrapper that only renames the API. |
| `AppSelect` | Required for select controls rendered in Radix-hosted overlays or any context needing its non-portal behavior. | Direct Mantine Select remains acceptable in ordinary page forms/filters. |
| Native controls | Auth/password, search, file, date/time, and other native-type-specific controls; semantically appropriate composite controls. | Must retain labels, names, keyboard behavior, and approved visual tokens. Native controls are not a shortcut for ordinary app fields. |
| Raw buttons | Shell/chrome, calendar/day-grid, tabs, pagination internals, disclosure, list selection, and composite widgets. | Conventional feature CTA use moves toward AppButton; raw actions require a semantic reason. |
| Direct Mantine Modal/Menu/Drawer | Shell navigation or a feature need not covered by an established shared contract. | Record the exception; preserve focus, Escape, and return-focus behavior. |
| Responsive data presentation | Screen-specific card, compact-row, or intentional scroll-table strategy. | Shared Table remains canonical for table chrome; ResponsiveDataView is an optional coordinator, not a universal requirement. |

## Explicitly deferred

- Exact AppButton API/variant design and migration sequence.
- Exact semantic-token schema and Mantine adapter mechanics.
- Package removal/retention decisions for Mantine Notifications, Geist, and unused utilities.
- Reports redesign and a specific solution for mobile output.
- Dashboard visual simplification and precise gradient/emoji/motion policy.
- Lint/test enforcement mechanisms and their rollout sequence.
- Long-term policy for the StudentSearchOverlay exception.
- Any component installation, library replacement, migration, or frozen-candidate disposition.

These are design and migration details to resolve through owner-approved follow-up decisions; deferral does not weaken the proposed architecture direction.

## 21st.dev under Option A

21st.dev may be considered later as a **bounded pattern/component source**, never as an architecture source of truth.

- It may not introduce a new primitive library, icon set, font, token system, theme model, or global styling convention by default.
- It may not bypass the canonical overlay, table, feedback, token, accessibility, or responsive boundaries above.
- Any future component must be evaluated for keyboard/focus behavior, mobile/safe-area behavior, dark mode, bundle/dependency impact, Tabler/Public Sans compatibility, and whether it duplicates an established primitive.
- A sourced component becomes canonical only through an explicit owner-approved design-system decision, never because it was imported once.

No 21st.dev research, selection, installation, or component import is authorised by this proposal.

## Evidence basis

- [030-H final audit report](../030-design-system-audit-cleanup/030-H-final-audit-report.md)
- [030-H finding register](../030-design-system-audit-cleanup/030-H-consolidated-finding-register.md)
- [030-H decision inputs](../030-design-system-audit-cleanup/030-H-spec-031-decision-inputs.md)
- [030-D browser issue register](../030-design-system-audit-cleanup/030-D-visual-runtime-issue-register.md)
- [030-E visual audit](../030-design-system-audit-cleanup/030-E-current-visual-language-and-pattern-audit.md)

## Owner decision record

The owner approved **Option A — keep the hybrid and tighten selective boundaries**. This established the architecture direction only; it did not authorise implementation, dependency changes, screen redesign, frozen-candidate action, or Spec 032.
