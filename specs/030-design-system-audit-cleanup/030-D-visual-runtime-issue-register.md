# 030-D — Visual and Runtime Issue Register

Date: 2026-09-12

This register distinguishes browser-confirmed observations from static suspicions, non-reproductions, and coverage gaps. It does not authorize remediation.

| ID | Classification | Evidence | Current behavior / impact |
| --- | --- | --- | --- |
| 030-D-01 | Browser-confirmed | 32 React console errors, all at `/admin/dashboard`, split equally between “`p` cannot contain nested `div`” and the matching descendant/hydration warning | Admin Dashboard renders invalid paragraph/div nesting. The client-rendered page remained usable in this run, but React explicitly warns of hydration risk and invalid HTML. |
| 030-D-02 | Browser-confirmed | Form modal at 639/640/641 and ConfirmDialog at 390 all reported `focusReturned: false`; Mantine Menu and direct Mantine Modal reported `true` | Escape closed the tested shared form/confirmation overlays, but focus did not return to their launch control in four scenarios. Keyboard continuity is inconsistent by overlay implementation. |
| 030-D-03 | Browser-confirmed | Reports secondary sheet screenshots at 360/390/639; table widths 606–612 px inside narrower viewports, detected overflow container `overflowX: visible`; visible columns clipped in screenshots | Secondary-report tables are wider than the mobile sheet and are clipped rather than presenting a clearly discoverable horizontal-scroll surface. At 640 inline, table right edges also exceeded the viewport by 5–10 px while root overflow remained hidden. |
| 030-D-04 | Browser-confirmed, heuristic-qualified | Primary captures found sub-44 px targets on all authenticated routes. Many are hidden sidebar duplicates, but visible Reports controls were 37–40 px high and the breadcrumb link was 36×16; logout measured 42×37 | The global count has false-positive reach because off-viewport shell nodes remain measurable. Visible raw/native Reports controls nevertheless confirm touch targets below the 44 px heuristic. |
| 030-D-05 | Browser-confirmed | Truncation metric triggered on 7 route states: Faculty Dashboard (mobile/desktop), Admin Dashboard mobile, Admin Duty Slots mobile, Admin Violations mobile/desktop, Super Admin admin-dashboard mobile | Long violation names, reassignment names, and the Super Admin greeting are clipped/ellipsized. Some compact-card truncation appears intentional, but touch users have no browser-confirmed expansion mechanism in this audit. |
| 030-D-06 | Browser-confirmed | Admin mobile Dashboard screenshot | The fixed 60 px bottom navigation overlays the scrolling document while flagged-violation content continues behind it. Page padding prevents the final page end from being permanently hidden, but content can sit beneath the bar during scrolling. |
| 030-D-07 | Browser-confirmed | Nested student search: two dialogs simultaneously; outer remained open after one Escape; screenshot shows the nested search above the outer workflow | Nested overlay stacking and one-level Escape dismissal work. The immediate geometry sample caught the second sheet during motion (`y=826`, height 844), so final position should be taken from the screenshot, not that transient metric. |
| 030-D-08 | Browser-confirmed | 767/768 checks on Faculty All Duties, Admin Students, Admin Violations, and Admin Duty Slots | All four surfaces switch coherently from card/mobile output at 767 to table output at 768 with no document-level overflow. This reconciles the earlier static breakpoint suspicion as current intentional behavior, not a reproduced defect. |
| 030-D-09 | Browser-confirmed | Invalid-login scenario plus 10 login-page 401 console errors | Invalid credentials displayed the expected error. Unauthenticated `/users/me` probes produced 401 console resource errors during login loads; these were expected auth probes in this environment, not failed page navigation. |
| 030-D-10 | Browser-confirmed | Offline banner screenshot at 390 dark | Offline state is visible above the page, readable in dark mode, dismissible, and does not create horizontal overflow. No sync mutation was submitted, so queued-sync behavior was not tested. |
| 030-D-11 | Not reproduced | All 58 route captures | No root-document horizontal overflow, nameless visible interactive, route crash, failed primary navigation, or dark-theme unreadability severe enough to prevent task comprehension was reproduced. |
| 030-D-12 | Blocked/untestable | Five hidden/off-viewport selector failures | Faculty bottom-nav activation, notification dropdown keyboard dismissal, and Profile ResponsiveSheet behavior at 390/639/640 remain unverified. The failures identify harness ambiguity, not product failure. |
| 030-D-13 | Blocked/untestable | Forced Students error and empty checks had false semantic assertions | Safe error and true empty-state rendering remain unverified because the request interception pattern did not match the runtime endpoint. |
| 030-D-14 | Browser-confirmed current-route mismatch | `/admin/duty-timing-settings` redirected to Admin Dashboard and did not show the afternoon session | Existing E2E/static expectations that treat this as a live page route are stale relative to the current `/admin/settings` surface. Documentation truth belongs to 030-F; no correction was made here. |
| 030-D-15 | Browser-confirmed label/assertion mismatch | Super Admin navigation reached `/admin/users`, but the check for text “User Management” was false | Navigation works; the old expected heading is not present. This is evidence for later test/document truth review, not proof that the page is inaccessible. |

## Runtime-event reconciliation

The 410 recorded events reduce to three meaningful groups:

- 368 service-worker registration warnings deliberately emitted because Chromium contexts used `service_workers="block"`; audit-environment noise.
- 32 invalid-nesting console errors on Admin Dashboard; product finding 030-D-01.
- 10 401 resource errors on unauthenticated Login; expected auth-probe behavior in this run.

No request-failed events, page exceptions, or HTTP errors on authenticated primary-route traversal were recorded in the successful run.

## Static-versus-browser reconciliation

- The static concern about 767/768 dual render trees was exercised on four data surfaces and transitioned coherently without root overflow.
- The static concern about report tables was confirmed in responsive secondary-report views: the tables remain desktop-width and visually clip inside the sheet/inline container.
- Overlay implementations are not behaviorally identical: Mantine Menu/Modal restored focus, while the tested FormModal/ConfirmDialog paths did not.
- ResponsiveSheet could not be treated as universally verified: report and nested-search sheets rendered, but the Profile sheet scenarios were blocked by selector ambiguity.
- No architecture classification or visual-style judgment was made; those remain for separately authorized later phases.
