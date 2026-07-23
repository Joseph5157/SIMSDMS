// IST-explicit calendar bucketing for the Violation Trend analytics endpoint.
// Same "no reliance on process TZ" discipline as reportRange.js (ADMIN-HIGH-003):
// all arithmetic works on plain {year, month, day} IST calendar triples, only
// converting to real UTC instants (via istWallToUTC) at the boundary.

const { istWallToUTC, formatDateIST } = require('./time');
const { parseYMD } = require('./reportRange');

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// IST calendar date of a UTC instant, as a {year,month,day} triple.
function istDateOf(date) {
  return parseYMD(formatDateIST(date));
}

// Adds `delta` days (may be negative) to an IST calendar date. Date.UTC
// normalises month/year rollover for out-of-range day values.
function addISTDays(year, month, day, delta) {
  const d = new Date(Date.UTC(year, month - 1, day + delta));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

// Day-of-week for a calendar triple. UTC and IST share the same calendar-day
// numbering (only wall-clock time differs), so constructing via Date.UTC on
// the bare y/m/d is safe here despite not going through istWallToUTC.
function dayOfWeek(year, month, day) {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay(); // 0=Sun..6=Sat
}

function mondayOfISTWeek(year, month, day) {
  const dow = dayOfWeek(year, month, day);
  const diffToMonday = dow === 0 ? -6 : 1 - dow;
  return addISTDays(year, month, day, diffToMonday);
}

// Whole-day-count difference between two IST calendar triples (b - a),
// using UTC-epoch-day arithmetic (immune to DST-style discontinuities, which
// IST doesn't have anyway, but keeps this exact regardless).
function dayDiff(a, b) {
  const da = Date.UTC(a.year, a.month - 1, a.day) / 86_400_000;
  const db = Date.UTC(b.year, b.month - 1, b.day) / 86_400_000;
  return db - da;
}

// -1 / 0 / 1 comparator for two IST calendar triples.
function cmpDate(a, b) {
  return (a.year - b.year) || (a.month - b.month) || (a.day - b.day);
}

// Real UTC instant range [gte, lte] covering the given IST calendar dates,
// inclusive on both ends (mirrors reportRange.js's instant*Range helpers).
function instantRangeForISTDates(from, to) {
  return {
    gte: istWallToUTC(from.year, from.month, from.day, 0, 0),
    lte: new Date(istWallToUTC(to.year, to.month, to.day + 1, 0, 0).getTime() - 1),
  };
}

// ── Granularity-aware bucket arithmetic ─────────────────────────────────────

function bucketStartFor(date, granularity) {
  switch (granularity) {
    case 'day':     return date;
    case 'week':    return mondayOfISTWeek(date.year, date.month, date.day);
    case 'month':   return { year: date.year, month: date.month, day: 1 };
    case 'quarter': return { year: date.year, month: Math.floor((date.month - 1) / 3) * 3 + 1, day: 1 };
    case 'year':    return { year: date.year, month: 1, day: 1 };
    default:        throw new Error(`Unknown granularity: ${granularity}`);
  }
}

function nextBucketStart(start, granularity) {
  switch (granularity) {
    case 'day':     return addISTDays(start.year, start.month, start.day, 1);
    case 'week':    return addISTDays(start.year, start.month, start.day, 7);
    case 'month': {
      const d = new Date(Date.UTC(start.year, start.month, 1)); // month is already 0-based+1 → rolls forward one month
      return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: 1 };
    }
    case 'quarter': {
      const d = new Date(Date.UTC(start.year, start.month - 1 + 3, 1));
      return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: 1 };
    }
    case 'year':    return { year: start.year + 1, month: 1, day: 1 };
    default:        throw new Error(`Unknown granularity: ${granularity}`);
  }
}

function bucketEndFor(start, granularity) {
  const next = nextBucketStart(start, granularity);
  return addISTDays(next.year, next.month, next.day, -1);
}

function bucketKeyFor(start, granularity) {
  const p2 = (n) => String(n).padStart(2, '0');
  switch (granularity) {
    case 'day':     return `${start.year}-${p2(start.month)}-${p2(start.day)}`;
    case 'week':    return `${start.year}-${p2(start.month)}-${p2(start.day)}`; // Monday date
    case 'month':   return `${start.year}-${p2(start.month)}`;
    case 'quarter': return `${start.year}-Q${Math.floor((start.month - 1) / 3) + 1}`;
    case 'year':    return `${start.year}`;
    default:        throw new Error(`Unknown granularity: ${granularity}`);
  }
}

function bucketLabelFor(start, end, granularity) {
  switch (granularity) {
    case 'day':
      return `${start.day} ${MONTH_SHORT[start.month - 1]}`;
    case 'week':
      return start.month === end.month
        ? `${start.day}–${end.day} ${MONTH_SHORT[start.month - 1]}`
        : `${start.day} ${MONTH_SHORT[start.month - 1]} – ${end.day} ${MONTH_SHORT[end.month - 1]}`;
    case 'month':
      return `${MONTH_SHORT[start.month - 1]} ${start.year}`;
    case 'quarter':
      return `Q${Math.floor((start.month - 1) / 3) + 1} ${start.year}`;
    case 'year':
      return `${start.year}`;
    default:
      throw new Error(`Unknown granularity: ${granularity}`);
  }
}

// Picks a bucket size that keeps the chart readable regardless of span —
// escalates from daily up to yearly as the selected range grows, so a
// multi-year custom range never renders (or queries) hundreds of points.
function pickGranularity(spanDays) {
  if (spanDays <= 31)   return 'day';
  if (spanDays <= 180)  return 'week';
  if (spanDays <= 1095) return 'month';
  if (spanDays <= 3650) return 'quarter';
  return 'year';
}

// Enumerates every bucket spanning `range` (a {gte,lte} instant range) at the
// given granularity — including empty buckets, so a quiet week/month still
// appears on the trend chart at 0 rather than being silently omitted.
// `range`'s own bounds clip each bucket's reported start/end so a bucket at
// the edge of a custom range never reports (or, via the breakdown endpoint,
// queries) beyond what was actually counted into it.
function enumerateBuckets(range, granularity) {
  const rangeStartIST = istDateOf(range.gte);
  const rangeEndIST   = istDateOf(range.lte);

  const buckets = [];
  let cursor = bucketStartFor(rangeStartIST, granularity);
  // Safety cap — pickGranularity already keeps this well under 400 for any
  // realistic input, this just guards against a caller passing a raw range
  // straight to 'day' granularity for a huge span.
  for (let i = 0; i < 400; i++) {
    const end = bucketEndFor(cursor, granularity);
    const nominal = instantRangeForISTDates(cursor, end);
    const bucket_start = nominal.gte < range.gte ? range.gte : nominal.gte;
    const bucket_end   = nominal.lte > range.lte ? range.lte : nominal.lte;

    buckets.push({
      key:   bucketKeyFor(cursor, granularity),
      label: bucketLabelFor(cursor, end, granularity),
      bucket_start,
      bucket_end,
    });

    if (cmpDate(end, rangeEndIST) >= 0) break;
    cursor = nextBucketStart(cursor, granularity);
  }
  return buckets;
}

module.exports = {
  istDateOf, addISTDays, mondayOfISTWeek, dayDiff, cmpDate,
  instantRangeForISTDates, bucketStartFor, bucketKeyFor, pickGranularity, enumerateBuckets,
};
