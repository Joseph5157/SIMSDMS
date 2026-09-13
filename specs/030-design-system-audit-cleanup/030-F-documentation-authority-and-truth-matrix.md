# 030-F — Documentation Authority and Current-Truth Matrix

## Scope and evidence rule

This is a read-only documentation audit at product baseline `21a7ca5f56dfd67118e6530e3f925e5607688656`. Code is the authority; 030-D browser evidence resolves rendered/mobile claims; 030-B/C/E provide audited context. Documentation is evaluated evidence, not authority. Historical plans are retained as history rather than recast as current guidance.

## Documentation authority map

| Document | Intended audience | Apparent authority | Currentness | Risk if followed literally |
| --- | --- | --- | --- | --- |
| `CONSTITUTION.md` §2 | All contributors and AI agents; `CLAUDE.md` directs it be read first | Declared project single source of truth | PARTIALLY STALE | High: it says Radix/Framer may exist solely in `ResponsiveSheet`, but `StudentSearchOverlay.jsx` directly imports both for nested-dialog focus behavior. |
| `CLAUDE.md` UI Architecture | Claude/Codex contributors, automatically prominent | Operational instruction which points to Constitution and the two guides | PARTIALLY STALE | High: repeats the sole-`ResponsiveSheet` rule and “once it exists” language although the sheet and the documented nested exception exist. |
| `docs/UI_ARCHITECTURE.md` | Frontend contributors, “required reading” | Detailed policy beneath Constitution | PARTIALLY STALE / CONTRADICTORY | High: much of §1–3 is a July migration snapshot presented as present tense (unbuilt sheet, Lucide/Vaul live, old overlay count, Mantine notifications target). |
| `docs/MOBILE_PATTERNS.md` | Frontend contributors | Companion current mobile guidance | PARTIALLY STALE | High: its 768px shell rule is current, but PageHeader is incorrectly “not built,” overlay references use future tense, and universal-state/table claims overstate implementation. |
| `.claude/skills/SIMS DMS Design System/SKILL.md` and `readme.md` | Invoked AI design work and prototypes | User-invocable design guidance with reusable assets | STALE | High: directs generated production work to DM Sans, Lucide, emoji navigation, Telegram OTP, and an older component/UI-kit model. |
| `.claude/skills/.../components/*.prompt.md` | AI/HTML artifact authors | Concrete component instructions beneath that skill | STALE | High: promotes non-production native controls, fixed old mobile rules, synthetic components, emojis, and obsolete invite/OTP assumptions. |
| `specs/025-ui-architecture-consolidation/plan.md` | Historical implementation initiative | A plan plus progress log, not a current standard | HISTORICAL ONLY | Medium if read as current: its early target tables conflict with later progress text and current source. |
| `specs/025-ui-architecture-consolidation/handoff.md` | Historical handoff | Progress record | HISTORICAL ONLY | Medium: correctly records work at that time but leaves unstarted waves and old counts that are not current state. |
| `specs/012-frontend-design-consistency-audit/handoff.md` | Historical audit handoff | Historical record | HISTORICAL ONLY | Low: it clearly records completed batches and remaining work, and usefully corroborates uneven state patterns. |
| `specs/030-design-system-audit-cleanup/audit-roadmap.md` | Current audit operators | Phase contract | CURRENT | Low: it correctly constrains this phase; it does not describe product implementation as truth. |
| `specs/color-system-notes.md` | Future maintainers | Explicit deferred/backlog reference | HISTORICAL ONLY / PARTIALLY STALE | Medium: its status disclaimer is clear, but its claim that raw `:root` ramps are unused and its layer description require a recheck before action. |
| `MOBILE_DESIGN_RULES.md` | Historical contributors | Explicitly archived | HISTORICAL ONLY | Low: banner says superseded, though its “bottom bar removed” statement itself is false today. |
| `MOBILE_UI_FIXES.md` | Historical fix implementers | Explicitly applied/archived | HISTORICAL ONLY | Low: the archive banner prevents it being current guidance; its source snippets must not be copied. |
| `FRONTEND_ARCHITECTURE_AUDIT.md` | Earlier implementation/fix session | Looks operational (“Reference daily,” “Send to Claude”) despite no archive marker | OBSOLETE | High: describes shadcn, Geist, old component paths, and an actionable fix order that does not match the baseline. |
| Root `README.md` | Project overview / new contributors | General project overview | STALE | Medium: it still describes Telegram OTP, cover-request volunteering, an old schema, and old frontend claims. |
| `client/README.md` | Frontend developers | Vite starter readme | OBSOLETE | Low: generic template does not describe SIMS DMS at all. |

## Architecture documentation truth matrix

| Topic | Documentation statement | Actual audited truth | Classification / risk | Evidence |
| --- | --- | --- | --- | --- |
| Mantine role | Constitution §2 and UI Architecture §1 say Mantine owns accessible primitives/focus behavior, Tailwind owns layout/responsive work. | Direct Mantine use remains broad (030-B: 34 files import core); Tailwind is broad styling/layout. The division is useful, but direct Mantine Button, inputs, Modal, Drawer, and page styling coexist with wrappers. | CURRENT core idea; PARTIALLY STALE if interpreted as exclusive ownership. Medium. | `client/src/App.jsx`; 030-B component inventory; 030-C dependency responsibility. |
| Overlay ownership | Constitution §2, `CLAUDE.md` lines 22–24, UI Architecture §1/§5 say Radix/Framer only inside `ResponsiveSheet`. | `ResponsiveSheet.jsx` and `StudentSearchOverlay.jsx` both import Radix Dialog and Framer Motion. The latter documents its nested-dialog/focus reason. | CONTRADICTORY. High agent risk. | `StudentSearchOverlay.jsx:2–34`; 030-C responsibility audit; 030-D nested-sheet evidence. |
| Vaul / old drawers | UI Architecture §2 says `ResponsiveSheet` replaces BottomDrawer/SheetModal and waits to delete both; Constitution says Vaul deprecated. | No installed `vaul` dependency at baseline. `ResponsiveSheet`, `FormModal`, `ConfirmDialog`, direct Mantine Modal, and drawers remain. Documentation's older Vaul/BottomDrawer inventory is no longer current. | PARTIALLY STALE. Medium. | `client/package.json`; 030-B/C overlay counts. |
| Buttons/forms | UI Architecture §3 calls `AppButton` and AppField the canonical target. | `AppButton` has one consumer; AppSelect has 7 calls in 3 files; direct Mantine controls and raw/native controls remain much more common. | PARTIALLY STALE: target language masquerades as broad present-tense standard. High. | `AppButton.jsx`, `AppField.jsx`; 030-B inventory. |
| Tables | UI Architecture §3 calls `ResponsiveDataView` canonical target. | It has one consumer; Table is used across 12 files; seven pages implement their own mobile card/table pairs. | PARTIALLY STALE. Medium. | `ResponsiveDataView.jsx`; 030-B; 030-D 767/768 captures. |
| Feedback | UI Architecture §2 says Mantine notifications replaces custom toast/banner; §3 says Toast/Alert already consolidated. | `@mantine/notifications` is installed but has zero direct app imports. Custom `Toast` has 25 consumers/100 calls; Alert coexistence and ad-hoc states remain. | CONTRADICTORY. High. | `client/package.json`, `Toast.jsx`; 030-B/C; 030-E state review. |
| Icons | Constitution/UI Architecture/CLAUDE say Tabler is default and Lucide deprecated. | Tabler imports are current (16 files, 53 imports); no Lucide imports in current source. | CURRENT, with stale historical counts in UI Architecture. Low. | `Layout.jsx`; 030-B/C icon inventory. |
| Charts | Documentation describes Mantine as broad UI owner and old plans name Recharts. | `@mantine/charts` has one direct page use; Recharts has no direct source import. | MISSING current boundary. Medium. | `client/package.json`; 030-C dependency map. |
| Token/theme responsibility | UI Architecture §4 accurately identifies `@theme`, `:root`, and Mantine-theme synchronization risk. | `index.css` has semantic light/dark tokens and `App.jsx` carries a Mantine theme; 030-C confirmed manual synchronization. Some “target” naming is not wholly implemented. | CURRENT diagnosis; PARTIALLY STALE target prescription. Medium. | `index.css:36,249–250,449–450`; `App.jsx`; 030-C. |

## Component-status truth matrix

| Component / pattern | Documented status | Actual status | Classification | Evidence |
| --- | --- | --- | --- | --- |
| `ResponsiveSheet` | UI Architecture §1 and Mobile Patterns §4 say Phase 2 / “not yet built” / “once it exists.” | Built and used in 10 locations. | STALE, High. | `ResponsiveSheet.jsx`; 030-B; 030-D overlay captures. |
| `PageHeader` variants | UI Architecture §3 and Mobile Patterns §5 say no variant prop and “not built yet.” | `Layout.jsx` exports `centered`, `operational`, and `compact`; default remains centered. | STALE, Medium. | `Layout.jsx` PageHeader block; 030-D route captures. |
| `AppButton` | Target/canonical AppButton language. | Exists, but one consumer only; direct Mantine/raw buttons dominate. | PARTIALLY STALE, High if read as a mandate. | `AppButton.jsx`; 030-B. |
| AppField family | Target/canonical AppField language. | `AppSelect`/`AppTextInput` exist; AppNumberInput has no consumer; direct Mantine/native inputs remain common. | PARTIALLY STALE, Medium. | `AppField.jsx`; 030-B. |
| `ConfirmDialog` | “Already consolidated,” 11 consumers. | Exists with 12 consumers in 030-B; visual use is consistent, but 030-D found focus return false in tested cases. | CURRENT existence/count broadly; MISSING behavioral limitation. Medium. | `ConfirmDialog.jsx`; 030-B; 030-D issue register. |
| `ResponsiveDataView` | Canonical target. | Exists but one consumer. | PARTIALLY STALE, Medium. | `ResponsiveDataView.jsx`; 030-B. |
| `EmptyState` / state components | Mobile Patterns says every data screen handles skeleton, empty, error/retry, offline and “these already exist.” | Components exist, but 030-C/E found uneven deployment; 030-D did not capture valid forced empty/error states. | PARTIALLY STALE, Medium. | 030-B/C/E and 030-D coverage gap. |
| BottomDrawer / SheetModal | Historical Phase 025 target/replacement inventory. | These named files are not current UI inventory; current overlay alternatives are as above. | HISTORICAL ONLY in spec 025; STALE in current guide prose. Medium. | `client/src/components/ui/`; 030-B/C. |

## Typography, icons, color, and theme truth

| Subject | Documented guidance | Actual implementation / rendered evidence | Classification / risk |
| --- | --- | --- | --- |
| UI font | Design skill says DM Sans everywhere and CDN font loading. | Public Sans 400–800 is imported in `main.jsx` and `index.css`; `--font-sans` is Public Sans. DM Mono remains mono. 030-D/E screenshots show the current loaded UI font. | STALE, High for agent guidance. |
| Geist | `FRONTEND_ARCHITECTURE_AUDIT.md` calls Geist/shadcn font active. | Geist remains installed but has zero production direct imports; it is not the rendered UI font. | OBSOLETE, Medium. |
| Mono | Skill says DM Mono; code loads DM Mono. | Current, though its claimed uses (OTP timers/codes) are no longer a current authentication flow. | PARTIALLY STALE, Low. |
| Icon policy | Design skill says Lucide desktop + fixed emoji mobile and invites a Lucide CDN import. | Current application uses Tabler; 030-E found emoji concentrated in Reports/report catalogue rather than fixed mobile navigation. | STALE / CONTRADICTORY, High. |
| Gradient policy | Skill says one gradient only on brand mark/login CTA; flat elsewhere. | `index.css` defines two brand gradients (light/dark), and 030-B found 40 gradient references in 13 files. 030-E observed dashboard hero, duty hero, and other gradient use. | CONTRADICTORY, High. |
| Color/status | Skill's slate/blue and semantic tinted status direction broadly aligns with 030-E's coherent base. | Current tokens include blue/indigo, emerald/amber/red/slate and light/dark variants; dashboards add multi-accent identity. | PARTIALLY STALE, Medium. |
| Color systems | `specs/color-system-notes.md` calls raw `:root` ramps dead and says only three parallel systems. | 030-C confirmed token/manual Mantine synchronization still matters; the exact “nobody” assertion must be re-verified before acting. Its deferred status is explicit. | HISTORICAL ONLY / UNCLEAR detail, Low. |

## Responsive, accessibility, and state-pattern truth

| Claim | Current / browser truth | Classification / risk | Evidence |
| --- | --- | --- | --- |
| 768px is the shell/table cutoff | Correct for shell: `Layout.jsx` uses Mantine `sm`/768 and 030-D confirmed 767 cards to 768 tables. | CURRENT, Low. | `Layout.jsx`; `Layout.module.css`; 030-D coverage matrix. |
| One mobile cutoff governs overlays | Mobile guide’s “single cutoff” overgeneralizes. `FormModal` switches around 640/641, while ResponsiveSheet/StudentSearchOverlay/Reports use max-width 639 and shell/list uses 767/768. | PARTIALLY STALE, High. | `FormModal.jsx`, `ResponsiveSheet.jsx`, `StudentSearchOverlay.jsx`; 030-D. |
| Tables always become cards / never tables under 768 | Archived Mobile Rules and skill prompt prescribe it. | 030-D found report-sheet tables clip at 360/390/412; Table scroll containers and page-specific strategies still exist. | STALE in skill; HISTORICAL ONLY in archived rule. High for skill. | 030-D issue register/screenshots; 030-B. |
| 44px targets globally enforced | Mobile Patterns says globally enforced on Mantine Button. | 030-D heuristic found rendered visible Reports controls 37–40px and a breadcrumb 36×16; hidden duplicate controls inflated total observations. | PARTIALLY STALE, Medium. | 030-D issue register/screenshots. |
| Overlay safety / focus | Guides prescribe safe areas, keyboard safety, and focus behavior. | Safe-area/mobile structure is visibly present, but 030-D found focus return false for tested FormModal/ConfirmDialog. | PARTIALLY STALE; MISSING known limitation. Medium. | 030-D overlay observations. |
| Required loading/empty/error/offline states | Mobile Patterns claims each data screen handles all and components already exist. | 030-C/E show uneven component use; 030-D only verified offline and did not capture valid forced empty/error results. | PARTIALLY STALE, Medium. | 030-C/E; 030-D closure. |

## Cross-document contradiction register

| Topic | Document A says | Document B / code says | Current observed truth | Risk |
| --- | --- | --- | --- | --- |
| Radix/Framer boundary | Constitution + CLAUDE: only ResponsiveSheet. | `StudentSearchOverlay.jsx` directly imports each and explains its nested-dialog need. | One documented-in-code exception exists. | High |
| ResponsiveSheet readiness | UI Architecture/Mobile Patterns: not built / once it exists. | Spec 025 later progress and source: built; 10 uses. | Built production component. | High |
| PageHeader readiness | Mobile Patterns: no variant prop, target only. | `Layout.jsx`: three variants. | Built, centered default. | Medium |
| Feedback owner | UI Architecture §2: Mantine notifications replaces custom feedback. | UI Architecture §3 / source: custom Toast is present and heavily used; no app notifications import. | Custom Toast is current feedback path. | High |
| Font | Design skill: DM Sans. | Constitution version history + source: Public Sans; DM Mono. | Public Sans UI. | High |
| Icons | Design skill: Lucide desktop + emoji mobile. | Constitution/CLAUDE/source: Tabler default, no Lucide source imports. | Tabler current; emoji not a mobile-nav system. | High |
| Gradients | Skill: only brand/login. | tokens + 030-E: dashboard and sheet/action gradients recur. | Broader current use. | High |
| Mobile table policy | Skill/archived rules: all tables cards below 768. | 030-D: Reports uses clipped tables in mobile sheets; Table scroll remains. | Mixed, not universal. | High |

## Correction-scope preparation for 030-G (documentation only)

| Document | Eventual action | Scope, without choosing future architecture |
| --- | --- | --- |
| `CONSTITUTION.md` §2 | ADD CLARIFICATION | Record the existing nested `StudentSearchOverlay` Radix/Framer exception, or obtain owner decision if it is not sanctioned. |
| `CLAUDE.md` | UPDATE | Remove “once it exists” language and make exception/actual overlay guidance factual. |
| `docs/UI_ARCHITECTURE.md` | REPLACE CURRENT-GUIDANCE SECTION | Separate delivered state from 025 historical targets; correct overlay, wrapper adoption, Toast, icon counts, PageHeader, and current exceptions. |
| `docs/MOBILE_PATTERNS.md` | UPDATE | Preserve verified 768 guidance; correct PageHeader/ResponsiveSheet state, document 639/640 overlay boundary and mixed table reality, qualify state/touch claims. |
| Design-system `SKILL.md` / `readme.md` / prompts | REPLACE CURRENT-GUIDANCE SECTION | Describe current font, Tabler policy, real auth/brand/component boundaries, and label prototype kit/history. Do not make a future visual decision. |
| `FRONTEND_ARCHITECTURE_AUDIT.md` | MARK HISTORICAL | Add conspicuous historical/obsolete status before anyone follows its executable instructions. |
| Root `README.md` | UPDATE | Correct baseline product/auth/workflow/architecture statements; retain history only where labelled. |
| `client/README.md` | REMOVE OBSOLETE GUIDANCE | Replace starter template text with minimal client-specific orientation, or link to root docs. |
| `MOBILE_DESIGN_RULES.md`, `MOBILE_UI_FIXES.md`, 012/025 artifacts | NO CHANGE / MARK HISTORICAL as needed | Preserve history; only improve archival labelling where a document can plausibly be mistaken for operating guidance. |
| `specs/color-system-notes.md` | ADD CLARIFICATION | Keep it deferred; timestamp/revalidate factual assertions before a later color task. |

## Unresolved owner decisions

1. Is `StudentSearchOverlay` a sanctioned long-term exception to the documented Radix/Framer boundary, or should current guidance instead state a different boundary? This audit does not choose it.
2. Which existing direct Mantine, raw-control, and page-specific data-view exceptions should be declared sanctioned rather than left as target-migration debt? Evidence establishes their existence, not their future status.
3. Should the historical design-skill assets remain an explicitly historical prototype kit, or become current production guidance after factual correction? This audit does not redesign the skill.
4. Whether mobile report tables should remain an allowed scroll/table pattern is a product/architecture question; 030-D establishes clipping, not a replacement.
