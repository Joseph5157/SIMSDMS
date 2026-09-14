# Handoff Report

## task_id
033-C / 033-D — Faculty Dashboard "Recent activity" presentation refinement, and Spec 033 closure

## status
complete — Spec 033 is CLOSED. Owner recorded the 033-D verdict as **ADOPT WITH CHANGES** in
`plan.md` (21st.dev approved as a bounded pattern/inspiration source; direct component adoption
is not the default and must clear `031-21st-dev-policy.md` first).

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
- None blocking closure. Optional: whether to seed a violation/message fixture for this faculty account to get a live visual check of the two unverified icon/no-badge branches (`IconAlertTriangle`, `IconMail`) — currently confirmed by code inspection only, not a live render.
- The two unconfirmed 21st.dev candidates ("Incident Status Timeline", "Chrono Board") were never inspected (quota exhausted) and are not needed for this spec's closure; if either idea (e.g. a violation-status history timeline) is wanted later, that would be a new, separate bounded pilot under the now-ADOPTed 21st.dev workflow — not a reopening of Spec 033.
