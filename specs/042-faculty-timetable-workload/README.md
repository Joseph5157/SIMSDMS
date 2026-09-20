# Spec 042 — Faculty Timetable and Workload

Status: **PLANNING COMPLETE — implementation not started**  
Prepared: 2026-09-20  
Target repository: `Joseph5157/SIMSDMS`  
Repository baseline reviewed: `main` at `448c1b723073a746820a7c3d2e378ecff806f227`

## Decision summary

Build the Faculty Timetable and Workload module inside the existing SIMSDMS monolith:

- React/Vite PWA frontend
- Express REST API
- Prisma with the existing Railway PostgreSQL database
- the existing email/password, JWT-cookie, CSRF, role and audit foundations
- one Railway web service for the first release

Do not introduce Laravel, Inertia, Vue, a second web service, a second database or a second authentication system. If reminders are approved later, run them in a dedicated Railway worker process while keeping the same repository and database.

## Planning pack

| File | Purpose |
| --- | --- |
| [`042-spec.md`](042-spec.md) | Product scope, roles, workflows, rules and acceptance criteria |
| [`042-architecture.md`](042-architecture.md) | Integration boundaries, frontend/backend design and deployment topology |
| [`042-data-model.md`](042-data-model.md) | Proposed Prisma entities, recurrence/versioning model and constraints |
| [`042-api-contract.md`](042-api-contract.md) | REST resources, payloads, authorization and error contract |
| [`042-implementation-plan.md`](042-implementation-plan.md) | Sequenced milestones, tasks, dependencies and completion gates |
| [`042-test-release-plan.md`](042-test-release-plan.md) | Test matrix, migration safety, Railway staging and rollback plan |
| [`handoff.md`](handoff.md) | Current planning handoff in the repository's required format |

## First implementation slice

The first shippable slice is deliberately narrow:

1. Amend `CONSTITUTION.md` for the approved timetable ownership rule.
2. Add academic master data and recurring timetable migrations.
3. Add read-only academic option APIs.
4. Add the faculty weekly timetable and **Add Class** flow.
5. Enforce faculty, section/batch and location conflict rules transactionally.
6. Add edit-one, edit-future, Cancel Today and Delete Schedule history behavior.
7. Add duration-based faculty workload totals.
8. Add the administrator read-only timetable/workload views.
9. Verify on staging before any production merge.

Telegram reminders and exports are not part of this first delivery.

## Governance note

The approved rule that administrators and super administrators cannot edit a faculty member's timetable conflicts with the current Constitution's broad Super Admin wording. Milestone 0 therefore requires an owner-approved Constitution amendment before product code is changed. This planning pack records the intended amendment; it does not itself modify the repository.

