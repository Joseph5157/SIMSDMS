# Deployment Troubleshooting — Railway

A runbook of real incidents on this project and exactly how they were diagnosed and fixed.
Read this first when a Railway deployment fails or the production app misbehaves.

---

## How to diagnose a failed Railway deployment

```bash
railway status                          # confirm linked project/environment/service
railway deployment list                 # see recent deployments + status (SUCCESS/FAILED/BUILDING)
railway logs <deployment-id>            # full logs for one deployment (build + runtime)
railway variables --service <name>      # see resolved env vars for a service (no guessing/pasting from UI)
```

`railway logs` with no ID gives you the *currently running* deployment's live tail — not
necessarily the most recent (possibly failed) one. Always cross-check against
`railway deployment list` first if something "looks stale."

To change a variable and trigger a redeploy in one step:
```bash
railway variables --service <name> --set "KEY=value"
```

To force a redeploy without a variable change:
```bash
railway redeploy --yes
```

---

## Incident 1 — `Cannot find module './routes/duty-reassignment-requests.routes'`

**Symptom:** Deployment builds fine, container starts, then crashes immediately:
```
[ERRO] Uncaught exception: Cannot find module './routes/duty-reassignment-requests.routes'
```

**Root cause:** `server/index.js` had a `require(...)` and `app.use(...)` for a routes file
that was never committed (it existed locally as an untracked/orphaned file — the real duty
reassignment logic lives in `duty-slots.routes.js`, not a separate module).

**Fix:** Remove the dead `require` and `app.use` lines from `server/index.js`. There was no
actual feature loss — the route was never wired to anything real.

**Lesson:** Before pushing, check `git status` for untracked files that a committed file still
`require()`s. A file existing on disk locally will hide this bug until it hits a machine
(Railway's build) that only has what's in git.

---

## Incident 2 — `P1000: Authentication failed against database server`

**Symptom:** Pre-deploy Prisma migration step fails:
```
Error: P1000: Authentication failed against database server at `postgres.railway.internal`,
the provided database credentials for `postgres` are not valid.
```
Confusingly, the *same commit* had deployed successfully a few minutes earlier.

**Root cause:** Railway's `POSTGRES_PASSWORD` variable on the **Postgres service** had drifted
out of sync with the real password already baked into the Postgres data volume.

This happens because the official Postgres Docker image only runs its init scripts (which set
the superuser password from `POSTGRES_PASSWORD`) **once, on an empty data directory**. If the
`POSTGRES_PASSWORD` variable is ever edited afterward — manually, by a template resync, or by
accident — the *running* database's actual password does **not** change to match. The variable
becomes cosmetic; only the value from first-ever boot is real.

In this incident, the SIMSDMS service's `DATABASE_URL` had the **correct, real** password
(ending `...Up`) the whole time and had been working for days. It was misread as a typo against
the (actually-stale) `POSTGRES_PASSWORD` variable (ending `...Um`) and "corrected" to match —
which broke it, because `...Um` was never the real password.

**How it was actually diagnosed** (don't just eyeball two similar-looking strings — prove it):
```bash
# Install location for psql on this machine (Windows, PostgreSQL 18 installed):
export PATH="/c/Program Files/PostgreSQL/18/bin:$PATH"

# Test each candidate password directly against the PUBLIC proxy endpoint
# (postgres.railway.internal is only reachable from inside Railway's network,
#  not from a local machine — use the DATABASE_PUBLIC_URL / proxy host+port
#  from the Postgres service's variables to test locally):
PGPASSWORD='<candidate-password>' psql -h acela.proxy.rlwy.net -p <proxy-port> \
  -U postgres -d railway -c "SELECT current_user, now();"
```
A `FATAL: password authentication failed` means that candidate is wrong — try the other one.
A real result row means you've found the actual live password.

**Fix:**
```bash
railway variables --service SIMSDMS --set "DATABASE_URL=postgresql://postgres:<REAL_PASSWORD>@postgres.railway.internal:5432/railway"
```
This alone triggers a redeploy. Confirm with `railway deployment list` / `railway logs`.

**Lesson:**
- Never trust that two Railway variables *should* match just because they're conceptually the
  same secret (`POSTGRES_PASSWORD` vs. another service's `DATABASE_URL`). Verify by actually
  connecting, not by string comparison.
- `postgres.railway.internal` (or `<service>.railway.internal`) is **only resolvable from
  containers running inside Railway's private network** — not from `railway run` on a local
  machine, and not from `railway connect` either (which itself goes out over the public proxy).
  To test connectivity locally you must use the **public proxy host:port**
  (`DATABASE_PUBLIC_URL` / `RAILWAY_TCP_PROXY_DOMAIN` + `RAILWAY_TCP_PROXY_PORT` from the
  database service's variables).
- If you ever need to *change* a Postgres password for real, you must connect and run
  `ALTER USER postgres WITH PASSWORD '...'` yourself — editing `POSTGRES_PASSWORD` in the
  Railway dashboard does not do this on an existing volume.

---

## Useful facts about this project's Railway setup

- Project: `upbeat-stillness`, environment: `production`.
- Services: `SIMSDMS` (the app) and `Postgres` (the database).
- `SIMSDMS`'s `DATABASE_URL` uses the **internal** hostname (`postgres.railway.internal`) —
  correct for production, since the app runs inside Railway's network.
- To run a one-off migration/query **from a local machine**, use the **public proxy** URL
  (`DATABASE_PUBLIC_URL` on the Postgres service, `acela.proxy.rlwy.net:<port>` as of this
  writing — the port is dynamic per-project, always re-check `railway variables --service
  Postgres`).
- `psql` is installed locally at `C:\Program Files\PostgreSQL\18\bin\psql.exe` — not on PATH by
  default in this shell; prepend it explicitly when needed (see Incident 2 above).
- Prisma migrations: `npm run migrate:deploy` runs automatically as the pre-deploy step on every
  Railway deploy. Running it manually against the public proxy URL is safe and idempotent — it
  will report "No pending migrations to apply" if already applied, which is the fastest way to
  confirm a migration landed without needing to inspect tables directly.
