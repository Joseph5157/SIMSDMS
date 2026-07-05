# Handoff Report

## task_id
001-auth-user-accounts / color-system audit — Fix A + Fix F, always-color stat cards, M3 accent-system expansion (surface-container utilities, page-canvas gradient, faculty dashboard + empty-state accents)

## status
complete

## completed
- **Stat cards → white/elevated surface.** After the page-canvas gradient shipped, the cool-tinted
  card fills (blue-50 #eff6ff, indigo-bg #eef2ff) blended into the cool canvas (#eef2f9) — blue and
  indigo cards nearly disappeared. Changed all colored `StatCard` accents to a white `--surface-card`
  fill; the accent now lives in the left bar + border + value color. Cards pop on the tinted canvas;
  still vibrant. Applies to both admin + SA dashboards. Confirmed via live side-by-side preview.
- **M3 accent-system expansion (3 tiers + background).**
  - *Tier 3 (enabler):* promoted the surface elevation tiers into `@theme` as
    `--color-surface-container-low/-/-high` so `bg-surface-container-*` utilities generate;
    removed the old `:root` duplicates (single source of truth); updated `StatCard` to the new
    token. Resolves item D in `specs/color-system-notes.md`. Verified `.bg-surface-container-low`
    ships and the token resolves in both light (#f4f7fd) and dark (#16213a).
  - *Background:* added `--page-canvas` — a subtle blue-tinted radial gradient (light: glow over
    #eef2f9) / flat #0f172a (dark) — applied to the app-shell main in `Layout.jsx` so white cards
    separate from the canvas. Left `--surface-page` (#f8fafc) untouched since it's reused for
    within-card headers / sunken tiles.
  - *Tier 1 (faculty dashboard):* activity-feed emojis → tonal icon circles keyed by category
    (violation red / message blue / cover indigo); upcoming-duty cards got a brand accent bar +
    blue date chip; "No duty today" tile tinted blue.
  - *Tier 2 (reports + empty states):* `EmptyState` icon now sits in a soft tonal circle; the one
    flat report tile (Unassigned Faculty) got an amber accent; Reports inner stat grids use the
    new `bg-surface-container-low` utility. (Report cards already had category-colored tiles.)
  - Client build passes clean; background verified via live preview matching the shipped values.
- **Always-color stat cards project-wide** (earlier in session, already pushed).
- **Always-color stat cards project-wide.** Product owner wanted the admin dashboard as vibrant
  as the super-admin one. Root cause: both use `StatCard` with the M3 tonal tokens, but the
  admin cards used a conditional accent (`value > 0 ? color : 'default'`), so with production
  data at 0 Pending/Cover/Flagged three cards collapsed to the neutral gray tier. Removed every
  conditional accent so each card always shows its category color; the `default` tier remains in
  `StatCard` only as a safety fallback (now unused by any page). Status meaning moves to the
  `sub` text ("All clear" / "Needs action"). Accents: Admin = Active Faculty blue / Pending amber
  / Cover Requests indigo / Flagged red; Super Admin = Total Users blue / Faculty green / Admins
  amber / Pending Approvals red. Verified via live DOM-injection preview on production; build clean.
- **Audited** the color system for Tailwind ↔ Mantine ↔ M3 inconsistency (verified against
  live production CSS at simsdms-production.up.railway.app, light + dark, desktop + mobile).
- **Fix A — indigo-tint tree-shaking bug.** `--color-indigo-tint` was declared in the `@theme`
  light block but referenced nowhere, so Tailwind v4 tree-shook the light declaration out of
  the shipped bundle while the `html.dark` override survived — leaving a token that was empty
  in light mode and `#3730a3` in dark. Removed both declarations (it was unused; `StatCard`'s
  indigo accent uses `-border`, not `-tint`) and left an inline note explaining why. Verified
  the built `dist` CSS no longer contains `--color-indigo-tint` in either mode.
- **Fix F — hardcoded-hex duplicates** replaced with tokens (all value-identical in light;
  the CreateUserDrawer title now correctly flips to `--brand` `#3b82f6` in dark instead of
  staying the too-dark `#2563eb`):
  - `CreateUserDrawer.jsx` — `text-[#2563eb]` → `var(--brand)`; `text-[#60a5fa]` → `var(--color-blue-400)`
  - `Layout.jsx` — `hover:bg-[#1e293b]` → `var(--surface-sidebar-hover)`; `hover:text-[#f1f5f9]` → `var(--text-on-dark)`
  - `UploadStudentsDrawer.jsx` — disabled `#93c5fd` → `var(--color-blue-300)`
  - `ui/BottomDrawer.jsx` — disabled `#93c5fd` → `var(--color-blue-300)`
- **Wrote `specs/color-system-notes.md`** — deferred backlog covering items B (4 names for
  success/warning), C (Mantine hand-synced second source of truth — refactor intentionally
  declined), D (M3 surface tiers not first-class utilities), E (dead duplicate raw token
  layer), plus the carried-over M3 tasks (on-color pairing docs, named type scale, indigo
  family completion) and the Tailwind tree-shaking guardrail.
- `npm run build --workspace=client` passes clean.

## failed_or_blocked
- None.

## commands_run
```
netstat -ano | grep -E ":5173|:3000"      # confirm dev server up
npm run dev                                # client (5173) + server (3000)
npm run build --workspace=client           # exit 0, clean
grep -o -- '--color-indigo-tint:[^;]*' client/dist/assets/index-*.css   # confirm removed
git diff -- client/src/index.css client/src/components/...               # review before commit
```

## constraints_discovered
- **Tailwind v4 tree-shakes unreferenced `@theme` variables.** A `--color-*` token added to
  `@theme` but never referenced (no utility class, no literal `var(--…)` in scanned source) is
  dropped from the light-mode bundle. If it also has an `html.dark {}` override (a plain rule,
  never shaken), the result is a token that is empty in light and colored in dark. **Rule:**
  reference a `@theme` color token in the same change, or don't add it. (Documented in
  `specs/color-system-notes.md`.)
- The app runs three parallel color systems (Tailwind `@theme`, dead raw `:root` ramps,
  Mantine ramps) synced by hand; they work today but are a drift risk. Details in the notes doc.

## deviations_from_constitution
- None.

## files_touched
- `client/src/index.css` — Tier 3: surface-container tiers moved to @theme; `--page-canvas` gradient token added; (earlier) removed `--color-indigo-tint` (Fix A)
- `client/src/components/Layout.jsx` — app-shell main uses `--page-canvas`; (earlier) tokenized theme-toggle hover (Fix F)
- `client/src/components/ui/StatCard.jsx` — surface-container token rename to @theme version
- `client/src/components/ui/EmptyState.jsx` — tonal icon circle
- `client/src/pages/faculty/DashboardPage.jsx` — activity tonal circles, upcoming-duty accent bars, blue tiles
- `client/src/pages/admin/ReportsPage.jsx` — accent the flat report tile; inner stat grids use bg-surface-container-low
- `client/src/pages/admin/AdminDashboardPage.jsx` — always-color the 4 stat cards (drop conditional default)
- `client/src/pages/super-admin/SuperAdminDashboardPage.jsx` — always-color Pending Approvals card
- `specs/color-system-notes.md` — marked item D resolved
- `client/src/components/CreateUserDrawer.jsx` — tokenized selected-role title + subtitle (Fix F)
- `client/src/components/Layout.jsx` — tokenized theme-toggle hover colors (Fix F)
- `client/src/components/UploadStudentsDrawer.jsx` — tokenized disabled download color (Fix F)
- `client/src/components/ui/BottomDrawer.jsx` — tokenized disabled primary-button color (Fix F)
- `specs/color-system-notes.md` — new deferred backlog doc (B, C, D, E + M3 naming tasks)

## open_questions_for_owner
- The single-source-of-truth Mantine refactor (notes item C) and the rest of the deferred
  backlog (B, D, E, M3 naming tasks) are parked in `specs/color-system-notes.md`. None are
  scheduled. Pick up only on an explicit decision — the color system works correctly as-is.
