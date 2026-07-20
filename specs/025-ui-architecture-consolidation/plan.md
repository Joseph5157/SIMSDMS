# Implementation Plan: Controlled Hybrid UI Architecture Consolidation

**Branch**: `chore/ui-architecture-phase1` | **Date**: 2026-07-19 | **Spec**: N/A (governance/refactor initiative, not a spec-kit feature spec — see Origin below)

**Input**: `Sims_Pharmacy_UI_Architecture_Phase_Documents.zip` (repo root, user-supplied 2026-07-19) — five docs: `00_Master_UI_Architecture_Roadmap`, `01_Phase_1_Standards_and_Governance`, `02_Phase_2_Shared_Component_Consolidation`, `03_Phase_3_Feature_Screen_Migration`, `04_Phase_4_Optimization_and_Enforcement`. Full content captured in memory as `ui_architecture_migration_plan_2026_07_19`.

## Origin

Not spec-kit-driven (no `spec.md`/clarify pass) — the requirements arrived pre-written and fully specified in the source zip after an independent audit confirmed the underlying problems against this codebase (BottomDrawer/SheetModal duplication comment in code, `PageHeader` hardcoded to `align="center"` with no variant prop, Mantine navbar breakpoint at `sm` while mobile/desktop card-vs-table switches happen at `md`, 9 files importing `lucide-react` vs 7 importing `@tabler/icons-react`, color ramp duplicated between `@theme` and `:root` in `index.css`). This `plan.md` exists to satisfy the project's spec-folder convention (`specs/<feature-folder>/plan.md` + `handoff.md`) so future sessions have a single place to read status, not to re-derive requirements already settled in memory.

## Summary

Do not rewrite the frontend into a single UI technology. Keep Mantine (interactive behavior/accessibility) and Tailwind (responsive layout), eliminate the *overlapping* implementations that currently do the same job differently — five overlay systems (Mantine Modal, Radix Dialog, Vaul Drawer, custom `BottomDrawer`, custom `SheetModal`), two icon libraries (Tabler + Lucide), a `PageHeader` with no variants, and a color-ramp duplicated between `@theme`/`:root` in `index.css`. Four phases, executed incrementally against production, never as a big-bang rewrite:

1. **Phase 1 (this branch)** — standards & governance only. No component code changes. Deliverables: `CONSTITUTION.md` amendment (done — v3.17), `docs/UI_ARCHITECTURE.md`, `docs/MOBILE_PATTERNS.md`, semantic token mapping, agent rules in `CLAUDE.md`, bundle + test baseline capture.
2. **Phase 2** — build canonical shared components (`ResponsiveSheet`, `AppButton`, `AppField` family, `AppCard`/`MobileListItem` primitives, `PageHeader` variants, `ResponsiveDataView`, `ConfirmAction`) standalone, one at a time, each migrated into one representative screen before wider rollout.
3. **Phase 3** — migrate feature screens in 4 traffic-priority waves (Login/Dashboard/Duty Slots/Reassignment first), one screen per PR, old patterns removed only after the new one is verified on that screen.
4. **Phase 4** — remove now-unused dependencies (Radix, Vaul, Lucide) only after a zero-usage grep confirms it's safe, add ESLint import restrictions to prevent regression, capture final bundle/accessibility numbers against the Phase 1 baseline.

**User constraint (2026-07-19): nothing from this initiative gets pushed/merged until it is fully tested and worked out.** Work happens on `chore/ui-architecture-phase1` (branched off the then-current `fix/audit-high-findings`, which was clean and up to date with `origin`); later phases will get their own branches per the "migrate one screen per PR" rule in Phase 3. No branch in this initiative is pushed to `origin` without explicit approval.

## Technical Context

**Language/Version**: React 18 (Vite) frontend only — no backend/schema/API involvement in any phase of this initiative.

**Primary Dependencies**: Mantine, Tailwind CSS v4, CSS Modules (app shell only), `@radix-ui/react-dialog` + `framer-motion` (to become internal-only to `ResponsiveSheet`), `vaul` (deprecated, Phase 4 removal candidate), `@tabler/icons-react` (kept, becomes the sole icon lib), `lucide-react` (deprecated, Phase 4 removal candidate) — all already installed, no new dependencies added in Phase 1.

**Testing**: Existing `server/tests/*.test.mjs` (unaffected — no server changes), `npm run lint --workspace=client`, `npm run build --workspace=client`, and the Playwright e2e scaffold added in `specs/024-quality-hardening-pass` (`playwright.config.js`, `e2e/login.spec.js`, `chromium` + `mobile-chrome` projects) — reused as the pre/post-change regression check per the user's "test before push" constraint. Phase 2 will need to extend e2e coverage to whatever screen each new shared component first lands on.

**Target Platform**: Same PWA (Railway-hosted), no infra changes.

**Project Type**: Existing `client/` + `server/` + root `prisma/` monolith — this initiative touches only `client/`.

**Constraints**: Business logic, API contracts, and schema must not change during any phase (pure UI-layer consolidation). Per Phase 3 source doc: "Keep API and business logic unchanged during visual migration" and "Do not combine broad UI migration with unrelated backend changes."

**Scale/Scope**: Phase 1 touches 0 component files (docs + `CONSTITUTION.md` only). Full 4-phase scope eventually touches nearly every screen in `client/src/pages` — tracked incrementally via the Phase 3 migration-tracking table, not attempted at once.

## Constitution Check

*GATE: Must pass before Phase 1 deliverables are considered complete.*

- **Tech stack**: Mantine/Tailwind roles unchanged — **PASS**. Radix/Framer Motion/Vaul/icon libraries were in production use but undocumented in §2 — **Constitution amendment required and completed this session** (v3.16 → v3.17): Radix+Framer Motion scoped internal-only to `ResponsiveSheet`, Vaul and Lucide marked deprecated, Tabler confirmed as default icon library.
- **Roles**: Not applicable — no role/permission changes.
- **UUID PKs / DECIMAL money / soft deletes**: Not applicable — no schema changes in this initiative.
- **Single source of truth**: Reinforced, not violated — this initiative's entire point is removing duplicate implementations (overlay systems, icon libraries, duplicated color tokens) in favor of single canonical ones.
- **Folder structure**: New files are `docs/UI_ARCHITECTURE.md`, `docs/MOBILE_PATTERNS.md` (new top-level `docs/` directory — did not exist before) and `client/src/components/ui/*` additions in later phases — no structural surprises.

No unjustified violations. Complexity Tracking table is not needed — this initiative *reduces* complexity by design.

## Project Structure

### Documentation (this initiative)

```text
specs/025-ui-architecture-consolidation/
├── plan.md              # This file
└── handoff.md           # Phase 1 handoff (end of this session)

docs/
├── UI_ARCHITECTURE.md   # Phase 1 Deliverable 1+2: policy + component inventory
└── MOBILE_PATTERNS.md   # Phase 1 Deliverable 4: mobile design rules
```

### Source Code (repository root)

**Structure Decision**: No new top-level source directories in Phase 1. Phase 2 will add canonical components under the existing `client/src/components/ui/` directory (where `BottomDrawer.jsx`, `SheetModal.jsx`, `FormModal.jsx` already live) rather than a new `components/mobile/` tree, since this codebase does not currently separate "mobile" and "shared" component directories and introducing that split is out of scope for what the source docs actually specify (they name components, not a directory layout).

```text
client/src/
├── index.css                          # Phase 1: token mapping documented, not changed yet
├── components/
│   ├── Layout.jsx                     # Phase 3 target: PageHeader variants, sm→md breakpoint
│   └── ui/
│       ├── BottomDrawer.jsx           # Phase 2 target: superseded by ResponsiveSheet
│       ├── SheetModal.jsx             # Phase 2 target: superseded by ResponsiveSheet
│       └── Table.jsx                  # Phase 2/3 target: ResponsiveDataView
└── pages/                              # Phase 3: wave-by-wave migration
```

## Phase 1 Deliverables Checklist

| # | Deliverable | Status |
|---|---|---|
| 1 | `CONSTITUTION.md` amendment (overlay/icon governance) | Done — v3.17 |
| 2 | `docs/UI_ARCHITECTURE.md` (policy + component inventory) | This session |
| 3 | Semantic token mapping (existing duplicated vars → semantic names) | This session, folded into `UI_ARCHITECTURE.md` |
| 4 | `docs/MOBILE_PATTERNS.md` | This session |
| 5 | Agent rules (`CLAUDE.md` addendum) | This session |
| 6 | Bundle baseline capture | This session |
| 7 | Pre-change test baseline (server tests, client lint/build, e2e login) | This session |

## Phase 1 baseline (captured 2026-07-19, `chore/ui-architecture-phase1` @ `npm run build --workspace=client`)

| Metric | Value |
|---|---|
| Main JS chunk (`index-*.js`) | 1,505.19 kB / gzip 432.73 kB |
| CSS (`index-*.css`) | 292.79 kB / gzip 46.48 kB |
| PWA precache | 28 entries, 2,357.61 KiB |
| Build warning | Main chunk exceeds the 500 kB no-code-splitting warning threshold — pre-existing, not caused by this initiative, not addressed here |

Phase 4's bundle-regression check compares against these numbers. Expect this to shrink once
Vaul/Radix (if unused post-`ResponsiveSheet`) and `lucide-react` are actually removed in Phase 4
— no size claim is made in advance of that removal.

## Phase 1 test baseline (captured 2026-07-19, `chore/ui-architecture-phase1`)

| Check | Result |
|---|---|
| `npm run test --workspace=server` | 191/191 passed, 20 files |
| `npm run lint --workspace=client` | 0 errors, 5 warnings (all pre-existing `react-refresh/only-export-components` — `BottomDrawer.jsx` ×2, `SheetModal.jsx` ×2, `Toast.jsx` ×1) |
| `npm run build --workspace=client` | Clean (see bundle table above) |
| Playwright e2e (`chromium` + `mobile-chrome`, disposable UTF8 Postgres 18, all 27 migrations applied clean) | 6/6 passed — `login.spec.js` (2 tests) + `duty-timing-settings.spec.js` (1 test), both projects |

This is the reference point every later phase's changes get compared against, per the user's
"nothing merges until tested" constraint. The 5 lint warnings are worth noting: `SheetModal.jsx`
now carries the same `react-refresh` warning `BottomDrawer.jsx` already had — direct evidence
the duplication these two components represent has already doubled the warning, not just the
code.

## Phase 2 progress (2026-07-19, branch `feat/responsive-sheet` off `chore/ui-architecture-phase1` @ 872cc6b)

`ResponsiveSheet` (`client/src/components/ui/ResponsiveSheet.jsx`) is built and has its first
representative-screen migration: `RecordViolationModal.jsx`. Full detail in
`specs/025-ui-architecture-consolidation/handoff.md`. Summary:

- `ResponsiveSheet` is `SheetModal.jsx` promoted to canonical, not a rewrite: same Radix Dialog +
  Framer Motion internals (already live-verified via the `spike/radix-sheet-modal` work), same
  `open`/`onClose`/`title`/`subtitle`/`children`/`footer` contract, plus the full spec's `size`
  (`sm`/`md`/`lg`/`xl` desktop widths — `md`=520px matches the old hardcoded value exactly, so
  every caller that omits `size` sees zero visual change), `mobileMode` (`sheet` default /
  `fullscreen`, only `sheet` has a live consumer so far), and `confirmClose` +
  `onDismissAttempt` (unsaved-change interception — implemented, not yet exercised by any
  consumer). Icon swapped from `lucide-react`'s `X` to `@tabler/icons-react`'s `IconX` per the
  Phase 1 governance rule.
- `RecordViolationModal.jsx` previously branched `if (isMobile)` between `SheetModal` (mobile)
  and a completely separate `FormModal` (desktop) — literally the anti-pattern `ResponsiveSheet`
  exists to fix. Collapsed to one unconditional `<ResponsiveSheet size="xl">` call; `FormModal`
  import removed from this file only (still used by 6 other files — not touched, not deprecated,
  it's a different, valid pattern for plain Mantine-Modal-shaped forms, out of scope here).
- **Not yet touched**: `BottomDrawer`'s other 7 consumers (`ComposeDrawer`, `StudentDetailsDrawer`,
  `ProfileDrawer`, `UploadStudentsDrawer`, `ViolationTypeDrawer`, `ReportsPage`, and
  `CreateUserDrawer` — the last one may already be dead code per the `fix/audit-high-findings`
  "drop dead CreateUserDrawer" commit, worth confirming before migrating it). `SheetModal.jsx`
  and `BottomDrawer.jsx` are both left in place — deleted only once a repo-wide search returns
  zero usages, per the migration procedure.

## Phase 2 complete (2026-07-19, same branch `feat/responsive-sheet`)

All 7 Phase 2 component line items now have a canonical implementation and at least one
representative-screen migration, per the "build once, migrate one screen, test, defer full
rollout to Phase 3" procedure. Full detail in `handoff.md`. Summary table:

| Component | Status | Representative migration |
|---|---|---|
| `ResponsiveSheet` | Built | `RecordViolationModal.jsx` (full — replaced both mobile+desktop branches) |
| `AppButton` | Built | `DutySlotsPage.jsx` mobile Reassign button |
| `AppField` (`AppSelect`/`AppTextInput`/`AppNumberInput`) | Built | `RecordViolationModal.jsx`'s 2 `Select` fields → `AppSelect` |
| `AppCard`/`MobileListItem` primitives (`MobileList.jsx`) | Built | `DutySlotsPage.jsx` mobile card list |
| `PageHeader` variants | Built (`centered` stays default — zero change for ~17 other callers) | `DutySlotsPage.jsx` → `variant="operational"` |
| `ResponsiveDataView` | Built | `DutySlotsPage.jsx` (wraps its own mobile-card/desktop-table pair) |
| `ConfirmDialog` (was going to be `ConfirmAction`) | **Already existed** — 11 consumers, no new build needed | N/A — documented as canonical instead |
| Feedback (`Alert`, `Toast`) | **`Alert`/`Toast` already existed**, consolidated | `RecordViolationModal.jsx`'s 3 hand-styled banner `div`s → `Alert` |

**Not in scope for Phase 2** (deferred to Phase 3's wave-by-wave rollout): migrating
`BottomDrawer`'s other 7 consumers, migrating every other screen's raw buttons/selects/cards to
the new primitives, the `sm`→`md` navbar breakpoint fix.

Everything is uncommitted on `feat/responsive-sheet`, per the user's "nothing merges until
tested" instruction.
