// Duty timing values are stored 24-hour (hour 0–23, minute 0–59) across the
// whole stack. These helpers convert to/from the <input type="time"> "HH:MM"
// string and to an unambiguous 12-hour label so the UI never shows a bare hour
// number that could be read as AM when PM was meant.

export const pad = (n) => String(n ?? 0).padStart(2, '0');

export const toTimeStr = (h, m) => `${pad(h)}:${pad(m)}`;

export function parseTimeStr(str) {
  const [h, m] = (str || '').split(':').map((x) => parseInt(x, 10));
  return { hour: Number.isFinite(h) ? h : 0, minute: Number.isFinite(m) ? m : 0 };
}

export function format12(h, m) {
  const hour = h ?? 0;
  const period = hour < 12 ? 'AM' : 'PM';
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${pad(m)} ${period}`;
}
