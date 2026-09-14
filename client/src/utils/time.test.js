import { formatHourMin, getGreeting } from './time';

describe('formatHourMin', () => {
  it('renders the midnight hour as 12 AM, not 0 AM', () => {
    expect(formatHourMin(0, 0)).toBe('12:00 AM');
  });
  it('renders the noon hour as 12 PM, not 0 PM', () => {
    expect(formatHourMin(12, 0)).toBe('12:00 PM');
  });
  it('renders an afternoon hour in PM with the 12-hour conversion', () => {
    expect(formatHourMin(13, 0)).toBe('1:00 PM');
  });
});

// getGreeting buckets by IST wall-clock time regardless of the machine's own
// timezone, specifically so it matches server-side session/cron timing
// instead of drifting for a device set to a different timezone — a
// correctness property no Playwright spec checks today, and one Playwright
// could only check by mocking the system clock across a real browser
// navigation. vi.setSystemTime is the direct, fast way to verify the exact
// boundary hours (11:59/12:00, 16:59/17:00 IST) this function's own comment
// promises.
describe('getGreeting', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  function setIstTime(hour, minute = 0) {
    // getGreeting reads Date.now() and adds the fixed +5:30 IST offset itself,
    // so pin the *system* clock to UTC such that (UTC + 5:30) lands on the
    // target IST hour, independent of the test runner's own timezone.
    const utcHour = (hour + 24 - 5) % 24;
    const utcMinute = (minute - 30 + 60) % 60;
    vi.useFakeTimers();
    vi.setSystemTime(new Date(Date.UTC(2026, 0, 1, utcHour, utcMinute)));
  }

  it('returns "morning" just before the noon boundary', () => {
    setIstTime(11, 59);
    expect(getGreeting()).toBe('morning');
  });

  it('returns "afternoon" exactly at the noon boundary', () => {
    setIstTime(12, 0);
    expect(getGreeting()).toBe('afternoon');
  });

  it('returns "afternoon" just before the evening boundary', () => {
    setIstTime(16, 59);
    expect(getGreeting()).toBe('afternoon');
  });

  it('returns "evening" exactly at the 5 PM boundary', () => {
    setIstTime(17, 0);
    expect(getGreeting()).toBe('evening');
  });
});
