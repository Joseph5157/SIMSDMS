# Spec 032 — UI System Implementation & Migration Roadmap

Status: **CLOSED — all 7 milestones implemented, verified, and owner-approved (2026-09-14).** See
`specs/032-ui-system-implementation-migration/handoff.md` for the Milestone 7 closure report and
full verification evidence (lint clean; server tests 241/241; client Vitest 18/18; Playwright
144/144, both projects). This document is retained as the historical sequencing record.
Baseline: `21a7ca5f56dfd67118e6530e3f925e5607688656` (audited), current branch `audit/design-system-030`.
Architecture authority: `specs/031-ui-architecture-design-system-decision/031-design-system-v2.md`,
`031-canonical-component-matrix.md`, `031-21st-dev-policy.md`, `031-frozen-candidate-evaluation.md`.
Spec 031 architecture decisions are treated as closed. This roadmap does not reopen them; it sequences
their implementation.

## 1. Purpose

Take SIMS DMS from the audited 030 baseline to Design System V2 through small, independently reviewable,
low-regression-risk batches. Priority order: **confirmed defect → shared primitive/foundation →
representative screen → broader migration**, not "rewrite every primitive, then every page."

## 2. What this document is not

- Not another audit (030 is closed).
- Not an architecture-options document (031 is closed).
- Not research into alternative libraries.
- Not an instruction to install 21st.dev or apply either frozen commit.

No product code, dependency, test, route, or configuration file is changed by this planning task.

## 3. Milestone plan

Seven implementation milestones, sequenced by dependency and risk. Full per-batch detail (files,
dependencies, accessibility/mobile/dark-mode verification, tests, Playwright scenarios, rollback
boundary, completion criteria) is in `032-migration-batch-plan.md`. Risk rationale for every batch is in
`032-test-and-release-risk-plan.md`.

| # | Milestone | Streams covered | Batches | Overall risk |
| - | --- | --- | --- | --- |
| 1 | Confirmed browser defects | Stream 1 | 1.1, 1.2, 1.3 | LOW → MEDIUM |
| 2 | Primitive foundations | Streams 2, 3, 8 (token base), 5 (touch targets) | 2.1, 2.2, 2.3 | MEDIUM → HIGH |
| 3 | Reports responsive implementation | Stream 4, frozen candidate `91e5b3e` | 3.1, 3.2 | HIGH |
| 4 | State & form consistency | Streams 3, 5, frozen candidate `fa996f2` | 4.1, 4.2, 4.3 | MEDIUM |
| 5 | Reports visual cleanup | Stream 6 | 5.1, 5.2 | MEDIUM |
| 6 | Dashboard visual cleanup | Stream 7 | 6.1, 6.2 | MEDIUM |
| 7 | Tokens, dependencies, enforcement | Streams 8 (remainder), 9, 10 | 7.1, 7.2 | LOW → MEDIUM |

Stream 11 (21st.dev) has **no batch**. Per policy it is not an early dependency: it is carried as a
standing note (§6 below) for milestones 5–6 to consult only if a genuine gap appears, never as
something any batch above depends on.

### Why this order

- Milestone 1 fixes the three 030-D-confirmed defects the spec calls out explicitly, before any
  aesthetic work, and before the primitives they touch (overlays, Reports table) are otherwise
  migrated — so later batches build on already-correct behavior instead of migrating a known bug.
- Milestone 2 builds the two foundations (token adapter, AppButton convergence) that every later
  visual/action batch depends on, plus one more isolated defect (Reports touch targets) that is safe
  to fix once controls are being touched anyway.
- Milestone 3 is the first "broader migration" proof point — Reports, the highest-priority responsive
  area — deliberately sequenced after the primitives it will consume (AppButton, token adapter) exist.
- Milestone 4 finishes state/form consistency and both frozen-candidate dispositions once their
  target primitives are stable.
- Milestones 5–6 are the purely visual cleanup streams, sequenced last among product-facing work
  because V2 explicitly treats them as lower priority than defect/primitive/responsive work, and
  because they should build on the token adapter and AppButton work rather than add new one-off
  styling that would need to be redone.
- Milestone 7 (dependency cleanup, enforcement) runs last per Stream 9's own instruction — usage is
  only verifiable once migrations are done — and per Stream 10, enforcement rules should reflect the
  boundary as it actually ends up, not a moving target.

## 4. First implementation batch

**Batch 1.1 — Admin Dashboard invalid HTML nesting fix.**

- Smallest, lowest-risk, most objectively defined defect (030-D-01 / DS-07): 32 React console errors
  from `<p>` containing `<div>` on `/admin/dashboard`, plus the matching hydration warning.
- No dependency on any other batch. No shared primitive touched. No visual-language decision required.
- Rollback is a single-file, single-PR revert.
- On owner approval, this is the batch to execute immediately.

See `032-migration-batch-plan.md` §1.1 for full detail.

## 5. Frozen-candidate placement

| Candidate | V2 classification | Placement | Why here, not earlier |
| --- | --- | --- | --- |
| `fa996f2` (OfflineBanner → Alert + AppButton) | ACCEPT WITH REVISION | Batch 4.1 | Depends on the token adapter (2.1) and AppButton (2.2) being final so the rebuild targets stable primitives instead of being redone. It is a reimplementation guided by the commit's direction, not a cherry-pick — the persistent connectivity/dismissal lifecycle from 031's conditions must be independently verified. |
| `91e5b3e` (Student Violation Report mobile card) | ACCEPT WITH REVISION | Batch 3.1 | Used only as directional reference for the primary Reports responsive rebuild, which is sequenced as the milestone-3 representative-screen proof point. Rebuilt against current `ReportsPage.jsx` and the V2 §6/§11 rules, not applied as a diff. |

Neither commit is applied, modified, rebased, or deleted by this plan. Both remain preserved and
unapplied until their respective batch is executed and reviewed.

## 6. Stream 11 (21st.dev) — standing note, not a batch

21st.dev may be consulted starting no earlier than milestone 5 (Reports visual cleanup), and only if a
concrete pattern gap appears that existing primitives cannot reasonably cover — for example, an
operational empty-state illustration treatment for a report with no results. Any candidate must pass
every requirement in `031-21st-dev-policy.md` before use, must not introduce a competing button/field/
dialog/table/toast/navigation primitive, and is treated as feature-local unless a separate owner
decision promotes it to canonical. No 21st.dev work is scheduled; this is a boundary, not a task.

## 7. Release-risk summary

Full rationale per batch is in `032-test-and-release-risk-plan.md`. Distribution across the plan:

- **LOW**: 1.1, 2.3, 7.1
- **MEDIUM**: 1.2, 1.3, 2.2, 4.1, 4.2, 4.3, 5.1, 5.2, 6.1, 6.2, 7.2
- **HIGH**: 2.1 (token/theme architecture consolidation), 3.1, 3.2 (major Reports responsive redesign)

The two HIGH-risk Reports batches (3.1, 3.2) are exactly the "major Reports responsive redesign" case
named in the required risk examples; 2.1 is the named "token/theme architecture change" case. All three
get the widest verification requirement (full light/dark, all tested breakpoints, explicit rollback
boundary) in the batch plan.

## 8. Migration-unit and verification discipline

Every batch in `032-migration-batch-plan.md` specifies: objective, exact files/areas, dependency on
prior batches, user-visible change, regression risks, accessibility considerations, mobile
verification, dark-mode verification, tests required, Playwright scenarios required, rollback
boundary, and completion criteria — so each can be reviewed, shipped, and rolled back independently of
the others.

## 9. Boundary confirmation

- No product code, dependency, test, route, or configuration file was changed to produce this plan.
- Frozen commits `fa996f2` and `91e5b3e` remain unapplied.
- The unrelated pre-existing stash is untouched.
- `git diff --check` was run and confirms whitespace-clean, additions-only documentation changes under
  `specs/032-ui-system-implementation-migration/`.
- Coding for Spec 032 has not begun. Execution of Batch 1.1 requires separate owner authorisation.
