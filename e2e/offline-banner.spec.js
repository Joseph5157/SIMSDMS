import { test, expect } from '@playwright/test';
import { E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD } from './fixtures.mjs';

// Batch 4.1 (Spec 032): OfflineBanner rebuilt onto Alert + AppButton per the
// fa996f2 frozen-candidate direction (rebuilt fresh, not cherry-picked).
// Reproduces the 030-D-10 offline scenario: visible, dismissible, dark-mode
// readable, no horizontal overflow, mobile-only (md:hidden).

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

function banner(page) {
  return page.getByRole('status', { name: /offline|online/i });
}

test.describe('OfflineBanner (Batch 4.1)', () => {
  test('mobile (390px): shows on offline, dismissible, hidden again once dismissed', async ({ page, context }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsAdmin(page);

    await context.setOffline(true);
    await expect(banner(page)).toBeVisible();
    await expect(banner(page)).toContainText("You're offline");
    await assertNoHorizontalOverflow(page);

    await page.getByRole('button', { name: 'Dismiss offline banner' }).click();
    await expect(banner(page)).toHaveCount(0);

    // Stays dismissed while still offline (persistent lifecycle: only an
    // actual online/offline transition re-triggers the effect, not a re-render).
    await page.waitForTimeout(500);
    await expect(banner(page)).toHaveCount(0);

    await context.setOffline(false);
  });

  test('mobile (390px): reappears as "back online" then auto-hides after reconnecting', async ({ page, context }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsAdmin(page);

    await context.setOffline(true);
    await expect(banner(page)).toBeVisible();

    await context.setOffline(false);
    await expect(banner(page)).toContainText('Back online');
    await expect(banner(page)).toHaveCount(0, { timeout: 4000 });
  });

  test('desktop (1280px): banner never shows (md:hidden) even when offline', async ({ page, context }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await loginAsAdmin(page);

    await context.setOffline(true);
    await page.waitForTimeout(300);
    await expect(banner(page)).toHaveCount(0);

    await context.setOffline(false);
  });

  test('mobile (390px), dark theme: banner renders visibly with no console errors', async ({ page, context }) => {
    await page.addInitScript(() => localStorage.setItem('app-theme', 'dark'));
    await page.setViewportSize({ width: 390, height: 844 });

    await loginAsAdmin(page);
    await expect(page.locator('html')).toHaveClass(/dark/);

    // Uncaught JS exceptions only — going offline legitimately spams the
    // console with ERR_INTERNET_DISCONNECTED resource-load errors (TanStack
    // Query polling), which is expected noise, not an application defect.
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await context.setOffline(true);
    await expect(banner(page)).toBeVisible();
    await assertNoHorizontalOverflow(page);
    expect(pageErrors).toEqual([]);

    await context.setOffline(false);
  });
});
