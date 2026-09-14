# 030-E — Current Visual Language and Pattern Audit

Date: 2026-09-12
Baseline: `21a7ca5f56dfd67118e6530e3f925e5607688656` on `audit/design-system-030`

Evidence priority: 030-D screenshots and raw browser results first; current source only to explain patterns visible in those screenshots. This is an observational audit, not a target design system or remediation plan.

## 1. Current visual language

SIMS DMS currently presents as a dark-navy operational shell with a light, blue-tinted mobile canvas; brand blue is the primary action/navigation color and indigo is its recurring secondary accent. The visual system is recognisable across roles through the SIMS logo, Public Sans typography, dark sidebar/white top bar, thin blue/slate borders, 14–20 px card radii, and compact status pills.

The visual language has two modes:

1. **Operational pages** — centred title/breadcrumb, sparse card/table layout, blue primary action, compact filters, and status markers. Settings, Users, Calendar, All Faculty Duties, and Audit Logs are the clearest examples.
2. **Dashboard/report catalogue pages** — the same base is augmented by prominent gradients, colour-coded stat cards, icon tiles, shadows, pills, and large collections of rounded panels. This is visually energetic, but it is where the generic dashboard-template signals concentrate.

This is not a visually random application. The recurring shell, palette, typeface, and status language make it one product. The inconsistency is one of **intensity and density**: informational screens are restrained; dashboards and Reports use several simultaneous decorative/differentiating devices.

## 2. Card and surface audit

| Route / evidence | Surface pattern | Layer count | Radius / border / elevation | Functional need | Classification |
| --- | --- | ---: | --- | --- | --- |
| Admin Dashboard, desktop dark — `030-D-admin-dashboard-desktop-1440-dark.png` | Gradient greeting hero, four metric cards, then bordered section cards and quick-action cards | 2–3 in the first viewport | Hero 20 px; cards ~14 px; borders plus light shadows/tints | Greeting and operational summaries are useful; separate cards organise different tasks | **OVERUSED** in aggregate: many equal-weight rounded surfaces compete before the main work area |
| Faculty Dashboard, desktop dark — `030-D-faculty-dashboard-desktop-1440-dark.png` | Gradient duty hero, date tiles, duty cards, stat cards, activity panel | 2–3 | 20 px hero; 14–16 px cards; hero has brand shadow | Duty/session state needs a strong primary surface | **FUNCTIONALLY JUSTIFIED** for the duty hero; **OVERUSED** for repeated card treatment below it |
| Super Admin Dashboard, desktop dark — `030-D-super-admin-dashboard-desktop-1440-dark.png` | Four accent-edge StatCards plus one activity card | 1–2 | ~14 px, border, little visible elevation | Metrics and audit activity are distinct units | **COHERENT / INTENTIONAL**; more restrained than the Admin dashboard |
| Reports, desktop dark — `030-D-admin-reports-desktop-1440-dark.png` | Primary report container, second report container, then 15 selectable report cards | 1–2 | Primary card receives a blue outline; cards use 14 px radius and border | Report selection benefits from grouping; each secondary item is actionable | **GENERIC SAAS PATTERN**: a large icon-card catalogue is visually familiar but makes a utilitarian report index feel like a feature marketplace |
| Reports, mobile light — `030-D-admin-reports-mobile-390-light.png` | Tall primary report card followed by two-column cards on tinted page canvas | 1–2 | White card, outline, rounded rectangles throughout | Controls and report categories need grouping | **OVERUSED**: repeated white rounded containers dominate the scroll experience |
| Students, mobile light — `030-D-admin-students-mobile-390-light.png` | One large white list container containing row separators; total-count footer card | 1–2 | 14 px outer card, flat internal rows | Strong scan/read structure for repeated records | **COHERENT / INTENTIONAL**; containment is carrying real list hierarchy |
| Calendar, mobile light — `030-D-admin-calendar-mobile-390-light.png` | Window-status card, date-grid card, legend card | 1–2 | 14 px white surfaces, low shadow/border | Separates scheduling status, date interaction, and legend | **FUNCTIONALLY JUSTIFIED**; modest extra containment in the legend |
| Settings, desktop dark — `030-D-admin-settings-desktop-1440-dark.png` | Tabs plus two session cards on mostly open canvas | 1–2 | 14 px bordered cards; no prominent decorative shadow | Two session configurations are natural groups | **COHERENT / INTENTIONAL** |
| Reassign modal, mobile — `030-D-direct-mantine-modal-duty-slots-mobile-412-light.png` | One elevated dialog containing an inner duty-summary panel | 2 | Outer ~12 px; inner ~12 px tinted/bordered summary | Inner card separates immutable context from editable fields | **FUNCTIONALLY JUSTIFIED** nested card |

Source corroboration: `.card` applies border, 14 px radius, and `--shadow-card`; radius tokens range from 6 px to 28 px in `client/src/index.css`. `StatCard` has 23 consumers, while Reports defines 15 secondary report cards (030-B inventory). The rendered evidence does not show decoration-only cards on the operational record-list pages; the concern is concentrated in dashboard/report density, not cards generally.

## 3. Gradient audit

| Rendered route / source | Gradient / prominence | Repetition | Purpose | Classification |
| --- | --- | --- | --- | --- |
| Faculty Dashboard duty hero — `030-D-faculty-dashboard-desktop-1440-dark.png`, `030-D-faculty-dashboard-mobile-390-light.png` | Deep blue→indigo 135° panel; full-width dominant element; translucent circle at upper right | One primary hero per active duty session | Makes the currently actionable duty unmistakable; separates check-in action from history | **FUNCTIONALLY JUSTIFIED** brand/state use, with one mild generic decoration signal from the circle |
| Admin Dashboard greeting — `030-D-admin-dashboard-desktop-1440-dark.png`, `030-D-admin-dashboard-mobile-390-light.png` | Blue→indigo full-width greeting strip | One per dashboard | Greeting/identity rather than a direct task state | **GENERIC SAAS PATTERN**; it is attractive and coherent but operational value is lower than the Faculty duty hero |
| Login — `030-D-unauthenticated-login-desktop-1440-dark.png`, `030-D-unauthenticated-login-mobile-390-light.png` | Radial blue/indigo background glows; brand-gradient submit button | Two background glows plus CTA | Establishes identity and focuses sign-in | **COHERENT / INTENTIONAL**; the sparse auth page prevents it from becoming busy |
| App-wide canvas — light mobile screenshots such as `030-D-admin-calendar-mobile-390-light.png` | Soft radial blue tint behind white content | Broad shell use | Keeps white cards separate from page background | **COHERENT / INTENTIONAL**; subtle enough to function as depth, not hero decoration |

The source records 40 gradient references across 13 files, but rendered screenshot evidence supports only a small number of high-prominence uses. There is no evidence of gradients being used indiscriminately on every operational page.

## 4. Color and accent audit

### Meaningful, coherent colour use

- **Blue** consistently marks primary navigation, active tabs, primary buttons, selected dates, links, and scheduled/informational state. See the selected sidebar/primary report outline in `030-D-admin-reports-desktop-1440-dark.png` and mobile bottom navigation in `030-D-admin-calendar-mobile-390-light.png`.
- **Emerald, amber, red, and indigo** mostly communicate status/count differences: completed/active, pending/warning, flagged/approval, and reassignment. The calendar’s Open/Close controls and All Faculty Duties completion/scheduled badges are legible examples (`030-D-admin-calendar-mobile-390-light.png`, `030-D-faculty-all-duties-mobile-390-light.png`).
- **Slate/navy** creates stable hierarchy: shell < page canvas < card surface in both themes. Settings demonstrates the restrained version of this language (`030-D-admin-settings-desktop-1440-dark.png`).

### Accent overload locations

Admin Dashboard combines indigo gradient, blue active-faculty card, amber pending card, indigo reassignment card, red flagged card, green/blue/slate attendance cells, purple reassignment pill, and blue/purple quick-action tiles in its first mobile viewport (`030-D-admin-dashboard-mobile-390-light.png`). Every hue has a local label, but the screen uses colour both for semantic state and for card identity. That weakens the distinction between alerting colour and decoration.

Reports repeats the same issue at lower severity: 15 secondary cards use different coloured emoji/icon tile backgrounds while section headings, cards, primary report outline, buttons, and report modes also use blue (`030-D-admin-reports-desktop-1440-dark.png`). The colours differentiate report categories but do not encode a stable cross-product taxonomy visible to a user.

**Assessment:** status colour semantics are mostly consistent; arbitrary category colour is a **GENERIC SAAS PATTERN** on dashboards/Reports, not a general application-wide failure.

## 5. Typography hierarchy audit

Public Sans is consistently rendered for interface text, with DM Mono reserved for IDs/dates/numbers in tables. Across role shells, centred `PageHeader` titles (Reports, Settings, Users) are large/bold with muted subtitles; record data uses a smaller, compact hierarchy; and sidebar labels are deliberately subdued. This is coherent in `030-D-admin-users-desktop-1440-dark.png`, `030-D-admin-settings-desktop-1440-dark.png`, and `030-D-faculty-all-duties-mobile-390-light.png`.

Observed changes without a clear task hierarchy:

- Admin Dashboard uses a compact white greeting inside a gradient hero, Faculty Dashboard uses a large black greeting on the canvas, and Super Admin uses a conventional page title. All three are understandable, but they establish three different dashboard header metaphors (`030-D-admin-dashboard-desktop-1440-dark.png`, `030-D-faculty-dashboard-desktop-1440-dark.png`, `030-D-super-admin-dashboard-desktop-1440-dark.png`). **INCONSISTENT**, low operational impact.
- Metric typography is sometimes numeric (appropriate), but Faculty’s “Most Common” category name is treated with the same oversized StatCard value language and truncates on mobile (`030-D-faculty-dashboard-mobile-390-light.png`; also 030-D issue 05). **INCONSISTENT**, medium impact because category meaning is lost.
- Reports uses small all-caps labels, headline titles, descriptive copy, button labels, and dense table headers simultaneously. The hierarchy remains readable on desktop but is crowded at 390 px (`030-D-admin-reports-mobile-390-light.png`). **MIXED**, medium operational impact.

## 6. Radius, shadow, and elevation audit

Facts first: visible UI spans 6/8 px control geometry, ~12–14 px inputs/cards, 16–20 px heroes/large cards, 28 px mobile sheets/login sheet, and full pills. This is a coherent *family* rather than unrelated shapes; no screenshot shows sharp rectangles beside extreme “bubble” surfaces.

The visual issue is frequency, not a divergent radius language. Dashboards and Reports repeatedly place 14–20 px rounded cards inside a blue-tinted canvas, with internal rounded cells, icon tiles, chips, and buttons. Faculty Dashboard’s duty hero additionally places a full pill and an inner rounded button inside a 20 px rounded panel. This is a **PROBABLE AI-SLOP SIGNAL** only at the repeated-screen level: rounded-card accumulation, not any individual radius.

Elevation is generally semantic:

- sidebar/header are stable shell planes;
- ordinary cards use a border with low shadow;
- modal/sheet is visibly elevated above a dimmed page;
- hero and primary CTA get the stronger blue shadow.

The card border + shadow + tinted page combination is visually busy in the mobile Admin Dashboard and Reports catalogue, but it remains restrained in Settings, Users, Calendar, and list pages. **OVERUSED** in the first two; **COHERENT / INTENTIONAL** elsewhere.

## 7. Pills, badges, iconography, and emoji

### Pills and badges

Status badges are operationally valuable: Completed/Scheduled/Reassigned/Active/Open map quickly to duty and record states. Their compact pill shape works well in `030-D-faculty-all-duties-mobile-390-light.png`, `030-D-admin-users-desktop-1440-dark.png`, and the reassign dialog.

Pill-like treatment becomes noisier where it is used for non-status metadata: the Admin Dashboard’s “0 checked in” indicator, Faculty dashboard date cells, report modes, and Messages’ “New chat-style experience coming soon” chip (`030-D-admin-dashboard-desktop-1440-dark.png`, `030-D-faculty-dashboard-mobile-390-light.png`, `030-D-admin-messages-mobile-390-light.png`). The Messages chip is especially generic/placeholder-like because it is announcement copy inside a chat product surface, not a user task. **GENERIC SAAS PATTERN**, low severity.

### Icons and emoji

Tabler is visually consistent in shell navigation, controls, form affordances, and status context. The SIMS logo makes the auth and shell identity specific rather than generic. Emoji are a second visual voice:

- small emoji in Reports card tiles and super-admin stat labels;
- emoji in Faculty hero/activity icons and quick actions;
- arrows/symbols in “View all” links and exported actions.

Emoji work as quick category cues in sparse contexts (Faculty activity, selected report tile), but Reports uses 15 different emoji/colour tile combinations and Super Admin puts emoji directly in metric labels. This mixes Tabler’s outline vocabulary, emoji’s filled/multicolour vocabulary, and coloured icon containers. **INCONSISTENT** visually, but mostly low operational impact. The repeated Reports catalogue is a **PROBABLE AI-SLOP SIGNAL** because emoji plus arbitrary tile colour plus card repetition appears 15 times.

## 8. Forms, controls, and overlays

### Controls

The rendered result is more consistent than the source implementation diversity suggests. Native report filters, Mantine selects, and AppSelect share white/slate fill, thin blue/slate border, rounded 8–12 px geometry, and compact labels. The difference is usually subtle, not visibly incompatible.

The exception is Reports, where a dense cluster of native selects, mode buttons, export buttons, and a table mixes 37–40 px controls in a narrow card (`030-D-admin-reports-mobile-390-light.png`). This is primarily density and touch-size evidence already recorded by 030-D; visually it reads as a control wall. **INCONSISTENT** at the page composition level, not proof that any one input primitive is visually wrong.

The Login form is intentionally different: larger 56 px controls and sheet-like mobile composition establish a clear one-task auth experience (`030-D-unauthenticated-login-mobile-390-light.png`). **COHERENT / INTENTIONAL** exception.

### Overlays

ResponsiveSheets, FormModal, ConfirmDialog, direct Mantine Modal, and menus share white/slate surface, crisp header separation, outlined fields, blue primary action, and a stronger elevation layer. The reassign modal (`030-D-direct-mantine-modal-duty-slots-mobile-412-light.png`) is visually coherent: the context card, form spacing, and action footer clearly separate read-only duty facts from the action.

Reports secondary sheet (`030-D-reports-secondary-sheet-mobile-390-light.png`) is the exception: the sheet’s radius/elevation is coherent, but its desktop-width table is visibly clipped. That remains 030-D’s objective usability defect; visually, the sheet itself is not an AI-slop signal.

## 9. Tables, lists, and state patterns

Tables and mobile cards largely feel related through blue/slate headers, thin dividers, compact metadata, and the same status pill language. All Faculty Duties has a particularly successful transformation: desktop uses a dense table, while mobile becomes date-grouped duty cards with AM/PM labels and statuses (`030-D-faculty-all-duties-desktop-1440-dark.png`, `030-D-faculty-all-duties-mobile-390-light.png`). **COHERENT / INTENTIONAL**.

Students mobile cards retain an operational list rhythm with row separators rather than making every row an independent floating card (`030-D-admin-students-mobile-390-light.png`). This is an appropriate dense pattern. Violations mobile cards are readable but extremely long because the analytics dashboard, filters, charts, heatmap, record controls, and records all remain on one visual journey (`030-D-admin-violations-mobile-390-light.png`). **OVERUSED** surface/section accumulation, medium operational impact.

030-D did not capture a true empty/error result; it did capture loading/normal surfaces and a non-working forced-state harness. Therefore no visual conclusion about general EmptyState, ErrorBlock, or retry cohesion is claimed beyond the static evidence of parallel implementations. Skeletons/alerts are visible only incidentally and are not sufficient for a cross-product visual judgment.

## 10. Motion audit

Source evidence identifies short control transitions, active press scaling, `fadeSlideIn`, spinner motion, StatCard number tweening, and Radix/Framer sheet/dialog transitions. The 030-D screenshots cannot measure duration or frequency, but they confirm overlays use motion-capable sheet/modal presentation and that the static UI is not animation-dominated.

| Motion | Current role | Classification |
| --- | --- | --- |
| Sheet/dialog entrance and drag | Establishes modality and mobile gesture affordance | **FUNCTIONALLY JUSTIFIED** |
| Spinner/loading motion | Communicates work in progress | **FUNCTIONALLY JUSTIFIED** |
| Button press/hover transitions | Small interaction feedback | **FUNCTIONAL** |
| StatCard count tween | Cosmetic attention draw for metrics; no screenshot evidence of harm | **DECORATIVE; NEEDS PRODUCT DECISION** if future operational density review considers it distracting |
| Hero/card hover lift/shadow emphasis | Present in component/source styles; not directly demonstrated in static screenshots | **NOT ASSESSED VISUALLY** |

No conclusion that motion is excessive is supported by the captured evidence.
