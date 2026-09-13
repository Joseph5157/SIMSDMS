# 030-F — Historical, Agent-Risk, Missing-Truth, and Documentation-Risk Register

## Historical-spec classification

| Record | Intended change / record | Status as documentation | Current-truth handling |
| --- | --- | --- | --- |
| `specs/012-frontend-design-consistency-audit/handoff.md` | Records an earlier consistency pass, including Reports error wiring, removal of duplicate `ui/PageHeader`, and known uneven loading/empty states. | HISTORICAL ONLY. | Keep as a dated record. Its remaining-state observations are corroborative, not present-tense policy. |
| `specs/025-ui-architecture-consolidation/plan.md` | Proposed four-phase controlled hybrid consolidation; later appended delivery/progress entries. | HISTORICAL ONLY. | Do not treat early “target/not built/Phase 4” sections as current. It accurately preserves architectural evolution but contains its own timeline layers. |
| `specs/025-ui-architecture-consolidation/handoff.md` | Phase/wave implementation handoff. | HISTORICAL ONLY. | Useful evidence for why the wrappers and variants were introduced; not a current adoption matrix. |
| `specs/030-*` A–E | Current signed-off audit evidence. | CURRENT as audit record, not design policy. | Use as evidence only; 030-F does not rewrite these records. |
| `MOBILE_DESIGN_RULES.md` | Pre-Mantine mobile rules. | HISTORICAL ONLY (self-labelled archived). | Preserve history; do not copy its universal card/table or nav assertions into new work. |
| `MOBILE_UI_FIXES.md` | June 2026 screenshot-derived fixes. | HISTORICAL ONLY (self-labelled applied/archived). | Preserve history. Some declared fixes need current browser revalidation, already supplied by 030-D where covered. |
| `FRONTEND_ARCHITECTURE_AUDIT.md` | Earlier fix proposal for competing Tailwind/inline/shadcn systems. | OBSOLETE. | It is not labelled archival despite code snippets and commands; it needs a clear historical marker before use by agents. |
| `specs/color-system-notes.md` | Deferred color-system backlog. | HISTORICAL ONLY. | Its explicit “not scheduled” status is good; assertions should be revalidated before any later implementation. |

## AI-agent instruction risk audit

| Instruction source / statement | Conflict with current truth | Risk | Classification | Evidence |
| --- | --- | --- | --- | --- |
| Design skill `SKILL.md` essentials: “DM Sans + DM Mono.” | UI font is Public Sans; only mono is DM Mono. | HIGH | STALE | `main.jsx:5–10`, `index.css:36–37`; 030-D/E rendered evidence. |
| Design skill `SKILL.md`: “Lucide (desktop) + fixed emoji vocabulary (mobile).” | Current icon policy is Tabler; current source has no Lucide imports; emojis are not the shell’s fixed icon system. | HIGH | CONTRADICTORY | Constitution §2; `Layout.jsx`; 030-B/C; 030-E. |
| Skill readme permits loading Lucide CDN / `lucide-react`. | Would reintroduce a retired icon library. | HIGH | STALE | skill readme Iconography; Constitution §2. |
| Skill readme defines Telegram-OTP login, OTP copy, and 6-box kit login. | Current documented/authenticated product login is email/password; old root README repeats OTP history. | HIGH | STALE | Constitution §4; current Login source reviewed in 030-B/D; 030-D login evidence. |
| Skill reads branch `001-auth-user-accounts` as source and tells agent to browse/copy it. | It is a historical branch rather than audited baseline. | HIGH | STALE | skill readme Sources; baseline/030-A. |
| Skill provides standalone Button/Input/Select/Card/Table/BrandMark assets as production-like rules. | Those are a separate prototype kit; actual product uses Mantine/shared wrappers/raw exceptions and SIMS image branding. | HIGH | STALE | skill manifest/components; `Layout.jsx` logo; 030-B/C. |
| `CLAUDE.md` sole ResponsiveSheet Radix/Framer rule. | Misses live StudentSearchOverlay exception; literal adherence can cause an agent to remove/bypass necessary nested overlay behavior. | HIGH | CONTRADICTORY | `StudentSearchOverlay.jsx:2–34`; 030-D nested overlay capture. |
| UI Architecture says Mantine notifications is canonical. | An agent could introduce/use notifications instead of the current custom Toast path. | HIGH | CONTRADICTORY | `Toast.jsx`; 030-C (zero notification imports). |
| UI/Mobile guides call wrappers canonical targets without adoption scope. | Agent could replace visible, intentional direct controls based on aspiration rather than current architecture. | MEDIUM | PARTIALLY STALE | 030-B/C wrapper counts. |
| Mobile Patterns says one breakpoint / universal full state coverage. | Agent could miss 639/640 overlay behavior and assume report cards/empty/error standardization exists. | MEDIUM | PARTIALLY STALE | 030-D; 030-C/E. |
| `FRONTEND_ARCHITECTURE_AUDIT.md` says “Send to Claude” and proposes shadcn/Geist edits. | Could cause a materially wrong implementation. | HIGH | OBSOLETE | Root audit §“3 Systems,” quick-fix instructions; current package/source. |
| Archived mobile rules / UI fixes. | Prominent archive banners limit accidental use. | LOW | HISTORICAL ONLY | File headings. |

## Missing-current-truth register

| Missing current truth | Why it belongs in documentation | Evidence | Risk |
| --- | --- | --- | --- |
| Exact Radix/Framer exception for `StudentSearchOverlay` | Operating policy states an exclusive boundary which code violates for a documented nested-dialog/focus purpose. | `StudentSearchOverlay.jsx:21–34`; 030-C; 030-D. | High |
| Actual overlay landscape and adoption | Contributors need to know ResponsiveSheet is available but not universal, and that FormModal, ConfirmDialog, Mantine Modal, Menu, Drawer and the nested overlay coexist. | 030-B/C counts; 030-D overlay review. | High |
| Current feedback ownership | `Toast` is the active app path while notifications are installed but unused; loading/empty/error adoption is uneven. | 030-B/C/E. | High |
| Wrapper adoption boundaries / known direct-control exceptions | Existing docs imply a canonical migration completion unsupported by usage counts. | 030-B/C control matrix; 030-E control comparison. | Medium |
| Responsive breakpoint map | 768 shell/list boundary, 639/640 overlay/report boundaries, and FormModal 640/641 behavior coexist. | `Layout.jsx`, overlay source; 030-D. | High |
| Current table/mobile strategy limitation | Mixed strategy exists and Reports’ mobile secondary-sheet table clipping is browser-confirmed. Documentation must distinguish fact from eventual decision. | 030-B; 030-D issue register/screenshots. | High |
| Font/package truth | Public Sans is rendered; DM Mono is mono; Geist is installed but unused. | `main.jsx`; `index.css`; `client/package.json`. | High |
| Current icon/emoji reality | Tabler is active; emojis are screen-specific (especially Reports) rather than a mobile navigation policy. | 030-B/C/E; `Layout.jsx`. | High |
| Chart responsibility | Mantine Charts has one use; Recharts is installed but has no direct source imports. | 030-C dependency map. | Medium |
| Browser-confirmed accessibility limitations | Existing principles say preserve focus/targets, but known tested focus-return and target findings are not represented as current limitations. | 030-D issue register. | Medium |

## Documentation-risk register

| ID | Documentation problem | Severity | Operational risk | Recommended 030-G documentation action |
| --- | --- | --- | --- | --- |
| DOC-01 | AI skill directs DM Sans and Lucide. | High | Reintroduces wrong typography/icon library into production or generated artifacts. | Replace factual current-guidance section. |
| DOC-02 | AI skill models older OTP/prototype product and historical branch as source. | High | Produces wrong auth/content/workflow/components. | Mark kit historical or update scope/source. |
| DOC-03 | Constitution/CLAUDE omit `StudentSearchOverlay` Radix/Framer exception. | High | Misleading rule can destabilize nested overlay/focus behavior. | Add factual exception or flag owner decision. |
| DOC-04 | UI Architecture says Mantine notifications is feedback replacement. | High | Produces inconsistent notification path. | Correct to current custom Toast/Alert reality and mark future decision separately. |
| DOC-05 | UI/mobile docs retain “not built” ResponsiveSheet/PageHeader statements. | High | Agents rebuild duplicates or choose obsolete migration work. | Update status and current usage caveat. |
| DOC-06 | Mobile guide claims one cutoff and universal mobile table/state patterns. | High | Hides Report clipping/mixed breakpoints and leads to invalid implementation assumptions. | Qualify with actual boundaries and verified limitation. |
| DOC-07 | Root frontend architecture audit remains executable but obsolete. | High | Agents follow shadcn/Geist paths absent from baseline. | Prominently mark historical/obsolete. |
| DOC-08 | Current-guide wrapper language does not disclose sparse adoption. | Medium | Encourages broad unapproved migration rather than factual reuse. | Clarify current adoption and defer architecture mandate. |
| DOC-09 | Root README has old OTP/cover/schema claims. | Medium | Misleads onboarding and product understanding. | Update current overview, preserve historical notes separately. |
| DOC-10 | `client/README.md` is unmodified Vite template. | Low | Does not actively prescribe wrong SIMS code but offers no orientation. | Replace or point to project docs. |
| DOC-11 | Historical docs have mixed archive cues. | Low | Most are obviously dated; isolated snippets may still be copied. | Add/standardize historical context only where needed. |

## Evidence boundaries

- 030-D did not capture valid forced empty/error screenshots. The state finding above is based on 030-B/C implementation inventory and explicitly does not claim visual browser confirmation for every state.
- 030-D did verify reports mobile clipping, 767/768 table/card switching, overlay focus return outcomes, and rendered font/theme behavior where cited.
- 030-F does not decide whether an existing exception should remain, whether Mantine stays, whether a wrapper becomes mandatory, or whether any report table is redesigned.
