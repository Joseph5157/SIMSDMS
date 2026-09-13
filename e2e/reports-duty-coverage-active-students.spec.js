import { test, expect } from '@playwright/test';
import { E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD } from './fixtures.mjs';

// Batch 3.2c (Spec 032): "Duty Coverage" and "Active Students" are the plan's
// own "non-table summaries" — a stat-tile grid and a flex-wrapped pill list,
// neither built on the shared Table component. Investigated before writing
// any code (per the owner-praised per-report/per-table judgment from Batch
// 3.2b): both already reflow correctly at every required width with no
// production code change, so this batch makes NO implementation change.
// This spec is a regression guard for that verified-compliant state, not a
// RED-then-GREEN fix-driving test — there is no prior broken behavior to
// prove against, since nothing was changed.
//
// "No table" is asserted scoped to the opened report's own container, not
// the whole page: the always-visible primary Student Violation Report
// (Batch 3.1) renders its own desktop <table> at >=768px elsewhere on this
// same page, which an unscoped page-level query would also match.

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

// <=639px: ResponsiveSheet (role="dialog"). >=640px: inline result panel —
// two levels up from the report's own heading (heading -> header row ->
// panel), same technique as Batches 3.2a/3.2b.
function reportContainer(page, width, name) {
  return width <= 639
    ? page.getByRole('dialog')
    : page.getByRole('heading', { name }).locator('..').locator('..');
}

const WIDTHS = [360, 390, 412, 639, 640, 768, 1280];

test.describe('Duty Coverage / Active Students non-table summaries (Batch 3.2c)', () => {
  for (const width of WIDTHS) {
    test(`Duty Coverage stat grid has no horizontal overflow at ${width}px`, async ({ page }) => {
      await loginAsAdmin(page);
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/admin/reports');
      await page.getByRole('button', { name: /Duty Coverage/ }).click();

      const container = reportContainer(page, width, /Duty Coverage/);
      await expect(container.getByText('Completion rate')).toBeVisible();
      await expect(container.getByRole('table')).toHaveCount(0); // never was, and still isn't, a table
      await assertNoHorizontalOverflow(page);
    });

    test(`Active Students breakdown pills have no horizontal overflow at ${width}px`, async ({ page }) => {
      await loginAsAdmin(page);
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/admin/reports');
      await page.getByRole('button', { name: /Active Students/ }).click();

      const container = reportContainer(page, width, /Active Students/);
      await expect(container.getByText(/active students$/)).toBeVisible();
      await expect(container.getByRole('table')).toHaveCount(0);
      await assertNoHorizontalOverflow(page);
    });
  }
});
