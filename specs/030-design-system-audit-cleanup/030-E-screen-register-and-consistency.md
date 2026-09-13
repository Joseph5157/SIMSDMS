# 030-E — Screen Register, AI-Slop Signals, and Cross-Application Consistency

Date: 2026-09-12

The “slop level” is a visual-language diagnostic, not a quality score or remediation order. A level is assigned only where the 030-D screenshots show several repeated signals together.

## 1. Dashboard comparison

| Dashboard / screenshot | Visual strengths | Repeated/generic signals | Slop level | Operational impact | Classification |
| --- | --- | --- | ---: | --- | --- |
| Admin — `030-D-admin-dashboard-desktop-1440-dark.png`; `030-D-admin-dashboard-mobile-390-light.png` | Strong scan of faculty, attendance, reassignment, and flagged work; clear action links; status colour is legible | Gradient greeting; four differently tinted metric cards; several bordered cards; status pills; coloured quick-action icon tiles; mobile bottom bar overlays reading area | 2 — Noticeable | Medium: colour and card weight compete with urgent content; page remains understandable | **OVERUSED / GENERIC SAAS PATTERN** |
| Faculty — `030-D-faculty-dashboard-desktop-1440-dark.png`; `030-D-faculty-dashboard-mobile-390-light.png` | Today’s duty is unmistakable; Check In is prominent; schedule and activity are task-specific; mobile cards preserve hierarchy | Gradient hero plus decorative circle; date pills; repeated duty cards; four accented metrics; iconised activity list; truncation of categorical metric | 2 — Noticeable | Medium: some decorative/metric treatment competes with routine duty scanning | **FUNCTIONALLY JUSTIFIED hero; OVERUSED supporting treatment** |
| Super Admin — `030-D-super-admin-dashboard-desktop-1440-dark.png`; `030-D-super-admin-dashboard-mobile-390-light.png` | Sparse, auditable, clear user/admin counts and activity log; consistent shell | Four coloured StatCards with emoji labels; otherwise restrained | 1 — Mild | Low | **COHERENT / INTENTIONAL** |

The three dashboards belong to the same application through shell, type, radius, accent-edge StatCards, and activity cards. They do not share one header treatment: Admin has a gradient greeting strip, Faculty has a plain greeting plus duty hero, and Super Admin has a conventional page title. This is **MIXED**, not a product identity break.

## 2. Screen-by-screen visual register

| Route / role | Visual strengths | Inconsistencies / signals | Slop level | Operational impact | Evidence |
| --- | --- | --- | ---: | --- | --- |
| `/login` unauthenticated | SIMS logo, clear single task, spacious form, coherent blue focus/action | Two decorative radial glows; marketing-style title block | 1 | Low | `030-D-unauthenticated-login-desktop-1440-dark.png`, `030-D-unauthenticated-login-mobile-390-light.png` |
| `/admin/dashboard` admin | Clear status panels and quick paths to violations/reports | Gradient hero, multiple accent cards, quick-action tiles, several card layers | 2 | Medium | `030-D-admin-dashboard-desktop-1440-dark.png`, `030-D-admin-dashboard-mobile-390-light.png` |
| `/faculty/dashboard` faculty | Duty hero supports the primary daily task; action and schedule sequencing are strong | Gradient/circle, date tiles, coloured metric row, card-heavy activity presentation | 2 | Medium | `030-D-faculty-dashboard-desktop-1440-dark.png`, `030-D-faculty-dashboard-mobile-390-light.png` |
| `/super-admin/dashboard` super admin | Efficient stats and audit activity, little unused decoration | Accent/emoji StatCards are more decorative than the rest, but limited | 1 | Low | `030-D-super-admin-dashboard-desktop-1440-dark.png`, `030-D-super-admin-dashboard-mobile-390-light.png` |
| `/admin/users`, `/admin/students`, `/super-admin/audit` | Strong table/list density; blue primary action; compact status badges; mobile rows remain readable | Page titles/filters differ slightly in spacing and input type; card containment remains frequent | 0–1 | Low | `030-D-admin-users-desktop-1440-dark.png`, `030-D-admin-students-mobile-390-light.png`, `030-D-super-admin-audit-logs-mobile-390-light.png` |
| `/admin/calendar`, `/admin/duty-slots`, `/faculty/slots` | Calendar/date controls, status legend, and slot cards make work state legible | Numerous rounded day cells and buttons, but they are genuine controls rather than decoration | 0 | Low | `030-D-admin-calendar-mobile-390-light.png`, `030-D-admin-duty-slots-mobile-390-light.png` |
| `/faculty/all-duties`, `/admin/attendance`, `/admin/flagged-violations` | Mobile cards and desktop tables share status/padding language; date grouping improves mobile scan | Card count rises on mobile but rows represent real duty units | 0–1 | Low | `030-D-faculty-all-duties-mobile-390-light.png`, `030-D-faculty-all-duties-desktop-1440-dark.png` |
| `/admin/violations` | Charts, trend, heatmap, filters, and record list provide rich operational evidence; status colours have meaning | Many independently bordered panels, four metric cards, three charts, mini-metrics, chips, filters, and record list make mobile a very long card stack | 2 | Medium | `030-D-admin-violations-desktop-1440-dark.png`, `030-D-admin-violations-mobile-390-light.png` |
| `/admin/reports` | Main report is prioritised; categories make report discovery easy; desktop table typography is clear | 15 coloured emoji cards; primary/secondary card layers; dense filter wall; mobile table clip (030-D objective defect) | 3 — Strong | High on mobile due combined density and clipped output | `030-D-admin-reports-desktop-1440-dark.png`, `030-D-admin-reports-mobile-390-light.png`, `030-D-reports-secondary-sheet-mobile-390-light.png` |
| `/admin/messages`, `/faculty/messages` | Minimal two-tab inbox, prominent Compose action, readable row separators | “New chat-style experience coming soon” chip introduces generic/promotional copy unrelated to current task | 1 | Low | `030-D-admin-messages-mobile-390-light.png` |
| `/admin/settings` | Open canvas, simple tabs, two factual setting cards, one primary action | No meaningful visual excess observed | 0 | Low | `030-D-admin-settings-desktop-1440-dark.png` |
| Notifications / change-password | Reuse shell/type/control language | Screenshot evidence is normal-state only; no strong visual concern or conclusion beyond consistency | 0–1 | Low | `030-D-admin-notifications-mobile-390-light.png`, `030-D-admin-change-password-mobile-390-light.png` |
| Dialogs/sheets | Modal hierarchy, dimmer, context panels, primary/secondary actions read clearly | Report sheet inherits clipped table; no decorative excess in reassign modal | 0–1 | Medium only for report output | `030-D-direct-mantine-modal-duty-slots-mobile-412-light.png`, `030-D-reports-secondary-sheet-mobile-390-light.png` |

## 3. AI-slop signal register

| ID | Pattern and repetition | Evidence | Classification | Severity / level | Why this is not merely preference |
| --- | --- | --- | --- | --- | --- |
| VE-01 | Dashboard-kit accumulation: gradient hero/greeting + multicolour stat cards + multiple card rows + pills + icon tiles | Admin and Faculty dashboards, both desktop and mobile | **PROBABLE AI-SLOP SIGNAL** | Medium / Level 2 | The repeated combination appears across two dashboards, where it competes with operational scanning; individual elements are not condemned |
| VE-02 | Report catalogue uses 15 uniform rounded cards, each with emoji plus arbitrary coloured icon tile | Reports desktop/mobile | **PROBABLE AI-SLOP SIGNAL** | Medium / Level 3 | Repetition is high, colour does not expose a stable semantics, and the catalogue is visually more “feature-grid” than an operational report index |
| VE-03 | Greeting hero is a gradient identity panel on Admin but Faculty uses plain greeting plus a separate gradient duty hero and Super Admin uses neither | Three dashboards | **INCONSISTENT** | Low / not scored | Same role of “landing header” changes visual metaphor without a shared reason |
| VE-04 | Rounded-card/border/shadow/tinted-canvas combination repeats for content, metadata, and action tiles | Admin Dashboard, Faculty Dashboard, Reports, mobile Violations | **OVERUSED** | Medium / Level 2 where concentrated | Repetition of three depth signals at once causes visual busyness; operational pages such as Settings show the restraint alternative already exists |
| VE-05 | Emoji, Tabler line icons, text arrows, and coloured icon containers appear together | Reports, dashboards, Super Admin stats | **INCONSISTENT** | Low / Level 1–2 | Multiple icon grammars reduce the clarity of icon meaning; logo and Tabler shell remain consistent |
| VE-06 | “New chat-style experience coming soon” chip in Messages | Admin Messages mobile | **GENERIC SAAS PATTERN** | Low / Level 1 | It reads as promotional roadmap copy within an operational inbox, not a current state or necessary instruction |
| VE-07 | Reports mobile combines control wall, table, card catalogue, bottom nav, and secondary-sheet output | Reports mobile/sheet | **OVERUSED** plus separate 030-D usability defect | High / Level 3 | Decoration/density concern is independent of, and compounded by, the confirmed clipping; this materially impairs report scanning |
| VE-08 | Faculty duty hero has gradient, circle, large session title, status pill, and Check In CTA | Faculty Dashboard desktop/mobile | **FUNCTIONALLY JUSTIFIED** | Low / Level 1 | It is a single focal element for an immediate time-bound duty, rather than repeated marketing decoration |

No page meets Level 4. The captured product never becomes dominated by decoration to the point that task comprehension fails. Reports is Level 3 because it combines several repeated signals with mobile operational density, not because it uses cards or emoji alone.

## 4. Cross-application consistency matrix

| Category | Typography | Spacing / density | Colour / status | Cards / action language | Icons / navigation | Overall | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| Auth | CONSISTENT with product font/blue; intentionally larger | Spacious, single-task | Brand blue and navy coherent | Intentional sheet/card exception | Logo + Tabler eye; no shell nav | **MOSTLY CONSISTENT** | Login desktop/mobile |
| Admin operations | Centred title/subtitle consistently used | Compact and task-centred | Stable blue/status palette | Borders/cards controlled except dashboard | Tabler shell consistent | **CONSISTENT** | Users, Calendar, Settings, Students |
| Faculty operations | Same type/status system | Good card/table mobile transformations | Stable duty statuses | More rounded mobile cards but task-led | Same mobile nav/shell | **MOSTLY CONSISTENT** | All Faculty Duties, My Slots, Attendance |
| Dashboards | Shared type/stat vocabulary | Admin/Faulty denser than Super Admin | More colour than operation pages | Mixed header metaphors, card intensity | Mixed emoji/Tabler/icon tile treatment | **MIXED** | Three dashboard pairs |
| Reports | Same heading/border/button base | Dense, especially mobile | Blue primary plus arbitrary category colours | Highest card repetition | Emoji/category tiles, arrows, native controls | **MIXED** | Reports desktop/mobile/sheet |
| Messaging | Same title/action/status base | Sparse and readable | Restrained | One large inbox surface | Shell icons coherent; promotional chip exception | **MOSTLY CONSISTENT** | Admin Messages mobile |
| Settings | Same type, tabs, primary action | Open and quiet | Restrained/semantic | Cards only where factual grouping needs them | Tabler tabs/shell | **CONSISTENT** | Settings desktop |
| Overlays | Same title/form/action typography | Appropriate modal spacing | Blue primary, neutral secondary | Clear hierarchy | Close affordance consistent | **MOSTLY CONSISTENT** | Reassign modal, Report sheet, 030-D overlay matrix |

## 5. Visual strengths register

| Strength worth preserving | Evidence | Classification |
| --- | --- | --- |
| Stable application identity through logo, Public Sans, navy/slate shell, and blue primary action | Login, Admin, Faculty, and Super Admin screenshots | **COHERENT / INTENTIONAL** |
| Status colour earns its visual attention in duty, student, and admin work | Calendar Open/Close, All Faculty Duties completion/scheduled badges, Users active badges | **FUNCTIONALLY JUSTIFIED** |
| Faculty duty hero makes the immediate action unambiguous | Faculty Dashboard desktop/mobile | **FUNCTIONALLY JUSTIFIED** |
| Operational list/table pages favour readable scan density over decorative card grids | Users desktop, Students mobile, All Faculty Duties desktop/mobile | **COHERENT / INTENTIONAL** |
| Responsive card/table switch at 767/768 preserves hierarchy without root overflow | 030-D boundary evidence for All Faculty Duties, Students, Violations, Duty Slots | **COHERENT / INTENTIONAL** |
| Settings is a concise reference for restrained operational composition | Settings desktop | **COHERENT / INTENTIONAL** |
| Dialogs clearly distinguish background, immutable context, editable form, and action footer | Reassign modal mobile | **COHERENT / INTENTIONAL** |
| Dark mode remains readable in all captured primary routes | 58 030-D captures; no severe unreadability reproduced | **COHERENT / INTENTIONAL** |

## 6. Unresolved visual questions for a future authorised phase

1. Is the additional visual energy on Admin/Faculty dashboards a desired product personality, or should operational priority be closer to the restrained Super Admin/Settings surfaces?
2. Does the report catalogue need 15 individually coloured emoji tiles for discovery, or should category differentiation rely more on information architecture? This is a product decision, not a prescribed replacement.
3. Is the Admin gradient greeting intended to convey a useful state, or is it purely an identity treatment?
4. Should the Messages roadmap chip remain visible to operational users, be a temporary notice, or be represented elsewhere?
5. Are animated StatCard values and hover elevation useful feedback in repeated daily work? 030-D static screenshots cannot answer this.
6. What visual treatment should true empty, error, retry, and loading states use? The 030-D forced-state interception did not produce valid evidence.

None of these questions authorises design-system decisions, component migration, documentation correction, or remediation.
