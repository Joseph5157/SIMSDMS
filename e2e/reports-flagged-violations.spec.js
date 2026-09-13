import { test, expect } from '@playwright/test';
import { E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD } from './fixtures.mjs';

// Batch 3.2d (Spec 032): "Flagged Student Violations" is a per-violation
// record list with a resolution status badge — same category as Batch
// 3.2b's reassignment history — same card treatment.
//
// No empty-state test: 'flagged-violations' has no MonthFilter (NO_MONTH
// list — always "everything ever flagged"), so there's no filter to switch
// to force a deterministically empty result.

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

async function openFlaggedViolations(page) {
  await page.goto('/admin/reports');
  await page.getByRole('button', { name: /Flagged Student Violations/ }).click();
}

function inlinePanel(page) {
  return page.getByRole('heading', { name: /Flagged Student Violations/ }).locator('..').locator('..');
}

test.describe('Flagged Student Violations mobile card (Batch 3.2d)', () => {
  test('desktop (1280px): shared Table shows the seeded record', async ({ page }) => {
    await loginAsAdmin(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await openFlaggedViolations(page);

    const panel = inlinePanel(page);
    const table = panel.getByRole('table');
    await expect(table).toBeVisible();
    // Scoped to the table itself — see the identical note in
    // reports-attendance-overrides.spec.js.
    await expect(table.getByText('E2E test flag note')).toBeVisible();
    await assertNoHorizontalOverflow(page);
  });

  test('mobile (390px): ResponsiveSheet renders a card with a status badge, not a table', async ({ page }) => {
    await loginAsAdmin(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await openFlaggedViolations(page);

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('table')).toHaveCount(0);
    await expect(dialog.getByText('E2E test flag note').first()).toBeVisible();
    await expect(dialog.getByText('Pending').first()).toBeVisible();
    await assertNoHorizontalOverflow(page);
  });

  test('640px: inline panel also renders a card', async ({ page }) => {
    await loginAsAdmin(page);
    await page.setViewportSize({ width: 640, height: 900 });
    await openFlaggedViolations(page);

    const panel = inlinePanel(page);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(panel.getByRole('table')).toHaveCount(0);
    await expect(panel.getByText('E2E test flag note').first()).toBeVisible();
    await assertNoHorizontalOverflow(page);
  });
});
