# UI Architecture

> Governs `client/src`. Required reading before adding or changing any UI component.
> Backed by `CONSTITUTION.md` §2 (Non-Negotiable Tech Stack) — this document is the detailed
> policy; the Constitution is the enforced summary. If they conflict, `CONSTITUTION.md` wins.
> Full migration plan: `specs/025-ui-architecture-consolidation/plan.md`.

## Why this exists

The frontend uses Mantine, Tailwind, CSS Modules, inline styles, Radix, Framer Motion, Vaul, and
two icon libraries. That's not the problem by itself — the problem is that several of these
solve the *same* job in different ways on different screens: five overlay systems (Mantine
Modal, Radix Dialog, Vaul Drawer, custom `BottomDrawer`, custom `SheetModal`), two icon sets
(`@tabler/icons-react` in 7 files, `lucide-react` in 9), and a color ramp defined twice
(`client/src/index.css` `@theme` block and `:root` block). Confirmed against the codebase
2026-07-19, not theoretical.

This document assigns one job to each tool and names the canonical component for each
overlapping behavior, so new code has one obvious way to be written instead of five plausible
ones to copy from.

## 1. Library responsibilities

| Layer | Owner | Notes |
|---|---|---|
| Interactive controls, accessibility, focus/keyboard behavior | **Mantine** | `TextInput`, `Select`, `Checkbox`, `Switch`, `NumberInput`, `Modal`, `Menu`, `Tooltip`, notifications |
| Responsive layout, spacing, breakpoints | **Tailwind** | Grid/flex, `md:`/`sm:` switches, visibility, one-off visual adjustments |
| Complex application shell | **CSS Modules** | Sidebar, header, main shell only — not per-feature-component modules |
| Mobile/desktop overlay behavior | **`ResponsiveSheet`** (Phase 2, not yet built) | Wraps Radix + Framer Motion internally. Feature code never imports Radix/Framer/Vaul directly — see `CONSTITUTION.md` §2. |
| Icons | **Tabler Icons** (`@tabler/icons-react`) | Sole default. `lucide-react` is deprecated — do not add new imports; migrate existing ones as their screen is touched. |
| Dynamic-only styling | **Inline `style={}`** | Only for values computed at runtime (`style={{ width: \`${progress}%\` }}`). Static visual styles (padding, radius, fixed colors) must not live in inline style objects — use a component, Tailwind class, or token. |

## 2. Overlay consolidation (Phase 2 target)

| Requirement | Canonical component | Replaces |
|---|---|---|
| Desktop dialog | Mantine `Modal` | ad hoc dialogs |
| Mobile bottom sheet / full-screen task | `ResponsiveSheet` | `BottomDrawer`, `SheetModal`, direct Radix/Vaul usage |
| Confirmation (especially destructive actions) | `ConfirmDialog` (already exists — see §3 note below) | mixed inline confirm patterns |
| Dropdown menu | Mantine `Menu` | — |
| Tooltip | Mantine `Tooltip` | — |
| Toast/feedback | Mantine notifications | custom toast/banner variants |

Feature pages call `<ResponsiveSheet />` and never know or care whether it's Radix, Vaul, or
something else underneath. `BottomDrawer.jsx` and `SheetModal.jsx` are deleted only once a
repo-wide usage search returns zero, per the migration procedure in
`specs/025-ui-architecture-consolidation/plan.md`.

## 3. Component inventory (Phase 1 audit — Phase 2 builds these)

| Category | Current state (confirmed 2026-07-19) | Canonical target |
|---|---|---|
| Buttons | Mantine `Button` + raw `<button className="...">` mixed | `AppButton` (primary/secondary/danger/ghost/icon variants, Mantine-backed) |
| Forms | Mantine inputs, inconsistent validation/label patterns | `AppField` family |
| Overlays | `Modal`, `Drawer`, `BottomDrawer`, `SheetModal`, direct Radix/Vaul | `ResponsiveSheet` (see §2) |
| Cards | Mantine `Paper`, raw `div`, inline-styled cards (heaviest in `DutySlotsPage.jsx` mobile cards) | `AppCard`, `MobileListItem` + primitives (`MobileList`, `MobileListItemHeader`, `MobileListItemMeta`, `MobileListItemStatus`, `MobileListItemActions`, `MobileSectionHeader`) |
| Tables/lists | `Table.jsx` (`MTable.ScrollContainer` + `whitespace-nowrap`) used inconsistently alongside dedicated mobile-card pages and column-hiding — 3 different strategies across the app today | `ResponsiveDataView` — see `docs/MOBILE_PATTERNS.md` for which pattern each data type gets |
| Page headers | `Layout.jsx` `PageHeader` — hardcoded `<Stack align="center" ... text-center>`, no variant prop exists | `PageHeader` with `operational` / `centered` / `compact` variants — see `docs/MOBILE_PATTERNS.md` |
| Icons | `@tabler/icons-react` (7 files) and `lucide-react` (9 files) both live | Tabler only |
| Confirmation | Already consolidated — `ConfirmDialog.jsx`, 11 consumers | `ConfirmDialog` (keep as-is, do not rebuild) |
| Toast/banner feedback | Already consolidated — `Toast.jsx` (single `ToastProvider`/`useToast`) and `Alert.jsx` (single tone-based banner: info/success/warning/danger/telegram) both exist as single canonical implementations | Use `Alert` instead of hand-rolled inline-styled banner `div`s — e.g. `RecordViolationModal.jsx` had 3 duplicating `Alert`'s exact styling before its Phase 2 migration |
| Buttons | Mixed: Mantine `Button` with inline `styles={{root:{minHeight:'var(--control-min)'}}}` boilerplate repeated per-call, plus raw `<button>` in places (e.g. `ResponsiveSheet`'s `cancelBtnStyle`/`primaryBtnStyle` sheet-footer buttons — deliberately kept raw/non-Mantine for that context, not migrated to `AppButton`) | `AppButton` — bakes in the 44px touch-target fix once instead of per-call, for Mantine-backed usage sites |
| Form fields | Mantine inputs used correctly but repeat gotcha-prone props per call (e.g. `comboboxProps={{ withinPortal: false }}` on every `Select` inside an overlay — see `[[mantine_select_in_drawer_gotcha]]`) | `AppSelect`/`AppTextInput`/`AppNumberInput` thin wrappers bake the gotcha fix in once |

New shared components land in `client/src/components/ui/` (where `BottomDrawer.jsx`,
`SheetModal.jsx`, `FormModal.jsx` already live) — this repo does not use a separate
`components/mobile/` tree, so Phase 2 does not introduce one.

## 4. Design tokens

`client/src/index.css` currently has **two token layers that both already exist for real
reasons** — don't collapse them into one without understanding why both are there:

- **`@theme` block** (`--color-*` names, e.g. `--color-text-primary`, `--color-surface`,
  `--color-border`) — Tailwind v4 reads only this block to generate utility classes
  (`text-text-primary`, `bg-surface`, `border-border`). This is already semantic, not raw
  palette values in most places.
- **`:root` block** (bare names, e.g. `--text-primary`, `--surface-page`, `--border`, plus the
  full `--blue-*`/`--slate-*`/`--emerald-*` etc. raw ramps) — needed for anything that isn't a
  Tailwind class: inline dynamic styles, CSS Modules, and Mantine's `mantineTheme` object in
  `client/src/App.jsx`, none of which can read Tailwind's `@theme` block directly.

**The actual problem isn't that both exist — it's that their names don't match**
(`--color-text-primary` vs `--text-primary`), so a component author has to guess which one a
given context needs, and the raw ramps (`--blue-500`, `--slate-400`, ...) are fully duplicated
between the two blocks with no naming difference at all.

**Rule going forward:**

| Context | Use |
|---|---|
| JSX `className` | Tailwind utility from `@theme` semantic tokens (`text-text-primary`, `bg-surface`, `border-border`) — never raw color utilities (`text-slate-500`) in feature code |
| Inline dynamic style, CSS Module, `mantineTheme` | `var(--text-primary)` etc. from the `:root` block |
| New raw palette value | Don't add one. Extend the semantic set (`--status-*`, `--action-*` etc.) instead — see the semantic groups below. |

Semantic token groups (target — some already exist under different names, see mapping above):

| Group | Examples |
|---|---|
| Surface | `--surface-page`, `--surface-card`, `--surface-sunken` |
| Text | `--text-primary`, `--text-secondary`, `--text-muted` |
| Border | `--border`, `--border-strong`, `--divider` |
| Action | `--brand`, `--brand-hover`, `--brand-active` |
| Status | `--color-success` / `--success-*`, `--color-warning` / `--warning-*`, `--color-danger` / `--danger-*` |
| Shape | `--radius-sm` through `--radius-sheet` |
| Elevation | `--shadow-card`, `--shadow-modal`, `--shadow-sheet` |

Phase 2+ work: as each shared component is built, use only the token names above (never a raw
hex or `blue-600`/`slate-500` Tailwind utility) so a future brand-color change is a single edit.

## 5. Prohibited patterns (effective immediately, Phase 1)

- No new direct `import` of `@radix-ui/react-dialog`, `vaul`, or `framer-motion` in
  `client/src/pages/**` or `client/src/components/**` outside `ui/ResponsiveSheet.jsx` (built
  Phase 2, 2026-07-19). Existing `BottomDrawer`/`SheetModal`/`StudentSearchOverlay` usages are
  grandfathered until their migration.
- No new `import` from `lucide-react`. Use `@tabler/icons-react`.
- No new static inline `style={{ padding: '16px', borderRadius: '12px', ... }}` objects. Inline
  `style` is for runtime-computed values only.
- **No Tailwind class built from a JS template literal or string concatenation**, e.g.
  `` `sm:max-w-[${size}px]` ``. Tailwind generates CSS by statically scanning source files for
  complete class-name strings — it does not execute your JS, so it can't see what an
  interpolated value resolves to and silently never generates the rule. The class name still
  shows up in the rendered DOM (harmless-looking on inspection), but no CSS backs it, so the
  style silently does nothing. Caught this exact bug while building `ResponsiveSheet`'s `size`
  prop (2026-07-19) before it shipped. **Fix:** compute the value in JS and apply it via inline
  `style`, gated on whatever breakpoint/condition you already have in JS (e.g. a
  `useMediaQuery` result) — never try to hand Tailwind a dynamic arbitrary-value class.
- No new raw `<button>`/`<input>` reimplementing what Mantine already provides.
- No new UI or icon library added without an explicit `CONSTITUTION.md` amendment.

## 6. Governance

- Feature code imports shared controls from `client/src/components/ui/`.
- Every new operational list screen must state its mobile rendering strategy explicitly (card,
  compact row, or scroll table) — see `docs/MOBILE_PATTERNS.md` for the decision rule.
- Destructive actions use the shared confirmation pattern — `ConfirmDialog`
  (`client/src/components/ui/ConfirmDialog.jsx`), already built, already the canonical pattern
  with 11 consumers as of 2026-07-19.
- This file and `CONSTITUTION.md` §2 must be updated together if a responsibility changes —
  `CONSTITUTION.md` is the version-numbered, enforced source of truth; this file is the detail
  behind it.
