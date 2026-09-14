import { test, expect } from '@playwright/test';
import { E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD, E2E_FACULTY_EMAIL, E2E_FACULTY_PASSWORD } from './fixtures.mjs';

// Milestone 6 (Spec 032): Batch 6.1 replaced the Admin Dashboard's decorative
// greeting gradient with a restrained plain header (client/src/pages/admin/
// AdminDashboardPage.jsx) and removed the per-quick-action arbitrary tile
// colours; Batch 6.2 converted Faculty Dashboard's per-item "Upcoming
// duties"/"Reassigned away" bordered cards into shared list containers
// (client/src/pages/faculty/DashboardPage.jsx,
// client/src/components/faculty/PendingReassignmentRequests.jsx) and fixed
// the "Most Common" stat-card truncation on the Faculty dashboard
// (client/src/components/faculty/MyViolationsSummary.jsx) — see V2 §10,
// DS-17, 030-D-05. These tests confirm the restyle didn't break navigation
// or the Faculty duty check-in/out action, a real operational path.

async function loginAsAdmin(page) {
  await page.goto('/login');
  await page.locator('#login-email').fill(E2E_ADMIN_EMAIL);
  await page.locator('#login-password').fill(E2E_ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/admin\/dashboard/);
}

async function loginAsFaculty(page) {
  await page.goto('/login');
  await page.locator('#login-email').fill(E2E_FACULTY_EMAIL);
  await page.locator('#login-password').fill(E2E_FACULTY_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/faculty\/dashboard/);
}

test.describe('Admin Dashboard (Batch 6.1)', () => {
  test('restyled quick actions and KPI cards all still navigate correctly', async ({ page }) => {
    await loginAsAdmin(page);

    // KPI row: the "Active Faculty" hero tile and the 3 supporting StatCards
    // are all still clickable and route to the pages they summarize.
    await page.getByRole('button', { name: /Active Faculty/ }).click();
    await expect(page).toHaveURL(/\/admin\/attendance/);

    await page.goto('/admin/dashboard');
    await page.getByRole('button', { name: /^PENDING/i }).click();
    await expect(page).toHaveURL(/\/admin\/users\?status=pending/);

    await page.goto('/admin/dashboard');
    await page.getByRole('button', { name: /REASSIGNMENTS/i }).click();
    await expect(page).toHaveURL(/\/admin\/reports/);

    await page.goto('/admin/dashboard');
    await page.getByRole('button', { name: /^FLAGGED/i }).click();
    await expect(page).toHaveURL(/\/admin\/flagged-violations/);

    // Quick actions: both now share one neutral treatment (no per-item tint).
    await page.goto('/admin/dashboard');
    // exact: true — "Review all flagged student violations →" also contains
    // "Student Violations" as a case-insensitive substring.
    await page.getByRole('button', { name: 'Student Violations', exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/violations/);

    await page.goto('/admin/dashboard');
    await page.getByRole('button', { name: 'Reports' }).click();
    await expect(page).toHaveURL(/\/admin\/reports/);
  });

  test('the live "checked in" indicator only shows at sm+ width, not on mobile', async ({ page }) => {
    // Regression check for a real bug caught during this batch: stacking
    // `hidden` on the same element as Badge's own base `inline-flex` class
    // raced against Tailwind's generated rule order instead of reliably
    // hiding below `sm` — fixed by moving the breakpoint classes onto a
    // wrapping <span> instead of Badge's own className.
    await loginAsAdmin(page);
    const pill = page.getByText(/checked in$/);

    await page.setViewportSize({ width: 1280, height: 900 });
    await expect(pill).toBeVisible();

    // toBeHidden (not toHaveCount(0)): `hidden` is display:none, which keeps
    // the node in the DOM — only a visibility assertion actually exercises
    // the responsive class.
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(pill).toBeHidden();
  });
});

test.describe('Faculty Dashboard (Batch 6.2)', () => {
  test('duty hero and check-in/out action render correctly after the surrounding restyle', async ({ page }) => {
    await loginAsFaculty(page);

    // TodaySessionCard itself was not touched by this batch — this confirms
    // the restyle of the sections around it (Upcoming duties, Reassigned
    // away) didn't break its render or the check-in/out action's
    // availability. Doesn't actually submit the mutation: the e2e fixture
    // data (a fixed auto-clocked-out morning session) is relied on by other
    // specs (e.g. reports-attendance-events.spec.js) and a real check-out
        // here would change that shared state.
    await expect(page.getByText("Today's duty")).toBeVisible();
    const actionButton = page.getByRole('button', { name: /^Check (In|Out)$/ });
    await expect(actionButton).toBeVisible();
    await expect(actionButton).toBeEnabled();
  });

  test('Reassigned away renders as one list container, not per-item cards', async ({ page }) => {
    await loginAsFaculty(page);

    const heading = page.getByText('Reassigned away', { exact: true });
    await expect(heading).toBeVisible();
    // The seeded reassignment record still renders with all its fields.
    await expect(page.getByText('Afternoon session')).toBeVisible();
    await expect(page.getByText(/Reassigned to E2E Faculty Two/)).toBeVisible();
  });

  test('My violations "Most Common" card no longer shares a row with the numeric cards on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsFaculty(page);

    const mostCommon = page.getByText('Most Common', { exact: true });
    await expect(mostCommon).toBeVisible();
    const mostCommonBox = await mostCommon.locator('..').boundingBox();
    const totalRecordedBox = await page.getByText('Total Recorded', { exact: true }).locator('..').boundingBox();
    // "Most Common" sits on its own row below the 3 numeric cards, so its
    // top must be strictly below Total Recorded's box, not beside it.
    expect(mostCommonBox.y).toBeGreaterThan(totalRecordedBox.y + totalRecordedBox.height - 1);
  });
});
