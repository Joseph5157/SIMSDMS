# Spec 032 — Test and Release-Risk Plan

Status: planning only. This consolidates the risk classification and test/verification strategy for
every batch in `032-migration-batch-plan.md`. Risk reflects actual behavior/blast-radius impact, not
line count, per the roadmap's instruction.

## 1. Release-risk classification, all batches

| Batch | Milestone | Risk | Why |
| --- | --- | --- | --- |
| 1.1 Admin Dashboard nesting fix | 1 | **LOW** | Isolated markup correction, no behavior/data/dependency change, trivially revertable. |
| 1.2 FormModal/ConfirmDialog focus-return | 1 | **MEDIUM** | Shared-component change with broad indirect reach (20 consumers), but a narrow, testable, well-defined fix. |
| 1.3 Reports clipping interim fix | 1 | **MEDIUM** | Touches the most structurally complex page even though the change is scoped to overflow behavior. |
| 2.1 Token/theme sync adapter | 2 | **HIGH** | Named directly in the spec's own examples ("token/theme architecture changes"); reaches 34 Mantine-importing files even with zero intended visual diff. |
| 2.2 AppButton — ResponsiveSheet footers | 2 | **MEDIUM** | Wide call-site count (17), but each is a bounded, like-for-like primitive swap. |
| 2.3 Reports touch-target fix | 2 | **LOW** | Sizing-only change, no structural impact. |
| 3.1 Student Violation Report mobile card | 3 | **HIGH** | Named directly in the spec's own examples ("major Reports responsive redesign"); must preserve full data/filter/export parity. |
| 3.2 Secondary report mobile presentation | 3 | **HIGH** (sub-batch to MEDIUM) | Broadest Reports surface change in the plan; recommend per-family sub-batching to de-risk each PR. |
| 4.1 OfflineBanner rebuild | 4 | **MEDIUM** | Single component, but root-level and safety-relevant (connectivity visibility). |
| 4.2 Loading/empty state consolidation | 4 | **MEDIUM** | Low risk per file, but broad file count (~15); recommend splitting by page. |
| 4.3 AppButton adoption batch 2 | 4 | **MEDIUM** | Includes the login/auth experience, which needs care despite being a routine conversion elsewhere. |
| 5.1 Report selector cleanup | 5 | **MEDIUM** | Visual-only, but all 15 report entry points must be re-verified reachable. |
| 5.2 Reports filter/header/export cleanup | 5 | **MEDIUM** | Layout-only, but on the most complex page, requiring full filter/export re-verification. |
| 6.1 Admin Dashboard visual cleanup | 6 | **MEDIUM** | Visual-only, but on the highest-traffic admin surface. |
| 6.2 Faculty/Super Admin dashboard refinement | 6 | **MEDIUM** | Must not regress the Faculty duty check-in action, a real operational path. |
| 7.1 Dependency verification & cleanup | 7 | **LOW** | Verify-then-remove discipline; each step independently reversible. |
| 7.2 Lint/enforcement + regression coverage | 7 | **MEDIUM** | Risk is to developer workflow/CI stability if a rule is scoped too broadly, not to runtime behavior. |

**LOW**: 1.1, 2.3, 7.1
**MEDIUM**: 1.2, 1.3, 2.2, 4.1, 4.2, 4.3, 5.1, 5.2, 6.1, 6.2, 7.2
**HIGH**: 2.1, 3.1, 3.2

## 2. Test strategy, proportionate to this repository

The current baseline (DS-23) has three logical Playwright tests across two projects and no client
unit-test suite; 030-D added ad hoc browser captures but not durable regression coverage. Spec 032 adds
targeted coverage only where a batch changes verifiable behavior — it does not introduce a general
test-writing mandate or a new testing framework.

### 2.1 Unit / component tests

Added only for batches that introduce new logic or a new component contract:

- 1.2 — focus-return assertion for FormModal/ConfirmDialog.
- 2.2 — ResponsiveSheet footer contract test.
- 3.1 — new card-renderer component test (populated/empty/loading/error).
- 4.1 — OfflineBanner show/dismiss/reappear lifecycle test.
- 4.2 — none new; existing suite must stay green.
- 4.3, 5.x, 6.x — spot unit tests only for the highest-traffic converted consumers, not every file.

### 2.2 Playwright scenarios

Reuse the exact 030-D scenario shapes (same viewports, same routes) so each new spec is directly
comparable to the audit evidence it closes:

| Defect / area | 030-D reference | New Playwright scenario | Batch |
| --- | --- | --- | --- |
| Admin Dashboard nesting | 030-D-01 | Console-error assertion on `/admin/dashboard` load | 1.1 |
| Overlay focus return | 030-D-02 | FormModal 639/640/641, ConfirmDialog 390, assert `focusReturned: true` | 1.2 |
| Reports clipping | 030-D-03 | Table-width/overflow assertion at 360/390/639/640 | 1.3, 3.1, 3.2 |
| Touch targets | 030-D-04 | Named-control size assertion ≥44px | 2.3 |
| Offline banner | 030-D-10 | Offline scenario, dark mode, dismiss/reappear | 4.1 |
| Report mobile card parity | (new, informed by 91e5b3e conditions) | Row/field parity between mobile card and desktop table for a fixed dataset | 3.1, 3.2 |
| Report selector reachability | (new) | Click through 5 reports spanning families | 5.1 |
| Dashboard functional smoke | (new) | Quick-action/stat-card navigation after restyle | 6.1 |
| Faculty check-in | (new) | Duty check-in flow after hero-area restyle | 6.2 |
| Import-boundary enforcement | C-R06 | Lint fixture asserting no new Radix/Framer feature-page import | 7.2 |

Viewport set used throughout, matching 030-D: 360, 390, 412, 639, 640, 641, 767, 768, 1440. Not every
batch needs every width — each batch's own section in the migration plan names the specific widths that
apply to it.

### 2.3 Visual regression

Used narrowly, only where a batch's stated goal is "no visible change" and manual review alone is
insufficient to catch drift:

- 2.1 (token adapter) — before/after screenshot comparison, light and dark, on 5 sampled screens
  (Admin Dashboard, Reports, Settings, Login, one FormModal). This is the one batch in the plan where
  screenshot diffing is load-bearing, because the entire acceptance criterion is "no visible change"
  across a 34-file blast radius.
- No general visual-regression tooling is introduced; this is a manual before/after comparison using
  the existing screenshot capability from 030-D's tooling, not a new pipeline.

### 2.4 Accessibility regression

- 1.2 and 4.1 each get a durable, automated regression test (unit + Playwright) for the exact defect
  they fix, per V2 §13's requirement that any migration touching D-02/D-03/D-04/D-07 has browser
  acceptance checks.
- 3.1/3.2 verify status-by-more-than-color and keyboard-reachable actions per converted report, but do
  not add a generic axe-core sweep — that would be disproportionate enforcement for a hand-reviewed
  visual migration, per the "no brittle enforcement" instruction.

### 2.5 What is deliberately not added

- No new testing framework or CI pipeline.
- No blanket "add tests to every touched file" rule.
- No automated visual-regression tool/service — the one visual-diff need (2.1) is handled with the
  existing screenshot workflow.
- No axe-core or similar automated a11y linter wired into CI as a blocking gate; V2's accessibility
  rules are enforced through the batch-specific Playwright scenarios above instead, to avoid a brittle
  gate on a large pre-existing surface that wasn't audited control-by-control.

## 3. Enforcement (Batch 7.2) scope discipline

The new ESLint rules in 7.2 apply to **newly written code**, using an ignore/allowlist for the
historical instances this plan does not migrate (e.g., composite/chrome/calendar/pagination raw
buttons, which Stream 2 explicitly excludes from migration). A rule that fails CI on unmigrated
historical code would contradict the plan's own "do NOT mass-convert" instruction for those categories
and would need to be reverted; scoping to new code from the start avoids that failure mode.

## 4. Verification run for this planning task

- `git diff --check` — confirms no product code, dependency, test, route, or configuration file
  changed; all changes are new files under `specs/032-ui-system-implementation-migration/`.
- Frozen commits `fa996f2` and `91e5b3e` remain unapplied (not fetched, cherry-picked, or referenced
  as diffs anywhere in this plan — only as directional/behavioral reference).
- The unrelated pre-existing stash was not touched.
