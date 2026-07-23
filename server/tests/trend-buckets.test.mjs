import { createRequire } from 'module';
const _require = createRequire(import.meta.url);

const {
  addISTDays, mondayOfISTWeek, dayDiff, cmpDate: _cmpDate,
  instantRangeForISTDates, pickGranularity, enumerateBuckets,
} = _require('../lib/trendBuckets');

// These helpers must be correct regardless of the process TZ (test env sets
// none — see vitest.config.mjs), same discipline as reportRange.js. (ADMIN-HIGH-003)

describe('mondayOfISTWeek', () => {
  it('finds the Monday of the IST week containing a mid-week date', () => {
    // 2026-07-14 is a Tuesday.
    expect(mondayOfISTWeek(2026, 7, 14)).toEqual({ year: 2026, month: 7, day: 13 });
  });

  it('is idempotent on a Monday itself', () => {
    expect(mondayOfISTWeek(2026, 6, 29)).toEqual({ year: 2026, month: 6, day: 29 });
  });
});

describe('addISTDays', () => {
  it('normalises month rollover', () => {
    expect(addISTDays(2026, 7, 30, 3)).toEqual({ year: 2026, month: 8, day: 2 });
  });

  it('normalises year rollover', () => {
    expect(addISTDays(2026, 12, 30, 3)).toEqual({ year: 2027, month: 1, day: 2 });
  });

  it('handles negative deltas', () => {
    expect(addISTDays(2026, 7, 2, -5)).toEqual({ year: 2026, month: 6, day: 27 });
  });
});

describe('dayDiff', () => {
  it('is inclusive-friendly: dayDiff + 1 gives the day count of a span', () => {
    expect(dayDiff({ year: 2026, month: 7, day: 1 }, { year: 2026, month: 7, day: 7 }) + 1).toBe(7);
  });
});

describe('pickGranularity', () => {
  it('escalates from day to year as the span grows, capping bucket count', () => {
    expect(pickGranularity(7)).toBe('day');
    expect(pickGranularity(31)).toBe('day');
    expect(pickGranularity(32)).toBe('week');
    expect(pickGranularity(180)).toBe('week');
    expect(pickGranularity(181)).toBe('month');
    expect(pickGranularity(1095)).toBe('month');
    expect(pickGranularity(1096)).toBe('quarter');
    expect(pickGranularity(3650)).toBe('quarter');
    expect(pickGranularity(3651)).toBe('year');
  });
});

describe('instantRangeForISTDates', () => {
  it('converts an IST calendar day into its UTC instant boundaries', () => {
    const r = instantRangeForISTDates({ year: 2026, month: 7, day: 1 }, { year: 2026, month: 7, day: 1 });
    expect(r.gte.toISOString()).toBe('2026-06-30T18:30:00.000Z');
    expect(r.lte.toISOString()).toBe('2026-07-01T18:29:59.999Z');
  });
});

describe('enumerateBuckets — day granularity', () => {
  it('produces one contiguous, correctly labeled bucket per day', () => {
    const range = instantRangeForISTDates({ year: 2026, month: 7, day: 1 }, { year: 2026, month: 7, day: 3 });
    const buckets = enumerateBuckets(range, 'day');

    expect(buckets.map((b) => b.key)).toEqual(['2026-07-01', '2026-07-02', '2026-07-03']);
    expect(buckets.map((b) => b.label)).toEqual(['1 Jul', '2 Jul', '3 Jul']);
    expect(buckets[0].bucket_start.toISOString()).toBe('2026-06-30T18:30:00.000Z');
    expect(buckets[2].bucket_end.toISOString()).toBe('2026-07-03T18:29:59.999Z');
    // Contiguous — no gap, no overlap between adjacent buckets.
    expect(buckets[1].bucket_start.getTime()).toBe(buckets[0].bucket_end.getTime() + 1);
    expect(buckets[2].bucket_start.getTime()).toBe(buckets[1].bucket_end.getTime() + 1);
  });
});

describe('enumerateBuckets — week granularity clips to the filtered range', () => {
  it('clips the first and last bucket to the range bounds without shifting the untouched edges', () => {
    // 2026-07-14 (Tue) .. 2026-07-20 (Mon) spans two Mon–Sun weeks:
    // week of Jul 13 (partial: starts mid-week) and week of Jul 20 (partial: one day).
    const range = instantRangeForISTDates({ year: 2026, month: 7, day: 14 }, { year: 2026, month: 7, day: 20 });
    const buckets = enumerateBuckets(range, 'week');

    expect(buckets.map((b) => b.key)).toEqual(['2026-07-13', '2026-07-20']);

    // First bucket's start is clipped to the query range, not the calendar week.
    expect(buckets[0].bucket_start.getTime()).toBe(range.gte.getTime());
    // First bucket's end is untouched — Sunday Jul 19 is still inside the range.
    expect(buckets[0].bucket_end.toISOString()).toBe(
      instantRangeForISTDates({ year: 2026, month: 7, day: 19 }, { year: 2026, month: 7, day: 19 }).lte.toISOString(),
    );

    // Second bucket's start is untouched — Monday Jul 20 is exactly the range's own start-of-day.
    expect(buckets[1].bucket_start.toISOString()).toBe(
      instantRangeForISTDates({ year: 2026, month: 7, day: 20 }, { year: 2026, month: 7, day: 20 }).gte.toISOString(),
    );
    // Second bucket's end is clipped to the query range, not the calendar week.
    expect(buckets[1].bucket_end.getTime()).toBe(range.lte.getTime());
  });
});

describe('enumerateBuckets — month granularity crosses a year boundary', () => {
  it('rolls Dec into the following Jan correctly', () => {
    const range = instantRangeForISTDates({ year: 2026, month: 12, day: 1 }, { year: 2027, month: 1, day: 31 });
    const buckets = enumerateBuckets(range, 'month');

    expect(buckets.map((b) => b.key)).toEqual(['2026-12', '2027-01']);
    expect(buckets.map((b) => b.label)).toEqual(['Dec 2026', 'Jan 2027']);
  });
});
