# 030-C — Pattern Ownership, Overlap, and Architecture Risks

Baseline: `21a7ca5f56dfd67118e6530e3f925e5607688656`.

## Overlay architecture

| Overlay family | Current owner/stack | Consumers | Same use as other families? | Architectural finding |
| --- | --- | ---: | --- | --- |
| Responsive task sheet/dialog | ResponsiveSheet → Radix Dialog semantics + Framer Motion animation/drag + Mantine media query + keyboard-inset hook | 10 | **PARTIAL** with FormModal | Owns one component across mobile sheet/fullscreen and desktop centered dialog, including safe-area and dismiss handling. It is established and dependency-encapsulated. |
| Nested student search | StudentSearchOverlay → its own Radix Dialog/Framer root | 1 | **NO** for its nesting requirement; **PARTIAL** with Reports search | Source comment and Spec 025 handoff identify a deliberate nested focus-scope exception. ESLint explicitly permits it. Reports uses a lighter in-page dropdown rather than a nested modal workflow. |
| Conventional form modal | FormModal → Mantine compound Modal | 8 | **PARTIAL** with ResponsiveSheet | Fixed form, error, submit/cancel, loading, sticky footer, and mobile-fullscreen contract. It serves conventional forms rather than mobile sheet gestures. |
| Confirmation | ConfirmDialog → Mantine Modal | 12 | **NO** for purpose | Specialized confirmation semantics and danger/loading contract; established shared pattern. |
| Feature-specific modal | Direct Mantine Modal | 2 | **UNCLEAR/PARTIAL** | Duty Slots reassignment and Users reset-result content do not map exactly to confirmation; one may overlap with form/task patterns, but runtime/product context is needed. |
| Navigation drawer | Layout → Mantine Drawer | 1 | **NO** | Shell navigation, not a task/form overlay. Mantine supplies focus/dismiss behavior. |
| Menus | Mantine Menu in Users | 2 templates | **NO** | Anchored action menus, semantically distinct from modal dialogs. |
| Positioned dropdowns | Custom NotificationBell and Reports search result surfaces | 2 | **PARTIAL** with Menu/search overlay | Lightweight anchored lists. NotificationBell owns Escape/focus code locally; Reports search lacks a dialog root by design. Runtime keyboard behavior awaits 030-D. |
| Browser confirmation | `window.confirm` in Notifications’ disabled implementation branch | 1 | **YES** with ConfirmDialog | The route renders a feature-disabled placeholder, so this bypass is currently unreachable; it remains source-level legacy overlap. |

**Conclusion:** the application does not currently have five interchangeable overlay systems. It has two underlying dialog technologies with mostly separated roles: Mantine for modal/form/confirmation/navigation/menu behavior, and Radix/Framer behind responsive/nested task surfaces. The genuine overlap is at the boundary between FormModal, direct feature Modal, and ResponsiveSheet for form-like tasks; source contracts and mobile behavior are not identical.

## Form-control architecture

| Layer | Responsibility | Evidence | Boundary finding |
| --- | --- | --- | --- |
| Mantine fields | Accessible labels/errors, control interaction, combobox/numeric behavior | Select 21 direct outside wrapper; TextInput 19; NumberInput 2; Textarea 2; Checkbox 7; Switch 1 | Constitution explicitly assigns form behavior to Mantine. This is the broad current foundation. |
| AppSelect | Default `comboboxProps.withinPortal=false` for overlay stacking/touch behavior | 7 uses in 3 files | Adds a real app-specific policy. Historical handoff describes it as overlay-hosted, explaining many direct page-filter bypasses. |
| AppTextInput | Named pass-through to Mantine TextInput | 2 uses | No additional behavior or policy currently distinguishes it from direct Mantine use. |
| AppNumberInput | Default decimal input mode | 0 uses | Useful contract exists in source but is not adopted. |
| Native fields | Browser-native search/auth/file/time/date/filter controls | Input 25, select 23, textarea 1; local forms/labels/styles | Some uses are type-specific or bespoke (file/time/auth); others perform the same filtering/form job as Mantine controls. |
| Local labels/styles | Auth, Compose, Profile, Upload and page filter classes | 8 labels, 7 forms; `selectCls`, `inputClassName`, auth arrays | Current governance has no single source-level rule that cleanly partitions every native versus Mantine case. |

Architectural gaps:

- **Confirmed:** detailed policy calls AppField canonical, but Spec 025 implementation notes narrow AppSelect to overlays and retain page-level Mantine filters.
- **Confirmed:** AppTextInput’s API is equivalent to direct Mantine TextInput; naming alone does not enforce a behavior boundary.
- **Confirmed:** AppButton/AppField imports are not enforced by ESLint; only deprecated library/direct overlay imports are enforced.
- **Inference:** many bypasses are historical because wrappers were added representative-first after screens existed. Some are intentional exceptions, but source lacks a complete authoritative decision table for form control choice.

## Raw action/button semantic classification

The 82 raw `<button>` occurrences were classified by inspecting every lexical tag and its handler/content. Counts describe source templates; mapped templates can render multiple runtime controls.

| Semantic purpose | Count | Representative locations | Relationship to AppButton/Mantine Button |
| --- | ---: | --- | --- |
| Conventional action (submit, cancel, save, close, download, retry, clear) | 32 | Sheet footers, auth submit/cancel, report downloads, upload template, retry/reset | **YES/PARTIAL:** closest functional overlap. Seventeen are sheet footer/result controls using ResponsiveSheet’s deliberately shared raw style objects; branded auth controls are historical bespoke cases. |
| Navigation rendered as button | 8 | “View all”, dashboard quick actions, change password, mobile Back | **PARTIAL:** navigation responsibility overlaps visual action styling, but destination semantics differ from mutations. |
| Icon-only/chrome/dismiss action | 9 | Logout, password reveal, banner/toast/sheet/report/message dismiss | **PARTIAL:** AppButton has an icon mode, while several controls are tightly coupled to host component chrome. |
| Selection/toggle/tab control | 7 | Create-user role choice, theme toggle, avatar choice, notification/report/message modes | **NO/PARTIAL:** native buttons are valid building blocks for composite widgets; semantics and keyboard models matter more than visual button uniformity. |
| Disclosure/menu trigger | 8 | Profile/menu/message dropdowns, error expansion, remarks, report/Settings disclosure | **NO/PARTIAL:** trigger semantics differ, though shared sizing/focus styling may overlap. |
| Calendar/date control | 11 | Month previous/next and selectable day cells | **NO/PARTIAL:** compact repeated date-grid controls are custom composite behavior, not ordinary CTA buttons. |
| Pagination control | 3 | Shared Pagination previous/page/next templates | **NO as bypass:** intentionally encapsulated inside the Pagination primitive. |
| Search/result/list selector | 4 | Student-search trigger/results, Reports results, Messages row | **NO/PARTIAL:** composite option/list selection behavior; rendered DOM accessibility requires 030-D. |
| **Total** | **82** | 32 files | Categories sum to the complete 030-B raw-button count. |

The directly competing set is therefore not “all 82.” The clearest job overlap is the 32 conventional actions, of which 17 already share an intentional sheet-specific styling contract. The remaining 50 primarily implement navigation, host chrome, composite widgets, date grids, pagination, or option selection. This does not establish whether any individual control should change.

Why AppButton adoption is one while other paths are broad:

1. **Confirmed historical sequence:** Spec 025 created it after most screens and required only one representative migration initially.
2. **Confirmed API limit:** it has no named success variant; the handoff explicitly kept green Mantine buttons direct.
3. **Confirmed shared exception:** ResponsiveSheet exports raw footer styles used by 17 button templates rather than AppButton.
4. **Confirmed overlap:** the global Mantine theme already applies the 44 px minimum to every Mantine Button, reducing AppButton’s unique value for direct Mantine callers to variant mapping and icon-label enforcement.
5. **Inference:** later migrations prioritized removing static page inline styles and deprecated libraries, leaving general action migration incomplete by the original wrapper ambition.

## Table and data-view architecture

| Layer | Responsibility | Evidence | Architecture interpretation |
| --- | --- | --- | --- |
| Shared Table | Table surface, semantic cells/rows, horizontal scrolling, clickable-row keyboard behavior, table empty/error/retry states | 27 tables in 12 files; no direct feature Mantine Table | Established canonical table implementation. It intentionally does not choose mobile information architecture. |
| ResponsiveDataView | Coordinate separately built mobile and desktop JSX at a literal Tailwind breakpoint | 1 Duty Slots consumer | Historical canonical coordinator for dual-tree screens; representative-first adoption did not spread. Both trees mount by design. |
| MobileList | Common compact card/list anatomy | 1 Duty Slots consumer | Companion representative primitive, not broad current ownership. |
| Local card/table pairs | Screen-specific mobile information hierarchy | 7 pages | Same high-level responsive job as ResponsiveDataView, with local markup and visibility classes. The content anatomy differs by page. |
| Horizontal-scroll table | Shared Table default | Reports and several table-only surfaces | Documented as valid for simple/reference/comparison cases, not automatically an error. Actual usability needs viewport evidence. |
| Raw HTML table | Analytical heatmap/detail in Violations | 1 | Specialized analytical structure inside overflow; not evidence of a second general table component. |
| Report renderers | Shared Table branches plus non-table summaries | 14 Table branches in ReportSection; two non-table summaries | Report-specific data schemas are local while table chrome is shared. Mobile content remains scroll-table inside a ResponsiveSheet/inline container. |

**ResponsiveDataView finding:** historical evidence supports that it was intended to become the canonical coordinator for screens with separate mobile/desktop trees, not a replacement for all tables. Its one consumer versus seven comparable local pairs is evidence of incomplete broad adoption. Whether each local pair can use its API without losing page-specific behavior is unresolved; its API accepts prebuilt/grouped JSX, so grouping alone is not an obvious blocker.

## State and feedback architecture

| Pattern | Responsibility | Same job as parallel patterns? | Evidence-based interpretation |
| --- | --- | --- | --- |
| Toast | Transient global mutation/PWA feedback, optionally persistent/clickable | **YES** with the unused Mantine Notifications domain | Broad actual canonical path: 25 hook consumers and 100 calls. |
| Custom Alert | Inline contextual semantic message with tone/action | **PARTIAL** with Mantine Alert and OfflineBanner | Established app pattern (13 uses). Mantine Alert is confined to FormModal’s embedded error. |
| OfflineBanner | Persistent connectivity/sync status at root | **NO/PARTIAL** with Alert visual form | Unique lifecycle/responsibility even though its presentation can resemble Alert. Frozen remediation is not baseline truth. |
| EmptyState | General card/page empty state | **NO** with EmptyRow at DOM/container level; **PARTIAL** conceptually | One use; its action/title/subtitle contract differs from table-row markup. |
| EmptyRow | Table-specific no-data/loading row | **NO** with general EmptyState structurally | 31 uses; established within shared Table family. |
| ErrorRow/ErrorBlock | Table versus non-table request failure/retry | **NO/PARTIAL** | Shared ErrorContent makes their visual responsibility intentionally common while containers differ. |
| Skeleton family | Space-preserving loading placeholders | **PARTIAL** with loaders/text | 8 importing files and 20 consumer/named calls. Suitable when shape is known. |
| DrawerSpinner/local spinners | In-control or indeterminate blocking progress | **NO/PARTIAL** with Skeleton | Mutation/route/overlay wait states need a compact indefinite indicator rather than content-shaped placeholders. |
| Literal Loading text | Minimal query state | **YES/PARTIAL** with Skeleton | 26 occurrences/15 files; sometimes a local special case, sometimes an unstandardized list/data state. Browser evidence is needed to distinguish impact. |
| ErrorBoundary | Fatal render failure/reload | **NO** | Root-level responsibility distinct from request errors. |

## Token ownership architecture

| Layer | Intended/current owner | Duplication type | Evidence and interpretation |
| --- | --- | --- | --- |
| Tailwind v4 `@theme` | Generates semantic and palette utility classes | **Intentional representation** | Required for statically generated Tailwind utilities; dominant class-based styling path. |
| `:root` semantic variables | Runtime inline styles, CSS Module, library-independent values | **Intentional representation with naming overlap** | Non-Tailwind contexts consume `--surface-*`, `--text-*`, `--brand*`, borders, spacing, radii, shadows, motion. Different names from some `@theme` aliases create authoring ambiguity. |
| `:root` raw ramps (`--blue-*`, `--slate-*`, status families) | Comment says design-system token compatibility | **Confirmed unused production alias layer** | A direct `var(--raw-ramp-name)` scan found zero actual consumers; the only matches were explanatory comments. Values duplicate `@theme` ramps. |
| `html.dark` overrides | Theme-aware CSS token values | **Intentional theme representation** | CSS/Tailwind tokens invert semantic/palette values for dark mode. |
| Mantine `createTheme.colors` | 10-shade arrays required by current Mantine theme approach | **Library-API-driven duplication with drift risk** | 72 hardcoded hex literals; App comment requires manual synchronization with `index.css`; Mantine switches shade index instead of CSS token inversion. |
| Component-local styles | Runtime values, library props, special surfaces, and some static presentation | **Mixed** | 158 inline style attributes/36 files and 404 hex literals/9 files. Some are computed or library-bound; some are fixed shared styles. A blanket “accidental” classification is unsupported. |
| Font imports | Load Public Sans and DM Mono | **Duplicate entry-point import** | Same weight CSS imported through `main.jsx` and `index.css`; runtime bundler deduplication was not measured here. |

The architecture therefore has both necessary duplication and avoidable duplication. Tailwind `@theme`, semantic runtime variables, and Mantine arrays serve different consumers under the current implementation. The unused raw `:root` ramps are direct duplicated definitions with no production `var()` consumers. Mantine’s arrays are actively required by the current configuration but create a manual synchronization risk.

## Responsive ownership architecture

| Concern | Current owner | Evidence | Relationship |
| --- | --- | --- | --- |
| Shell chrome | Layout CSS Module + Mantine AppShell/Drawer | 767/768 CSS boundary; Mantine `sm` = 768 | Coherent shared shell cutoff after July correction |
| Page layout/visibility | Tailwind utilities | 151 breakpoint prefixes/27 files | Primary CSS-first mechanism |
| Dual mobile/desktop data trees | ResponsiveDataView or local Tailwind visibility pairs | 1 shared + 7 local pairs | Same coordination job implemented centrally and locally |
| Overlay mode/animation | Mantine `useMediaQuery` inside shared overlays/forms | 639/640 boundaries | JS state is necessary because behavior/animation changes, not just CSS visibility |
| Chart sizing | Violations `useMediaQuery(max-width:767px)` | 1 page | Page-local JS behavior aligned to 768 content boundary |
| Keyboard viewport | `useKeyboardInset` / `visualViewport` | Shared responsive overlays/forms | Orthogonal to layout breakpoint system |
| Safe areas | Global CSS, Layout module, and overlay inline styles | 8 references/5 files | Distributed because fixed shell and portals each need inset handling |

**Conclusion:** one canonical breakpoint model exists for the shell and dominant table/card split—768 px—but not for all responsive behavior. Overlay components use an exact 639/640 boundary and FormModal includes 640 px while Tailwind `sm` begins at 640; chart logic uses 767/768. This is a layered model with local deviations, not one universal breakpoint source. Boundary behavior at 639/640/767/768 must be verified in 030-D.

## Architecture overlap register

| Responsibility | Implementation A | Implementation B | Implementation C | Same job? | Intentional distinction? | Evidence | Needs later decision? |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Standard actions | AppButton | Mantine Button | Raw conventional actions | **YES/PARTIAL** | **PARTIAL** | 1 / 70 / 32 closest-overlap raw actions | **YES — Spec 031** |
| Composite controls | Raw button widgets | Mantine Menu/Tabs | AppButton | **PARTIAL** | **YES/PARTIAL** | 50 non-conventional raw button templates classified above | **Some — runtime in 030-D, policy in 031** |
| Selects | AppSelect | Direct Mantine Select | Native select | **PARTIAL** | **PARTIAL** | 7 / 21 / 23; AppSelect owns overlay portal default | **YES — Spec 031** |
| Text fields | AppTextInput | Mantine TextInput | Native input | **PARTIAL** | **PARTIAL/UNCLEAR** | 2 / 19 / 25; native types vary | **YES — Spec 031** |
| Dialog tasks | ResponsiveSheet | FormModal | Direct Mantine Modal | **PARTIAL** | **YES/PARTIAL** | 10 / 8 / 2, different contracts | **YES — Spec 031 after 030-D** |
| Confirmation | ConfirmDialog | Feature-gated `window.confirm` | — | **YES** | **NO/legacy branch** | 12 shared consumers; one unreachable Notifications implementation call | **YES if feature is activated — Spec 031/product** |
| Dropdown/menu | Mantine Menu | NotificationBell custom | Reports search dropdown | **PARTIAL** | **YES/PARTIAL** | anchored action menu versus notifications/search results | **Runtime first** |
| Tables | Shared Table | Raw analytical table | Report local schema branches | **PARTIAL** | **YES** | 27 shared tables; one raw analytical table; reports reuse shared chrome | **Mobile strategy in 031 after 030-D** |
| Mobile data transformation | ResponsiveDataView/MobileList | Seven local card/table pairs | Horizontal scroll | **PARTIAL** | **PARTIAL** | data-type decision table allows different strategies; coordinator adoption is one | **YES — Spec 031** |
| Transient feedback | Custom Toast | Mantine Notifications package | — | **YES domain, one active implementation** | **NO active distinction** | 100 Toast calls; zero Notifications imports | **YES — Spec 031/package decision** |
| Inline feedback | Custom Alert | Mantine Alert in FormModal | OfflineBanner | **PARTIAL** | **YES/PARTIAL** | 13 app alerts; one wrapper-local Mantine path; unique connectivity lifecycle | **Policy question in 031** |
| Empty state | EmptyState | EmptyRow | Local empty copy/cards | **PARTIAL** | **YES/PARTIAL** | 1 / 31 / page-local | **YES after visual evidence** |
| Loading | Skeleton | Spinner | Literal text | **PARTIAL** | **YES/PARTIAL** | shape, mutation, and minimal query states differ | **YES after visual evidence** |
| Colors | Tailwind `@theme` | `:root` semantics | Mantine arrays/local literals | **PARTIAL** | **YES for consumer APIs; NO for all duplication** | current token scan and App sync warning | **YES — Spec 031** |
| Charts | Mantine Charts | Recharts peer runtime | — | **NO separate app implementations** | **YES** | zero Recharts app imports; peer required | **Only wrapper/policy question in 031** |
| Icons | Tabler | app SVG/emoji/image/CSS | — | **PARTIAL** | **YES** | no second icon library; assets serve brand/avatar/status roles | **Visual policy in 031** |

## Architecture risk register

| ID | Severity | Risk | Evidence | Impact without prescribing a solution |
| --- | --- | --- | --- | --- |
| C-R01 | **High** | Canonical action wrapper has almost no adoption and no complete boundary rule | AppButton 1; 70 Mantine Buttons outside it; 82 raw buttons, including 32 conventional actions | Action styling, variants, accessible naming, loading conventions, and touch-target guarantees can evolve differently across many files. |
| C-R02 | **High** | Theme colors have manually synchronized active sources | Tailwind/CSS definitions plus 72 Mantine theme hex literals; source comment says both must be updated | A palette/theme change can produce cross-library or light/dark drift across a broad UI surface. |
| C-R03 | **Medium** | Shared form wrapper intent and actual scope are ambiguous | AppSelect 7 versus direct/native 21/23; AppTextInput 2; AppNumberInput 0; conflicting broad versus overlay-specific historical rules | New feature authors can choose different equally plausible control paths and inherit different portal/input defaults. |
| C-R04 | **Medium** | Responsive dual-tree coordinator did not become the common implementation | ResponsiveDataView/MobileList one consumer; seven local table/card pairs | Breakpoint, state, and mobile-card conventions can diverge per screen even when the high-level strategy is the same. |
| C-R05 | **Medium** | No universal breakpoint source; a one-pixel/form boundary differs from Tailwind shell conventions | 639/640, 767/768, Tailwind/Mantine named breakpoints, CSS and JS mechanisms | Boundary-specific layout or modal-mode mismatches are possible and need runtime testing. |
| C-R06 | **Medium** | Overlay governance text contradicts the implemented nested-dialog exception | Constitution/CLAUDE say ResponsiveSheet-only; ESLint and source allow StudentSearchOverlay | Maintainers may remove a behaviorally necessary exception or copy it without understanding its narrow reason. |
| C-R07 | **Medium** | State components cover different containers but completeness/adoption is uneven | EmptyState 1; Skeleton partial; 26 loading labels; local empty/error paths | Similar screens may communicate waiting/failure/no-data differently; missing retry/offline behavior cannot be excluded statically. |
| C-R08 | **Medium** | Current detailed architecture docs combine targets, completed work, and stale implementation statements | PageHeader marked unbuilt although variants exist; old overlay deletion comments remain; feedback ownership conflicts | Documentation cannot reliably determine current ownership without source reconciliation, increasing implementation drift risk. Full truth audit is 030-F. |
| C-R09 | **Low** | Installed direct packages/utilities have no current direct/downstream source use | Mantine Notifications, Geist zero imports; `cn()` zero consumers; tailwind-merge only feeds `cn()` | Manifest intent and current production use differ, increasing maintenance uncertainty; removal is not authorized or concluded. |
| C-R10 | **Low** | Duplicate raw `:root` palette aliases have no production consumers | Source scan found definitions but no actual `var(--blue/slate/status-*)` consumers outside comments | Additional token surface can be mistaken for an active source and can drift from active values. |
| C-R11 | **Low** | Font CSS is imported through two entry points | Public Sans five weights and DM Mono imported in both main.jsx and index.css | Ownership is ambiguous; whether bundling duplicates bytes was not measured. |
| C-R12 | **Low** | A disabled feature branch retains a browser-native confirmation bypass | One `window.confirm` in Notifications; `NOTIFICATIONS_ENABLED = false` returns before that branch | If the feature is activated later, its confirmation behavior would bypass the established shared pattern. |

## Questions requiring 030-D Playwright/browser evidence

1. Do raw icon, disclosure, calendar, tab, and list-selector controls expose correct names, roles, focus indicators, and keyboard behavior in rendered DOM?
2. Do ResponsiveSheet, StudentSearchOverlay, FormModal, direct Mantine Modal, Drawer, Menu, and custom dropdowns trap/return focus and stack correctly when nested?
3. What happens at widths 639, 640, 767, and 768 px, especially FormModal fullscreen state and Tailwind visibility boundaries?
4. Which horizontal-scroll tables are usable on 360/390/412 px, and which require excessive scrolling or hide actions?
5. Do the seven local table/card pairs present equivalent actions, state feedback, and information at mobile and desktop widths?
6. Are literal loading, empty, error, retry, offline, and sync states actually reachable and readable in both themes?
7. Does the custom Toast remain visible above every overlay and avoid the bottom navigation/safe areas at required widths?
8. Do custom NotificationBell and Reports search dropdowns provide expected Escape, focus-return, outside-click, and keyboard-option behavior?
9. Do Mantine/Tailwind color representations visually agree in light/dark modes on pages that mix them?
10. Does importing font CSS twice produce duplicate requests/rules or is it deduplicated by the built bundle/browser?

## Questions explicitly deferred to Spec 031

1. What future direct-Mantine versus wrapper boundary should be authoritative?
2. Should AppButton/AppField APIs expand, remain context-specific, or cease to be canonical?
3. Which raw conventional actions, if any, should share a component and which host-specific controls remain native?
4. Which overlay task belongs to FormModal, ResponsiveSheet, ConfirmDialog, or a direct Mantine primitive?
5. Should ResponsiveDataView be required for every dual-tree page or remain optional coordination sugar?
6. What future token synchronization model should own Mantine/Tailwind/light/dark colors?
7. What package classification follows from zero direct usage after transitive/runtime needs are accounted for?
8. Is an app chart wrapper warranted for one chart page?
9. What explicit policy should govern general/page/table empty and loading states?
10. What target breakpoint vocabulary should be documented for shell, content, and behavior switches?

No answer in this section authorizes dependency removal, wrapper migration, token redesign, or component replacement.
