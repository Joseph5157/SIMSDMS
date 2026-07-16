// Formats an hour/minute pair (24h, as stored in duty timing settings) as
// a 12h clock string, e.g. formatHourMin(13, 0) -> "1:00 PM".
export function formatHourMin(hour, min) {
  const period = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${String(min).padStart(2, '0')} ${period}`;
}

// Dashboard greeting ("Good morning/afternoon/evening") — bucketed by IST wall
// clock, not the device's local timezone, so it matches server-side session
// timing (system_config, cron) instead of drifting for anyone whose phone is
// set to a different timezone than the college.
export function getGreeting() {
  const istHour = new Date(Date.now() + 5.5 * 60 * 60 * 1000).getUTCHours();
  if (istHour < 12) return 'morning';
  if (istHour < 17) return 'afternoon';
  return 'evening';
}
