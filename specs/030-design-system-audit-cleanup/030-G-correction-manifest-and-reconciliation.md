# 030-G — Documentation Correction Manifest and Reconciliation

## Scope

Corrections in this phase make active documentation and AI-agent guidance match the audited implementation at `21a7ca5f56dfd67118e6530e3f925e5607688656`. They do not change product code or select a target architecture. Evidence is from 030-C current architecture, 030-D browser verification, 030-E visual findings, and 030-F documentation audit.

## Correction manifest

| Document | Old/stale claim | Corrected current truth | Audit evidence | Type |
| --- | --- | --- | --- | --- |
| `CONSTITUTION.md` §2 | Radix/Framer could be used solely inside ResponsiveSheet. | They are internal shared-overlay infrastructure; ResponsiveSheet and the current nested StudentSearchOverlay exception are documented. Feature pages remain prohibited from direct use. | 030-C dependency map; StudentSearchOverlay source; 030-D nested-overlay evidence; 030-F DOC-03. | Current-exception clarification |
| `CONSTITUTION.md` §2 | Vaul and Lucide were described as active incremental-removal paths. | Neither had direct baseline source use; both are historical/deprecated and must not be added. Tabler is the current third-party icon library. | 030-C dependency/icon evidence; 030-F architecture matrix. | Library-status correction |
| `CLAUDE.md` | “ResponsiveSheet once it exists” was the only Radix/Framer location; icon wording implied active Lucide migration. | ResponsiveSheet exists; StudentSearchOverlay is the bounded exception; Tabler is established and no direct Lucide imports were found. | 030-C/F. | Agent-safety correction |
| `CLAUDE.md` | Accessibility wording implied established overlay behavior was uniformly preserved. | Current instruction preserves behavior and explicitly tells agents to verify tested focus-return gaps. | 030-D tested FormModal/ConfirmDialog results; 030-F missing-truth register. | Limitation clarification |
| `docs/UI_ARCHITECTURE.md` | July 2026 target snapshot described unbuilt ResponsiveSheet/PageHeader, canonical wrappers, Mantine Notifications feedback, old overlay/icon counts, and universal future targets as current. | Replaced with current ownership/adoption map: built ResponsiveSheet/PageHeader, partial wrapper adoption, custom Toast feedback, current overlay/data-view landscape, Tabler, font/theme, explicit exception, and deferred decisions. | 030-B/C; 030-D; 030-F DOC-04/05/08. | Current-guidance replacement |
| `docs/MOBILE_PATTERNS.md` | One cutoff governed mobile behavior; PageHeader/ResponsiveSheet were unbuilt; tables/cards and state patterns were universal. | Records 768 shell/list behavior, 639/640 and 640/641 overlay boundaries, built variants/sheet, mixed table/card patterns, 030-D Reports clipping, safe-area navigation, and uneven state adoption. | 030-C; 030-D; 030-F DOC-06. | Current-guidance replacement |
| Design skill `SKILL.md` | DM Sans, Lucide, fixed mobile emoji vocabulary, Telegram OTP, and prototype components were presented as production guidance. | Rewritten as audited current-state guidance: Public Sans/DM Mono, Tabler, email/password auth, shell/breakpoint facts, mixed component adoption, overlay exception, custom Toast, and historical-prototype boundary. | 030-C/E/F; `main.jsx`, `index.css`, `Layout.jsx`. | AI-agent guidance replacement |
| Design skill `readme.md` | Older prototype visual/auth/component model and historical branch were described as the product. | Rewritten as current production reference; legacy assets, prompts, and kits are explicitly historical and not production component sources. | 030-F DOC-01/02. | AI-agent guidance replacement |
| Root `README.md` | Present-tense overview contained old OTP, cover-workflow, schema, and frontend claims. | Adds a current-facts section and conspicuous boundary that the retained detailed snapshot is historical, directing readers to active guides. | 030-F DOC-09; Constitution current auth. | Current-entry-point clarification |
| `client/README.md` | Stock Vite template supplied no SIMS orientation. | Replaced with concise current client orientation, governing document links, and actual workspace commands. | 030-F DOC-10. | Obsolete guidance replacement |
| `FRONTEND_ARCHITECTURE_AUDIT.md` | Obsolete shadcn/Geist/action instructions looked operational. | Adds a conspicuous historical/obsolete header and directs production readers to active guidance. | 030-F DOC-07. | Historical-context marker |
| `specs/color-system-notes.md` | Deferred color notes could still be read as current architecture guidance. | Retains the backlog but explicitly requires revalidation against current product and Spec 030 before later use. | 030-F correction-scope preparation. | Historical-context clarification |

## Before/after truth summary

| Topic | Before 030-G | After 030-G |
| --- | --- | --- |
| Primary font | Active agent skill instructed DM Sans. | Active guidance consistently states Public Sans; DM Mono is mono; Geist has no direct production use. |
| Icons | Skill instructed Lucide and fixed emoji mobile vocabulary. | Active guidance establishes Tabler and describes emoji as current screen-specific usage, not a mandate. |
| Authentication | Skill/root overview led agents toward Telegram OTP. | Current references state email/password with httpOnly-cookie/CSRF session; Telegram is notifications only. |
| ResponsiveSheet/PageHeader | Active UI/mobile guides said not built. | Active guides state both are implemented and describe limited/current adoption accurately. |
| Radix/Framer | Constitution/CLAUDE omitted direct nested-overlay exception. | General internal boundary is retained and StudentSearchOverlay is explicitly bounded. |
| Feedback | UI Architecture named Mantine Notifications as canonical. | Active guides state custom Toast is current and notifications have zero direct production imports. |
| Responsive/mobile | Guide presented one breakpoint and universal cards/states. | Current facts distinguish shell, overlay boundaries, mixed lists/tables, Reports clipping, and uneven state adoption. |
| Historical material | Obsolete root audit looked actionable; skill assets looked current. | Both are explicitly contextualized as historical rather than rewritten out of history. |

## Active-document contradiction re-check

| Topic | Re-check result | Evidence |
| --- | --- | --- |
| Font policy | CONSISTENT: active guides identify Public Sans + DM Mono; DM Sans/Geist/Lucide references are prohibitions or historical context. | Constitution history, CLAUDE, UI Architecture, Mobile Patterns, skill, root/client README. |
| Icon policy | CONSISTENT: Tabler is established; Lucide is prohibited/deprecated with no direct baseline imports; emoji are not prescribed as a system. | Constitution §2, CLAUDE, UI Architecture, skill. |
| Authentication | CONSISTENT: active entry points/skill state email/password; historical root material is explicitly labelled. | Constitution §4, skill, root README banner. |
| Overlay policy | CONSISTENT: ResponsiveSheet is implemented; Radix/Framer remain internal; StudentSearchOverlay is the bounded exception; alternatives are described as current. | Constitution §2, CLAUDE, UI Architecture, Mobile Patterns, skill. |
| Feedback ownership | CONSISTENT: custom Toast is current, Alert is inline feedback, Mantine Notifications has no direct production imports. | UI Architecture, skill/readme, 030-C. |
| PageHeader / sheet status | CONSISTENT: both are implemented; no active document says “not built yet.” | UI Architecture, Mobile Patterns, skill/readme. |
| Responsive data behavior | CONSISTENT: 768 shell/list boundary is distinct from overlay boundaries; table/card patterns remain mixed and Reports clipping is disclosed. | UI Architecture, Mobile Patterns, skill/readme, 030-D. |

## AI-agent safety reconciliation

Reading the corrected active guidance as a new agent should now prevent these incorrect actions:

- importing Lucide or loading a Lucide CDN;
- applying DM Sans or Geist as the production UI face;
- generating Telegram OTP authentication UI;
- rebuilding an “unbuilt” ResponsiveSheet or PageHeader variants;
- creating a separate overlay stack or copying StudentSearchOverlay’s Radix/Framer exception;
- treating AppButton/AppField/ResponsiveDataView as universal migration mandates;
- introducing Mantine Notifications as the current toast path;
- assuming Reports mobile tables are already resolved;
- treating legacy UI kits or prompt components as production sources; or
- making a Design System V2, library, or visual-policy decision reserved for Spec 031.

## Historical documents intentionally left unchanged

- `specs/012-frontend-design-consistency-audit/handoff.md` — historical record.
- `specs/025-ui-architecture-consolidation/plan.md` and `handoff.md` — historical plan/progress layers.
- `MOBILE_DESIGN_RULES.md` and `MOBILE_UI_FIXES.md` — already explicitly archived.
- Legacy prototype files under `.claude/skills/SIMS DMS Design System/{styles.css,tokens,guidelines,components,ui_kits}` — preserved as historical artifacts and bounded by corrected active skill entry guidance.

## Remaining unresolved architecture questions

1. Whether StudentSearchOverlay remains a sanctioned long-term Radix/Framer exception is reserved for owner/Spec 031; 030-G only documents its current fact and boundary.
2. Which direct Mantine, raw/native control, and page-specific list/data-view patterns become sanctioned future boundaries is not decided.
3. Retention/removal or future role of installed-but-directly-unused `@mantine/notifications` and Geist is not decided.
4. Any solution for the browser-confirmed Reports mobile table clipping is not selected.
5. Dashboard/report visual patterns, including gradients, emojis, rounded cards, and accent density, remain future product/design decisions.
