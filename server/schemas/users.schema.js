const { z } = require('zod');

const AVATAR_OPTIONS = ['male_professor', 'female_professor', 'admin', 'super_admin'];

const updateProfileSchema = z.object({
  name: z.string().min(1).max(150).optional(),
  department: z.string().max(100).optional(),
  designation: z.string().max(100).optional(),
  title: z.string().max(20).optional(),
  phone: z.string().max(20).optional(),
  avatar: z.enum(AVATAR_OPTIONS).nullable().optional(),
});

// The Super-Admin Audit Logs page sends blank strings for cleared filters —
// treat '' as "not set" so they pass through, while a malformed uuid/date/page
// is rejected with a 422 instead of reaching Prisma as an Invalid Date/bad
// filter and 500-ing. (ADMIN-LOW-002)
const emptyToUndefined = (v) => (v === '' ? undefined : v);

const auditLogsQuery = z.object({
  actor:  z.preprocess(emptyToUndefined, z.string().uuid('Invalid actor ID.').optional()),
  action: z.preprocess(emptyToUndefined, z.string().max(100).optional()),
  from:   z.preprocess(emptyToUndefined, z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'from must be in YYYY-MM-DD format.').optional()),
  to:     z.preprocess(emptyToUndefined, z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'to must be in YYYY-MM-DD format.').optional()),
  page:   z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).optional()),
  limit:  z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).max(100).optional()),
});

module.exports = { updateProfileSchema, AVATAR_OPTIONS, auditLogsQuery };
