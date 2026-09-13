# SIMS DMS Design System V2

Status: proposed implementation-ready V2 specification; awaiting owner review; implementation is deferred to Spec 032.
Architecture direction: Mantine + Tailwind hybrid with tighter selective boundaries.
Evidence baseline: Spec 030, `21a7ca5f56dfd67118e6530e3f925e5607688656`.

## 1. Purpose and non-goals

V2 defines exactly how **new and migrated** SIMS DMS UI must be built. It preserves the existing functional hybrid rather than replacing it.

V2 does not authorise a migration, package operation, screen redesign, token implementation, or frozen-candidate application. Those are Spec 032 work after an approved migration plan.

## 2. Architecture ownership

| Owner | Responsibility | Boundary |
| --- | --- | --- |
| Tailwind + application CSS | Layout, responsive composition, spacing, typography application, surfaces, borders, radii, shadows, and semantic visual tokens. | Primary visual/styling owner. Do not make Mantine props or local hex values the source of visual language. |
| Mantine Core/Hooks | Accessible behavior and complex primitives: standard fields, buttons, menus, modals, drawer, table internals, shell behavior, focus/keyboard interactions, and responsive hooks. | Direct use is allowed only as defined in the canonical matrix; Mantine does not own the visual language. |
| Radix Dialog + Framer Motion | Dialog semantics, focus scope, animation, drag, and keyboard-inset behavior used by shared overlay infrastructure. | No direct feature-page imports. `StudentSearchOverlay` remains the one audited nested-overlay exception inside `components/ui`. |
| Tabler | Third-party iconography. | Canonical icon system; do not add Lucide or another icon library. |
| Public Sans / DM Mono | Public Sans for UI/content; DM Mono for IDs, dates/times, compact numeric/data values, and code-like values where mono aids scanning. | Do not introduce a new UI font. |
| Native HTML | Native controls/semantics where they are the better platform behavior. | Allowed only for the defined semantic exceptions; native is not a shortcut around application patterns. |

## 3. Action system

### Core rule

`AppButton` is canonical for **conventional feature actions**: primary submits/creates/saves, secondary/cancel actions, destructive confirmations, and conventional labeled icon actions. It is not the owner of every interactive element.

### AppButton contract

| Concern | V2 rule |
| --- | --- |
| Variants | `primary`, `secondary`, `danger`, `ghost`, and `icon`. Add a semantic `success` variant only if a real approved feature action needs it; do not encode arbitrary screen colours as variants. |
| Hierarchy | One primary action per local task surface. Secondary/cancel is visually subordinate. Danger is reserved for irreversible or destructive operations and must not also be the primary default action. |
| Size / touch | Conventional touch actions have a 44px minimum interactive target. Dense table/icon contexts may render visually compact only when the actual hit area remains 44px or the control is not touch-critical. |
| Icons | Use Tabler. Labeled actions may use a leading or trailing supporting icon. Icon-only actions require an accessible name and tooltip where discovery is not obvious. |
| Loading / disabled | Loading preserves the action’s label/meaning, prevents duplicate invocation, and does not change layout unexpectedly. Disabled controls remain legible and include an adjacent explanation when the reason is not obvious. |
| Styling | AppButton consumes semantic V2 tokens; feature code does not add one-off colour, gradient, radius, or shadow overrides. |

### Direct and raw action rules

| Pattern | Allowed for | Not allowed for |
| --- | --- | --- |
| Direct Mantine `Button` / `ActionIcon` | Existing shared primitives, a Mantine-specific primitive, or a documented exception where AppButton lacks required behavior. | New ordinary feature CTA/save/cancel/delete actions. |
| Raw `<button>` | Shell/menu/disclosure triggers, calendar/day-grid controls, tabs/toggles, pagination internals, list selection, drag/gesture controls, and composite widgets. | New conventional feature actions merely to avoid AppButton. |
| Link | Navigation to a destination. | Mutations, form submissions, or actions that only look like navigation. |
| Icon button | Compact familiar control (close, menu, previous/next, row action) using Tabler and an accessible name. | An unlabeled primary workflow action where text is needed for clarity. |
| Destructive action | AppButton `danger` in a ConfirmDialog or equivalent approved confirmation flow. | Destructive behavior hidden behind a neutral control without confirmation, except an explicitly reversible local action. |

### ResponsiveSheet footer decision

`ResponsiveSheet` owns footer placement, safe-area padding, alignment, and responsive layout. Its **conventional cancel/primary/destructive footer actions must use the AppButton contract**. The existing exported raw footer-style button pattern is a legacy implementation to migrate in Spec 032; no new caller may copy it. Raw close/dismiss controls in a sheet header remain legitimate disclosure controls.

## 4. Forms

| Concern | V2 rule |
| --- | --- |
| `AppSelect` | Canonical for selects inside Radix-hosted overlays and any context requiring its non-portal behavior. |
| Direct Mantine Select / TextInput / NumberInput / Textarea | Canonical for ordinary application forms and filters when no app wrapper adds distinct semantics or behavior. This is an approved direct-use path, not a bypass. |
| `AppTextInput` / `AppNumberInput` | Do not add new consumers until they provide a material application contract beyond a thin pass-through. Existing uses may remain until migration planning. |
| Native `<input>` | Approved for password, search, file upload, date, time, checkbox/radio where native behavior is desired, and other type-specific platform controls. Use correct `type`, label, name, autocomplete/inputmode, and token styling. |
| Native `<select>` | Approved for a small, static, native-appropriate option set where platform behavior is preferable. Use Mantine/AppSelect for searchable, asynchronous, large, or overlay-hosted selection. |
| Labels / help / error | Every input has a programmatic label. Help text and error text are associated with the control; errors state what must change. Placeholder text never substitutes for a label. |
| Focus | Use the shared visible focus treatment; never remove focus outlines without an equal or stronger keyboard-visible replacement. |
| Layout | Tailwind/CSS owns form spacing and responsive composition. Mantine owns field behavior; feature code does not create arbitrary field visual systems. |

## 5. Overlay system

| Surface | Canonical job | Required behavior |
| --- | --- | --- |
| `ResponsiveSheet` | Contextual, task-focused flows that need mobile sheet/full-screen presentation and desktop dialog presentation. | Focus containment; Escape and permitted click-outside close; safe-area and keyboard inset; responsive switch at the overlay boundary; V2 footer contract. |
| `FormModal` | Structured create/edit form with fields, validation, loading/error region, and sticky actions. | Labeled dialog, focus containment, Escape/backdrop behavior appropriate to unsaved state, safe-area-aware mobile presentation, and V2 focus-return requirement. |
| `ConfirmDialog` | Confirmation of destructive or consequential action. | Clear consequence, primary/secondary hierarchy, loading prevention, Escape behavior where safe, and V2 focus-return requirement. |
| Mantine `Menu` | Anchored action/menu choices. | Keyboard traversal, Escape close, trigger focus return, and visible trigger affordance. |
| Direct Mantine Modal / Drawer | Shell navigation or a documented feature contract not covered by the three canonical surfaces. | Exception must name why existing shared surface is unsuitable and retain equivalent accessibility behavior. |
| Custom dropdown | Search suggestions or a genuinely bespoke anchored selection interaction. | Must define keyboard navigation, focus relationship, Escape/outside click, selection semantics, and mobile behavior before implementation. |

### Overlay accessibility requirement

030-D confirmed false focus return in tested FormModal and ConfirmDialog scenarios. **Any V2 migration or change to those components must make return focus to the invoking control a verified acceptance criterion.** Focus containment, Escape, click-outside, safe areas, and nested-dialog behavior must be tested at the affected breakpoint; do not assume current behavior is uniform.

`StudentSearchOverlay` remains a tightly bounded shared-overlay exception: it may use Radix/Framer directly only within its shared component for nested student search. No feature component may copy this pattern.

## 6. Tables and responsive data

### Ownership

- Shared `Table` is canonical for desktop tabular data, table chrome, semantic rows/cells, horizontal containment, and table-specific loading/empty/error/retry states.
- `ResponsiveDataView` is an optional coordinator for an already justified paired mobile/desktop renderer. It is not mandatory and must not force two trees where a single responsive representation works.
- A page owns its information architecture choice—table, compact rows, cards, or an allowed scroll table—using the rules below.

### Mobile decision rule

| Data/task shape | Required mobile presentation |
| --- | --- |
| Daily operational records with row actions, multiple statuses, or fields that must be scanned/acted on individually | Card or compact-row transformation below 768px. Preserve the primary action and meaningful status information. |
| Short read-only comparison/reference table with few columns and no hidden primary action | Horizontal scroll is allowed if it is visibly scrollable, uses an actual scroll container, and does not clip content. |
| Wide data table inside a bottom sheet or narrow dialog | Not allowed. Use a mobile-specific summary/detail/card presentation, or a surface intentionally designed for the data width. |
| Reports at <=639px | A desktop-width result table may not be placed in a narrow ResponsiveSheet. Use a mobile report renderer or an explicitly usable full-width/read-only scroll presentation based on the report schema. |

The 030-D Reports clipping defect establishes the constraint: hidden/ambiguous overflow is never an acceptable mobile-table strategy. Row actions must remain discoverable; table loading, empty, error, and retry states use shared table primitives.

## 7. Feedback and state patterns

| State | Canonical pattern | Context rule |
| --- | --- | --- |
| Transient success/info/failure | Custom `Toast`. | Mutation feedback, PWA/update feedback, or transient result; do not introduce Mantine Notifications. |
| Inline contextual message | Custom `Alert`. | Persistent explanation, warning, success, or action within the relevant page/card/form context. |
| Field validation | Field-associated error/help text. | Do not use toast as the only indication of invalid field input. |
| Known-shape loading | Skeleton / table row skeleton. | Use when the loaded layout is predictable and preserving layout stability helps scanning. |
| Indeterminate action/loading | Button/overlay/local loader plus clear action context. | Use for short mutation or blocking waits where a skeleton would misrepresent content. |
| General no-data view | `EmptyState`. | Use for page/card-level absence when title, explanation, and optional next action are useful. |
| Table no-data/loading | `EmptyRow`. | Use inside shared Table. |
| Table failure | `ErrorRow`. | Use inside shared Table, including retry where retry is possible. |
| Non-table request failure | `ErrorBlock`. | Use inside a card/content region; use Alert when the message is contextual rather than a failed data block. |
| Offline | `OfflineBanner`. | Persistent root connectivity/sync state; it is not replaced by a normal Toast. |
| Disabled | Disabled control plus visible reason where non-obvious. | Never rely on colour alone. |

Do not create a new universal state abstraction merely to merge structurally different containers. Semantic consistency matters; table rows, pages, and local mutation states retain appropriate structures.

## 8. Token and theme strategy

### Source of truth

1. **Semantic CSS custom properties are the visual source of truth** for light and dark values: surface, text, border, primary, status, focus, spacing, radii, shadows, motion, and dimensions.
2. **Tailwind `@theme` exposes semantic aliases**, not independent component/page palettes. Tailwind classes and application CSS consume the semantic vocabulary.
3. **Mantine receives a small theme adapter** for values its APIs require. It maps to the same named semantic tokens and must not become a second feature-authored palette.
4. Components consume semantic tokens or approved Tailwind aliases; they do not introduce raw hex colours, independent shadows, or arbitrary radii for static styling.

### Synchronization rule

The V2 implementation must consolidate Mantine palette/shade declarations into one clearly named adapter next to the token source and document the mapping. A token-affecting change updates the semantic token and its adapter in the same change, then verifies light and dark representative Mantine/Tailwind surfaces in the browser. No token-generation pipeline is required unless this small adapter proves insufficient.

This is proportionate to the project: it removes ambiguous independent ownership without adding a build-time token tool. It also preserves Mantine APIs that require colour arrays.

## 9. Visual language

SIMS DMS is **institutional, operational, authoritative, and clear**. It is not a marketing dashboard or a generic feature-card catalogue.

| Concern | V2 rule |
| --- | --- |
| Surfaces | Use containment to group a task, dataset, immutable context, or decision—not merely to decorate whitespace. Avoid card-inside-card unless inner context is materially distinct. |
| Radius | Use a compact family: controls 8px, standard surfaces 12–14px, overlays 12–16px, pills full. Do not introduce large rounding on ordinary operational panels. |
| Borders / shadows | Border is the default separation signal. Use one restrained elevation level for raised overlays/dropdowns and one subtle card elevation only where hierarchy needs it. Do not combine heavy shadow, strong tint, and border by default. |
| Colour | Blue is primary action/navigation; status colours retain semantic meaning. Accent colours may not be used as arbitrary card identities. One screen’s status colours must not compete with its primary action. |
| Gradients | Allowed for clear brand or task-state emphasis (login, one task-critical Faculty duty hero). Decorative greeting gradients and repeated gradient cards require explicit product purpose. |
| Pills / badges | Use Badge/pill treatments for status, role, compact filters, or live state—not ordinary metadata or promotional copy. |
| Icon containers / emoji | Tabler is default. A coloured icon container needs semantic purpose, not category decoration. Emoji are exceptional content cues; do not use them as a report catalogue, navigation, metric, or status system. |
| Motion | Motion explains modality, progress, state change, or direct manipulation. Respect reduced motion. Number tweening, hover lift, and decorative transitions are off by default unless they improve comprehension. |
| Density | Prefer compact, scannable tables/lists and concise labels for repeated administrative work. Do not add cards, helper copy, or tiles that conceal operational information. |
| StatCard | Use for a small set of actionable/summary metrics. A metric must have a stable semantic accent or neutral presentation; do not create a rainbow of arbitrary stat identities. |

## 10. Dashboard direction

- Each dashboard has one clear first-priority task or summary. Faculty may retain a task-critical duty hero; Admin/Super Admin use a restrained operational heading unless a real state warrants stronger treatment.
- Use one greeting/hero metaphor per dashboard, not a greeting gradient plus unrelated hero treatment.
- Stat cards show a limited, decision-relevant metric set. Keep accents semantic or neutral; avoid four unrelated colour identities by default.
- Quick actions are for frequent role tasks only and use the same action hierarchy as the rest of the product, not a marketplace-like coloured tile grid.
- Charts answer a specific operational question, include concise labels/period context, and do not create a wall of equal-weight panels.
- Activity sections use rows/lists where scanability is better than separate decorative cards.
- Decorative circles, blobs, gradients, hover lift, animated counts, and announcement chips require a task-specific rationale; they are not default dashboard affordances.

## 11. Reports direction

- Reports are an operational index, not a 15-card feature catalogue. Group by report family/task, use text-first labels and Tabler only where an icon improves recognition.
- Do not use a unique emoji plus arbitrary colour tile as the default identity for each report.
- Filters are grouped by the report they affect, use a clear Apply/Reset or immediate-update model, and do not form a dense unprioritized control wall.
- Give a selected report a concise factual header: report name, period/filter summary, result status/count where useful, export actions, then data.
- Desktop uses shared Table for tabular reports, preserving density and export/action hierarchy.
- Mobile follows the data rule: result-specific cards/compact rows for record scanning; intentional clearly scrollable read-only comparison tables only when their schema supports it; never clipped desktop tables in a sheet.
- Export actions are secondary to selecting/understanding the report result, but remain easy to find and keyboard/touch accessible.

## 12. Responsive model

| Range / boundary | Owner / rule |
| --- | --- |
| 0–639px | Mobile overlay/report mode. ResponsiveSheet and StudentSearchOverlay use mobile presentation; Reports must not place a desktop-width table in a narrow sheet. |
| 640px | Reports may switch out of its narrow-sheet mode only when resulting content is usable; this boundary is not the desktop shell boundary. |
| 640–767px | Intermediate/mobile composition. FormModal retains its established 640/641 modal boundary; test content, keyboard, and safe area rather than assuming desktop density. |
| Below 768px | Mobile shell: fixed bottom navigation and mobile composition. Operational data chooses cards/compact rows/allowed scroll table using the table rule. |
| 768px and above | Desktop shell/sidebar and dominant table presentation. This is the authoritative shell/data boundary. |

Shell, overlay, and data behavior have different legitimate boundaries. Do not force them into one breakpoint token merely for visual symmetry. Fixed navigation and overlays must preserve safe-area padding and avoid obscuring primary actions.

## 13. Accessibility requirements

- Every control is semantic, keyboard-operable, visibly focusable, and has an accessible name. Icon-only controls require an `aria-label`; tooltips supplement rather than replace the name.
- Conventional touch actions have 44px-class hit targets. Dense exceptions must preserve a 44px hit area where touch use is expected or demonstrate why the context is desktop-only/secondary.
- Inputs have labels, associated help/error text, appropriate types/autocomplete/inputmode, and errors that describe remediation.
- Dialogs/sheets trap focus, restore focus to the trigger on close, support Escape where safe, expose a labelled title, and handle outside click intentionally.
- Colour never carries status/error/selection meaning alone. Text, icon, shape, or label supplements semantic colour; light and dark contrast must remain readable.
- Motion honours `prefers-reduced-motion`; no task outcome depends only on animation or hover.
- Any migration that touches D-02, D-03, D-04, or D-07 has browser acceptance checks for its relevant keyboard, mobile, safe-area, and focus behavior.

## 14. AI-agent implementation rules

Before creating or changing UI, an agent must:

1. Identify the semantic job: conventional action, field, overlay, data view, feedback, or status.
2. Check the canonical component matrix before creating anything.
3. Reuse an approved shared primitive when its contract fits; use a documented direct/native exception when it does not.
4. Use semantic V2 tokens, Public Sans/DM Mono, and Tabler; never add raw palettes, fonts, or icon libraries by default.
5. Choose mobile presentation using the table/overlay breakpoint rules, including safe-area behavior.
6. Verify light and dark mode, keyboard/focus behavior, labels, touch targets, and reduced motion as applicable.
7. Do not add a dependency, new overlay stack, new global theme, or 21st.dev component without explicit approved scope and review.
8. Do not copy legacy prototype skill assets or historical specifications into production implementation.

## 15. Discouraged patterns

Do not add new instances of the following without an approved exception:

- conventional raw feature-action buttons or direct Mantine CTA buttons where AppButton fits;
- new UI, icon, font, dialog, form, or notification libraries;
- feature-authored static raw hex palettes, radii, shadows, or dark-mode overrides;
- decorative gradients, rainbow stat cards, emoji report catalogues, or card grids without operational purpose;
- a new ad hoc overlay/dropdown system when an approved surface fits;
- a wide/clipped table in a narrow mobile sheet;
- bespoke empty/error/loading presentation when EmptyState, table state primitives, Alert, Skeleton, or ErrorBlock fit the container/semantics;
- hover-only discovery, icon-only controls without accessible names, or focus styling removal.

## 16. Remaining owner input

No additional **blocking architecture decision** is required to begin a future Spec 032 plan: the hybrid direction, primitive boundaries, responsive constraints, visual language, and 21st.dev boundary are now specified.

Owner approval is still required for a future Spec 032 scope, sequencing, budget, and release risk; that is implementation governance, not an unresolved V2 architecture question. Any proposal to replace Mantine, introduce a new primitive library, override these boundaries, or add 21st.dev beyond the policy requires a new owner decision.
