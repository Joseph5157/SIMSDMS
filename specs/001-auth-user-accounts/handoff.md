# Handoff Report

## task_id
001-auth-user-accounts / color-system audit — Fix A (indigo-tint tree-shaking) + Fix F (hardcoded-hex duplicates) + always-color stat cards

## status
complete

## completed
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
- `client/src/pages/admin/AdminDashboardPage.jsx` — always-color the 4 stat cards (drop conditional default)
- `client/src/pages/super-admin/SuperAdminDashboardPage.jsx` — always-color Pending Approvals card
- `client/src/index.css` — removed both `--color-indigo-tint` declarations; added explanatory note (Fix A)
- `client/src/components/CreateUserDrawer.jsx` — tokenized selected-role title + subtitle (Fix F)
- `client/src/components/Layout.jsx` — tokenized theme-toggle hover colors (Fix F)
- `client/src/components/UploadStudentsDrawer.jsx` — tokenized disabled download color (Fix F)
- `client/src/components/ui/BottomDrawer.jsx` — tokenized disabled primary-button color (Fix F)
- `specs/color-system-notes.md` — new deferred backlog doc (B, C, D, E + M3 naming tasks)

## open_questions_for_owner
- The single-source-of-truth Mantine refactor (notes item C) and the rest of the deferred
  backlog (B, D, E, M3 naming tasks) are parked in `specs/color-system-notes.md`. None are
  scheduled. Pick up only on an explicit decision — the color system works correctly as-is.
