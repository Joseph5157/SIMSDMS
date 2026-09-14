import { test, expect } from '@playwright/test';
import { E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD } from './fixtures.mjs';

// Batch 3.2d (Spec 032): "Upload History" is a per-upload event log — same
// category as duty-reassignments' history table — same card treatment.
//
// No empty-state test: 'upload-history' has no MonthFilter (NO_MONTH list —
// always "most recent 50 uploads"), so there's no filter to switch to force
// a deterministically empty result.

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

async function openUploadHistory(page) {
  await page.goto('/admin/reports');
  await page.getByRole('button', { name: /Upload History/ }).click();
}

function inlinePanel(page) {
  return page.getByRole('heading', { name: /Upload History/ }).locator('..').locator('..');
}

test.describe('Upload History mobile card (Batch 3.2d)', () => {
  test('desktop (1280px): shared Table shows the seeded record', async ({ page }) => {
    await loginAsAdmin(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await openUploadHistory(page);

    const panel = inlinePanel(page);
    const table = panel.getByRole('table');
    await expect(table).toBeVisible();
    // Scoped to the table itself — see the identical note in
    // reports-attendance-overrides.spec.js.
    await expect(table.getByText('e2e-test-upload.xlsx')).toBeVisible();
    await assertNoHorizontalOverflow(page);
  });

  test('mobile (390px): ResponsiveSheet renders a card, not a table', async ({ page }) => {
    await loginAsAdmin(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await openUploadHistory(page);

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('table')).toHaveCount(0);
    await expect(dialog.getByText('e2e-test-upload.xlsx').first()).toBeVisible();
    await expect(dialog.getByText(/Added 1/).first()).toBeVisible();
    await assertNoHorizontalOverflow(page);
  });

  test('640px: inline panel also renders a card', async ({ page }) => {
    await loginAsAdmin(page);
    await page.setViewportSize({ width: 640, height: 900 });
    await openUploadHistory(page);

    const panel = inlinePanel(page);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(panel.getByRole('table')).toHaveCount(0);
    await expect(panel.getByText('e2e-test-upload.xlsx').first()).toBeVisible();
    await assertNoHorizontalOverflow(page);
  });
});
