import { test, expect } from '@playwright/test';
import { E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD } from './fixtures.mjs';

// Batch 3.2d (Spec 032): "Override Log" is an audit-log-with-reason report,
// same category as Batch 3.2b's reassignment history — same card treatment.
//
// Milestone 7 (Spec 032) fixed the field-name mismatch this spec previously
// documented as a known pre-existing bug: the 'attendance-overrides'
// ReportSection case in client/src/pages/admin/ReportsPage.jsx read
// r.faculty / r.dutySlot / r.overriddenBy, but attendanceOverrideLog
// (server/controllers/reports.controller.js) returns nested
// attendance.faculty / attendance.dutySlot / changedBy instead — every row's
// faculty name rendered blank and its date rendered "Invalid Date". Now that
// the frontend reads the actual response shape, this spec asserts the
// faculty name and a real (non-"Invalid Date") date render correctly, in
// addition to override_reason and structural/responsive behavior.

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

async function openOverrideLog(page) {
  await page.goto('/admin/reports');
  await page.getByRole('button', { name: /Override Log/ }).click();
}

function inlinePanel(page) {
  return page.getByRole('heading', { name: /Override Log/ }).locator('..').locator('..');
}

test.describe('Attendance Override Log mobile card (Batch 3.2d)', () => {
  test('desktop (1280px): shared Table shows the seeded reason', async ({ page }) => {
    await loginAsAdmin(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await openOverrideLog(page);

    const panel = inlinePanel(page);
    const table = panel.getByRole('table');
    await expect(table).toBeVisible();
    // Scoped to the table itself: ResponsiveDataView always mounts both
    // trees, and the CSS-hidden mobile card (first in DOM) also contains
    // this text, so an unscoped query needs .first()/.last() disambiguation
    // — scoping to the visible table sidesteps that entirely.
    await expect(table.getByText('E2E test override reason')).toBeVisible();
    await expect(table.getByText('E2E Faculty')).toBeVisible();
    await expect(table.getByText('Invalid Date')).toHaveCount(0);
    await assertNoHorizontalOverflow(page);
  });

  test('mobile (390px): ResponsiveSheet renders a card, not a table', async ({ page }) => {
    await loginAsAdmin(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await openOverrideLog(page);

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('table')).toHaveCount(0);
    await expect(dialog.getByText('E2E test override reason').first()).toBeVisible();
    await expect(dialog.getByText('E2E Faculty').first()).toBeVisible();
    await expect(dialog.getByText('Invalid Date')).toHaveCount(0);
    await assertNoHorizontalOverflow(page);
  });

  test('640px: inline panel also renders a card', async ({ page }) => {
    await loginAsAdmin(page);
    await page.setViewportSize({ width: 640, height: 900 });
    await openOverrideLog(page);

    const panel = inlinePanel(page);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(panel.getByRole('table')).toHaveCount(0);
    await expect(panel.getByText('E2E test override reason').first()).toBeVisible();
    await assertNoHorizontalOverflow(page);
  });

  test('renders the empty card state for a month with no overrides', async ({ page }) => {
    await loginAsAdmin(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await openOverrideLog(page);

    const dialog = page.getByRole('dialog');
    const lastYear = String(new Date().getFullYear() - 1);
    await dialog.locator('select').first().selectOption(lastYear);

    await expect(dialog.getByRole('table')).toHaveCount(0);
    await expect(dialog.getByText('No records found.').first()).toBeVisible();
    await assertNoHorizontalOverflow(page);
  });
});
