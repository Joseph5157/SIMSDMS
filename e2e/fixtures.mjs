// Shared e2e test constants. No side effects — safe to import from spec files.
// The matching users are created by e2e/seed.mjs.
export const E2E_FACULTY_EMAIL = 'e2e.faculty@sims.test';
export const E2E_FACULTY_PASSWORD = 'E2eTest1234!';

export const E2E_ADMIN_EMAIL = 'e2e.admin@sims.test';
export const E2E_ADMIN_PASSWORD = 'AdminTest1234!';

// e2e/seed.mjs creates this second faculty with the SAME password hash as
// E2E_FACULTY_PASSWORD above (it just never exported a constant for it,
// since until now nothing needed to log in as this user). It holds today's
// afternoon duty slot but — unlike the primary e2e faculty — no open
// attendance record, which makes it the ready-made "off-duty" fixture for
// e2e/faculty-violation-recording.spec.js. Do not use it for anything that
// assumes it can't log in; it always could.
export const E2E_FACULTY2_EMAIL = 'e2e.faculty2@sims.test';
export const E2E_FACULTY2_PASSWORD = E2E_FACULTY_PASSWORD;
