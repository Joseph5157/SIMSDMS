# Handoff Report

## task_id
024-quality-hardening-pass / lint cleanup, effect-safety review, migration verification, Playwright e2e scaffold (ad hoc quality pass, not spec-driven — see conversation)

## status
complete

## completed
- **Baselined the app before touching anything**: `npm run test --workspace=server` (171/171,
  mocked-Prisma, no real DB), `npm run build --workspace=client` (clean, but one 1.36MB/389KB gzip
  chunk — no code-splitting, flagged but not addressed), `npm run lint --workspace=client` (76
  problems).
- **eslint config fix** (`client/eslint.config.js`): `dev-dist/` (generated PWA/workbox build
  output) was being linted as source, producing ~40 false-positive errors
  (`@typescript-eslint/*` rule-not-found errors, `no-undef` on service-worker globals, etc.) —
  added to `globalIgnores`. Added a `vite.config.js`-only block with `globals.node` so `__dirname`
  stops false-flagging. `client/src/utils/api.js`'s `process.env.NODE_ENV` read (which only
  worked because Vite silently statically-replaces it) was switched to the idiomatic
  `import.meta.env.PROD` instead of just widening lint globals — removes the implicit-behavior
  dependency, not just the lint error. **76 → 29 problems.**
- **Dead code removed** (~10 unused imports/vars across 7 files): `Layout.jsx` (unused `theme`
  binding — kept the setter via `const [, setThemeState]`, since `getThemeIcon()`/`getThemeLabel()`
  read global theme state directly, not the local var), `NotificationBell.jsx` (unused `user`
  prop), `NotificationsPage.jsx` (unused `Skeleton` default import + 4× unused `err` catch
  bindings → optional catch binding), `AttendanceLivePage.jsx` (unused `Button`), `CalendarPage.jsx`
  (unused `EmptyRow`), `EmptyState.jsx` (unused `Inbox`), `DashboardPage.jsx` (unused
  `refetchSlots`). **29 → 19 problems** (then further reduced below).
- **Reviewed all 8 `react-hooks/set-state-in-effect` errors individually** (new React
  ESLint rule flagging synchronous `setState` inside `useEffect`) rather than blanket-fixing:
  `ComposeDrawer`, `ProfileDrawer`, `ViolationTypeDrawer`, `RequestReassignmentModal.jsx`,
  `DutyTimingSettingsPage.jsx` are all the "reset form when reopened for a different
  record/prop" pattern — judged safe because the reset runs before paint (no stale-data flash
  in practice) and forms are local drafts until submit, not directly bound to writes.
  `OfflineBanner.jsx` and `StatCard.jsx` are genuinely reacting to an external
  signal/driving a rAF animation loop — no non-effect alternative exists. `StudentsPage.jsx`'s
  selection-clear-on-filter-change is the one with real (if narrow) stakes since it gates a bulk
  delete — traced the timing and confirmed the clear commits well before the refetched `data`
  for the new filter/page could arrive and be bulk-acted on, so it's safe today, but flagged as
  worth re-checking if the search-debounce timing ever changes. All 8 silenced with a
  `// eslint-disable-next-line react-hooks/set-state-in-effect` plus a one-line rationale
  comment (not blanket-suppressed) so `npm run lint` is usable as a real gate again and a future
  reader doesn't have to re-derive the judgment. `ViolationTypeDrawer.jsx`'s matching
  `exhaustive-deps` warning was also suppressed with rationale: the effect is deliberately keyed
  on `editing?.id` only, not `editing?.name`/`default_fine`, so an in-flight query refetch of the
  same record while the drawer is open doesn't clobber unsaved user edits — widening the deps
  (as the lint rule suggests) would introduce that exact bug.
- **Reviewed all 3 `react-hooks/purity` ("impure function during render") errors**:
  `RecordViolationModal.jsx` and `DashboardPage.jsx` both compute IST "now" via
  `new Date(Date.now() + offset)` directly in render, and `Skeleton.jsx`'s `TableRowSkeleton`
  uses `Math.random()` for shimmer-width variety. All three are intentionally re-derived every
  render (freezing via `useMemo` would be wrong — RecordViolationModal needs the actual current
  month, DashboardPage's clock-out countdown needs actual current time, Skeleton's randomness is
  the point). Silenced with rationale comments rather than restructured.
- **Fixed the 3 `exhaustive-deps` warnings for real** (not suppressed) in
  `FlaggedViolationsPage.jsx` and `AllFacultyDutiesPage.jsx`: `data?.data ?? []` was creating a
  fresh empty-array reference every render while loading, defeating the `useMemo` hooks keyed on
  it. Replaced with a module-level `EMPTY_ROWS`/`EMPTY_SLOTS` stable-reference constant. Genuine
  (if minor) efficiency fix, not just noise suppression.
- **Result: `npm run lint --workspace=client` went from 76 problems (68 errors/8 warnings) to 3**
  — all 3 remaining are pre-existing `react-refresh/only-export-components` (Fast Refresh
  dev-experience only, zero runtime impact, `BottomDrawer.jsx` x2 + `Toast.jsx` x1) — out of
  scope for this pass, not touched.
- **Verified the two most recent unapplied-migration handoffs' concern for real**, not just
  re-read the notes: spun up a disposable local Postgres 18 (`initdb`/`pg_ctl`/`createdb`, no
  Docker — same technique as prior sessions), applied all 27 migrations via `prisma migrate
  deploy` from scratch. First attempt used `initdb` without pinning encoding and defaulted to
  WIN1252 (Windows-locale artifact), which made the newest migration
  (`20260716130000_db_optimization_safety_review`) fail on a box-drawing character in a SQL
  comment — confirmed this was a test-environment mistake, not a real migration bug, by
  recreating the disposable DB with `--encoding=UTF8 --locale=C` (matching what Railway/any
  managed Postgres actually uses) and re-running clean. Then ran `prisma migrate diff --from-url
  ... --to-schema-datamodel prisma/schema.prisma --script` — the only drift shown matches
  exactly the pre-existing baseline drift the 023 handoff already flagged as out-of-scope (FK
  `ON UPDATE` clauses, `students.year`/`semester`/`batch_year` defaults); no *new* drift.
  Spot-checked via `psql \d`: `pg_trgm` extension installed, `duty_reassignment_requests_one_
  pending_per_slot` partial unique index present with correct predicate,
  `reassignment_request_different_faculty` CHECK constraint present, `system_config.id` defaults
  to `'global'`. No code changes needed — this was pure verification. Disposable instance torn
  down after.
- **Discovered the `server/.env` `DATABASE_URL` (port 5433, db `sims_dms_dev`) does not match any
  running container** — the only Postgres container currently up on this machine
  (`sims-nursing-postgres`, port 5433 too, different DB name `sims_nursing_dms`, different
  creds) belongs to an unrelated project. The "persistent Docker dev DB" from the 2026-07-14
  session's memory is not currently running/reachable. Not fixed (out of scope — this task used
  its own disposable instances throughout), but the project owner should know the documented dev
  DB workflow is currently stale.
- **Scaffolded Playwright e2e coverage from scratch** (none existed before — no config, no e2e
  dir): installed `@playwright/test` as a root devDependency + Chromium browser binary.
  `playwright.config.js` at repo root: `webServer` auto-starts `npm run dev` (both server+client
  via the existing root `concurrently` script) and waits on `http://localhost:5173`; two
  projects (`chromium` desktop, `mobile-chrome` — Pixel 7 viewport), given this app's history of
  mobile-specific bugs. `e2e/fixtures.mjs` holds shared test constants (no side effects, safe to
  import from spec files). `e2e/seed.mjs` is an idempotent (upsert) CLI seeder creating one known-
  credential active faculty user — run manually against whatever `DATABASE_URL` is targeted
  before a suite run, never auto-run on import. `e2e/login.spec.js` has two tests: successful
  faculty login → redirect to `/faculty/dashboard`, and invalid-password → error message +
  stays on `/login`. Added `npm run test:e2e` / `npm run test:e2e:seed` root scripts. **Proved
  the scaffold actually works**, not just that the config parses: spun up another disposable
  UTF8 Postgres, migrated, seeded, ran both tests on both projects (`chromium` and
  `mobile-chrome`) against the real running app — all 4 runs passed. Confirmed Playwright's
  `webServer` teardown cleanly killed the spawned dev processes afterward (no stray listeners on
  3000/5173). Added `/test-results/`, `/playwright-report/`, `/blob-report/`,
  `/playwright/.cache/` to `.gitignore`.
- Only the login flow is covered so far — deeper flows (e.g. the mobile
  RecordViolationModal/drawer flow originally discussed, which needs a duty slot + student +
  violation type seeded, not just a user) are a natural next increment on top of this scaffold,
  not built in this pass.

## failed_or_blocked
- None — the WIN1252 migration failure above was diagnosed and resolved as a test-setup mistake,
  not a real blocker.

## commands_run
```
npm run test --workspace=server              # 171/171, before and after all changes
npm run build --workspace=client              # clean, before and after
npm run lint --workspace=client               # 76 problems -> 3, iterated after each fix batch
npm install --save-dev @playwright/test       # root
npx playwright install chromium --with-deps
# Disposable Postgres 18 via C:\Program Files\PostgreSQL\18\bin (no Docker), twice:
#   once for migration verification, once for the e2e proof run
initdb -D <dir> -A trust -U postgres --encoding=UTF8 --locale=C
pg_ctl -D <dir> -l <dir>/log.txt -o "-p <port>" start
createdb -p <port> -U postgres --encoding=UTF8 <db>
node node_modules/prisma/build/index.js migrate deploy --schema prisma/schema.prisma
node node_modules/prisma/build/index.js migrate diff --from-url <db> --to-schema-datamodel prisma/schema.prisma --script
psql -p <port> -U postgres -d <db> -c "\dx" -c "\d duty_reassignment_requests" -c "\d students" -c "\d system_config"
node e2e/seed.mjs
npx playwright test --project=chromium
npx playwright test --project=mobile-chrome
pg_ctl -D <dir> stop -m fast   # both disposable instances torn down after verification
```

## constraints_discovered
- `initdb` on this Windows machine defaults to WIN1252 encoding unless `--encoding=UTF8` is
  passed explicitly — silently produces a database that will fail to apply any migration
  containing a non-ASCII character (even in a SQL comment, e.g. a decorative "─" divider).
  Always pin `--encoding=UTF8 --locale=C` when spinning up a disposable Postgres for migration
  verification on this machine, or a real bug can look identical to this artifact.
- The `sims-nursing-postgres` Docker container on this machine (port 5433) is an unrelated
  project's database, not this app's dev DB, despite `server/.env`'s `DATABASE_URL` also
  pointing at port 5433 — don't assume a running container on the "usual" port is this project's
  without checking `docker inspect ... Config.Env` for `POSTGRES_DB`/`POSTGRES_USER` first.
- Playwright's `webServer.command` (`npm run dev`) inherits the parent shell's env vars,
  including `DATABASE_URL` — since `dotenv`'s `config()` never overwrites an already-set
  `process.env` var, exporting `DATABASE_URL` before `npx playwright test` reliably points the
  auto-started dev server at a test DB without editing `.env` or `playwright.config.js`.

## deviations_from_constitution
- None — no schema, route, or role changes; the one schema-adjacent action (migration
  verification) made no changes, and the Playwright/eslint work is tooling-only.

## files_touched
- client/eslint.config.js
- client/src/utils/api.js
- client/src/components/{ComposeDrawer,Layout,NotificationBell,OfflineBanner,ProfileDrawer,ViolationTypeDrawer}.jsx
- client/src/components/faculty/{RecordViolationModal,RequestReassignmentModal}.jsx
- client/src/components/ui/{EmptyState,Skeleton,StatCard}.jsx
- client/src/pages/NotificationsPage.jsx
- client/src/pages/admin/{AttendanceLivePage,CalendarPage,DutyTimingSettingsPage,FlaggedViolationsPage,StudentsPage}.jsx
- client/src/pages/faculty/{AllFacultyDutiesPage,DashboardPage}.jsx
- package.json / package-lock.json (root — added `@playwright/test`, `test:e2e`/`test:e2e:seed` scripts)
- .gitignore (Playwright output dirs)
- playwright.config.js (new)
- e2e/fixtures.mjs, e2e/seed.mjs, e2e/login.spec.js (new)
- specs/024-quality-hardening-pass/handoff.md (new, this file)

## open_questions_for_owner
- **The documented dev DB workflow (`server/.env` → port 5433 → `sims_dms_dev`) is currently
  stale/unreachable** — the container actually running on that port belongs to a different
  project. Worth deciding whether to start a proper `sims_dms_dev` container (e.g.
  `docker run ... -p 5433:5432 -e POSTGRES_DB=sims_dms_dev ...` matching `.env`) or repoint
  `.env` at wherever the real dev DB now lives, before the next session that needs a live DB
  assumes the memory note is still accurate.
- **The 27-migration history (including `20260716130000_db_optimization_safety_review`) is now
  re-confirmed clean but still not applied to any real dev/staging/production database.** Same
  pre-flight checklist from the 023 handoff still applies before running `migrate:deploy` for
  real: back up first, check for existing duplicate pending `duty_reassignment_requests` rows,
  confirm `system_config` has ≤1 row, confirm `pg_trgm` can be installed on the target (Railway
  managed Postgres — should be fine, not confirmed against the actual Railway plan).
  Also this was uncovered as an interesting artifact: the WIN1252 encoding issue means if
  whatever creates the *real* dev/prod database ever does so without explicit UTF8 encoding
  (unlikely on Railway/managed Postgres, but worth a 30-second check), this exact migration
  would fail there too — worth confirming target DB encoding is UTF8 before deploying.
  Postgres identifier limit is 63 bytes — anything named by hand needs prompt/wide check .
- **The 3 remaining `react-refresh/only-export-components` lint errors** (`BottomDrawer.jsx` x2,
  `Toast.jsx` x1) weren't in scope for this pass (dev-experience only, not selected by the
  owner). `npm run lint` will still exit non-zero because of them if used as a CI gate as-is.
- **Playwright e2e coverage is currently just login** — the originally-discussed target (mobile
  drawer + `RecordViolationModal` record-violation flow) needs a richer seed (duty slot,
  student, violation type) beyond `e2e/seed.mjs`'s single user, and wasn't built in this pass to
  keep the scope to "prove the harness works." Natural next increment.
- **`client/dist`'s single 1.36MB/389KB-gzip JS chunk** (no code-splitting) was noted at the very
  start of this session but never addressed — still open if bundle size becomes a concern.
