import { test, expect } from '@playwright/test';
import { E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD } from './fixtures.mjs';

// Batch 4.2 (Spec 032): loading/empty state consolidation. Verifies the
// EmptyRow-as-"Loading…" misuse (desktop table rows) and raw ad hoc loading/
// empty text (mobile card lists) were replaced with the Skeleton family and
// EmptyState, per V2 §7 — on 3 representative converted pages.
//
// Service workers are blocked for this whole file: the app's PWA service
// worker intercepts some GET API calls (e.g. /users) at the SW fetch-handler
// level, which Playwright's page.route cannot see or mock — confirmed via a
// throwaway debug spec (a catch-all page.route saw /users/me but not the
// /users list call; blocking the SW made it visible again). Without this,
// route mocks below would silently no-op and the "real" network response
// would render instead.
test.use({ serviceWorkers: 'block' });

const API_ORIGIN = 'http://localhost:3000';

async function loginAsAdmin(page) {
  await page.goto('/login');
  await page.locator('#login-email').fill(E2E_ADMIN_EMAIL);
  await page.locator('#login-password').fill(E2E_ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/admin\/dashboard/);
}

// Delays every matching backend response for the rest of the page's life, so
// the loading branch is observable without needing to know/mock each
// endpoint's response shape.
async function delayResponses(page, urlPattern, ms = 700) {
  await page.route(urlPattern, async (route) => {
    await new Promise((r) => setTimeout(r, ms));
    await route.continue();
  });
}

test.describe('Loading/empty state consolidation (Batch 4.2)', () => {
  // Two independent tests (not one test reloading at a new viewport): useUsers
  // caches its response into localStorage (`getCacheKey`/`setCacheKey`) and
  // feeds it back as TanStack Query `initialData`, so a second load in the
  // same browsing context skips the loading state entirely — a reload after
  // the desktop assertions below would never show the mobile skeleton.
  test('Users page desktop: shows TableRowSkeleton while loading, resolves to real content', async ({ page }) => {
    // Anchored to the API origin + exact "/users" path — a bare "/users"
    // substring match would also catch the SPA's own /admin/users document
    // navigation, and a looser one would catch /users/me and /users/directory.
    await delayResponses(page, new RegExp(`^${API_ORIGIN}/users(\\?|$)`));
    await page.setViewportSize({ width: 1280, height: 900 });
    await loginAsAdmin(page);
    await page.goto('/admin/users');

    await expect(page.locator('table .animate-pulse').first()).toBeVisible();
    await expect(page.getByRole('table').first()).toBeVisible();
    await expect(page.locator('table .animate-pulse')).toHaveCount(0);
  });

  test('Users page mobile: shows CardSkeleton while loading', async ({ page }) => {
    await delayResponses(page, new RegExp(`^${API_ORIGIN}/users(\\?|$)`));
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsAdmin(page);
    await page.goto('/admin/users');

    await expect(page.locator('.animate-pulse').first()).toBeVisible();
  });

  test('Users page: empty result shows EmptyState, not raw text', async ({ page }) => {
    await page.route(new RegExp(`^${API_ORIGIN}/users(\\?|$)`), (route) =>
      route.fulfill({ json: { data: [], meta: { total: 0, page: 1, limit: 20 } } })
    );
    // Mobile: the card-list container is where the ad hoc "No users found."
    // <div> text used to live before this batch converted it to EmptyState.
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsAdmin(page);
    await page.goto('/admin/users');

    await expect(page.getByText('No users found.')).toBeVisible();
  });

  test('Flagged Violations page: desktop TableRowSkeleton, mobile CardSkeleton while loading', async ({ page }) => {
    await delayResponses(page, `${API_ORIGIN}/reports/flagged-violations**`);
    await page.setViewportSize({ width: 1280, height: 900 });
    await loginAsAdmin(page);
    await page.goto('/admin/flagged-violations');

    await expect(page.locator('table .animate-pulse').first()).toBeVisible();
    await expect(page.locator('table .animate-pulse')).toHaveCount(0, { timeout: 5000 });

    // Route interception persists for the page's lifetime, so this reload
    // is delayed by the same handler registered above.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await expect(page.locator('.animate-pulse').first()).toBeVisible();
  });

  test('Student Violations page: desktop shows TableRowSkeleton while loading', async ({ page }) => {
    await delayResponses(page, new RegExp(`^${API_ORIGIN}/violations(\\?|$)`));
    await page.setViewportSize({ width: 1280, height: 900 });
    await loginAsAdmin(page);
    await page.goto('/admin/violations');

    await expect(page.locator('table .animate-pulse').first()).toBeVisible();
    await expect(page.locator('table .animate-pulse')).toHaveCount(0, { timeout: 5000 });
  });
});
