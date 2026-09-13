# Spec 031 — UI Architecture & Design-System Decision Roadmap

## Status and purpose

**Status: planned; 031-A has not begun.**

Spec 031 converts the evidence from closed Spec 030 into explicit, owner-approved UI architecture and visual-system decisions. It is a decision specification only:

- **031 = decisions**
- **032 = implementation / migration after approved 031 decisions**

No production component migration, dependency action, redesign, cleanup, token change, test change, or frozen-candidate action is authorised by this roadmap or any 031 phase unless separately and explicitly authorised as an isolated decision prototype.

## Baseline and preserved work

| Item | Record |
| --- | --- |
| Audited product baseline | `21a7ca5f56dfd67118e6530e3f925e5607688656` |
| Audit branch at closure | `audit/design-system-030` |
| Spec 030 status | Owner-approved and closed, 2026-09-12 |
| Frozen candidate `fa996f2` | OfflineBanner candidate; preserved and unapplied |
| Frozen candidate `91e5b3e` | Student Violation Report mobile-card candidate; preserved and unapplied |
| Existing stash | Unrelated, pre-existing, out of scope, and untouched |

## Governing evidence and decision principles

Read these before beginning any 031 phase:

1. [030-H final audit report](../030-design-system-audit-cleanup/030-H-final-audit-report.md)
2. [030-H consolidated finding register](../030-design-system-audit-cleanup/030-H-consolidated-finding-register.md)
3. [030-H Spec 031 decision inputs](../030-design-system-audit-cleanup/030-H-spec-031-decision-inputs.md)
4. [030-H closure](../030-design-system-audit-cleanup/030-H-closure.md)
5. Current reconciled guidance: `CONSTITUTION.md`, `CLAUDE.md`, `docs/UI_ARCHITECTURE.md`, and `docs/MOBILE_PATTERNS.md`.

The audit found a defensible hybrid architecture—not a mandate to replace it. Every option and decision must weigh demonstrated benefits against migration cost, regression risk, accessibility, operational usability, and the working behavior that Spec 030 identified for preservation.

Do not treat historical specifications, prototype skill assets, frozen candidate commits, raw dependency count, or an aesthetic preference as current architecture authority.

## Phase-gating rule

Each phase below is independently owner-authorised. Completing a phase does not authorise the next one. Every phase must produce its listed deliverables, verification record, explicit owner-review request, and hard-stop statement.

---

## 031-A — Decision Framework & Constraints

### Objective

Define the neutral evaluation framework that every future architecture and visual-system option must satisfy. Do not select an option, a library, a primitive, or a Design System V2 direction.

### Evidence inputs

- 030-H architecture snapshot, strengths register, limitations, and decision-deferred register.
- 030-H consolidated findings DS-01 through DS-25.
- Current reconciled governance and architecture/mobile guidance.

### Questions answered

- What operational, accessibility, mobile, maintainability, visual, agent, dependency, performance, testing, migration, dark-mode, and extensibility criteria are relevant?
- How is each criterion weighted or otherwise evaluated without falsely implying scientific precision?
- What working behavior is non-negotiable to preserve while alternatives are assessed?
- What evidence threshold is needed before an option can be selected?

### Required deliverables

- Decision criteria and definitions.
- Evidence-quality and uncertainty rubric.
- Preservation constraints register.
- Migration-risk and implementation-cost evaluation model.
- Decision-log template for later 031 phases.
- 031-A closure report.

### Verification

- Confirm all criteria trace to Spec 030 evidence or an explicit owner constraint.
- Confirm the framework makes no technology, primitive, token, or visual-policy selection.
- Run `git diff --check`; confirm no product implementation changes.

### Owner review and hard stop

Request owner review of the framework. **Stop after 031-A. Do not begin 031-B.**

---

## 031-B — Architecture Options Analysis

### Objective

Develop realistic, evidence-based options and compare them against the approved 031-A framework. Do not choose an option.

### Required options

1. Current hybrid architecture with stricter documented boundaries.
2. Mantine-centric architecture.
3. Reduced-Mantine architecture with more application-owned React/Tailwind primitives.
4. Any additional option only if Spec 030 evidence demonstrates a distinct, realistic path.

Options must not be strawmen. Each must represent feasible dependency, primitive, token, responsive, accessibility, testing, and migration consequences.

### Evidence inputs

- 031-A approved framework.
- 030-C dependency/responsibility and overlap evidence.
- 030-D browser and responsive evidence.
- 030-E visual evidence.
- 030-G reconciled current documentation.

### Questions answered

- What does each option preserve, alter, and leave unchanged?
- What are its dependency, bundle/performance, accessibility, dark-mode, testability, agent-reliability, and migration implications?
- What evidence argues against each option?
- Is an option’s benefit sufficient to justify its migration/regression cost?

### Required deliverables

- Options dossier with scope, assumptions, counter-evidence, and non-goals.
- Criteria comparison matrix.
- Dependency/boundary and migration-risk comparisons.
- Open questions requiring owner decision.
- 031-B closure report.

### Verification

- Verify every option is assessed with the 031-A criteria.
- Verify no option is presented as selected and no component/package is changed.
- Run `git diff --check`; confirm no product implementation changes.

### Owner review and hard stop

Request owner review of the options analysis. **Stop after 031-B. Do not begin 031-C.**

---

## 031-C — Primitive Ownership Decisions

### Objective

Make explicit owner-approved ownership rules for UI primitives based on the selected architecture direction. Do not migrate any production consumer.

### Scope

Decide, for each of the following:

- buttons/actions;
- text, select, and number inputs; labels and form structure;
- overlays, sheets, dialogs, and menus;
- tables and responsive data presentation;
- alerts, toast, loading, empty, error, and retry states;
- badges/status, pagination, PageHeader, StatCard, icons, and charts.

### Required decision record for every primitive

- Canonical application primitive, if any.
- Whether direct third-party use is allowed.
- Whether native HTML is allowed.
- Explicit exceptions and their reason.
- Behavioral/accessibility owner.
- Styling/token owner.
- Current adoption, migration implication, and verification requirement.

### Evidence inputs

- Selected/approved 031-B direction and 031-A criteria.
- 030-B component counts, 030-C ownership/overlap analysis, 030-D overlay/table results, and current reconciled guidance.

### Required deliverables

- Primitive ownership matrix.
- Allowed direct-import and native-control exception register.
- Overlay and responsive-data responsibility map.
- State/feedback semantic map.
- Decision log and unresolved exceptions register.
- 031-C closure report.

### Verification

- Check every scope item has an explicit answer or an owner-approved deferral.
- Check rules preserve current proven behavior, especially Table, Toast, ResponsiveSheet, FormModal, ConfirmDialog, and StudentSearchOverlay’s bounded exception.
- Run `git diff --check`; confirm no implementation/migration work occurred.

### Owner review and hard stop

Request owner approval of primitive ownership. **Stop after 031-C. Do not begin 031-D.**

---

## 031-D — Tokens & Visual Language

### Objective

Define future visual-system policy from 030-E’s evidence while preserving the application’s operational strengths. Do not redesign individual screens or implement tokens.

### Decisions required

- typography and mono use;
- semantic colour language and dark-mode ownership;
- token ownership/synchronization;
- radius, shadow/elevation, card/surface philosophy, and gradients;
- Tabler/iconography and emoji policy;
- operational density, hierarchy, and motion;
- dashboard and Reports treatment;
- responsive presentation rules.

### Evidence inputs

- Approved 031-A framework and 031-C primitive decisions.
- 030-E visual-language, screen-register, strength, and AI-signal evidence.
- 030-D screenshots and browser findings where visual policy affects usability.
- Current Public Sans/DM Mono, Tabler, token, dark-mode, and responsive facts.

### Required deliverables

- Visual-language decision record with evidence and counter-evidence.
- Token ownership and dark-mode decision specification.
- Surface/elevation, colour/status, typography, icon/emoji, motion, density, and responsive policy.
- Dashboard and Reports decision boundaries—not page redesigns.
- Visual preservation register and open product questions.
- 031-D closure report.

### Verification

- Confirm 030-E observations are not converted into unsupported blanket rules.
- Confirm current strengths (status semantics, shell identity, dense operations, duty priority, dark-mode readability) are explicitly protected.
- Run `git diff --check`; confirm no visual implementation changes.

### Owner review and hard stop

Request owner approval of the visual-language policy. **Stop after 031-D. Do not begin 031-E.**

---

## 031-E — 21st.dev Evaluation

### Objective

Only after architecture and visual direction are approved, determine whether 21st.dev should be used and under what bounded conditions. Do not install, import, or select individual components.

### Core principle

**21st.dev may be a component/pattern source. It must not become the SIMS DMS design system by accident.**

### Evidence inputs

- Approved 031-A through 031-D decisions.
- 030-C dependency and wrapper evidence; 030-E visual evidence; 030-G agent guidance boundaries.

### Questions answered

- Should 21st.dev be used at all?
- What use cases, if any, are approved or prohibited?
- Can a sourced component introduce a primitive library, icon set, font, token model, or styling convention?
- What token normalization, accessibility, dependency, bundle, and review requirements apply?
- How can a reviewed component become canonical, if at all?

### Required deliverables

- 21st.dev evaluation and decision record.
- Approved/prohibited use-case register.
- Dependency, font/icon, token-normalization, accessibility, and component-review checklist.
- Canonicalization and AI-agent governance rules, if use is approved.
- 031-E closure report.

### Verification

- Confirm no package install, generated component import, or product prototype was performed.
- Confirm any decision is compatible with approved primitive and visual policy.
- Run `git diff --check`; confirm no implementation change.

### Owner review and hard stop

Request owner approval of the 21st.dev decision. **Stop after 031-E. Do not begin 031-F.**

---

## 031-F — Decision Validation

### Objective

Validate the proposed decision set against the real high-risk cases from Spec 030. This is conceptual/decision validation, not product migration.

### Required validation scenarios

- Reports mobile tables;
- Admin Dashboard and Faculty Dashboard;
- forms using the current mixed control implementations;
- ResponsiveSheet footer actions;
- StudentSearchOverlay nested-overlay exception;
- ConfirmDialog;
- shared Table and ResponsiveDataView;
- loading, empty, error, and retry states;
- 639/640/641 and 767/768 breakpoint behavior.

### Evidence inputs

- Approved 031-A through 031-E decisions.
- 030-D browser artifacts and 030-E screenshots/visual register.
- 030-H finding register and preservation constraints.

### Required deliverables

- Scenario-by-decision validation matrix.
- Regression, accessibility, and operational-risk assessment.
- Decision conflicts/gaps register with owner questions.
- Revised decision log only where an approved decision needs clarification.
- 031-F closure report.

### Verification

- Demonstrate that every high-risk scenario is addressed, explicitly deferred, or rejected with evidence.
- Verify decisions do not create disproportionate migration risk or discard proven working behavior.
- Run `git diff --check`; confirm no product changes.

### Owner review and hard stop

Request owner review of decision validation. **Stop after 031-F. Do not begin 031-G.**

---

## 031-G — Design System V2 Specification

### Objective

Produce the owner-approved future design-system specification precise enough for implementation agents to follow consistently. This produces a specification, not a product migration.

### Required content

- dependency boundaries;
- canonical primitives and allowed direct imports;
- explicit exceptions;
- token and dark-mode rules;
- responsive rules;
- accessibility rules;
- visual language and component-authoring rules;
- AI-agent rules;
- approved 21st.dev policy, if any.

### Evidence inputs

- Approved 031-A through 031-F records.

### Required deliverables

- Design System V2 specification.
- Decision traceability index to 030 evidence and 031 approvals.
- Agent/contributor guidance update scope for a later authorised documentation task.
- 031-G closure report.

### Verification

- Confirm every normative rule has an approved decision source.
- Confirm no unapproved product migration is represented as complete.
- Run `git diff --check`; confirm no production implementation changes.

### Owner review and hard stop

Request owner approval of the specification. **Stop after 031-G. Do not begin 031-H.**

---

## 031-H — Migration Plan & Owner Sign-Off

### Objective

Translate approved decisions into a future Spec 032 migration plan, obtain owner sign-off, and close Spec 031. Do not apply the plan.

### Required work categories

- browser-confirmed defect fixes;
- primitive migrations;
- token work;
- dependency cleanup;
- responsive work;
- Reports work;
- dashboard work;
- state-pattern work;
- documentation/agent enforcement;
- tests/lint enforcement.

### Frozen candidate assessment

Assess `fa996f2` and `91e5b3e` against the approved Design System V2. For each classify **accept**, **revise**, **supersede**, or **discard** as a future-plan disposition only. Do not apply, modify, rebase, delete, or otherwise act on either candidate.

### Required deliverables

- Sequenced Spec 032 migration plan with dependencies, risks, and verification gates.
- Browser-defect, architecture, visual, and documentation work classification.
- Frozen-candidate assessment record.
- Owner sign-off record.
- 031-H closure report and handoff.

### Verification

- Confirm all migration work derives from approved 031 decisions.
- Confirm candidates remain unapplied and the stash remains untouched.
- Run `git diff --check`; confirm 031 created no product implementation change.

### Owner review and hard stop

Request final owner sign-off. **Stop after 031-H. Spec 032 may begin only under a separate explicit owner authorization.**

## Global prohibitions until separately authorised

- Do not implement product migrations or cleanup.
- Do not remove/install/update dependencies.
- Do not select Mantine alternatives or change React/Tailwind direction by assumption.
- Do not redesign dashboards or Reports.
- Do not create/introduce a 21st.dev component.
- Do not apply, modify, accept, reject, rebase, or delete `fa996f2` or `91e5b3e`.
- Do not touch the unrelated stash.

