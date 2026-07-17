import { defineConfig, devices } from '@playwright/test';

// Real-browser e2e coverage for flows that unit tests can't see (drawer/modal
// timing, mobile keyboard interaction, actual rendered layout). Point
// DATABASE_URL at a disposable/seeded Postgres before running — see
// e2e/seed.mjs. `npm run dev` starts both server (3000) and client (5173);
// Vite's dev proxy (client/vite.config.js) forwards API calls to the server.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
