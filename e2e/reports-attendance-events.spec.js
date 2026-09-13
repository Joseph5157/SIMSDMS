import { test, expect } from '@playwright/test';
import { E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD } from './fixtures.mjs';

// Batch 3.2a (Spec 032): the shared late-arrivals/auto-clockout ReportSection
// branch (client/src/pages/admin/ReportsPage.jsx) now uses the same card
// pattern Batch 3.1 established, instead of a horizontally-scrolled table
// inside ResponsiveSheet. Exercised via "Auto Clock-outs" — deterministic via
// e2e/seed.mjs's fixed today/morning duty slot+attendance — since "Late
// Arrivals" additionally depends on the runtime duty-timing config, which
// this seed does not control. Both report ids render through the identical
// switch case, so this covers the shared branch either way.
//
// Unlike the always-inline primary Student Violation Report (Batch 3.1),
// secondary reports render inside ResponsiveSheet (<=639px, Radix Dialog,
// role="dialog") or an inline result panel (>=640px) — two separate JSX
// trees the page swaps between, so each viewport needs its own open+verify
// pass rather than one continuous flow across a resize.

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

async function openAutoClockOuts(page) {
  await page.goto('/admin/reports');
  await page.getByRole('button', { name: /Auto Clock-outs/ }).click();
}

// The desktop/640px inline panel has no distinguishing role or unique class
// (its `border` token also matches the "By student" primary card and every
// secondary-report tile), so scope via the panel's own heading — two DOM
// levels up reaches the panel div that also holds the MonthFilter + result:
// heading -> header row -> panel.
function inlinePanel(page) {
  return page.getByRole('heading', { name: /Auto Clock-outs/ }).locator('..').locator('..');
}

test.describe('Late Arrivals / Auto Clock-outs mobile card (Batch 3.2a)', () => {
  test('desktop (>=768px): shared Table shows the seeded record', async ({ page }) => {
    await loginAsAdmin(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await openAutoClockOuts(page);

    const panel = inlinePanel(page);
    await expect(panel.getByRole('table')).toBeVisible();
    const row = panel.getByRole('row').filter({ hasText: 'E2E Faculty' });
    await expect(row).toHaveCount(1);
    await expect(row.getByText('morning')).toBeVisible();
    await assertNoHorizontalOverflow(page);
  });

  for (const width of [360, 390, 412, 639]) {
    test(`mobile (${width}px): ResponsiveSheet renders a card, not a table`, async ({ page }) => {
      await loginAsAdmin(page);
      await page.setViewportSize({ width, height: 844 });
      await openAutoClockOuts(page);

      const dialog = page.getByRole('dialog');
      await expect(dialog.getByRole('table')).toHaveCount(0);
      // .first(): ResponsiveDataView always mounts both trees (mobile first
      // in DOM, then CSS-hidden desktop) — the hidden desktop <Td> also
      // contains "morning", so assert the visible (mobile) copy.
      await expect(dialog.getByText('E2E Faculty').first()).toBeVisible();
      await expect(dialog.getByText(/morning/).first()).toBeVisible();
      await assertNoHorizontalOverflow(page);
    });
  }

  test('640px: inline panel (not the sheet) also renders a card', async ({ page }) => {
    await loginAsAdmin(page);
    await page.setViewportSize({ width: 640, height: 900 });
    await openAutoClockOuts(page);

    const panel = inlinePanel(page);
    await expect(panel.getByRole('table')).toHaveCount(0);
    await expect(page.getByRole('dialog')).toHaveCount(0); // confirms this is the inline path, not the sheet
    await expect(panel.getByText('E2E Faculty').first()).toBeVisible();
    await assertNoHorizontalOverflow(page);
  });

  test('renders the empty card state for a month with no seeded attendance', async ({ page }) => {
    await loginAsAdmin(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await openAutoClockOuts(page);

    const dialog = page.getByRole('dialog');
    // MonthFilter offers only "last year" and "current year" — the fixture is
    // always dated today, so last year is deterministically empty.
    const lastYear = String(new Date().getFullYear() - 1);
    await dialog.locator('select').first().selectOption(lastYear);

    await expect(dialog.getByRole('table')).toHaveCount(0);
    await expect(dialog.getByText('No records found.').first()).toBeVisible();
    await assertNoHorizontalOverflow(page);
  });
});
