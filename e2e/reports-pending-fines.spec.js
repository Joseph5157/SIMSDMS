import { test, expect } from '@playwright/test';
import { E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD } from './fixtures.mjs';

// Batch 3.2d (Spec 032): "Pending Fines" is a per-student-record list, the
// same shape as Batch 3.1's Student Violation Report — same card treatment,
// with the fine amount moved to a trailing value instead of a table column.
//
// No empty-state test: 'pending-fines' has no MonthFilter (it's in
// ReportsPage.jsx's NO_MONTH list — always "all outstanding fines right
// now"), so there's no filter to switch to force a deterministically empty
// result, unlike absent-faculty/attendance-overrides.

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

async function openPendingFines(page) {
  await page.goto('/admin/reports');
  await page.getByRole('button', { name: /Pending Fines/ }).click();
}

function inlinePanel(page) {
  return page.getByRole('heading', { name: /Pending Fines/ }).locator('..').locator('..');
}

test.describe('Pending Fines mobile card (Batch 3.2d)', () => {
  test('desktop (1280px): shared Table shows the seeded record', async ({ page }) => {
    await loginAsAdmin(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await openPendingFines(page);

    const panel = inlinePanel(page);
    await expect(panel.getByRole('table')).toBeVisible();
    const row = panel.getByRole('row').filter({ hasText: 'E2E Test Student' });
    await expect(row.first()).toBeVisible();
    await assertNoHorizontalOverflow(page);
  });

  test('mobile (390px): ResponsiveSheet renders a card with a trailing fine amount, not a table', async ({ page }) => {
    await loginAsAdmin(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await openPendingFines(page);

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('table')).toHaveCount(0);
    await expect(dialog.getByText('E2E Test Student').first()).toBeVisible();
    await expect(dialog.getByText('₹100').first()).toBeVisible();
    await assertNoHorizontalOverflow(page);
  });

  test('640px: inline panel also renders a card', async ({ page }) => {
    await loginAsAdmin(page);
    await page.setViewportSize({ width: 640, height: 900 });
    await openPendingFines(page);

    const panel = inlinePanel(page);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(panel.getByRole('table')).toHaveCount(0);
    await expect(panel.getByText('E2E Test Student').first()).toBeVisible();
    await assertNoHorizontalOverflow(page);
  });
});
