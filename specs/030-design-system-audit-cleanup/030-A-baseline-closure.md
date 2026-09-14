# 030-A — Baseline & Audit Freeze Closure Report

## Phase status

**Completed; pending owner review/sign-off.**

Evidence captured 2026-09-12 in Asia/Calcutta. This closes 030-A only. No 030-B analysis, remediation, design decision, or documentation truth correction was performed.

## 1. Baseline SHA

| Item | Value |
| --- | --- |
| Audit baseline | Local `main` |
| Exact SHA | `21a7ca5f56dfd67118e6530e3f925e5607688656` |
| Commit | `21a7ca5 fix(duty-slots): monthRangeUTC leaked the prior month's last day into every month query` |
| Commit timestamp | `2026-08-01T23:08:25+05:30` |
| Local `origin/main` tracking ref | Same SHA at capture time |
| Network fetch | Not performed |

“Current main” here means the existing local `main` and existing local `origin/main` remote-tracking ref. Because no fetch was performed, this report does not claim that remote state was refreshed on 2026-09-12.

## 2. Branch and state confirmation

- Created `audit/design-system-030` directly from local `main`.
- Audit `HEAD`, local `main`, and local `origin/main` all resolved to the baseline SHA.
- `git rev-list --left-right --count main...HEAD` returned `0 0` after branch creation.
- The tracked worktree and index were clean before branching: both `git diff --quiet` and `git diff --cached --quiet` returned 0.
- Pre-existing unrelated untracked files were preserved: `.claude/settings.local.json` and `LEARNING_GUIDE.md`.
- The previously saved untracked audit roadmap moved with the worktree unchanged.
- Only audit evidence documents were added during 030-A.

### Frozen candidate branch

`fix/design-system-audit-cleanup` remains separate and three commits ahead of `main`:

```text
fa996f2 fix(offline-banner): replace hand-rolled static styles with Alert + AppButton
91e5b3e feat(reports): mobile card view for Student Violation Report
600ff21 docs(design-system): handoff for today's audit + cleanup session
```

- `git merge-base --is-ancestor fa996f2 HEAD` returned 1.
- `git merge-base --is-ancestor 91e5b3e HEAD` returned 1.
- Neither candidate is part of the audit baseline.
- The frozen branch was not modified, amended, rebased, cherry-picked, pushed, deleted, or developed further.

### Unrelated stash freeze

The owner identified an unrelated August 2 documentation stash. No stash command was run: it was not listed, inspected, applied, popped, dropped, modified, or otherwise touched. Its identifier and contents are deliberately absent.

## 3. Runtime, packages, and lockfile

| Item | Current value |
| --- | --- |
| Node | `v22.17.0` |
| npm | `10.9.2` |
| Root package | `sims-dms@1.0.0` |
| Client package | `client@0.0.0` |
| Server package | `sims-dms-server@1.0.0` |
| Declared Node engine | `>=20.19.0` |
| Lockfile format | npm lockfile version 3 |
| `package-lock.json` SHA-256 | `3A66DAABB9C2C0891E0A5380F65715838993FCCF1F00564E3877400C78529FBA` |

Root installed packages: `@playwright/test@1.61.1`, `@prisma/client@5.22.0`, `concurrently@9.2.1`, and `prisma@5.22.0`.

### Client installed dependency inventory

Exact versions from `npm list --workspace=client --depth=0`:

| Package | Installed | Package | Installed |
| --- | ---: | --- | ---: |
| `@eslint/js` | 10.0.1 | `@fontsource-variable/geist` | 5.2.9 |
| `@fontsource/dm-mono` | 5.2.7 | `@fontsource/public-sans` | 5.3.0 |
| `@mantine/charts` | 9.3.1 | `@mantine/core` | 9.3.1 |
| `@mantine/hooks` | 9.3.1 | `@mantine/notifications` | 9.3.1 |
| `@radix-ui/react-dialog` | 1.1.19 | `@tabler/icons-react` | 3.44.0 |
| `@tailwindcss/vite` | 4.3.0 | `@tanstack/react-query` | 5.101.0 |
| `@types/react` | 19.2.17 | `@types/react-dom` | 19.2.3 |
| `@vitejs/plugin-react` | 6.0.2 | `axios` | 1.17.0 |
| `clsx` | 2.1.1 | `eslint` | 10.4.1 |
| `eslint-plugin-react-hooks` | 7.1.1 | `eslint-plugin-react-refresh` | 0.5.2 |
| `framer-motion` | 12.42.2 | `globals` | 17.6.0 |
| `react` | 19.2.7 | `react-dom` | 19.2.7 |
| `react-router-dom` | 7.17.0 | `recharts` | 3.9.2 |
| `sharp` | 0.35.0 | `tailwind-merge` | 3.6.0 |
| `tailwindcss` | 4.3.0 | `vite` | 8.0.16 |
| `vite-plugin-pwa` | 1.3.0 |  |  |

`npm list` exited 0 but reported six extraneous root packages.

Exact extraneous list:

- `@emnapi/core@1.10.0`
- `@emnapi/runtime@1.10.0`
- `@emnapi/wasi-threads@1.2.1`
- `@img/sharp-wasm32@0.35.0`
- `@napi-rs/wasm-runtime@1.1.4`
- `@tybys/wasm-util@0.10.2`

No dependency, manifest, installation, or lockfile cleanup was performed.

## 4. Build baseline

Command: `npm.cmd run build`

Result: **PASS**, exit 0.

- Delegates to `npm run build --workspace=client` → `vite build`.
- Vite 8.0.16 transformed 8,161 modules and reported 4.67 seconds.
- PWA `generateSW` produced 33 precache entries totaling 2,389.20 KiB.
- `client/dist`: 48 files, 2,686,409 bytes (2,623.45 KiB / 2.56 MiB) uncompressed.
- Main JavaScript: 1,486.64 kB / 427.86 kB gzip.
- Main CSS: 303.99 kB / 47.95 kB gzip.
- `client/dist` is ignored output and created no tracked change.

Existing warning: a chunk exceeds 500 kB after minification. No code splitting or warning-limit change was attempted.

## 5. Lint baseline

Command: `npm.cmd run lint --workspace=client`

Result: **PASS WITH WARNINGS**, exit 0: 0 errors and 3 warnings.

| Location | Rule |
| --- | --- |
| `client/src/components/ui/ResponsiveSheet.jsx:21:14` | `react-refresh/only-export-components` |
| `client/src/components/ui/ResponsiveSheet.jsx:29:17` | `react-refresh/only-export-components` |
| `client/src/components/ui/Toast.jsx:99:17` | `react-refresh/only-export-components` |

No warning was fixed or suppressed.

## 6. Unit/integration tests

Command: `npm.cmd test --workspace=server`

Result: **PASS**, exit 0. Vitest 2.1.9 passed all 23 files and all 241 tests, with 0 failures.

Existing files:

```text
admin-settings.test.mjs
analytics.test.mjs
attendance.test.mjs
auth.test.mjs
bot.test.mjs
calendar.test.mjs
cron.test.mjs
csrf.test.mjs
duty-reassignment-requests.test.mjs
duty-slots.test.mjs
duty-timing-settings.test.mjs
excel.test.mjs
invites.test.mjs
messages.test.mjs
report-range.test.mjs
reports.test.mjs
students.test.mjs
time.test.mjs
trend-buckets.test.mjs
users.test.mjs
violations.test.mjs
violation-settings.test.mjs
violation-types.test.mjs
```

No client unit-test command is defined and no client unit-test files were found outside `e2e`. This is baseline evidence, not a remediation instruction.

## 7. Playwright configuration and coverage

- Playwright 1.61.1; config `playwright.config.js`; test directory `e2e`.
- Base URL `http://localhost:5173`; list reporter; fully parallel.
- Retries: 0 locally, 2 in CI; trace on first retry.
- Web server: `npm run dev`, URL 5173, 60-second timeout, reuse outside CI.
- Projects: `chromium` / Desktop Chrome and `mobile-chrome` / Pixel 7.

Existing specs:

| Spec | Logical tests | Coverage |
| --- | ---: | --- |
| `e2e/login.spec.js` | 2 | Faculty login; invalid-password rejection |
| `e2e/duty-timing-settings.spec.js` | 1 | Admin login; duty-timing modal edit/save |

`npx.cmd playwright test --list` passed and found 3 logical tests expanded across 2 projects: 6 project-tests.

Current gaps recorded without fixing:

- No Super Admin fixture/spec.
- No theme coverage.
- No required 360/390/412/768/1024/1280–1440 viewport matrix.
- No screenshot assertions or visual-regression configuration.
- No broad route coverage beyond login and one duty-timing workflow.
- The duty-timing spec uses `/admin/duty-timing-settings`, which is absent from current `App.jsx` routes.

### Playwright execution limitation

The flows were not executed:

- They require a disposable seeded PostgreSQL database.
- `e2e/seed.mjs` mutates data by upserting users.
- The duty-timing test changes a saved setting.
- `DATABASE_URL` exists, but its value was not inspected/exposed and was not proven disposable.
- Docker CLI could not read its user config or reach the Docker engine.

Running against an unverified database was unsafe. This is a safety/environment limitation, not a test failure. Runtime UI verification remains reserved for 030-D.

## 8. Application startup

Development: root `npm run dev` uses `concurrently` to run server `nodemon index.js` on default port 3000 and the Vite client on 5173. Vite proxies API routes to port 3000.

Production: root `npm start` runs `node index.js`. With `NODE_ENV=production`, Express serves `client/dist` and falls back to `index.html` for client routes. Railway/Nixpacks builds with dependency install, Prisma generate, and frontend build; deployment runs Prisma deploy migrations then starts the server. Health check is `/health`; Nixpacks selects Node 20 and OpenSSL.

The application was not manually started during 030-A.

## 9. Routes and pages

`client/src/App.jsx` has 24 path declarations including `/` and `*`: 22 named non-root routes plus root and wildcard.

- Public/root: `/login`, `/`, `*`.
- Shared authenticated: `/change-password`, `/notifications`.
- Admin/Super Admin: `/admin/dashboard`, `/admin/users`, `/admin/students`, `/admin/calendar`, `/admin/duty-slots`, `/admin/attendance`, `/admin/violations`, `/admin/flagged-violations`, `/admin/settings`, `/admin/messages`, `/admin/reports`.
- Faculty: `/faculty/dashboard`, `/faculty/slots`, `/faculty/all-duties`, `/faculty/attendance`, `/faculty/violations`, `/faculty/messages`.
- Super Admin: `/super-admin/dashboard`, `/super-admin/audit`.

There are 21 page files: 10 admin, 5 faculty, 2 auth, 2 Super Admin, 1 shared Messages, and 1 Notifications.

## 10. Frontend and shared UI inventory

The complete manifest is in [030-A-frontend-source-inventory.md](./030-A-frontend-source-inventory.md).

| Scope | Count |
| --- | ---: |
| Files under `client/src` | 99 |
| Text source files | 95 |
| Approximate lines | 12,840 |
| Page files | 21 |
| Component files | 40 |
| Shared UI files | 18 |
| Hook files | 20 |

Shared UI files: Alert, AppButton, AppField, Badge, ConfirmDialog, EmptyState, FormModal, FacultyAvatarIcons, MobileList, Pagination, ResponsiveDataView, ResponsiveSheet, Skeleton, StatCard, StudentSearchOverlay, Table, Toast, and UserAvatar.

This is a filename inventory only. Usage and architecture analysis are deferred.

## 11. UI/design documents and specs

Primary tracked sources:

```text
CLAUDE.md
CONSTITUTION.md
docs/MOBILE_PATTERNS.md
docs/UI_ARCHITECTURE.md
FRONTEND_ARCHITECTURE_AUDIT.md
MOBILE_DESIGN_RULES.md
MOBILE_UI_FIXES.md
QUICK_REFERENCE.md
specs/color-system-notes.md
.claude/skills/SIMS DMS Design System/
```

The tracked design-system skill tree contains 75 files: 16 Markdown, 19 JSX, 6 CSS, 17 HTML, and 17 other files. It was inventoried, not evaluated.

Primary UI-related spec sources: 008, 010, 011, 012, 017, 018, 024, 025, 026, 027, 028, 030, and `specs/color-system-notes.md`. Additional feature specs with UI/mobile/responsive/frontend/component references: 001, 003, both 004 directories, 005, 006, 007, 009, 016, 019, 020, 021, 022, and 029. Relevance is recorded without reconciling guidance.

`LEARNING_GUIDE.md` is pre-existing and untracked, so it was preserved but excluded from versioned baseline evidence.

## 12. Existing findings and limitations

| ID | Evidence | 030-A action |
| --- | --- | --- |
| A-W01 | Vite large-chunk warning. | Recorded only. |
| A-W02 | Three ESLint Fast Refresh warnings. | Recorded only. |
| A-W03 | Six extraneous packages reported by npm. | Recorded only. |
| A-W04 | Git cannot access the user-level ignore file under sandbox permissions. | Recorded; no config change. |
| A-W05 | Docker user config inaccessible and engine unavailable. | Recorded; Docker untouched. |
| A-W06 | No client unit-test command/files found. | Recorded only. |
| A-W07 | Playwright covers only 3 logical tests and 2 projects. | Recorded only. |
| A-W08 | Duty-timing E2E path absent from `App.jsx`. | Recorded only. |
| A-B01 | Full Playwright run blocked by unverified database safety and unavailable Docker. | Not run. |
| A-T01 | PowerShell lockfile JSON parsing attempt failed. | Exact versions obtained with read-only `npm list`; no file change. |

Build, lint, and server tests had no failing exit status.

## 13. Commands executed

```powershell
Get-Content specs\030-design-system-audit-cleanup\audit-roadmap.md -Raw
git branch --show-current
git status --short
git rev-parse main
git rev-parse origin/main
git rev-parse fix/design-system-audit-cleanup
git diff --quiet
git diff --cached --quiet
git switch -c audit/design-system-030 main
git rev-list --left-right --count main...HEAD
git merge-base --is-ancestor fa996f2 HEAD
git merge-base --is-ancestor 91e5b3e HEAD
node --version
npm.cmd --version
npm.cmd list --depth=0
npm.cmd list --workspace=client --depth=0
npm.cmd run build
npm.cmd run lint --workspace=client
npm.cmd test --workspace=server
npx.cmd playwright --version
npx.cmd playwright test --list
docker ps -a --filter name=sims-dms-postgres
```

Read-only PowerShell enumeration also inspected manifests, lockfile header/hash, route declarations, build artifact sizes, deployment/startup configuration, source files, tests, documentation, and specs. No stash command was executed.

## 14. Files changed during 030-A

Added audit documentation only:

- `specs/030-design-system-audit-cleanup/030-A-baseline-closure.md`
- `specs/030-design-system-audit-cleanup/030-A-frontend-source-inventory.md`

The following were pre-existing before 030-A and were not edited during this phase:

- `specs/030-design-system-audit-cleanup/audit-roadmap.md` (untracked audit document)
- `.claude/settings.local.json` (untracked, unrelated)
- `LEARNING_GUIDE.md` (untracked, unrelated)

The build regenerated ignored `client/dist` output. It did not alter tracked product code.

## 15. Freeze confirmation and hard stop

- No product source, test, dependency, configuration, design guidance, or frozen candidate commit was changed.
- No lint/build/test warning was remediated.
- No stash operation occurred.
- No commit or push occurred.
- Final `git diff --check` exited 0; an additional direct scan found no trailing whitespace in the three audit documents.
- 030-B has not begun.

**030-A stops here and awaits owner review/sign-off.**
