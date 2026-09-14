import { pad, toTimeStr, parseTimeStr, format12 } from './timeFormat';

// These are the exact functions e2e/duty-timing-settings.spec.js drives
// through a real browser to reach only ONE case (afternoon 16:00 -> "4:00
// PM"). The midnight/noon 12-hour boundary this suite covers below is
// realistic (session_start_morning_hour can legitimately be 0, and
// auto_checkout_afternoon_hour can legitimately be 12) but was never
// exercised by any Playwright spec — exactly the "Playwright handles this
// inefficiently, or not at all" case Milestone 7 was authorized to address
// with a small Vitest layer instead.

describe('pad', () => {
  it('left-pads single digits to two characters', () => {
    expect(pad(5)).toBe('05');
  });
  it('leaves two-digit numbers unchanged', () => {
    expect(pad(15)).toBe('15');
  });
  it('defaults a nullish value to "00"', () => {
    expect(pad(undefined)).toBe('00');
    expect(pad(null)).toBe('00');
  });
});

describe('toTimeStr', () => {
  it('formats an hour/minute pair as HH:MM for a native time input', () => {
    expect(toTimeStr(9, 5)).toBe('09:05');
    expect(toTimeStr(16, 0)).toBe('16:00');
  });
});

describe('parseTimeStr', () => {
  it('parses a native time input value back into hour/minute numbers', () => {
    expect(parseTimeStr('16:30')).toEqual({ hour: 16, minute: 30 });
  });
  it('falls back to 0/0 for an empty or malformed value', () => {
    expect(parseTimeStr('')).toEqual({ hour: 0, minute: 0 });
    expect(parseTimeStr(undefined)).toEqual({ hour: 0, minute: 0 });
  });
});

describe('format12', () => {
  it('renders the midnight hour as 12 AM, not 0 AM', () => {
    expect(format12(0, 0)).toBe('12:00 AM');
  });
  it('renders the noon hour as 12 PM, not 0 PM', () => {
    expect(format12(12, 0)).toBe('12:00 PM');
  });
  it('renders a morning hour in AM', () => {
    expect(format12(9, 15)).toBe('9:15 AM');
  });
  it('renders an afternoon hour in PM with the 12-hour conversion', () => {
    expect(format12(16, 0)).toBe('4:00 PM');
  });
  it('defaults a nullish hour to midnight (12 AM)', () => {
    expect(format12(undefined, 0)).toBe('12:00 AM');
  });
});
