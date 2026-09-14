# Handoff Report

## task_id
033-C / 033-D — Faculty Dashboard "Recent activity" presentation refinement (Spec 033 pilot)

## status
complete (for this step — see open_questions_for_owner for the spec-wide 033-D verdict, which is still outstanding)

## completed
- Produced 3 design proposals for the Recent Activity row (icon-chip two-line, single-line/dot, grouped-by-day rail), grounded in existing SIMS DMS primitives (`MobileList`, `Badge`, Tabler icons, `index.css` tokens) — not 21st.dev code, since the free quota was exhausted before candidates "Incident Status Timeline"/"Chrono Board" could be inspected.
- Owner selected Proposal 1 with two revisions: (1) one neutral/brand tonal icon-chip for every event type instead of a per-type accent map — status color lives only on `Badge`; (2) do not merge "Reassigned away" or pending-request sections into Recent Activity this pilot — presentation-only change to the existing feed.
- Implemented in `client/src/pages/faculty/DashboardPage.jsx`:
  - Removed the `ACTIVITY_TINT` per-type accent map; added `ACTIVITY_CHIP_BG`/`ACTIVITY_CHIP_ICON` (reuses `--color-blue-50`/`--color-blue-800`, the same pair already used by this page's "Upcoming duties" tile).
  - Replaced hand-rolled row `<div>`s with the shared `MobileList`/`MobileListItem` primitives.
  - Split each feed item's single baked `text` string into `title` (event label) + optional `detail` (instance specifics), with `timeAgo()` staying always-visible next to the title and `detail`/`Badge` on an optional second line.
  - Replaced emoji icons with `IconAlertTriangle` (violation) / `IconMail` (message) / `IconRefresh` (reassignment) at the same `size={15} stroke={1.75}` already used elsewhere on this page.
- Verified live against the running dev server/DB (`e2e.faculty@sims.test`): mobile 390×844 light + dark, desktop 1440×900 (sidebar layout) light + dark. All four render correctly.
- `npx eslint` on the changed file: clean.

## failed_or_blocked
- Could not visually verify the violation (`IconAlertTriangle`) or message (`IconMail`) row variants, or the "detail present, no Badge" branch — this faculty's seed data only produced one activity item (a reassignment). Confirmed correct by code inspection only (the same conditional structure proven live for the reassignment row).

## commands_run
```
npx eslint src/pages/faculty/DashboardPage.jsx   # clean
```
(Live verification was via chrome-devtools MCP browser automation against the running `npm run dev` client/server, not a scripted command.)

## constraints_discovered
- None new — confirmed `html.dark` class (not `prefers-color-scheme`) drives dark mode, toggled via `localStorage['app-theme']`; matches existing `client/src/lib/theme.js`.

## deviations_from_constitution
- None.

## files_touched
- `client/src/pages/faculty/DashboardPage.jsx` (Recent activity section only)
- `specs/033-21st-dev-pilot-pattern-adoption/handoff.md` (this file, new)

## open_questions_for_owner
- Spec 033's own completion criteria (§7) still need an explicit 033-D verdict (ADOPT PATTERN / ADOPT WITH CHANGES / DO NOT ADOPT) recorded in `plan.md` for this pattern before the spec is considered closed, and a decision on whether to spend further 21st.dev quota inspecting the two unconfirmed candidates ("Incident Status Timeline", "Chrono Board") or stop here since this pilot area was resolved without needing them.
- Whether to seed a violation/message fixture for this faculty account to get a live visual check of the two unverified icon/no-badge branches before final sign-off.
