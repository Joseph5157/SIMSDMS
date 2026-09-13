# Master Plan: 030 — UI / Design-System Current-State Audit

## Purpose and frozen work

Spec 030 is a current-state audit, not a cleanup or refactor project. It establishes an evidence-based account of the UI as it exists today, corrects documentation to match reality, and supplies evidence for later architecture decisions.

Preserve these local commits exactly where they are on `fix/design-system-audit-cleanup`:

- `fa996f2` — OfflineBanner cleanup
- `91e5b3e` — Student Violation Report mobile card

They are candidate remediations. Do not discard, amend, move, cherry-pick, merge, push, or build further work on them. The queued chevron, `View all →`, report-table, button, and lint cleanup tasks are also frozen.

## Governing phase boundary

Every Codex phase is an independently authorized, gated unit:

> Do not proceed to the next phase. Do not perform opportunistic cleanup. Do not modify application code unless this phase explicitly authorizes it. Stop after producing the required evidence and closure report.

Completing one phase does not authorize the next.

---

## 030-A — Baseline & Audit Freeze

### Objective

Establish clean, current `main` as the reproducible audit baseline while preserving the WIP branch untouched.

### Required work

- Record the exact `main` SHA and verify it—not `fix/design-system-audit-cleanup`—is the audit baseline.
- Record runtime, package-manager, dependency, and lockfile versions.
- Record the production build result and build size.
- Record lint commands, results, warnings, and errors.
- Inventory existing automated tests and record results.
- Inventory Playwright specifications, projects, fixtures, auth states, and route coverage.
- Inventory all frontend source files, UI/design documentation, and relevant older UI specs.
- Record the current high-level component inventory without evaluating or fixing it.
- Verify both candidate commits remain local, unpushed, and unchanged.
- Record unrelated worktree and stash state so it is not confused with audit work.

### Deliverables

- Baseline manifest tied to the exact `main` SHA
- Build, lint, test, and Playwright baseline results
- Source, documentation, prior-spec, and high-level component inventories
- Audit-freeze confirmation
- Phase closure report with evidence, limitations, and unresolved prerequisites

### Hard boundary

Do not change UI code, tests, configuration, dependencies, documentation truth statements, or the frozen branch. Do not proceed to 030-B. Stop after producing the evidence and closure report.

---

## 030-B — Full Code & Component Inventory

### Objective

Perform a complete, read-only inventory of frontend implementation patterns and count actual usage.

### Audit matrix

| Category | Questions |
| --- | --- |
| Buttons | Mantine `Button`, `AppButton`, raw `<button>`, or link styled as button? |
| Inputs | Mantine, `AppField`, native, or custom? |
| Selects | `AppSelect`, Mantine `Select`, native `<select>`, or custom trigger? |
| Cards | Layout `Card`, Mantine `Paper`, `StatCard`, or raw container? |
| Tables | Shared `Table`, `ResponsiveDataView`, or custom? |
| Mobile lists | Shared primitives or hand-built? |
| Modal/dialog | Mantine `Modal`, `ResponsiveSheet`, direct Radix, or custom overlay? |
| Feedback | `Alert`, toast/notification, inline banner, or ad hoc? |
| Empty states | `EmptyState`, `EmptyRow`, or ad hoc? |
| Loading/errors | Shared primitives, Mantine, text, or page-specific? |
| Navigation | Consistent across shells, roles, desktop, and mobile? |
| Icons | Tabler, emoji, raw SVG, CSS shape, or text symbol? |
| Charts | Mantine Charts, Recharts, or another implementation? |
| Typography | Semantic/token-based or arbitrary values? |
| Colors | Semantic/palette token, utility, CSS variable, or raw value? |
| Spacing/radius/shadow | Shared scale/token or one-off value? |
| Motion | Meaningful feedback or decoration? |
| Styling | Tailwind, CSS, Mantine props/styles, inline, shared object, or mixed? |
| Responsive behavior | Shared strategy, page-specific split, overflow fallback, or accidental? |

### Scope and evidence

Audit every frontend page, component, layout, shell, provider, native control, shared wrapper, direct Mantine use, styling method, token, icon, chart, table, form, feedback state, and responsive fork.

For every distinct implementation, record exact usage count, files/components, representative evidence, wrapper/direct-library relationship, sanctioned exceptions, unexplained duplication, and cases needing browser or product judgment.

Example:

```text
Button implementation A: 43 usages
Button implementation B: 17 usages
Raw <button>: 12 usages
Sanctioned exceptions: 4
Unexplained duplication: 8
```

### Deliverables

- Frontend file manifest
- Component/primitive usage matrix
- Styling/token matrix
- Responsive-pattern inventory
- Exception and uncertainty register
- Phase closure report

### Hard boundary

Read only. Do not normalize code, replace controls, extract components, adjust styles, add lint rules, or fix defects. Do not proceed to 030-C. Stop after producing the evidence and closure report.

---

## 030-C — Dependency & Design-System Architecture Audit

### Objective

Map the current responsibility, reach, overlap, encapsulation, and replacement cost of every UI dependency and internal design-system layer.

### Scope

- Mantine Core, Hooks, Charts, and Notifications
- Tailwind
- Radix Dialog
- Framer Motion
- Tabler Icons
- Recharts
- Custom components, shared wrappers, style objects, utilities, helpers, and supporting packages

For each, record its current production responsibility, direct users, wrapped users, intentional encapsulation, overlap, reach, change impact, replacement cost, and migration risk.

Use provisional evidence labels:

- Required
- Useful but overlapping
- Limited internal use
- Unused
- Legacy
- Replaceable
- Potential removal candidate
- Requires architecture decision

These labels do not authorize decisions. Library count alone is not a defect. For example, Radix and Framer Motion may both be justified if `ResponsiveSheet` encapsulates separate responsibilities.

### Deliverables

- Dependency responsibility map
- Direct-use and wrapper-use counts
- Overlap/encapsulation map
- Change-impact and replacement-risk notes
- Confirmed unused/legacy evidence
- Questions reserved for Spec 031
- Phase closure report

### Hard boundary

Do not remove, replace, install, update, consolidate, or standardize dependencies or components. Do not make Design System V2 decisions. Do not proceed to 030-D. Stop after producing the evidence and closure report.

---

## 030-D — Playwright UI Verification

### Objective

Verify the rendered product across roles, routes, themes, and viewports. Use Playwright as a visual and interaction verification system, not only as an assertion runner.

### Coverage

Roles/states:

- Faculty, Admin, Super Admin
- Unauthenticated and authenticated

Viewports:

- 360, 390, 412, 768, and 1024 px
- Approximately 1280 and/or 1440 px desktop

Themes:

- Light and dark

Admin pages:

- Dashboard, Users, Students, Calendar, Duty Slots, Live Attendance
- Violations, Flagged Violations, Reports, Messages, Settings

Faculty pages/workflows:

- Dashboard, My Slots, All Faculty Duties, Attendance
- Violations, Messages, Reassignment workflows

Super Admin pages:

- Dashboard, Audit Logs, and admin-equivalent pages

Auth pages:

- Login and Change password

### Evidence per applicable state

- Screenshot/trace reference
- Horizontal overflow, clipped controls, and overlapping content
- Modal/sheet behavior
- Dark-mode readability
- Touch targets and viewport layout
- Scrolling, whitespace, header consistency, and typography
- Table usability and action discoverability
- Mobile bottom-navigation interference
- Interaction failures
- Console errors/warnings and failed network calls

Separate every result as static suspicion, browser-confirmed, not reproduced, not applicable, or blocked/untestable.

### Deliverables

- Role/route/theme/viewport coverage matrix
- Organized screenshots and useful traces
- Visual/runtime issue register
- Static-versus-runtime reconciliation
- Coverage gaps and environmental limitations
- Phase closure report

### Hard boundary

Do not fix visual, interaction, console, network, test, or accessibility issues. Any test-support change requires separate authorization and must not alter product behavior. Do not proceed to 030-E. Stop after producing the evidence and closure report.

---

## 030-E — Visual Consistency & AI-Slop Audit

### Objective

Evaluate visual coherence and task efficiency using code evidence and the rendered evidence from 030-D.

### Patterns

- Unnecessary gradients, decoration, circles, or blobs
- Too many cards, nested cards, excessive rounding, or stat cards
- Excessive/random colors, accents, pills, or emoji
- Redundant copy or generic SaaS-dashboard presentation
- Unnecessary animation or indiscriminate hover lifts
- Duplicated hero areas
- Excessive/unclear hierarchy
- Inconsistent density, typography, spacing, radius, shadows, or emphasis

Classify each instance:

- Good / intentional
- Questionable
- Probable AI-slop
- Needs product decision

Include page/component locations, screenshots, recurrence counts, impact, and counter-evidence. Do not treat fashionable styling as harmful solely because it is fashionable; consider speed, comprehension, feedback, and accessibility for real users.

### Deliverables

- Visual consistency matrix
- AI-slop evidence register
- Cross-page recurrence counts
- Intentional-pattern/counter-evidence notes
- Product questions reserved for Spec 031
- Phase closure report

### Hard boundary

Do not remove, restyle, simplify, animate, or redesign UI. Do not convert judgments into implementation tasks. Do not proceed to 030-F. Stop after producing the evidence and closure report.

---

## 030-F — Documentation Truth Audit

### Objective

Compare production code and verified browser behavior against every relevant UI/design guidance source.

### Sources

- `CONSTITUTION.md`
- `docs/UI_ARCHITECTURE.md`
- `docs/MOBILE_PATTERNS.md`
- `CLAUDE.md`
- `.claude/skills/SIMS DMS Design System/`
- Specs 012, 025, and 030
- Other guidance found during the audit

Classify each relevant statement or section:

- CURRENT
- PARTIALLY STALE
- OBSOLETE
- CONTRADICTORY
- MISSING

Every non-current result must cite the documentation, actual code/browser evidence, mismatch, factual correction needed, and whether it needs only a documentation correction or a future architecture/product decision.

Known examples to verify—not assume—include `MOBILE_PATTERNS.md` describing `PageHeader` variants as unbuilt when variants exist in `Layout.jsx`, and the design-system skill describing an older visual implementation.

### Deliverables

- Documentation inventory
- Statement-level truth matrix
- Contradiction/missing-guidance register
- Factual correction list for 030-G
- Architecture/design questions for Spec 031
- Phase closure report

### Hard boundary

Read only. Do not edit documentation, code, skills, tests, or configuration. Do not use stale guidance to force code changes. Do not proceed to 030-G. Stop after producing the evidence and closure report.

---

## 030-G — Documentation Correction

### Objective

Correct documentation so it accurately describes the existing production system proven by 030-A through 030-F.

### Authorized changes

- Correct objectively stale or false statements.
- Remove obsolete implementation-status language.
- Document current shared primitives, usage boundaries, and verified production exceptions.
- Add missing current behavior where evidence is complete.
- Mark unresolved questions and link them to Spec 031.
- Preserve useful history while labeling it as historical.

### Prohibited changes

- Do not redesign the product in documentation.
- Do not declare Design System V2 or invent architecture boundaries.
- Do not convert preferences into mandates.
- Do not describe proposals as current behavior.
- Do not change code, dependencies, tests, or configuration.

### Deliverables

- Corrected current-state documentation
- Change log mapping each edit to 030-F evidence
- Deliberately unresolved decision register
- Documentation verification report
- Phase closure report

### Hard boundary

Only evidence-backed documentation corrections are authorized. Do not modify product implementation or establish future architecture. Do not proceed to 030-H. Stop after producing the corrected documentation and closure report.

---

## 030-H — Final Audit Report & Sign-off

### Objective

Consolidate all evidence, obtain owner sign-off, and close Spec 030 without beginning a broad refactor.

### Finding schema

| Field | Required content |
| --- | --- |
| ID | Stable identifier such as `DS-017` |
| Severity | Evidence-based impact level |
| Evidence | Counts and/or reproducible observation |
| Code location | Files/components and lines where practical |
| Playwright confirmation | Confirmed, not reproduced, not applicable, or not tested |
| Screenshot | Evidence reference when applicable |
| Current behavior | What production does now |
| Impact | User, accessibility, maintenance, consistency, or performance effect |
| Recommendation | Future action/decision, not automatic authorization |
| Classification | Final classification below |

Final classifications:

- KEEP
- INVESTIGATE
- CONSOLIDATE
- REMOVE-CANDIDATE
- DESIGN-DECISION

These are audit outcomes, not implementation instructions.

Evidence-based health summaries may cover UI architecture, component consistency, design-system adherence, mobile consistency, visual coherence, accessibility, and AI-slop risk. Scores require a documented rubric and traceable evidence; do not invent them.

Include `fa996f2` and `91e5b3e` as candidate remediations. The report may recommend accepting, rejecting, revising, cherry-picking, or reproducing them, but may not perform that action without separate explicit authorization after sign-off.

### Deliverables

- Consolidated audit report and finding register
- Coverage/evidence index
- Final documentation truth status
- Limitations and remaining unknowns
- Spec 031 decision-input register
- Owner sign-off record
- Spec 030 closure report

### Hard boundary

Do not implement findings, push frozen commits, begin cleanup, or make Design System V2 decisions. Do not begin Spec 031 automatically. Stop after delivering the audit and requesting/recording explicit sign-off.

## Spec 030 closure criteria

- All eight phases were separately authorized, completed, and closed.
- Baseline is tied to an exact `main` SHA.
- Code/component and dependency findings have traceable counts and locations.
- Required UI states have Playwright evidence or explicit coverage gaps.
- Static suspicions and browser-confirmed issues are separated.
- Visual judgments include evidence and counter-evidence.
- Documentation truth was audited and factual corrections completed.
- Final findings use the required schema and classifications.
- Owner signed off on the final audit.
- No unauthorized remediation or architecture decision occurred.

---

# Follow-up Specifications

## 031 — UI Architecture & Design-System Decision

Begins only after Spec 030 is signed off and closed. It uses the audit evidence to decide:

- Keep Mantine at its current scope or reduce it?
- Which Mantine components may be used directly?
- Which components must go through application wrappers?
- Should some components become pure React/Tailwind?
- Should Radix remain internal-only?
- Should the project use 21st.dev, and which components are acceptable?
- What should Design System V2 look like?
- What should be kept, consolidated, removed, or rebuilt?
- What migration sequence best balances impact, effort, and risk?

Spec 031 produces explicit architecture decisions, accepted boundaries/exceptions, target-state documentation, and an approved migration plan. It does not inherit permission to implement the migration.

## 032 — UI Architecture Implementation & Migration

Begins only after Spec 031 decisions and migration order are approved. It contains the actual implementation, consolidation, removal, rebuilding, testing, rollout, and candidate-remediation handling. Its scope must be derived from approved Spec 031 decisions, not assumed during Spec 030.
