const { z } = require('zod');

// Query params arrive as strings — z.coerce.number() handles the conversion.

const yearMonthQuery = z.object({
  year:  z.coerce.number().int().min(2000).max(2100).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
});

const studentViolationQuery = yearMonthQuery.extend({
  student_id: z.string().uuid('Invalid student ID.').optional(),
});

const facultyActivityQuery = yearMonthQuery.extend({
  faculty_id: z.string().uuid('Invalid faculty ID.').optional(),
});

const activeStudentsQuery = z.object({
  course:           z.string().max(50).optional(),
  semester_or_year: z.string().max(20).optional(),
});

module.exports = {
  yearMonthQuery,
  studentViolationQuery,
  facultyActivityQuery,
  activeStudentsQuery,
};
