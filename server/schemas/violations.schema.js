const { z } = require('zod');

const createViolationSchema = z.object({
  student_id:        z.string().uuid('Invalid student ID.'),
  duty_slot_id:      z.string().uuid('Invalid duty slot ID.'),
  violation_type_id: z.string().uuid('Invalid violation type ID.'),
  custom_violation:  z.string().min(1).max(1000).optional(),
  fine_amount:       z.number().nonnegative().optional(),
  is_warning_only:   z.boolean().optional().default(false),
  remarks:           z.string().max(1000).optional(),
});

const editViolationSchema = z
  .object({
    custom_violation: z.string().min(1).max(1000).optional(),
    fine_amount:      z.number().nonnegative().optional(),
    is_warning_only:  z.boolean().optional(),
    remarks:          z.string().max(1000).optional(),
  })
  .refine(
    (d) => Object.values(d).some((v) => v !== undefined),
    { message: 'At least one field must be provided.' },
  );

const flagViolationSchema = z.object({
  flag_note: z.string().min(1, 'Flag note is required.').max(500),
});

const resolveFlagSchema = z.object({
  reason: z.string().min(1, 'Resolution reason is required.').max(500),
});

module.exports = { createViolationSchema, editViolationSchema, flagViolationSchema, resolveFlagSchema };
