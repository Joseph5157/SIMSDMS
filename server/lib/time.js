/**
 * IST (Indian Standard Time) aware time utilities
 * India uses UTC+5:30 with no DST
 */

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // 5 hours 30 minutes in milliseconds

/**
 * Get current time in IST
 * @returns {Date} Current time in IST
 */
function nowIST() {
  const utcNow = new Date();
  const istMs = utcNow.getTime() + IST_OFFSET_MS;
  return new Date(istMs);
}

/**
 * Check if a date (in IST) is today
 * @param {Date} dateInIST - Date in IST to check
 * @returns {boolean} True if the date is today in IST
 */
function isToday(dateInIST) {
  const now = nowIST();
  const istDateStr = dateInIST.toISOString().split('T')[0];
  const todayStr = now.toISOString().split('T')[0];
  return istDateStr === todayStr;
}

/**
 * Get the start of today in UTC (as a Date object)
 * Used for database queries with duty_date field
 * @returns {Date} Start of today (IST midnight) as UTC timestamp
 */
function getTodayStartUTC() {
  const now = new Date();
  const istNow = new Date(now.getTime() + IST_OFFSET_MS);

  // Get IST date components
  const year = istNow.getUTCFullYear();
  const month = istNow.getUTCMonth();
  const date = istNow.getUTCDate();

  // Create a UTC date at IST midnight
  return new Date(Date.UTC(year, month, date, 0, 0, 0, 0));
}

/**
 * Get the end of today in UTC (as a Date object)
 * Used for database queries with duty_date field
 * @returns {Date} End of today (IST 23:59:59) as UTC timestamp
 */
function getTodayEndUTC() {
  const now = new Date();
  const istNow = new Date(now.getTime() + IST_OFFSET_MS);

  // Get IST date components
  const year = istNow.getUTCFullYear();
  const month = istNow.getUTCMonth();
  const date = istNow.getUTCDate();

  // Create a UTC date at IST end of day
  return new Date(Date.UTC(year, month, date, 23, 59, 59, 999));
}

/**
 * Check if current time in IST is past the late attendance threshold
 * Late threshold is typically 30 minutes after duty start (e.g., 9:30 AM for 9 AM duty)
 * @param {number} lateThresholdMinutes - Minutes after duty start considered late
 * @returns {boolean} True if current IST time is past the late threshold
 */
function isLate(lateThresholdMinutes = 30) {
  const now = nowIST();
  const hours = now.getUTCHours();
  const minutes = now.getUTCMinutes();

  // Morning duty (typically 9 AM start) → late after 9:30 AM
  const morningLateTime = 9 * 60 + lateThresholdMinutes;
  const currentTime = hours * 60 + minutes;

  // Afternoon duty (typically 2 PM start) → late after 2:30 PM
  const afternoonLateTime = 14 * 60 + lateThresholdMinutes;

  // Simplified: check if past morning OR past afternoon threshold
  return currentTime >= morningLateTime && currentTime < afternoonLateTime ||
         currentTime >= afternoonLateTime;
}

/**
 * Format a Date as IST date string (YYYY-MM-DD)
 * @param {Date} date - Date to format
 * @returns {string} Date string in YYYY-MM-DD format (IST)
 */
function formatDateIST(date) {
  const istDate = new Date(date.getTime() + IST_OFFSET_MS);
  const year = istDate.getUTCFullYear();
  const month = String(istDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(istDate.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

module.exports = {
  nowIST,
  isToday,
  getTodayStartUTC,
  getTodayEndUTC,
  isLate,
  formatDateIST,
  IST_OFFSET_MS,
};
