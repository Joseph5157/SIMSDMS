import { test, expect } from '@playwright/test';
import { E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD } from './fixtures.mjs';

// Batch 3.2b (Spec 032): the "Duty Reassignments" report has two tables.
// Duty counts (short read-only comparison, 5 columns, no actions) keeps the
// existing scrollable Table unchanged — the plan's allowed-scroll-table
// exception. Reassignment history (per-event operational data) gets the same
// card treatment as Batches 3.1/3.2a. This spec covers only the
// history table's responsive behavior; the counts table is unchanged and
// already covered by Batch 1.3's scroll-container fix.
//
// Like Batch 3.2a, secondary reports render inside ResponsiveSheet
// (<=639px, role="dialog") or an inline result panel (>=640px) — two
// separate JSX trees — so each viewport needs its own open+verify pass.

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

async function openDutyReassignments(page) {
  await page.goto('/admin/reports');
  await page.getByRole('button', { name: /Duty Reassignments/ }).click();
}

// Two-levels-up from the heading reaches the inline panel div (heading ->
// header row -> panel), same technique as Batch 3.2a — "border" alone is not
// a unique selector on this page.
function inlinePanel(page) {
  return page.getByRole('heading', { name: /Duty Reassignments/ }).locator('..').locator('..');
}

test.describe('Duty Reassignments mobile card (Batch 3.2b)', () => {
  test('desktop (>=768px): both tables show the seeded data, history unchanged', async ({ page }) => {
    await loginAsAdmin(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await openDutyReassignments(page);

    const panel = inlinePanel(page);
    // Duty counts: still a Table, includes both seeded faculty (unchanged
    // behavior). "E2E Faculty" also appears in the history row below
    // ("E2E Faculty" -> "E2E Faculty Two"), hence .first().
    await expect(panel.getByText('E2E Faculty', { exact: true }).first()).toBeVisible();
    await expect(panel.getByText('E2E Faculty Two').first()).toBeVisible();

    // Reassignment history: still a Table row with all 7 columns.
    const historyRow = panel.getByRole('row').filter({ hasText: 'E2E test reassignment' });
    await expect(historyRow).toHaveCount(1);
    await expect(historyRow.getByText('afternoon')).toBeVisible();
    await assertNoHorizontalOverflow(page);
  });

  for (const width of [360, 390, 412, 639]) {
    test(`mobile (${width}px): reassignment history renders a card, not a table`, async ({ page }) => {
      await loginAsAdmin(page);
      await page.setViewportSize({ width, height: 844 });
      await openDutyReassignments(page);

      const dialog = page.getByRole('dialog');
      // Duty counts keeps its Table at every width (allowed-scroll exception) —
      // so this spec can't assert "zero tables" globally; scope to the history
      // section specifically via its own heading.
      const historySection = dialog.getByText('Reassignment history').locator('..');
      await expect(historySection.getByRole('table')).toHaveCount(0);
      // .first(): ResponsiveDataView mounts both trees (mobile first, then
      // CSS-hidden desktop) — see Batches 3.1/3.2a's identical note.
      await expect(historySection.getByText('E2E test reassignment').first()).toBeVisible();
      await expect(dialog.getByText(/E2E Faculty Two/).first()).toBeVisible();
      await assertNoHorizontalOverflow(page);
    });
  }

  test('640px: inline panel also renders the history card', async ({ page }) => {
    await loginAsAdmin(page);
    await page.setViewportSize({ width: 640, height: 900 });
    await openDutyReassignments(page);

    const panel = inlinePanel(page);
    await expect(page.getByRole('dialog')).toHaveCount(0); // confirms the inline path, not the sheet
    const historySection = panel.getByText('Reassignment history').locator('..');
    await expect(historySection.getByRole('table')).toHaveCount(0);
    await expect(historySection.getByText('E2E test reassignment').first()).toBeVisible();
    await assertNoHorizontalOverflow(page);
  });

  test('renders the empty history card state for a month with no reassignments', async ({ page }) => {
    await loginAsAdmin(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await openDutyReassignments(page);

    const dialog = page.getByRole('dialog');
    const lastYear = String(new Date().getFullYear() - 1); // fixture is always dated today
    await dialog.locator('select').first().selectOption(lastYear);

    const historySection = dialog.getByText('Reassignment history').locator('..');
    await expect(historySection.getByRole('table')).toHaveCount(0);
    await expect(historySection.getByText('No reassignments this month.').first()).toBeVisible();
    await assertNoHorizontalOverflow(page);
  });
});
