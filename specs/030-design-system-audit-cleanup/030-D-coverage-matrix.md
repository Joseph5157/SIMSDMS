# 030-D — Browser Coverage Matrix

Date: 2026-09-12

Baseline: `21a7ca5f56dfd67118e6530e3f925e5607688656` on `audit/design-system-030`

Raw evidence: [`evidence/030-D/030-D-browser-results.json`](./evidence/030-D/030-D-browser-results.json)

## 1. Run summary

| Evidence | Result |
| --- | ---: |
| Route/state captures | 58 verified |
| Screenshot files | 82 |
| Interaction scenarios | 34 total: 29 executed, 5 not verified |
| Runner failures | 0 |
| Root-document horizontal overflow in the 58 route captures | 0 |
| Nameless visible interactive elements in the 58 route captures | 0 |
| Runtime events | 410: 368 expected Playwright service-worker warnings, 42 console errors |

Every primary route below was captured at 390×844 light and 1440×1000 dark. This produces 29 state/route pairs × 2 = 58 captures. Additional interaction evidence covers 360, 412, 639, 640, 641, 767, 768, 1024, and 1280 widths.

## 2. Route matrix

| Role/state | Routes captured | 390 light | 1440 dark |
| --- | --- | --- | --- |
| Unauthenticated | `/login` | Verified | Verified |
| Faculty | Dashboard, My Slots, All Faculty Duties, Attendance, Student Violations, Messages, Notifications, Change Password | 8/8 | 8/8 |
| Admin | Dashboard, Users, Students, Calendar, Duty Slots, Live Attendance, Student Violations, Flagged Violations, Reports, Messages, Settings, Notifications, Change Password | 13/13 | 13/13 |
| Super Admin | Dashboard, Audit Logs, and admin-equivalent Dashboard, Users, Reports, Settings | 6/6 | 6/6 |

All requested primary routes reached their expected final URL. The obsolete `/admin/duty-timing-settings` route was separately exercised and redirected to `/admin/dashboard`; the current settings surface remained `/admin/settings`.

## 3. Responsive-boundary matrix

| Width | Scenario | Browser result |
| ---: | --- | --- |
| 360 | Reports secondary-report sheet | Bottom sheet rendered; report table content was clipped horizontally within the sheet |
| 390 | Full route matrix; navigation; dialogs; nested search; reports; offline banner | Covered in both the primary matrix and focused interactions |
| 412 | Direct Mantine duty-reassignment modal | Dialog rendered and Escape returned focus |
| 639 | Responsive form; Reports secondary report | Form used a full-height side sheet; report used a bottom sheet |
| 640 | Responsive form; Reports secondary report | Form still used the full-height side sheet; report switched to inline content |
| 641 | Responsive form | Form switched to centered modal |
| 767 | Faculty All Duties, Students, Violations, Duty Slots | Mobile/card renderers; zero tables and no root overflow |
| 768 | Same four data surfaces | Desktop/table renderers; tables present and no root overflow |
| 1024 | Faculty All Duties | Table rendered without root overflow |
| 1280 | Mantine menu | Keyboard navigation and Escape/focus return exercised |
| 1440 | Full route matrix | All 29 route/state pairs in dark theme |

The 640/641 form cutoff, 639/640 report cutoff, and 767/768 data-view cutoff are browser-confirmed current behavior. They are recorded as architecture evidence, not judged or changed here.

## 4. Interaction matrix

Browser-executed scenarios included invalid login; nested student search; mobile navigation Escape/focus; theme switching; responsive form modal boundaries; confirmation dialog; Mantine menu; direct Mantine modal; responsive Reports sheet/inline behavior; custom Reports search; Students/Violations/Duty Slots responsive boundaries; stale-route behavior; offline banner; and Super Admin navigation.

Five scenarios were **not verified**, all because the audit selector resolved a hidden/off-viewport duplicate rather than the intended visible control:

1. Faculty bottom-navigation click (`.last` selected the off-viewport sidebar link).
2. Notification dropdown (the first matching bell was hidden).
3. Profile sheet at 390.
4. Profile sheet at 639.
5. Profile sheet at 640 (the profile selector resolved the off-viewport sidebar user card).

These are coverage gaps, not browser-confirmed product failures. No test-support change was made because this phase did not separately authorize one.

Two forced Students states were also attempted but are unproven: the interception pattern targeted `/api/students`, while this runtime requests `/students`, so the error and empty payloads were not installed. Their raw scenario records completed but their semantic checks were false (`errorText: false`; seeded rows still present in the alleged empty state).

## 5. Evidence index

- Raw structured run: [`030-D-browser-results.json`](./evidence/030-D/030-D-browser-results.json)
- Screenshots: [`evidence/030-D/screenshots`](./evidence/030-D/screenshots)
- Runner: [`tooling/030-D-browser-audit.py`](./tooling/030-D-browser-audit.py)
- Deterministic seed: [`tooling/030-D-seed-audit-db.mjs`](./tooling/030-D-seed-audit-db.mjs)
- Runtime launcher: [`tooling/030-D-start-audit.ps1`](./tooling/030-D-start-audit.ps1)

No traces were generated. Screenshots and JSON metrics are the phase evidence.
