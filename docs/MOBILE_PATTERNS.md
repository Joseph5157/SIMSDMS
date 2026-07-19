# Mobile Design Patterns

> Companion to `docs/UI_ARCHITECTURE.md`. Defines the mobile-specific rules for a PWA used on
> phones with variable network quality. Backed by `CONSTITUTION.md` §2.

## Breakpoints

**Current state (confirmed 2026-07-19):** `client/src/components/Layout.jsx` switches the
Mantine `AppShell` navbar (desktop sidebar → mobile hamburger) at `sm` (~640px), but most
page-level mobile-card-vs-desktop-table switches (e.g. `DutySlotsPage.jsx`'s
`md:hidden`/`hidden md:block` pair) happen at `md` (~768px). Between 640–768px, a device can get
the **desktop sidebar** (eating horizontal space) at the same time as **mobile-card content** —
the two systems disagree.

**Rule:** the navbar breakpoint moves to `md` in Phase 3 (`Layout.jsx` `navbar={{ breakpoint:
'md', ... }}`) so both systems agree on the same cutoff. This is a Phase 3 change (touches the
live app shell on every screen) — not done in Phase 1.

- Mobile bottom navigation: below 768px (`md`)
- Desktop sidebar: 768px (`md`) and above
- Tablet-specific layout adjustments: 768–1024px, only where content genuinely benefits from a
  two-column treatment — don't force it

## Design-from-mobile-up

Design and test from 360px width upward, not down from desktop. Test viewports: **360px, 390px,
412px, 768px, 1024px**.

## Touch targets

Primary touch targets are at least 44×44px. (Already enforced globally via `--control-min` on
Mantine `Button` — see the 2026-07-11 touch-target hardening pass. New components must not
regress this.)

## Overlay pattern: sheet vs. full-screen

- Short contextual task (confirm, quick filter, single-field edit) → `ResponsiveSheet` in sheet
  mode.
- Long workflow (multi-step form, search-and-select) → `ResponsiveSheet` in full-screen mobile
  mode, centered dialog on desktop.
- Sticky footers (form actions, confirm/cancel) include safe-area padding
  (`env(safe-area-inset-bottom)`) and stay keyboard-safe — don't let the soft keyboard cover the
  active field or the action row. See the existing `useKeyboardInset` hook pattern
  (`docs/UI_ARCHITECTURE.md` links the components once `ResponsiveSheet` exists).

## PageHeader variants (Phase 3 — not built yet)

`Layout.jsx`'s `PageHeader` currently has exactly one look: centered title/subtitle with the
action stacked underneath (`<Stack align="center" ... className="text-center">`, no `variant`
prop). Target: three variants.

| Variant | Use | Layout |
|---|---|---|
| `operational` (default for management screens) | Duty Slots, Users, Students, Violations, etc. | Left-aligned title + subtitle, compact action on the right, no forced centering |
| `centered` | Onboarding, empty states, major summary screens | Current behavior, kept as an explicit opt-in |
| `compact` | Nested/detail screens with limited vertical space | Minimal header, no subtitle row |

## Table-to-card mobile strategy

The app currently has **three different mobile table strategies** in use at once (dedicated
mobile card list, e.g. `DutySlotsPage.jsx`; column-hiding; and full horizontal scroll via
`Table.jsx`'s `MTable.ScrollContainer` + `whitespace-nowrap`, used inconsistently on 6 files
including `DutySlotsPage.jsx`, `DashboardPage.jsx`, `SuperAdminDashboardPage.jsx`). Pick by data
type, not by page:

| Data type | Mobile pattern | Desktop pattern |
|---|---|---|
| Operational task list (Duty Slots, Users) | Compact cards or tappable list rows | Table or split view |
| Approval queue (Reassignment Requests) | Card with visible primary actions | Table with row actions |
| Simple 2–3 column reference list | Keep as list/table | Table |
| Comparison/report table | Summary cards + optional scrollable table | Full table |
| Large analytical report | Mobile summary + drill-down | Charts + detailed table |
| Record detail | Stacked sections | Two-column detail layout |

`ResponsiveDataView` (Phase 2) encodes this: `<ResponsiveDataView mobileRender={...}
desktopRender={...} />` per screen, chosen from the table above at migration time — not
reinvented per page.

## Typography scale

Confirmed 2026-07-19: arbitrary `text-[Npx]` values (10px, 11px, 12px, 13px, 13.5px) are spread
across 6 files (`LoginPage.jsx`, `DutyTimingSettingsPage.jsx`, `DutyTimingSettingsModal.jsx`,
`Layout.jsx`, `StatCard.jsx`, `Table.jsx`). Target scale — use these, not arbitrary values, when
touching a screen in Phase 3:

| Role | Size |
|---|---|
| Page title | 20px |
| Section title | 15–16px |
| Card title | 14px |
| Body | 14px |
| Supporting text | 12px |
| Navigation label | 11px |
| Table label | 11px |

Never go below 12px for body content.

## Required states per screen

Every list/data screen must handle: loading (skeleton), empty, error + retry, offline, and
(where applicable) sync status. These already exist as components in the app — reuse them, don't
rebuild per-screen.

## What NOT to do

- Don't rely on `:hover` for anything a touch user needs (no hover-only reveal of actions).
- Don't let the soft keyboard hide the active field or the primary action — see the existing
  `useKeyboardInset` / `repositionInputs={false}` fixes already shipped for this exact bug class.
- Don't silently discard in-progress form data on accidental back-navigation or a network error.
