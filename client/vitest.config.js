import { defineConfig } from 'vitest/config';

// Milestone 7 (Spec 032) client-testing-strategy decision: a minimal Vitest
// layer for pure-logic shared utilities that Playwright can only exercise
// indirectly and slowly through a full browser flow (or, for time/timezone
// edge cases, can't exercise at all without extensive Date-mocking
// infrastructure). Mirrors server/vitest.config.mjs's own settings for
// consistency — this repo already chose Vitest as its test runner on the
// server side. No jsdom/React Testing Library yet: nothing here needs a DOM.
// Add that layer later only when a component actually justifies it — see
// docs/UI_ARCHITECTURE.md's testing-strategy note for the criteria.
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.js'],
  },
});
