import { createRequire } from 'module';
const _require = createRequire(import.meta.url);

const { monthRangeUTC } = _require('../lib/time');

describe('monthRangeUTC', () => {
  it('returns exact UTC-midnight boundaries regardless of the process timezone', () => {
    // Regression test: this used to build boundaries with new Date(year, month-1, 1)
    // (the process-LOCAL constructor). On a server running IST (UTC+5:30, the
    // project's configured TZ), that shifted the lower boundary to
    // 2026-07-31T18:30:00.000Z — still calendar-date "31 July" once compared
    // against a @db.Date column — so the previous month's last day satisfied
    // `duty_date >= gte` and silently leaked into the query. Asserting the exact
    // UTC instant here (not just "excludes/includes" via a JS Date comparison,
    // which can't reproduce the Postgres-side DATE cast that actually caused the
    // leak) is what pins the fix.
    const range = monthRangeUTC(2026, 8);
    expect(range.gte.toISOString()).toBe('2026-08-01T00:00:00.000Z');
    expect(range.lte.toISOString()).toBe('2026-08-31T23:59:59.999Z');
  });

  it('handles a single-digit month correctly', () => {
    const range = monthRangeUTC(2026, 2);
    expect(range.gte.toISOString()).toBe('2026-02-01T00:00:00.000Z');
    expect(range.lte.toISOString()).toBe('2026-02-28T23:59:59.999Z');
  });
});
