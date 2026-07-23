const { z } = require('zod');

// Shared filter set for every analytics endpoint — date range preset (or custom
// from/to), plus the dynamic student/violation-type filters from the P24 spec.
const analyticsQuery = z.object({
  range:             z.enum(['this_week', 'this_month', 'last_month', 'custom']).optional(),
  // Year bounded to 1900-2099 (not just \d{4}) — trend's previous-period
  // lookback can walk back by up to the selected span's own length, and an
  // unbounded 4-digit year lets that land outside the year range Prisma can
  // serialize as a DateTime argument, turning a bad date into a 500 instead
  // of a clean validation error.
  from_date:         z.string().regex(/^(19|20)\d{2}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD (1900-2099).').optional(),
  to_date:           z.string().regex(/^(19|20)\d{2}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD (1900-2099).').optional(),
  course:            z.string().max(20).optional(),
  year:              z.coerce.number().int().min(1).max(12).optional(),
  academic_year:     z.string().max(10).optional(),
  violation_type_id: z.string().uuid('Invalid violation type ID.').optional(),
  faculty_id:        z.string().uuid('Invalid faculty ID.').optional(),
  recorded_by:       z.enum(['admin']).optional(),
});

// The trend breakdown endpoint is scoped to one bucket the trend response
// already computed and clipped server-side, so bucket_start/bucket_end are
// required ISO instants (not another date-range preset).
const trendBreakdownQuery = analyticsQuery.extend({
  bucket_start: z.string().datetime(),
  bucket_end:   z.string().datetime(),
});

module.exports = { analyticsQuery, trendBreakdownQuery };
