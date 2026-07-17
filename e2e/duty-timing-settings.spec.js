import { test, expect } from '@playwright/test';
import { E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD } from './fixtures.mjs';

async function loginAsAdmin(page) {
  await page.goto('/login');
  await page.locator('#login-email').fill(E2E_ADMIN_EMAIL);
  await page.locator('#login-password').fill(E2E_ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/admin\/dashboard/);
}

test.describe('Duty Timing Settings', () => {
  test('shows times in 12-hour language and edits via the modal', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/duty-timing-settings');

    // Read-only summary renders in plain 12-hour format (not a bare hour number).
    await expect(page.getByText('Afternoon session')).toBeVisible();
    await expect(page.getByText(/\d{1,2}:\d{2} (AM|PM)/).first()).toBeVisible();

    // Open the edit modal (its "Save Changes" button is unique to the dialog —
    // the page header shares the "Duty Timing Settings" title text).
    await page.getByRole('button', { name: 'Edit timings' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('button', { name: 'Save Changes' })).toBeVisible();

    // Set the afternoon auto clock-out to 16:00 (4 PM) via the native time input.
    // Fields are ordered morning (3) then afternoon (3); "Auto clock-out" appears
    // once per session, so the afternoon one is the 2nd match.
    await dialog.getByLabel('Auto clock-out').nth(1).fill('16:00');

    // The unambiguous caption updates live.
    await expect(dialog.getByText('4:00 PM', { exact: true })).toBeVisible();

    await dialog.getByRole('button', { name: 'Save Changes' }).click();

    // Modal closes and the summary reflects the saved value in 12-hour form.
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(page.getByText('4:00 PM', { exact: true })).toBeVisible();
  });
});
