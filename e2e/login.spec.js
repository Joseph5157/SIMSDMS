import { test, expect } from '@playwright/test';
import { E2E_FACULTY_EMAIL, E2E_FACULTY_PASSWORD } from './fixtures.mjs';

test.describe('Login', () => {
  test('faculty can sign in and land on their dashboard', async ({ page }) => {
    await page.goto('/login');

    await page.locator('#login-email').fill(E2E_FACULTY_EMAIL);
    await page.locator('#login-password').fill(E2E_FACULTY_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL(/\/faculty\/dashboard/);
  });

  test('rejects an invalid password', async ({ page }) => {
    await page.goto('/login');

    await page.locator('#login-email').fill(E2E_FACULTY_EMAIL);
    await page.locator('#login-password').fill('wrong-password');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByText('Invalid email or password.')).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });
});
