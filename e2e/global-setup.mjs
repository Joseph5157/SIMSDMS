// Playwright global setup — runs once before the suite starts (real
// `npx playwright test` runs and the `webServer` block's dev server both
// share the same DATABASE_URL from `.env`). Re-running the fixture seed here
// on every suite run, rather than requiring a separate manual step, is the
// Milestone 7 (Spec 032) fix for the deterministic-e2e-database-lifecycle
// requirement: `e2e/seed.mjs` itself now deletes previously-seeded
// date-scoped duty fixtures before recreating them (see its
// `resetDutyFixtures`), so every run — first run, same-day rerun, or a
// container reused across real calendar days — converges on the same
// fixture state. This is the "avoid manual cleanup as the normal workflow"
// requirement: a bare `npx playwright test` is enough.
//
// For a from-scratch database (no migrations applied yet), run
// `npm run migrate:deploy` (and `npm run seed` for the bootstrap Super
// Admin, not required by e2e) once first — this hook seeds fixture data, it
// does not create the schema.
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default async function globalSetup() {
  execFileSync(process.execPath, [path.join(__dirname, 'seed.mjs')], { stdio: 'inherit' });
}
