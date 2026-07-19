import { createRequire } from 'module';
const _require = createRequire(import.meta.url);

const {
  dateDayRange, dateMonthRange, dateYearRange, dateSpanRange,
  instantDayRange, instantMonthRange, instantYearRange, instantSpanRange,
  parseYMD,
} = _require('../lib/reportRange');

// These helpers must be correct regardless of the process TZ (the test env sets
// none — see vitest.config.mjs). All assertions are exact UTC instants. (ADMIN-HIGH-003)

const iso = (d) => d.toISOString();
const within = (range, d) => d >= range.gte && d <= range.lte;

describe('reportRange — @db.Date (calendar) boundaries', () => {
  it('dateMonthRange spans UTC midnight of day 1 to end of the last day', () => {
    const r = dateMonthRange(2026, 7);
    expect(iso(r.gte)).toBe('2026-07-01T00:00:00.000Z');
    expect(iso(r.lte)).toBe('2026-07-31T23:59:59.999Z');
  });

  it('dateMonthRange handles February leap/non-leap length via day-0-of-next-month', () => {
    expect(iso(dateMonthRange(2024, 2).lte)).toBe('2024-02-29T23:59:59.999Z'); // leap
    expect(iso(dateMonthRange(2026, 2).lte)).toBe('2026-02-28T23:59:59.999Z');
  });

  it('dateDayRange covers exactly one UTC calendar day', () => {
    const r = dateDayRange(2026, 7, 15);
    expect(iso(r.gte)).toBe('2026-07-15T00:00:00.000Z');
    expect(iso(r.lte)).toBe('2026-07-15T23:59:59.999Z');
  });

  it('dateYearRange spans Jan 1 to Dec 31 in UTC', () => {
    const r = dateYearRange(2026);
    expect(iso(r.gte)).toBe('2026-01-01T00:00:00.000Z');
    expect(iso(r.lte)).toBe('2026-12-31T23:59:59.999Z');
  });

  it('dateSpanRange is inclusive on both ends', () => {
    const r = dateSpanRange({ year: 2026, month: 7, day: 1 }, { year: 2026, month: 7, day: 7 });
    expect(iso(r.gte)).toBe('2026-07-01T00:00:00.000Z');
    expect(iso(r.lte)).toBe('2026-07-07T23:59:59.999Z');
  });

  it('matches a duty_date stored as UTC midnight (Prisma @db.Date)', () => {
    const r = dateMonthRange(2026, 7);
    expect(within(r, new Date('2026-07-01T00:00:00.000Z'))).toBe(true);
    expect(within(r, new Date('2026-07-31T00:00:00.000Z'))).toBe(true);
    expect(within(r, new Date('2026-08-01T00:00:00.000Z'))).toBe(false);
  });
});

describe('reportRange — timestamptz (IST instant) boundaries', () => {
  it('instantMonthRange uses IST wall-clock start/end as UTC instants', () => {
    const r = instantMonthRange(2026, 7);
    // July 1 00:00 IST = June 30 18:30 UTC; Aug 1 00:00 IST − 1 ms
    expect(iso(r.gte)).toBe('2026-06-30T18:30:00.000Z');
    expect(iso(r.lte)).toBe('2026-07-31T18:29:59.999Z');
  });

  it('classifies a violation at 11:30 PM IST into the current month', () => {
    const july = instantMonthRange(2026, 7);
    const at1130pmIST = new Date('2026-07-31T18:00:00.000Z'); // 11:30 PM IST, Jul 31
    expect(within(july, at1130pmIST)).toBe(true);
  });

  it('classifies a violation at 12:30 AM IST into the NEXT month, not the current one', () => {
    const july   = instantMonthRange(2026, 7);
    const august = instantMonthRange(2026, 8);
    const at1230amIST = new Date('2026-07-31T19:00:00.000Z'); // 12:30 AM IST, Aug 1
    expect(within(july, at1230amIST)).toBe(false);
    expect(within(august, at1230amIST)).toBe(true);
  });

  it('instantYearRange handles the year-end edge in IST', () => {
    const y2026 = instantYearRange(2026);
    expect(iso(y2026.gte)).toBe('2025-12-31T18:30:00.000Z');
    expect(iso(y2026.lte)).toBe('2026-12-31T18:29:59.999Z');
    expect(within(y2026, new Date('2026-12-31T18:00:00.000Z'))).toBe(true);  // 11:30 PM IST Dec 31
    expect(within(y2026, new Date('2026-12-31T19:00:00.000Z'))).toBe(false); // 12:30 AM IST Jan 1
  });

  it('instantDayRange covers one IST calendar day as UTC instants', () => {
    const r = instantDayRange(2026, 7, 15);
    expect(iso(r.gte)).toBe('2026-07-14T18:30:00.000Z');
    expect(iso(r.lte)).toBe('2026-07-15T18:29:59.999Z');
  });

  it('instantSpanRange is inclusive from start-of-first to end-of-last IST day', () => {
    const r = instantSpanRange({ year: 2026, month: 7, day: 1 }, { year: 2026, month: 7, day: 7 });
    expect(iso(r.gte)).toBe('2026-06-30T18:30:00.000Z');
    expect(iso(r.lte)).toBe('2026-07-07T18:29:59.999Z');
  });
});

describe('reportRange — parseYMD', () => {
  it('parses a YYYY-MM-DD string into numeric parts', () => {
    expect(parseYMD('2026-07-15')).toEqual({ year: 2026, month: 7, day: 15 });
  });
});
