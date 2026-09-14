import { test, expect } from '@playwright/test';
import { E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD, E2E_FACULTY_EMAIL, E2E_FACULTY_PASSWORD } from './fixtures.mjs';

// Batch 4.3 (Spec 032): targeted coverage for the AppButton conversions not
// already exercised elsewhere. e2e/login.spec.js already exercises the two
// kept-exception auth submit buttons (LoginPage "Sign in") end-to-end; this
// file covers the plan's remaining bar — "one report download, one retry
// control" — plus the StudentsPage Clear-filters and ChangePasswordPage
// Cancel conversions from the same batch.

const API_ORIGIN = 'http://localhost:3000';

async function loginAsAdmin(page) {
  await page.goto('/login');
  await page.locator('#login-email').fill(E2E_ADMIN_EMAIL);
  await page.locator('#login-password').fill(E2E_ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/admin\/dashboard/);
}

async function loginAsFaculty(page) {
  await page.goto('/login');
  await page.locator('#login-email').fill(E2E_FACULTY_EMAIL);
  await page.locator('#login-password').fill(E2E_FACULTY_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/faculty\/dashboard/);
}

test.describe('Report download (Batch 4.3)', () => {
  test('Student Violation Report: Excel AppButton triggers a real download', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/reports');
    const report = page.locator('.border-2');

    // "Overall" + Recorder=Admin isolates the fixed seeded record (see
    // e2e/reports-student-violations.spec.js) so the button is deterministically
    // enabled regardless of the current month/year.
    await report.getByRole('button', { name: 'Overall', exact: true }).click();
    await report.locator('select').nth(3).selectOption({ label: 'Admin' });

    const excelButton = report.getByRole('button', { name: '⬇ Excel' });
    await expect(excelButton).toBeEnabled();

    // downloadReportFile (client/src/utils/downloadFile.js) fetches a blob then
    // synthesizes an <a download> click — no navigation, so waitForEvent
    // is the correct signal, not a URL assertion.
    const downloadPromise = page.waitForEvent('download');
    await excelButton.click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/^student-violations-.*\.xlsx$/);
  });
});

test.describe('Retry control (Batch 4.3)', () => {
  // Forces a 500 on the first duty-slots request so isError renders the
  // converted mobile Retry AppButton (AllFacultyDutiesPage), then lets the
  // retried request succeed. Per the SW-interception constraint documented in
  // e2e/state-consistency.spec.js, the PWA service worker can intercept GET
  // API calls at a level page.route can't see/mock in dev.
  test.use({ serviceWorkers: 'block' });

  test('AllFacultyDutiesPage mobile: Retry clears the error state and loads real content', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsFaculty(page);

    let requestCount = 0;
    await page.route(new RegExp(`^${API_ORIGIN}/duty-slots/all/`), (route) => {
      requestCount += 1;
      if (requestCount === 1) {
        return route.fulfill({ status: 500, json: { message: 'Internal error' } });
      }
      return route.continue();
    });

    await page.goto('/faculty/all-duties');

    const retryButton = page.getByRole('button', { name: 'Retry' });
    await expect(retryButton).toBeVisible();

    await retryButton.click();

    // The mobile branch only ever renders one of isLoading/isError/agenda at a
    // time (client/src/pages/faculty/AllFacultyDutiesPage.jsx), so the Retry
    // button disappearing already means isError flipped false via a resolved
    // (not merely pending) refetch — requestCount confirms a second request
    // actually happened rather than the first response being reused.
    await expect(retryButton).toHaveCount(0);
    expect(requestCount).toBeGreaterThanOrEqual(2);
  });
});

test.describe('Clear filters (Batch 4.3)', () => {
  test('StudentsPage: Clear AppButton appears while filtering, resets search, then hides again', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/students');

    const search = page.getByPlaceholder('Search name or reg. no…');
    const clearButton = page.getByRole('button', { name: 'Clear' });

    await expect(clearButton).toHaveCount(0);

    await search.fill('E2E');
    await expect(clearButton).toBeVisible();

    await clearButton.click();

    await expect(search).toHaveValue('');
    await expect(clearButton).toHaveCount(0);
  });
});

test.describe('ChangePasswordPage Cancel (Batch 4.3)', () => {
  test('faculty: Cancel AppButton navigates back to the faculty dashboard', async ({ page }) => {
    // E2E faculty user has must_change_password: false, so Cancel renders
    // (it's hidden while a password change is mandatory) with no special setup.
    await loginAsFaculty(page);
    await page.goto('/change-password');

    const cancelButton = page.getByRole('button', { name: '← Cancel' });
    await expect(cancelButton).toBeVisible();

    await cancelButton.click();

    await expect(page).toHaveURL(/\/faculty\/dashboard/);
  });
});
