import { test, expect } from '@playwright/test';
import { E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD } from './fixtures.mjs';

// Batch 3.1 (Spec 032): the Student Violation Report's mobile presentation
// changed from a horizontally-scrolled table to a card list below 768px
// (see client/src/pages/admin/ReportsPage.jsx, case 'student-violations').
// This confirms the same fixed record (seeded by e2e/seed.mjs) is visible
// and data-equivalent on both sides of that boundary, with no clipping and
// export controls still reachable on mobile.
//
// Scoped to `.border-2` — the main Student Violation Report card is the only
// container on this page with that exact Tailwind class (the "By student"
// card below it uses plain `border`; secondary-report tiles use `border` on
// a <button>, never `border-2`) — because ResponsiveDataView always mounts
// both the mobile and desktop trees (one CSS-hidden), so an unscoped page
// query for "Excel"/"No records found." matches more than one element:
// the disabled Excel button on the not-yet-active "By student" card, the
// "Upload History" report tile (its description text also contains
// "Excel"), and the desktop table's own (hidden) empty-row message.

async function loginAsAdmin(page) {
  await page.goto('/login');
  await page.locator('#login-email').fill(E2E_ADMIN_EMAIL);
  await page.locator('#login-password').fill(E2E_ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/admin\/dashboard/);
}

async function assertNoHorizontalOverflow(page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1); // 1px tolerance for subpixel rounding
}

const RECORDER_SELECT = 3; // Course(0), Year(1), Violation Type(2), Recorder(3), Session(4)

test.describe('Student Violation Report mobile card (Batch 3.1)', () => {
  test('shows the seeded record as a data-equivalent card on mobile and table row on desktop', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/reports');
    const report = page.locator('.border-2');

    await report.getByRole('button', { name: 'Overall', exact: true }).click();
    // Isolates the fixed seeded record from anything else in the e2e DB.
    await report.locator('select').nth(RECORDER_SELECT).selectOption({ label: 'Admin' });

    // ── Desktop (>=768px): shared Table, all six columns ──
    await page.setViewportSize({ width: 1280, height: 900 });
    await expect(report.getByRole('table')).toBeVisible();
    const desktopRow = report.getByRole('row').filter({ hasText: 'E2E Test Student' });
    await expect(desktopRow).toHaveCount(1);
    await expect(desktopRow.getByText('E2E-STU-0001')).toBeVisible();
    await expect(desktopRow.getByText('E2E Test Violation')).toBeVisible();
    await expect(report.getByRole('button', { name: '⬇ Excel' })).toBeEnabled();
    await expect(report.getByRole('button', { name: '⬇ PDF' })).toBeEnabled();
    await assertNoHorizontalOverflow(page);

    // ── Mobile (<768px): card list, not a table — same record, same fields ──
    for (const width of [360, 390, 412]) {
      await page.setViewportSize({ width, height: 844 });
      await expect(report.getByRole('table')).toHaveCount(0); // desktop tree is display:none, not merely scrolled off
      // .first(): ResponsiveDataView always mounts both trees (mobile first
      // in DOM, then CSS-hidden desktop) — see the file-level comment — so
      // the same seeded fields exist twice in the DOM; assert the visible copy.
      await expect(report.getByText('E2E Test Student').first()).toBeVisible();
      await expect(report.getByText('E2E-STU-0001').first()).toBeVisible();
      // Matches the card's combined meta line ("Type · Recorder · Date"), not
      // the plain-text violation-type <option> or the desktop table's <Td> —
      // both also contain "E2E Test Violation" alone.
      await expect(report.getByText(/E2E Test Violation · Admin/)).toBeVisible();
      await expect(report.getByRole('button', { name: '⬇ Excel' })).toBeEnabled();
      await expect(report.getByRole('button', { name: '⬇ PDF' })).toBeEnabled();
      await assertNoHorizontalOverflow(page);
    }
  });

  test('renders the empty card state when the filtered recorder has no violations', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/reports');
    await page.setViewportSize({ width: 390, height: 844 });
    const report = page.locator('.border-2');

    await report.getByRole('button', { name: 'Overall', exact: true }).click();
    // E2E Faculty (seeded by e2e/seed.mjs) has no violations recorded against
    // it — every seeded violation is recorded by Admin — so this deterministically
    // empties the result without depending on month/year or a fixed violation count.
    await report.locator('select').nth(RECORDER_SELECT).selectOption({ label: 'E2E Faculty' });

    await expect(report.getByRole('table')).toHaveCount(0);
    // .first(): ResponsiveDataView mounts the mobile tree (visible) before the
    // desktop tree (CSS-hidden, same empty message inside its Table), in that
    // DOM order — see the file-level comment.
    await expect(report.getByText('No records found.').first()).toBeVisible();
    await assertNoHorizontalOverflow(page);
  });
});
