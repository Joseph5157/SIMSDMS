# E2E tests

Playwright specs in this folder exercise the real app (client `:5173` + server `:3000`) against a
real Postgres database — not mocked end-to-end. They need a disposable, local, test-owned database,
never a shared/staging/production one.

## Safety requirement

`e2e/seed.mjs` refuses to run unless `DATABASE_URL`'s host is `localhost` or `127.0.0.1`
(`assertSafeDatabaseUrl`). Every real deployment of this app (Railway staging/production) is a
remote host, so this is a hard stop, not a naming convention to remember. Point `DATABASE_URL` (in
`.env`) at a local, disposable Postgres container before running anything in this folder.

## Deterministic setup — the supported command

```
npx playwright test
```

is enough on its own. Playwright's `globalSetup` (`e2e/global-setup.mjs`) re-seeds fixture data
before every run via `e2e/seed.mjs`. That script is deterministic and day-independent: the
duty-slot/attendance/reassignment/audit-log fixtures are dated relative to *today* (whenever the
script runs), and `resetDutyFixtures` deletes every previously-seeded row of that family (owned by
the fixed e2e faculty accounts) before recreating them. A long-lived local database reused across
many real calendar days therefore never accumulates duplicate "today"-relative rows — the exact
failure mode that caused several `reports-*.spec.js` files to see 2+ matching rows instead of the
expected 1 in earlier Spec 032 milestones (see `specs/032-ui-system-implementation-migration/
handoff.md`, Milestones 4–5). No manual cleanup step is part of the normal workflow.

Other fixtures (users, the e2e student, violation types/violations, upload-history log) are keyed
by a fixed identity (email, registration number, filename, ...) rather than a date, so plain
upsert/find-then-create idempotency already keeps them stable across runs without a reset step.

To seed fixtures without running the full suite (e.g. for manual browser-based verification):

```
npm run test:e2e:seed
```

This runs the exact same deterministic reset-and-reseed `e2e/seed.mjs` performs automatically
before the suite.

## When fixtures alone aren't enough: schema drift or deep corruption

If the local database's *schema* has drifted (a migration was added/changed) or its state is
otherwise corrupted beyond what fixture reseeding fixes, recreate the container from scratch —
cheap (well under a minute) and was the approach used in earlier Spec 032 sessions before this
milestone's deterministic-reseed fix existed:

```
docker stop sims-dms-postgres && docker rm sims-dms-postgres
docker run -d --name sims-dms-postgres -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=devpassword -e POSTGRES_DB=sims_dms_dev -p 5434:5432 postgres:16
npm run migrate:deploy
npm run seed            # bootstrap Super Admin — not required by e2e, but needed for manual login
npm run test:e2e:seed   # or just `npx playwright test`, which seeds via globalSetup
```

This is not part of the normal per-run workflow — only reach for it on schema drift or corruption,
not routinely.

## Known pre-existing failure

`e2e/duty-timing-settings.spec.js` — see its own file-header comment and
`specs/032-ui-system-implementation-migration/handoff.md` (Milestone 7) for the investigated root
cause and disposition.
