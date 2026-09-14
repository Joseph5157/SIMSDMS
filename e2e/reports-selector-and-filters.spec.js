import { test, expect } from '@playwright/test';
import { E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD } from './fixtures.mjs';

// Milestone 5 (Spec 032): Batch 5.1 replaced the 15 emoji/colour-tile report
// cards with a text-first list grouped by family (client/src/pages/admin/
// ReportsPage.jsx), and Batch 5.2 grouped the primary report card's controls
// into labeled "Period"/"Filters" sections instead of three anonymous stacked
// rows (V2 §11, DS-18/DS-19 — see specs/030-design-system-audit-cleanup).
// These tests confirm the visual redesign didn't break report selection or
// filter/export function — no data/backend behavior changed.

async function loginAsAdmin(page) {
  await page.goto('/login');
  await page.locator('#login-email').fill(E2E_ADMIN_EMAIL);
  await page.locator('#login-password').fill(E2E_ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/admin\/dashboard/);
}

test.describe('Report selector (Batch 5.1)', () => {
  test('desktop: 5 reports spanning every family open correctly from the redesigned list', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await loginAsAdmin(page);
    await page.goto('/admin/reports');

    // One report per family (Attendance, Student Violations, Duty & Coverage,
    // Students) plus a second Attendance report, matching the plan's "5
    // reports spanning families" bar for this batch.
    const samples = ['Monthly Attendance', 'Faculty Activity', 'Duty Coverage', 'Override Log', 'Late Arrivals'];

    for (const label of samples) {
      const row = page.getByRole('button', { name: new RegExp(`^${label} `) });
      await row.click();
      await expect(page.getByRole('heading', { name: label, exact: true })).toBeVisible();
      // Selected-row state (left-accent bar + tint) is exposed via aria-pressed.
      await expect(row).toHaveAttribute('aria-pressed', 'true');
    }
  });

  test('mobile (390px): a report opens in the ResponsiveSheet from the redesigned list', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsAdmin(page);
    await page.goto('/admin/reports');

    await page.getByRole('button', { name: /^Pending Fines / }).click();
    await expect(page.getByRole('heading', { name: 'Pending Fines', exact: true })).toBeVisible();
  });
});

test.describe('Filter and export hierarchy (Batch 5.2)', () => {
  test('using the grouped Period and Filters controls together still produces a working export', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/reports');
    // The main Student Violation Report card is the only `.border-2` container
    // (see e2e/reports-student-violations.spec.js's file-level comment).
    const report = page.locator('.border-2');

    // "Period" group control.
    await report.getByRole('button', { name: 'Overall', exact: true }).click();
    // "Filters" group control — Recorder is select index 3 (Course, Year,
    // Violation Type, Recorder, Session), unchanged by the 5.2 regrouping.
    await report.locator('select').nth(3).selectOption({ label: 'Admin' });

    const excelButton = report.getByRole('button', { name: '⬇ Excel' });
    await expect(excelButton).toBeEnabled();
    const downloadPromise = page.waitForEvent('download');
    await excelButton.click();
    await downloadPromise;
  });
});
