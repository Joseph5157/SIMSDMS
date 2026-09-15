# Handoff Report

## task_id
038-faculty-dashboard-glance-stats / Mobbin-inspired faculty dashboard enhancements

## status
complete

## completed
- Reviewed faculty `DashboardPage.jsx` and cross-referenced against Mobbin screens (Deel, Jobber,
  Remote Global HR, DoorDash Dasher, Grab Driver, Air NZ) for a comparable staff/attendance
  dashboard. Confirmed the hero check-in card, 7-day strip, and accept/reject reassignment cards
  already match or exceed those reference patterns — no changes made there.
- Added a compact "at-a-glance" stat row (existing `StatCard` component, `tonal compact`) directly
  below the today's-duty hero: "This month" violations logged (click → `/faculty/violations`) and
  "Requests" awaiting the faculty's response (click → smooth-scrolls to the existing
  `PendingReassignmentRequests` section). Previously this data only surfaced in
  `MyViolationsSummary` near the bottom of the page.
- Made the "Recent activity" feed rows tappable (violation → `/faculty/violations`, message →
  `/faculty/messages`, reassignment → `/faculty/slots`), with a trailing chevron affordance.
- Fixed `MobileListItem` (`client/src/components/ui/MobileList.jsx`) to add `role="button"`,
  `tabIndex`, and `onKeyDown` (Enter/Space) whenever `onClick` is passed — it previously only set
  `cursor: pointer` with no keyboard/AT support. Needed because this task is the first place an
  `onClick` is passed to this shared component.
- Verified: `npx eslint` clean on both changed files; `npm run build` (client) succeeds.
- Live-verified in a real browser (Playwright MCP, 430×900 mobile viewport) against the local dev
  stack (`sims-dms-postgres` on :5434, `npm run dev`), logged in as `e2e.faculty@sims.test`:
  - Stat row renders correctly at 0/0 for this seed account; "This month" tile is a real
    `role=button` and navigates to `/faculty/violations` on click.
  - "Requests" tile correctly has no `onClick` (not a button) when its count is 0.
  - Recent-activity "Duty reassigned" row is a real `role=button` and navigates to
    `/faculty/slots` on click.
  - No new console errors (only the pre-existing pre-login 401 on `/users/me` and the React
    DevTools info line).

## failed_or_blocked
- None.

## commands_run
```
docker start sims-dms-postgres
npm run dev   (workspace root; backgrounded, later stopped)
cd client && npx eslint src/pages/faculty/DashboardPage.jsx src/components/ui/MobileList.jsx
cd client && npm run build
```

## constraints_discovered
- `usePendingReassignmentRequests()` and `useMyViolations({ limit: 100 })` were already used
  elsewhere on the same page tree (`PendingReassignmentRequests`, `MyViolationsSummary`) — calling
  them again in `DashboardPage.jsx` with identical query keys dedupes via React Query, so this adds
  no extra network requests in practice.
- The inbox endpoint (`GET /messages/inbox`) has no unread-specific count — only a `total` across
  all messages. An "unread messages" stat tile was considered and dropped rather than adding a
  backend change out of scope for this task.

## deviations_from_constitution
- None. No new UI/icon libraries; reused `StatCard`, `MobileList`, Tabler icons, and existing
  design tokens throughout.

## files_touched
- `client/src/pages/faculty/DashboardPage.jsx`
- `client/src/components/ui/MobileList.jsx`

## open_questions_for_owner
- None — ready to merge once reviewed.
