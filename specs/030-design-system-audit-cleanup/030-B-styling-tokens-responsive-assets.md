# 030-B — Styling, Tokens, Responsive, Typography, Icons, and Charts

Baseline: `21a7ca5f56dfd67118e6530e3f925e5607688656`.

This artifact records current implementation facts only. Counts are exact lexical source counts unless explicitly marked approximate. A lexical count measures occurrences in source and is not necessarily the number rendered at runtime.

## Styling mechanism inventory

| Mechanism | Usage evidence | Locations / notes |
| --- | ---: | --- |
| Tailwind `className` attributes | 1,117 across 49 files | Dominant component/page styling mechanism; includes static strings and expressions |
| CSS Modules | 1 module, 23 class references | `Layout.module.css`, consumed only by `Layout.jsx` |
| Global CSS | 1 primary stylesheet | `src/index.css`: Tailwind import/theme declarations, root/dark tokens, global rules, utilities, animations, safe-area helpers |
| Mantine component props/styles | 9 `styles={{...}}` occurrences across 6 files | In addition to ordinary Mantine props such as `size`, `variant`, `radius`, and responsive visibility props |
| Inline React styles | 158 `style={{...}}` attributes across 36 files | Token references, computed values, and literal values all occur |
| CSS custom-property references | 1,707 across 56 files | Includes definitions and `var(...)` consumers |
| Locally constructed style/class objects | Present | Examples: ResponsiveSheet `cancelBtnStyle`/`primaryBtnStyle`, Pagination `btnBase`, page-local input/select class strings, computed chart/color style objects |
| Tailwind breakpoint prefixes | 151 across 27 files | `sm:`, `md:`, `lg:` and related responsive variants |
| Tailwind bracket utilities | 1,622 lexical occurrences, 258 unique strings | 1,270 occurrences/129 unique strings contain `var(--...)`; 352 occurrences/129 unique strings are other literal or structural bracket utilities |

## Literal visual-value inventory

| Value type | Confirmed lexical evidence | Concentrations / representative locations |
| --- | ---: | --- |
| Hex colors | 404 across 9 files | `index.css` 288; `App.jsx` 72; `Layout.module.css` 20; remaining occurrences in component/page style data |
| RGB/RGBA/HSL values | 58 across 11 files | Global/CSS-module shadows and overlays plus local component styles |
| Gradient references | 40 across 13 files | Token definitions, avatar/background treatments, status/metric presentation, and login/dashboard visuals |
| `boxShadow` identifiers | 12 across 7 files | Inline/computed style objects |
| Tailwind shadow fragments | 15 across 10 files | Static utility classes |
| `borderRadius` identifiers | 15 across 7 files | Inline/computed style objects |
| Arbitrary Tailwind rounded utilities | 100 across 25 files | Bracketed radius values and token-backed radius utilities |

The figures above overlap: for example, a token-backed arbitrary Tailwind utility is counted under both Tailwind bracket utilities and CSS custom-property references. They are not additive totals.

## Token inventory from production code

The token source of truth observed in code is primarily `client/src/index.css`, supplemented by the Mantine theme in `client/src/App.jsx` and literal/local component values.

| Token area | Current implementation |
| --- | --- |
| Font families | `--font-sans` uses Public Sans; `--font-mono` uses DM Mono |
| Color palettes | Blue, indigo, and slate ramps; emerald, amber, red, cyan, purple, and orange status/accent families |
| Semantic colors | Surface, text, border/divider, brand, status, and selection aliases |
| Dark theme | `html.dark` overrides semantic surface/text/border/status variables |
| Typography scale | `--text-stat` 40 px through `--text-nano` 9 px; weight, line-height, and tracking variables |
| Spacing | 4 px-based spacing variables |
| Radii | `sm`, `md`, `lg`, `xl`, `2xl`, `3xl`, `sheet`, and `full` |
| Shadows | `card`, `stat`, `dropdown`, `toast`, `modal`, `sheet`, and `brand` |
| Motion | `--dur-fast: 150ms`, `--dur-sheet: 280ms`, and easing variables |
| Component dimensions | Control heights plus tab-bar and sidebar dimensions |
| Breakpoints | No CSS custom-property breakpoint token found; values are expressed through Tailwind prefixes, Mantine breakpoints/hooks, CSS media queries, and JS parameters |
| Z-index | No centralized z-index scale found; local values are used by shell and overlay implementations |

There are 312 custom-property definition occurrences and 211 unique custom-property names in `index.css`. Definition occurrences exceed unique names because dark-theme and contextual overrides repeat names.

### Factual duplicated definitions

- Color information is represented in Tailwind `@theme` declarations, `:root` semantic aliases, `html.dark` overrides, and the Mantine theme color arrays in `App.jsx`.
- The Mantine theme contains 72 hex literals and mirrors parts of the CSS/Tailwind palette relationship.
- Public Sans and DM Mono side-effect font imports occur in both `main.jsx` and `index.css`.
- Breakpoint values are repeated through different mechanisms: 768/767 px in layout CSS and page logic; 639/640 px in overlays/forms/reports; Tailwind `sm`/`md` utilities; and Mantine `sm` visibility behavior.
- Z-index values are local: desktop header 40; mobile header 50; bottom navigation 100; OfflineBanner 70; FormModal default 115; ResponsiveSheet 110/111; StudentSearchOverlay 200/201; Toast 1000; and additional feature-local values such as Reports 20 and Students bulk actions 40.

These are representation/duplication facts, not judgments about which definitions should remain.

## Responsive implementation inventory

| Mechanism / behavior | Confirmed evidence | Locations / details |
| --- | ---: | --- |
| Tailwind breakpoint utilities | 151 occurrences across 27 files | Page layout, hiding/showing alternatives, grids, sizing, and density |
| CSS media queries | 6 across 2 files | One in `index.css`; five in `Layout.module.css`; primary boundary is 768/767 px |
| Mantine `useMediaQuery` | 5 files | FormModal max-width 640; ResponsiveSheet max-width 639; StudentSearchOverlay max-width 639; Reports max-width 639; Violations max-width 767 |
| Mantine responsive props | Present | Layout Drawer `hiddenFrom="sm"`; AppShell behavior uses the Mantine `sm` boundary |
| Shared dual-tree rendering | 1 consumer | `ResponsiveDataView` in Duty Slots; supports `sm`, `md`, or `lg` class-map boundaries |
| Hand-built table/card alternatives | 7 pages | Flagged Violations, Settings violation types, Students, Users, Violations, All Faculty Duties, Audit Logs |
| JS viewport API | 1 hook | `useKeyboardInset` reads `visualViewport`; no production `matchMedia` call found |
| Safe-area handling | 8 references across 5 files | `index.css`, `Layout.module.css`, FormModal, ResponsiveSheet, StudentSearchOverlay |
| Mobile bottom navigation | Fixed shell implementation | Height 60 px, z-index 100, corresponding content padding; Students mobile bulk-action bar sits above it at bottom 60 px |
| Mobile sheet/dialog behavior | Shared and local paths | ResponsiveSheet and StudentSearchOverlay switch at 639 px; FormModal becomes fullscreen at 640 px; Layout Drawer switches at Mantine `sm` |
| Horizontal table fallback | Shared behavior | Shared Table uses Mantine `Table.ScrollContainer`, default `minWidth=500`; report tables retain this path on mobile |

No production-code `matchMedia` check was found. Conditional mobile/desktop rendering is implemented through a mix of CSS visibility, Mantine hooks/props, and component branches.

## Typography inventory

| Area | Confirmed evidence | Notes |
| --- | ---: | --- |
| Loaded Public Sans weights | 400, 500, 600, 700, 800 | Imported in both `main.jsx` and `index.css`; applied globally through the sans token/body styles |
| Loaded DM Mono weight | 400 | Imported in both locations; used through mono token/utilities |
| Geist variable package | Zero direct import usage found | Package presence is recorded in the dependency inventory; no usage conclusion is made here |
| Token-backed arbitrary text utilities | 198 across 30 files | Examples use CSS text-size variables through Tailwind bracket syntax |
| Literal pixel text utilities | 181 across 27 files | Lexical arbitrary `text-[Npx]` forms |
| Standard Tailwind text-size utilities | 49 across 18 files | Non-bracket Tailwind sizes |
| Sans font references/utilities | 9 across 8 files | Most text inherits the global body family and therefore is not represented by this count |
| Mono font references/utilities | 13 across 8 files | IDs, numeric/time/data presentation and explicit mono treatments |
| Native heading elements | 15 across 9 files | Page- and component-level headings outside Mantine Title |
| Mantine `Title` | 3 JSX instances | All inside the `PageHeader` implementation |
| Shared `PageHeader` | 17 instances across 16 pages | Three pages use local/custom page headings instead |
| Global `.page-title` class | Definition present, zero production references found | Source-search fact only |

## Icons and visual assets

| Source | Confirmed usage | Locations / responsibility |
| --- | ---: | --- |
| `@tabler/icons-react` | 16 importing files; 40 unique named icon symbols; 53 named imports | Shell navigation, actions, alerts, role/avatar imagery, search, forms, and state presentation |
| Inline SVG | 2 components | `FacultyAvatarIcons.jsx`, registered through `utils/avatars.js` |
| Image elements | 3 JSX instances | App splash, Layout logo, and Login logo; all reference `sims-logo.png` |
| Unicode symbol/emoji-like characters | Approximate upper bound: 66 symbol occurrences across 33 files | Unicode-category scan includes rendered emoji, arrows/symbols, comments, and source text; it is not an exact rendered-emoji count |
| CSS-created visuals | Present | Border-based loading spinners, gradient backgrounds, avatar/status circles, and pseudo/box-shadow treatments |
| Other icon libraries | Zero direct imports found | No additional frontend icon package import was discovered |

Static reference search found `sims-logo.png` in use. `hero.png`, `react.svg`, and `vite.svg` had zero static source references; dynamic/runtime reference behavior was not evaluated in this phase.

## Chart implementation inventory

| Implementation | Usage evidence | Responsibility / styling |
| --- | ---: | --- |
| `@mantine/charts` | 1 importing file | `ViolationsPage.jsx` imports `LineChart` and `BarChart` |
| Mantine `LineChart` | 1 JSX instance | Violation trend rendering |
| Mantine `BarChart` | 2 JSX instances | Category/comparison analytics in Violations |
| Direct `recharts` imports | Zero direct usage found | No feature or wrapper imports discovered |
| App chart wrapper | None found | Violations configures chart components locally |
| Chart styling | Local configuration | Mantine/CSS-token references plus local raw-hex series definitions such as year-series colors |

The installed-package relationship between Mantine Charts and Recharts is reserved for 030-C. This section records direct source imports only.

## Counting limitations

- JSX tags inside conditional branches, maps, and reusable components can render zero, one, or many runtime instances.
- Regex counts include source syntax and do not resolve aliasing, generated code, or runtime composition.
- Tailwind and CSS counts overlap when a utility embeds a CSS variable.
- Unicode symbol scanning cannot reliably distinguish rendered emoji from comments, arrows, or other symbols; its count is explicitly approximate.
- Static asset searches do not prove that a dynamically constructed URL is unreachable.
