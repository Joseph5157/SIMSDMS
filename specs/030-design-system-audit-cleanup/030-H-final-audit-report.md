# 030-H — Final Audit Report

Date: 2026-09-12
Audited product baseline: `21a7ca5f56dfd67118e6530e3f925e5607688656`
Audit branch: `audit/design-system-030`

## Executive conclusion

SIMS DMS is **not** evidence of a fundamentally broken or casually assembled frontend built from competing design libraries. It is a functional React/Vite operational application with a coherent hybrid implementation: Tailwind supplies most presentation and responsive layout; Mantine supplies a broad set of accessible primitives and application shell behavior; Radix Dialog plus Framer Motion are contained in shared overlay infrastructure; Tabler is the established third-party icon set; and Public Sans gives the product a recognisable typographic base. The dependency count is not itself the problem: the audited dependencies have mostly separate, evidenced responsibilities. [030-C dependency map](./030-C-dependency-and-wrapper-responsibility.md) records that separation.

The system has nevertheless accumulated meaningful **design-system drift**. Shared primitives coexist with extensive direct Mantine, native, and raw-control use; some wrappers are established and valuable while others remain representative or nearly unused. Token values are represented in Tailwind, CSS variables, Mantine theme arrays, and local styles, creating a documented manual synchronization risk. Responsive data transformations are successful in captured 767/768 cases but implemented through one shared coordinator and seven local page pairs. Loading, empty, and error presentation is uneven. These are architectural consistency concerns, not proof that every direct use is wrong.

Browser evidence supports a healthy core: 58 route/state captures across roles and themes completed with no primary-route crash, root-document overflow, or severe dark-mode unreadability. It also confirms concrete defects and concerns: clipped mobile Reports secondary tables, invalid Admin Dashboard HTML nesting warnings, inconsistent focus return from tested shared overlays, selected sub-44px visible controls, and a small set of harness coverage gaps. [030-D issue register](./030-D-visual-runtime-issue-register.md) is the authoritative defect evidence.

Visually, the application has a coherent operational foundation—not pervasive “AI slop.” Its shell, typography, primary blue, semantic status language, dense tables/lists, and mobile navigation make roles feel related. Generic dashboard-kit signals are concentrated, rather than ubiquitous: Admin and Faculty dashboards are Level 2, and Reports is a Level 3 visual-density/generic-SaaS case because it combines 15 coloured emoji cards, dense controls, and repeated surfaces. No captured screen was Level 4. [030-E visual audit](./030-E-current-visual-language-and-pattern-audit.md) separates this qualitative evidence from browser defects.

Documentation had been the largest contributor to future drift risk: active agent guidance still described a prototype era. 030-F identified that conflict; 030-G corrected active documentation to current reality without deciding the future architecture. The remaining questions—Mantine scope, wrapper boundaries, token ownership, Reports redesign, and any 21st.dev role—are intentionally deferred to Spec 031.

## Current architecture snapshot

| Layer / concern | Current audited implementation | Current-state classification | Evidence / notes |
| --- | --- | --- | --- |
| Application | React 19/Vite 8 SPA, React Router, TanStack Query for server state, local React state for UI state | HEALTHY | 21 routes/page files are reachable; Query is imported by 19 production files. 030-A/B. |
| Tailwind | Broad layout, spacing, visibility, type, and token-backed presentation layer | HEALTHY WITH DRIFT | 1,117 `className` attributes across 49 files; it coexists intentionally with Mantine and CSS variables. 030-B/C. |
| Mantine Core | Theme/provider, shell/layout, accessible controls, menus, modals, drawer, table structure, and direct feature composition | HEALTHY WITH DRIFT | 34 importing production files; direct use is broad and wrappers are only partly adopted. 030-C. |
| Mantine Hooks | Localized `useMediaQuery`, disclosure, and debounce behavior | HEALTHY | Six production files; behavior-specific reach. 030-C. |
| Charts | One `@mantine/charts` consumer (`ViolationsPage`): one line and two bar charts; Recharts is its peer/runtime | PARTIALLY STANDARDIZED | No direct Recharts source imports and no app chart wrapper. 030-B/C. |
| Radix + Framer | Dialog semantics, focus/dismissal, sheet/dialog animation and drag inside `ResponsiveSheet`; bounded nested-dialog `StudentSearchOverlay` exception | HEALTHY WITH KNOWN EXCEPTION | No feature page imports either dependency directly. The exception is documented in current guidance. 030-C/G. |
| Iconography | Tabler is the established third-party icon source; two app SVG avatar glyphs, logo images, emoji/symbols, and CSS visuals are separate visual roles | HEALTHY WITH VISUAL DRIFT | 16 importing files, 40 unique Tabler symbols; Reports/dashboard emoji mixing is a visual, not library-count, concern. 030-B/E. |
| Typography | Public Sans (400–800) is the primary UI font; DM Mono 400 is the mono face | HEALTHY | Global loaded/applied type evidence and all captured routes. Geist has zero direct production import. 030-B/C/D. |
| Theme/tokens | Tailwind `@theme`, CSS semantic variables/light-dark overrides, Mantine shade arrays, and some local values | HEALTHY WITH DRIFT | Each has current consumers, but 72 Mantine hex literals must be manually synchronized with CSS/Tailwind; raw `:root` ramps have no observed `var()` consumers. 030-C. |
| Overlays | ResponsiveSheet (10), FormModal (8), ConfirmDialog (12), two direct Mantine Modals, Layout Drawer, two Menu templates, and custom dropdowns | PARTIALLY STANDARDIZED | Each shared overlay has a distinct task contract, but focus-return results differ by path. 030-B/C/D. |
| Forms / controls | AppSelect/AppTextInput/AppNumberInput exist alongside direct Mantine and native controls | PARTIALLY STANDARDIZED | AppSelect has an overlay-safe portal behavior; AppTextInput is pass-through; AppNumberInput has no consumer. 030-B/C. |
| Actions / buttons | AppButton exists but direct Mantine and raw controls dominate | INCONSISTENT | 1 AppButton consumer; 70 direct Mantine Buttons; 82 raw buttons (only 32 closest conventional-action overlap). 030-B/C. |
| Tables / data | Shared Table owns Mantine table chrome, scroll, cells, and row/block states; page-specific mobile cards and one ResponsiveDataView coexist | HEALTHY WITH DRIFT | Table: 27 instances/12 files; ResponsiveDataView/MobileList: one Duty Slots consumer; seven local card/table pairs. 030-B/C. |
| Feedback / states | Custom Toast is active transient feedback; Alert is inline feedback; table states are shared; general loading/empty/error treatment is mixed | PARTIALLY STANDARDIZED | Toast: 25 hook consumers/100 calls. Mantine Notifications has zero direct production imports. 030-B/C. |
| Responsive | Shared shell/table-list cutoff at 768, CSS-first page behavior, local mobile card branches, and overlay-specific 639/640/641 behavior | HEALTHY WITH DRIFT | Browser-confirmed boundaries; no universal breakpoint source. 030-C/D. |

### Established, partial, exception, and unresolved boundary

- **Established:** Layout shell, Public Sans/DM Mono, Tabler, custom Toast, shared Table, ResponsiveSheet for contextual responsive tasks, FormModal for structured forms, ConfirmDialog for confirmations, and 768 shell/dominant data-switch behavior.
- **Partially adopted:** AppButton, AppField family, ResponsiveDataView, MobileList, EmptyState, Skeleton use, general cards, and page-level mobile data transformations.
- **Known exception:** StudentSearchOverlay directly uses the otherwise internal Radix/Framer overlay dependencies for its nested-overlay behavior. It is documented, not newly sanctioned by this report.
- **Unresolved:** future direct-Mantine/wrapper boundary, native-control exceptions, token ownership, chart-wrapper need, package disposition, and target responsive-data strategy.

## Consolidated component-adoption summary

| Pattern | Audited adoption / significance |
| --- | --- |
| AppButton | 1 consumer. It is not an effective general current boundary; this does not invalidate the legitimate raw host-chrome, composite, calendar, pagination, and sheet-footer controls. |
| Direct Mantine Button / raw buttons | 70 direct Mantine Buttons and 82 raw buttons. The closest standard-action overlap is 32 raw buttons; the remainder has composite/navigation semantics. Boundary choice is deferred. |
| AppSelect / direct Mantine Select / native select | 7 / 21 / 23. AppSelect materially sets non-portal behavior for Radix-hosted contexts; other controls are visually mostly similar in captures but architecturally mixed. |
| Text inputs | AppTextInput 2, direct Mantine TextInput 19, native input 25. AppTextInput currently adds little behavior; native inputs include legitimate search/auth/file/time/date/report cases. |
| ResponsiveSheet / FormModal / ConfirmDialog | 10 / 8 / 12. These are established specialized overlay families, not duplicates with identical contracts. |
| Direct Mantine overlays | Two direct feature Modals, one shell Drawer, two mapped Menu templates. Current exceptions are task-specific, not evidence for a replacement. |
| Table / ResponsiveDataView | Shared Table is broadly established (27/12 files). ResponsiveDataView is one-consumer coordination support, not a universal current pattern. |
| EmptyState / table states | EmptyState one consumer; EmptyRow/ErrorRow/ErrorBlock 31/9/7. Container-specific table states are broad; general state standardization is incomplete. |
| PageHeader / Badge / StatCard / Pagination | PageHeader 17 uses/16 pages; Badge 46/17 files; StatCard 23/5 files; Pagination 8/7 files. These have meaningful current reach, with dashboard/local-heading exceptions as documented. |

## Dependency assessment

| Category | Dependencies / current fact | Future disposition |
| --- | --- | --- |
| Broad current dependency | `@mantine/core`, Tailwind, `@tailwindcss/vite`, Public Sans | Decision deferred; broad current reach means any change has high impact. |
| Narrow but behaviorally important | `@mantine/hooks`, Radix Dialog, Framer Motion, Tabler, DM Mono | Current responsibilities are contained or clear; future scope is unresolved. |
| Narrow feature dependency | `@mantine/charts` with Recharts peer/runtime | One analytics page; no direct Recharts app API. Wrapper/package policy deferred. |
| Active support dependency | React Router, TanStack Query, Axios, PWA registration | Outside the component-library overlap decision, but part of current architecture. |
| Zero direct production use observed | `@mantine/notifications`, `@fontsource-variable/geist`; `cn()` has no consumer | No removal conclusion. Package disposition belongs to Spec 031/032 after decision. |

## Strengths register — protect before changing

| Strength | Evidence | Why it matters later |
| --- | --- | --- |
| Recognisable shell and role structure | Layout is shared by all 19 non-auth pages; 030-D captured all primary roles/routes | A future architecture decision should preserve useful navigation and role separation rather than replace it wholesale. |
| Public Sans, navy/slate shell, blue primary language, SIMS logo | Login plus Admin/Faculty/Super Admin screenshots | Coherent product identity exists today. |
| Semantic status language | Calendar, All Faculty Duties, Users, student/admin states in 030-D/E | Status colors earn attention and support operational scanning. |
| Shared Table foundation | 27 Table uses, no direct feature Mantine Table; row accessibility behaviors are centralized | Dense data work already has common table chrome and states. |
| Browser-confirmed 767/768 transformations | All Faculty Duties, Students, Violations, Duty Slots | Four captured surfaces switch cards/tables without root overflow. |
| Faculty duty priority | Faculty dashboard hero makes the current duty and Check In action conspicuous | This is a task-specific hierarchy worth evaluating carefully, not discarding as generic styling. |
| ResponsiveSheet interaction model | 10 consumers, safe-area/keyboard/drag infrastructure; report and nested-search sheets rendered | It is an established task family even though focus return needs follow-up. |
| Dark-mode readability | 58 captures: no severe dark-theme comprehension failure | Existing theme behavior must be preserved through any later token decision. |
| Custom Toast and inline/table feedback foundations | Toast 100 calls/25 consumers; Table state components broad | Future consolidation should build from real active paths. |
| Business-rule UI and role/permission behavior | Routes, protected role groups, seeded 030-D role traversal | Visual/migration work must not casually alter operational rules. |

## Browser-confirmed defect summary

| ID | Type | Verified observation | Impact | Evidence |
| --- | --- | --- | --- | --- |
| D-01 | Runtime / HTML validity | Admin Dashboard produces 32 React console errors: invalid `p`/`div` nesting and matching hydration warning | High maintenance/hydration risk; page stayed usable in the audit | 030-D-01; `/admin/dashboard`; desktop/mobile route captures |
| D-02 | Accessibility concern | Tested FormModal at 639/640/641 and ConfirmDialog at 390 close on Escape but reported `focusReturned: false`; tested Menu/direct Modal returned focus | Keyboard continuity varies by overlay path | 030-D-02 interaction records |
| D-03 | User-facing responsive defect | Reports secondary sheet tables are 606–612px in narrower sheets, have visible clipping, and no clear scroll affordance; inline 640 view also overruns right edge 5–10px | High mobile report usability impact | 030-D-03; `030-D-reports-secondary-sheet-mobile-390-light.png` and 360/639 captures |
| D-04 | Accessibility/touch-target concern | Visible Reports controls are 37–40px; breadcrumb 36×16; logout 42×37. Global scan contains hidden-duplicate false positives. | Confirmed local target-size concern, not a claim every control is undersized | 030-D-04 |
| D-05 | Readability observation | Seven captured route states include text truncation/ellipsis, including dashboards and Violations | Some may be intentional compact treatment; expansion was not verified | 030-D-05 |
| D-06 | Shell reading-area observation | Admin mobile bottom nav overlays scrolling content; final end padding avoids permanently hiding the final content | Low–medium scan interruption while scrolling | 030-D-06 screenshot |
| D-07 | Confirmed behavior | Nested student search stacks two dialogs and one Escape dismisses the upper level | Supports the documented exception; not a defect by itself | 030-D-07 |
| D-08 | Confirmed healthy behavior | Four screens render card output at 767 and tables at 768 without root overflow | Resolves static breakpoint suspicion in favor of intentional behavior | 030-D-08 |

The following are **testing/harness gaps, not product defects**: Profile sheet, notification dropdown, and Faculty bottom-nav interactions were blocked by hidden/off-viewport duplicate selectors; forced Students empty/error interception missed the runtime endpoint; loading duration, queued offline sync, destructive submissions, and several mutation success states were not exercised. The existing Playwright suite originally contained only three logical tests across two projects and no client unit-test baseline exists. 030-D expanded evidence to 58 captures, 34 interactions, 82 screenshots, seven viewport families, roles, and light/dark examples—but it is not full production-state coverage.

## Visual-quality summary

030-E is intentionally separate from the defect list above.

- **Coherent operational foundation:** logo, Public Sans hierarchy, navy/slate shell, blue primary action/navigation, semantic status colors, compact pills, restrained table/list pages, and readable dark mode are consistent across roles.
- **Dashboard concentration:** Admin and Faculty dashboards each accumulate gradient treatment, multicolor StatCards, bordered surfaces, pills, and icon tiles. This meets the repeated-evidence threshold for a **probable generic/dashboard-kit signal**, Level 2, Medium—not a blanket AI-slop conclusion.
- **Reports concentration:** Reports uses 15 uniform emoji/colour cards, primary/secondary containers, dense filters, and mobile output in a long scroll. It is a **Level 3, Medium visual-language concern**; combined with D-03 it has High mobile operational impact. Its clipped tables remain a separate browser-confirmed defect.
- **Counter-evidence:** Settings, Users, Students, Calendar, All Faculty Duties, and Super Admin dashboard show restrained, dense, intentional operational presentation. No captured screen was Level 4.
- **Visual questions deferred:** gradient purpose, dashboard simplification, Reports information architecture, emoji/icon strategy, StatCard number animation, hover elevation, and a unified true empty/error/loading visual policy.

## Documentation reconciliation

030-F established that documentation had mixed active governance with stale migration/prototype guidance. 030-G corrected current operating documentation and AI-agent entry guidance while preserving historical records as history.

| Corrected active truth | Current source/evidence basis |
| --- | --- |
| Public Sans primary UI font; DM Mono mono; Geist zero direct production import | 030-B/C typography inventory |
| Tabler is established; Lucide must not be added | 030-B/C icon inventory |
| Email/password with httpOnly-cookie/CSRF session; Telegram is not OTP login | Current auth evidence; 030-D login |
| ResponsiveSheet and PageHeader variants are implemented | 030-B/C and 030-D |
| Custom Toast is current transient feedback; Mantine Notifications has zero direct production imports | 030-B/C |
| Radix/Framer are internal overlay infrastructure with bounded StudentSearchOverlay exception | 030-C/D |
| 768 shell/list behavior differs from 639/640/641 overlay behavior; Reports clipping is a current disclosed limitation | 030-C/D |
| Wrappers and mobile data strategies are mixed rather than universal | 030-B/C |

Historical records intentionally remain historical: Specs 012 and 025, archived mobile records, legacy skill-kit assets, and obsolete implementation snapshots are not erased. Current entry documents now mark their historical status where needed. The 030-G contradiction re-check found active guidance internally consistent on font, icon, auth, overlay, feedback, status of PageHeader/ResponsiveSheet, and mixed responsive data behavior.

## Final current-state classifications

| Area | Classification | Evidence-based current state |
| --- | --- | --- |
| Application shell / navigation | HEALTHY | Shared Layout and role-specific navigation render across captured routes. |
| Typography | HEALTHY | Public Sans/DM Mono applied consistently; readable across captures. |
| Iconography | HEALTHY WITH VISUAL DRIFT | Tabler is consistent as a library; emoji/tile/text-arrow mix is concentrated in Reports/dashboards. |
| Buttons / actions | PARTIALLY STANDARDIZED | AppButton is limited; direct Mantine/raw actions are broad. |
| Forms / controls | PARTIALLY STANDARDIZED | Wrapper, direct Mantine, and native paths coexist with mostly subtle visual differences. |
| Overlays | HEALTHY WITH KNOWN ACCESSIBILITY CONCERN | Specialised contracts are clear; tested focus return is inconsistent. |
| Tables / data views | HEALTHY WITH DRIFT | Shared Table is strong; mobile strategy is mixed; Reports secondary table is a confirmed defect. |
| Feedback / loading / empty / error | PARTIALLY STANDARDIZED | Toast is strong; general state adoption is uneven and not fully browser-verified. |
| Responsive strategy | HEALTHY WITH DRIFT | Boundary behavior works where tested; implementation ownership is layered rather than universal. |
| Dashboards | VISUALLY MIXED | Operational hierarchy is useful; generic-card/gradient accumulation is noticeable. |
| Reports | CONFIRMED DEFECT + VISUAL DENSITY CONCERN | Mobile secondary output clips; report catalogue/control presentation is Level 3. |
| Tokens / theme | HEALTHY WITH DRIFT | Light/dark works in captures; multiple active representations create sync risk. |
| Dependencies | HEALTHY WITH DECISION DEFERRED | Separate roles largely explain library presence; zero-direct-use packages need later policy. |
| Accessibility foundations | HEALTHY WITH CONFIRMED GAPS | No nameless visible interactive element in captures; focus-return/target-size concerns remain. |
| Documentation | DOCUMENTATION RECONCILED | 030-G corrected active current-state/agent guidance; history remains bounded. |
| Testing | IMPROVED AUDIT COVERAGE WITH GAPS | 030-D is strong evidence but client unit tests and broad durable E2E coverage remain absent. |

## Audit limitations and confidence

**High confidence:** audited baseline identity; dependency/source counts; current font/icon/feedback facts; 030-D’s captured route/boundary/interaction results; Reports clipping; Admin invalid-nesting warnings; tested overlay focus outcomes; documentation corrections.

**Medium confidence:** visual quality classifications (controlled qualitative interpretation grounded in screenshots); general touch-target prevalence (hidden duplicate controls affect aggregate heuristic); behavior of overlay families not individually exercised; status/loading/empty/error consistency outside captured states.

**Not verified / unresolved:** every production dataset and permission combination; true Students forced empty/error states; profile sheet and notification dropdown keyboard paths; queued offline sync; file operations; destructive confirmation submission; mutation successes; loading duration; visual-motion duration; client unit-test behavior; a future architecture migration.

Rendered evidence uses a disposable seeded environment and captured/reachable state, not every possible production dataset. No architecture migration, dependency removal, redesign, or remediation was tested or performed.

## Frozen candidate commits

| Commit | Candidate | Audit status |
| --- | --- | --- |
| `fa996f2` | OfflineBanner candidate change | Preserved, unapplied, outside the audited baseline. Spec 030 neither accepts nor rejects it. Reconsider only after Spec 031 decisions. |
| `91e5b3e` | Student Violation Report mobile-card candidate | Preserved, unapplied, outside the audited baseline. It is not an accepted solution to D-03 and must be reconsidered only after Spec 031 decisions. |

The unrelated existing stash remains out of scope and untouched.

## Spec 031 decision-deferred register

Spec 030 intentionally does **not** answer:

1. Whether Mantine remains at its current scope or usage is reduced.
2. Which Mantine components may be used directly and which, if any, need application wrappers.
3. Whether AppButton, form wrappers, ResponsiveDataView, or MobileList should be expanded, narrowed, replaced, or remain context-specific.
4. Which native/raw controls remain sanctioned for auth, search, file/time/date, composite, shell, and sheet-footer contexts.
5. Whether and how token ownership/manual synchronization should change.
6. Whether Mantine Notifications, Geist, or other directly unused utilities should remain installed.
7. Whether the ResponsiveSheet footer contract and StudentSearchOverlay exception remain sanctioned long term.
8. Whether lint enforcement, chart wrapping, or state-pattern policy should be introduced.
9. Whether dashboards should be visually simplified and how Reports should be redesigned.
10. Whether 21st.dev is introduced and, if so, under what dependency, token, accessibility, and component-boundary rules.

## Spec 032 boundary

**Spec 032 is implementation/migration only after Spec 031 decisions are approved.** It may eventually address component consolidation, package cleanup, browser-confirmed defects, Reports mobile behavior, dashboard visual changes, wrapper migration, token changes, lint enforcement, and frozen candidate commits. None is authorised by this report.

## Non-negotiable preservation list for future deliberation

These are evidence-backed preservation warnings, not architecture lock-in:

- preserve working role/navigation shell behavior and business-rule-driven UI;
- preserve Public Sans/DM Mono application typography until a future approved decision changes it;
- preserve Tabler consistency and the SIMS logo identity;
- preserve semantic status language and dense operational table/list scanability;
- preserve browser-confirmed 767/768 transformations that already work;
- preserve ResponsiveSheet’s mobile/keyboard/safe-area responsibilities while investigating its focus-return gap;
- preserve custom Toast’s active feedback behavior during any package/feedback decision;
- preserve dark-mode readability and tested role/permission behavior;
- preserve the bounded StudentSearchOverlay behavior until an approved architecture decision determines its long-term policy.

## Final audit verdict

SIMS DMS is a **functional, coherent operational system with accumulated standardization and visual-density drift**, not an amateur product whose main flaw is “too many libraries” or indiscriminately generated components. Its dependency boundaries are mostly defensible; its component adoption is incomplete; its browser evidence reveals a small number of concrete defects; its dashboards and Reports concentrate generic SaaS styling signals; and its active documentation has now been reconciled to the audited reality. The appropriate next step is a fact-led **Spec 031 decision**, not an automatic rewrite, library swap, or migration.
