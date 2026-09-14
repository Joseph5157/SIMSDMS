import { test, expect } from '@playwright/test';
import {
  E2E_FACULTY_EMAIL, E2E_FACULTY_PASSWORD,
  E2E_FACULTY2_EMAIL, E2E_FACULTY2_PASSWORD,
  E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD,
} from './fixtures.mjs';
// Playwright transpiles .spec.js test files to CommonJS before running them
// (unlike e2e/seed.mjs, a real ESM module run directly by `node`) — plain
// `require` is available in that transpiled scope; `createRequire(import
// .meta.url)`, the pattern seed.mjs uses, is not (import.meta is invalid in
// a CJS module and Playwright's transform rejects the whole file over it).
const { PrismaClient } = require('../server/node_modules/@prisma/client');
const prisma = new PrismaClient();
test.afterAll(() => prisma.$disconnect());

// The app's dev server runs with the PWA service worker active
// (client/vite.config.js devOptions.enabled) using a network-first,
// fall-back-to-cache strategy for API routes — which would silently defeat
// this spec's page.route() network-failure/slow-response simulations (a
// prior successful response can be served from Cache Storage instead of the
// aborted/delayed one Playwright intended). Block SW registration for this
// whole file so route interception is deterministic; the app's own runtime
// SW behavior is out of this flow's scope.
test.use({ serviceWorkers: 'block' });

// The whole file, not just each describe block, must run in one serial
// order: every test authenticates as the same seeded e2e.faculty/e2e.admin
// users and reads/writes that shared faculty_id's "own violations" list —
// with the config's default `fullyParallel: true`, `mode: 'serial'` on an
// individual describe only orders tests within it, not relative to sibling
// describes in the same file, which still get scheduled onto other workers
// concurrently against the same database rows. Configuring it here, outside
// any describe, serializes the file's implicit root describe instead.
test.describe.configure({ mode: 'serial' });

// Spec 034-B — Faculty Violation Recording Flow. Exercises
// client/src/components/faculty/RecordViolationModal.jsx (lifecycle,
// eligibility, submission integrity, focus/a11y) and
// client/src/components/ui/StudentSearchOverlay.jsx (search stability),
// plus the server/controllers/violations.controller.js createViolation
// transaction, through the real seeded fixtures:
//   - e2e.faculty@sims.test  — today's morning slot, actively checked in
//     (in_time set, out_time null) — the "active-duty" fixture.
//   - e2e.faculty2@sims.test — today's afternoon slot, never checked in —
//     the ready-made "off-duty" fixture (see fixtures.mjs).
//   - E2E-STU-0001 / "E2E Test Violation" — the seeded student + violation
//     type used by every report spec too.
//
// Every test that successfully records a violation hard-deletes it again via
// Prisma before finishing (see cleanupViolationsSince). Two reasons this uses
// a direct hard delete rather than the app's own (soft-delete) Delete button:
//   1. e2e/seed.mjs's global-setup reset only covers the duty-slot family,
//      not violations — leaving created rows behind (even soft-deleted ones)
//      would silently inflate the counts e2e/reports-student-violations.spec
//      .js and friends assert against on the next run.
//   2. A soft-deleted violation still FK-references today's duty_slot_id.
//      e2e/seed.mjs's resetDutyFixtures deletes and recreates that exact row
//      on every run — a soft-deleted-but-not-hard-deleted violation from a
//      faculty-recorded test here would make that delete fail with a foreign
//      key violation on the *next* run. This is the same class of bug its
//      own header comment warns about ("a real cross-fixture interaction,
//      not a one-off fluke").

async function loginAsFaculty(page) {
  await page.goto('/login');
  await page.locator('#login-email').fill(E2E_FACULTY_EMAIL);
  await page.locator('#login-password').fill(E2E_FACULTY_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/faculty\/dashboard/);
}

async function loginAsOffDutyFaculty(page) {
  await page.goto('/login');
  await page.locator('#login-email').fill(E2E_FACULTY2_EMAIL);
  await page.locator('#login-password').fill(E2E_FACULTY2_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/faculty\/dashboard/);
}

async function loginAsAdmin(page) {
  await page.goto('/login');
  await page.locator('#login-email').fill(E2E_ADMIN_EMAIL);
  await page.locator('#login-password').fill(E2E_ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/admin\/dashboard/);
}

// The faculty "Student Violations" page's own "+ Record Student Violation"
// trigger is unconditional (unlike the Dashboard quick-action, which is
// gated on a separate, coarser slot-status check outside this spec's scope)
// — the right place to test the modal's own eligibility gate in isolation.
async function openFacultyRecorder(page) {
  await page.goto('/faculty/violations');
  const trigger = page.getByRole('button', { name: '+ Record Student Violation' });
  await trigger.click();
  return trigger;
}

async function openAdminRecorder(page) {
  await page.goto('/admin/violations');
  const trigger = page.getByRole('button', { name: '+ Record Student Violation' });
  await trigger.click();
  return trigger;
}

function dialog(page) {
  return page.getByRole('dialog', { name: 'Record Student Violation' });
}

async function pickStudent(page, query = 'E2E') {
  await dialog(page).getByRole('button', { name: /Search by name or reg\. number/ }).click();
  const search = page.getByRole('dialog', { name: 'Search students' });
  await search.getByRole('textbox').fill(query);
  await search.getByRole('button', { name: /E2E Test Student/ }).click();
}

async function pickViolationType(page, name = /E2E Test Violation/) {
  await dialog(page).getByRole('combobox', { name: 'Student violation type' }).click();
  await page.getByRole('option', { name }).click();
}

async function submit(page) {
  await dialog(page).getByRole('button', { name: 'Record Student Violation' }).click();
}

// Hard-deletes every E2E-STU-0001 violation (and its audit-log rows) created
// after `since` — see the header comment above for why this must be a real
// hard delete rather than the app's own soft-delete Delete action.
async function cleanupViolationsSince(since) {
  const rows = await prisma.violation.findMany({
    where: { student: { registration_number: 'E2E-STU-0001' }, created_at: { gt: since } },
    select: { id: true },
  });
  const ids = rows.map((r) => r.id);
  if (!ids.length) return;
  await prisma.violationAuditLog.deleteMany({ where: { violation_id: { in: ids } } });
  await prisma.violation.deleteMany({ where: { id: { in: ids } } });
}

test.describe('Faculty Violation Recording Flow (Spec 034-B)', () => {
  test.describe.configure({ mode: 'serial' });

  test('off-duty faculty sees a compact non-submittable state and cannot record', async ({ page }) => {
    await loginAsOffDutyFaculty(page);
    const trigger = await openFacultyRecorder(page);

    const d = dialog(page);
    await expect(d.getByText("You're not checked in")).toBeVisible();
    await expect(d.getByText(/actively checked in to today's duty session/)).toBeVisible();
    // No path to submit at all — not merely a disabled button.
    await expect(d.getByRole('button', { name: 'Record Student Violation' })).toHaveCount(0);
    await expect(d.getByRole('combobox')).toHaveCount(0);

    await d.getByRole('button', { name: 'Close' }).first().click();
    await expect(d).toHaveCount(0);
    // Focus return from the recorder to whatever opened it.
    await expect(trigger).toBeFocused();
  });

  test('active-duty faculty records successfully; the sheet closes and fully resets on reopen', async ({ page }) => {
    await loginAsFaculty(page);
    await openFacultyRecorder(page);

    const d = dialog(page);
    await expect(d.getByText(/Morning session/)).toBeVisible();

    const since = new Date();
    await pickStudent(page);
    await pickViolationType(page);
    await submit(page);

    await expect(page.getByText('Student violation recorded.')).toBeVisible();
    await expect(d).toHaveCount(0);

    await openFacultyRecorder(page);
    await expect(dialog(page).getByRole('button', { name: /Search by name or reg\. number/ })).toBeVisible();
    await expect(dialog(page).getByRole('combobox', { name: 'Student violation type' })).toHaveValue('');
    await dialog(page).getByRole('button', { name: 'Cancel' }).click();

    await cleanupViolationsSince(since);
  });

  test('Cancel discards the abandoned draft — reopening starts from a clean form', async ({ page }) => {
    await loginAsFaculty(page);
    await openFacultyRecorder(page);

    await pickStudent(page);
    await expect(dialog(page).getByRole('button', { name: /E2E Test Student/ })).toBeVisible();

    await dialog(page).getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog(page)).toHaveCount(0);

    await openFacultyRecorder(page);
    await expect(dialog(page).getByRole('button', { name: /Search by name or reg\. number/ })).toBeVisible();
    await dialog(page).getByRole('button', { name: 'Cancel' }).click();
  });

  test('Quick Add stays open after success, keeps duty context, and clears only the per-record fields', async ({ page }) => {
    await loginAsFaculty(page);
    await openFacultyRecorder(page);

    const d = dialog(page);
    await d.getByRole('switch', { name: /Quick-add mode/ }).click();
    const since = new Date();
    await pickStudent(page);
    await pickViolationType(page);
    await submit(page);

    await expect(page.getByText(/Recorded for E2E Test Student\. Add next\./)).toBeVisible();

    // The next-entry search reopens automatically ~50ms after success — close
    // it first (it sits on top and hides the sheet's fields from the a11y
    // tree while open) before inspecting the now-cleared underlying fields.
    const search = page.getByRole('dialog', { name: 'Search students' });
    await expect(search).toBeVisible();
    await search.getByRole('button', { name: 'Cancel' }).click();
    await expect(search).toHaveCount(0);

    // Still open, same duty context, Quick Add still on, fields cleared.
    await expect(d).toBeVisible();
    await expect(d.getByText(/Morning session/)).toBeVisible();
    await expect(d.getByRole('switch', { name: /Quick-add mode/ })).toBeChecked();
    await expect(d.getByRole('combobox', { name: 'Student violation type' })).toHaveValue('');

    await d.getByRole('switch', { name: /Quick-add mode/ }).click(); // turn off before closing
    await d.getByRole('button', { name: 'Cancel' }).click();

    await cleanupViolationsSince(since);
  });

  test('rapid double-submit records the violation exactly once (synchronous in-flight guard)', async ({ page }) => {
    // Count actual POST /violations network requests — the precise thing the
    // guard protects — rather than DOM row counts, which this table's layout
    // makes an unreliable proxy for "how many creates actually happened."
    let postCount = 0;
    page.on('request', (r) => {
      if (r.method() === 'POST' && /\/violations$/.test(new URL(r.url()).pathname)) postCount++;
    });

    await loginAsFaculty(page);
    await openFacultyRecorder(page);
    const since = new Date();
    await pickStudent(page);
    await pickViolationType(page);

    const submitBtn = dialog(page).getByRole('button', { name: 'Record Student Violation' });
    // Two native clicks dispatched back-to-back in the same page-side task —
    // not two separate Playwright actionability-checked `.click()` calls,
    // which race against the dialog closing after the first succeeds and
    // become flaky for reasons unrelated to what this test verifies. This is
    // exactly what the synchronous submittingRef guard (not just the async
    // isPending-driven `disabled`) protects against: React's onClick handler
    // runs synchronously up to its first `await`, so the second dispatched
    // click's handler invocation sees the guard already set.
    await submitBtn.evaluate((el) => { el.click(); el.click(); });

    await expect(page.getByText('Student violation recorded.')).toBeVisible();
    await expect(dialog(page)).toHaveCount(0);
    expect(postCount).toBe(1);

    await cleanupViolationsSince(since);
  });

  test('a rejected submission shows one inline error, keeps the sheet open, and brings it into focus', async ({ page }) => {
    await loginAsFaculty(page);
    await openFacultyRecorder(page);
    await pickStudent(page);
    await pickViolationType(page);

    await page.route('**/violations', (route) => {
      if (route.request().method() !== 'POST') return route.continue();
      route.fulfill({
        status: 422,
        contentType: 'application/json',
        body: JSON.stringify({ error: true, code: 'VALIDATION_ERROR', message: 'Forced test failure.' }),
      });
    });

    await submit(page);

    const d = dialog(page);
    await expect(d.getByText('Forced test failure.')).toBeVisible();
    await expect(d).toBeVisible(); // never silently closed on failure
    // Brought into view/focus, not just present in the DOM.
    await expect(d.getByText('Forced test failure.')).toBeFocused();

    await page.unroute('**/violations');
    await d.getByRole('button', { name: 'Cancel' }).click();
  });

  test('a network failure during submit shows a recoverable inline error, not a crash', async ({ page }) => {
    await loginAsFaculty(page);
    await openFacultyRecorder(page);
    await pickStudent(page);
    await pickViolationType(page);

    await page.route('**/violations', (route) => {
      if (route.request().method() !== 'POST') return route.continue();
      route.abort('failed');
    });

    await submit(page);

    const d = dialog(page);
    await expect(d.getByText('Network error — check your connection and try again.')).toBeVisible();

    await page.unroute('**/violations');
    await d.getByRole('button', { name: 'Cancel' }).click();
  });

  test('admin can record a violation with no duty-session gate (regression, does not inherit faculty restrictions)', async ({ page }) => {
    await loginAsAdmin(page);
    const trigger = await openAdminRecorder(page);

    const d = dialog(page);
    await expect(d.getByText('Recording as Admin — no duty session required.')).toBeVisible();
    await expect(d.getByText("You're not checked in")).toHaveCount(0);

    const since = new Date();
    await pickStudent(page);
    await pickViolationType(page);
    await submit(page);

    await expect(page.getByText('Student violation recorded.')).toBeVisible();
    await expect(d).toHaveCount(0);
    await expect(trigger).toBeFocused();

    await cleanupViolationsSince(since);
  });
});

test.describe('Student search stability (StudentSearchOverlay, inside RecordViolationModal)', () => {
  test.describe.configure({ mode: 'serial' });

  test('distinguishes minimum-character guidance, loading, results, and empty state', async ({ page }) => {
    await loginAsFaculty(page);
    await openFacultyRecorder(page);
    await dialog(page).getByRole('button', { name: /Search by name or reg\. number/ }).click();
    const search = page.getByRole('dialog', { name: 'Search students' });
    const box = search.getByRole('textbox');

    await expect(search.getByText('Start typing a name or registration number.')).toBeVisible();
    await box.fill('E');
    await expect(search.getByText('Keep typing — at least 2 characters.')).toBeVisible();

    await box.fill('E2E');
    await expect(search.getByRole('button', { name: /E2E Test Student/ })).toBeVisible();

    await box.fill('Nonexistent Student Xyz');
    await expect(search.getByText(/No students match/)).toBeVisible();

    await search.getByRole('button', { name: 'Cancel' }).click();
    await dialog(page).getByRole('button', { name: 'Cancel' }).click();
  });

  test('hides the previous query\'s results immediately when the input changes, before the debounce settles', async ({ page }) => {
    await loginAsFaculty(page);
    await openFacultyRecorder(page);
    await dialog(page).getByRole('button', { name: /Search by name or reg\. number/ }).click();
    const search = page.getByRole('dialog', { name: 'Search students' });
    const box = search.getByRole('textbox');

    await box.fill('E2E');
    await expect(search.getByRole('button', { name: /E2E Test Student/ })).toBeVisible();

    // Change the query and check well inside the 250ms debounce window —
    // the previous result must already be gone, not linger until the network
    // request for the new query finally resolves.
    await box.fill('Nonexistent Student Xyz');
    await page.waitForTimeout(60);
    await expect(search.getByRole('button', { name: /E2E Test Student/ })).toHaveCount(0);

    await search.getByRole('button', { name: 'Cancel' }).click();
    await dialog(page).getByRole('button', { name: 'Cancel' }).click();
  });

  test('a slow response for an earlier query never overwrites the current query\'s results (stale-response protection)', async ({ page }) => {
    await loginAsFaculty(page);
    await openFacultyRecorder(page);
    await dialog(page).getByRole('button', { name: /Search by name or reg\. number/ }).click();
    const search = page.getByRole('dialog', { name: 'Search students' });
    const box = search.getByRole('textbox');

    await page.route('**/students/search*', async (route) => {
      const url = new URL(route.request().url());
      const q = url.searchParams.get('q') || '';
      if (q.toLowerCase().startsWith('e2e')) {
        // Slow first query — resolves well after the second query's request.
        await new Promise((r) => setTimeout(r, 1200));
      }
      // TanStack Query aborts the now-irrelevant in-flight 'E2E' request once
      // the debounced value moves on to the second query — by the time the
      // delay above elapses, the page may have already cancelled it, which
      // makes continue()/abort() on this route throw. That race is exactly
      // the scenario under test (an old request losing), not a bug to fix.
      await route.continue().catch(() => {});
    });

    await box.fill('E2E');
    await page.waitForTimeout(300); // let the debounce fire and the slow request start
    await box.fill('Nonexistent Student Xyz');

    // The fast second query's "no results" must win — never the slow first
    // query's results landing late.
    await expect(search.getByText(/No students match/)).toBeVisible({ timeout: 3000 });
    await expect(search.getByRole('button', { name: /E2E Test Student/ })).toHaveCount(0);

    await page.unroute('**/students/search*');
    await search.getByRole('button', { name: 'Cancel' }).click();
    await dialog(page).getByRole('button', { name: 'Cancel' }).click();
  });

  test('distinguishes a network/server failure from zero results, with a retry action', async ({ page }) => {
    await loginAsFaculty(page);
    await openFacultyRecorder(page);
    await dialog(page).getByRole('button', { name: /Search by name or reg\. number/ }).click();
    const search = page.getByRole('dialog', { name: 'Search students' });
    const box = search.getByRole('textbox');

    await page.route('**/students/search*', (route) => route.abort('failed'));
    await box.fill('E2E');

    await expect(search.getByText(/Couldn't load results/)).toBeVisible();
    await expect(search.getByRole('button', { name: 'Try again' })).toBeVisible();
    await expect(search.getByText(/No students match/)).toHaveCount(0);

    await page.unroute('**/students/search*');
    await search.getByRole('button', { name: 'Cancel' }).click();
    await dialog(page).getByRole('button', { name: 'Cancel' }).click();
  });

  test('focus returns to the student-selection trigger after choosing a result', async ({ page }) => {
    await loginAsFaculty(page);
    await openFacultyRecorder(page);
    const trigger = dialog(page).getByRole('button', { name: /Search by name or reg\. number/ });
    await trigger.click();

    const search = page.getByRole('dialog', { name: 'Search students' });
    await search.getByRole('textbox').fill('E2E');
    await search.getByRole('button', { name: /E2E Test Student/ }).click();

    await expect(dialog(page).getByRole('button', { name: /E2E Test Student/ })).toBeFocused();
    await dialog(page).getByRole('button', { name: 'Cancel' }).click();
  });
});

test.describe('Viewport behavior (Spec 034-B)', () => {
  test('desktop (1440px): centered dialog', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await loginAsFaculty(page);
    await openFacultyRecorder(page);
    const box = await dialog(page).boundingBox();
    expect(box.width).toBeLessThan(1440); // not edge-to-edge — a centered dialog, not a sheet
    await dialog(page).getByRole('button', { name: 'Cancel' }).click();
  });

  test('mobile (390px): full-screen presentation, correct section order', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsFaculty(page);
    await openFacultyRecorder(page);

    const d = dialog(page);
    const box = await d.boundingBox();
    expect(box.width).toBeGreaterThanOrEqual(388); // edge-to-edge fullscreen sheet

    const text = await d.innerText();
    const order = ['Morning session', 'STUDENT', 'STUDENT VIOLATION', 'Add notes', 'Quick-add mode'];
    let lastIndex = -1;
    for (const marker of order) {
      const idx = text.indexOf(marker);
      expect(idx, `expected "${marker}" to appear in the form`).toBeGreaterThan(-1);
      expect(idx, `expected "${marker}" to appear after the previous section`).toBeGreaterThan(lastIndex);
      lastIndex = idx;
    }

    await d.getByRole('button', { name: 'Cancel' }).click();
  });

  test('constrained-height viewport (keyboard-like, 390x500) keeps the submit action reachable', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 500 });
    await loginAsFaculty(page);
    await openFacultyRecorder(page);

    const d = dialog(page);
    await expect(d.getByRole('button', { name: 'Record Student Violation' })).toBeVisible();
    await d.getByRole('button', { name: 'Cancel' }).click();
  });
});
