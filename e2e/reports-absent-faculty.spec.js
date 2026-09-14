import { test, expect } from '@playwright/test';
import { E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD } from './fixtures.mjs';

// Batch 3.2d (Spec 032): "Absent Faculty" is the third member of the same
// per-event-attendance-record-with-status category as Batch 3.2a's
// late-arrivals/auto-clockout — same card treatment, same container-scoping
// technique (ResponsiveSheet <=639px vs. inline panel >=640px).

async function loginAsAdmin(page) {
  await page.goto('/login');
  await page.locator('#login-email').fill(E2E_ADMIN_EMAIL);
  await page.locator('#login-password').fill(E2E_ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/admin\/dashboard/);
}

async function assertNoHorizontalOverflow(page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

// Matches e2e/seed.mjs's absentDate (today minus 3 days) — must be computed,
// not hardcoded, since the seed recomputes it relative to whenever it last ran.
function absentFixtureDateLabel() {
  const d = new Date();
  d.setDate(d.getDate() - 3);
  return d.toLocaleDateString('en-IN');
}

async function openAbsentFaculty(page) {
  await page.goto('/admin/reports');
  await page.getByRole('button', { name: /Absent Faculty/ }).click();
}

function inlinePanel(page) {
  return page.getByRole('heading', { name: /Absent Faculty/ }).locator('..').locator('..');
}

test.describe('Absent Faculty mobile card (Batch 3.2d)', () => {
  test('desktop (1280px): shared Table shows the seeded record', async ({ page }) => {
    await loginAsAdmin(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await openAbsentFaculty(page);

    const panel = inlinePanel(page);
    await expect(panel.getByRole('table')).toBeVisible();
    // Not toHaveCount(1): the app's own attendance cron can independently
    // mark other slots "absent" over time (e.g. an unattended slot from an
    // earlier batch's fixture, once its session time passes) — this only
    // confirms our specific fixture (this faculty + this exact date) is
    // present, not that it's the only absent row.
    const row = panel.getByRole('row').filter({ hasText: 'E2E Faculty Two' }).filter({ hasText: absentFixtureDateLabel() });
    await expect(row).toHaveCount(1);
    await assertNoHorizontalOverflow(page);
  });

  test('mobile (390px): ResponsiveSheet renders a card with a status badge, not a table', async ({ page }) => {
    await loginAsAdmin(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await openAbsentFaculty(page);

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('table')).toHaveCount(0);
    await expect(dialog.getByText('E2E Faculty Two').first()).toBeVisible();
    await expect(dialog.getByText('Absent').first()).toBeVisible();
    await assertNoHorizontalOverflow(page);
  });

  test('640px: inline panel also renders a card', async ({ page }) => {
    await loginAsAdmin(page);
    await page.setViewportSize({ width: 640, height: 900 });
    await openAbsentFaculty(page);

    const panel = inlinePanel(page);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(panel.getByRole('table')).toHaveCount(0);
    await expect(panel.getByText('E2E Faculty Two').first()).toBeVisible();
    await assertNoHorizontalOverflow(page);
  });

  test('renders the empty card state for a month with no absences', async ({ page }) => {
    await loginAsAdmin(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await openAbsentFaculty(page);

    const dialog = page.getByRole('dialog');
    const lastYear = String(new Date().getFullYear() - 1); // fixture is always dated relative to today
    await dialog.locator('select').first().selectOption(lastYear);

    await expect(dialog.getByRole('table')).toHaveCount(0);
    await expect(dialog.getByText('No records found.').first()).toBeVisible();
    await assertNoHorizontalOverflow(page);
  });
});
