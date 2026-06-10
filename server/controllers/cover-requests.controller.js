const prisma = require('../lib/prisma');
const settingsService = require('../services/settings.service');

const COVER_INCLUDE = {
  dutySlot: {
    select: {
      id: true, duty_date: true, session_type: true, status: true,
      faculty: { select: { id: true, name: true, email: true } },
    },
  },
  requester:   { select: { id: true, name: true, email: true, department: true } },
  volunteer:   { select: { id: true, name: true, email: true, department: true } },
  confirmedBy: { select: { id: true, name: true, email: true } },
};

// ─── POST /cover-requests — Faculty ───────────────────────────────────────────

async function createCoverRequest(req, res) {
  const { duty_slot_id, reason } = req.body;

  const slot = await prisma.dutySlot.findUnique({ where: { id: duty_slot_id } });
  if (!slot || slot.faculty_id !== req.user.id) {
    return res.status(403).json({ error: true, code: 'FORBIDDEN', message: 'You can only post cover requests for your own duty slots.' });
  }

  if (['covered', 'absent'].includes(slot.status)) {
    return res.status(409).json({ error: true, code: 'CONFLICT', message: `Cannot post a cover request — slot status is already '${slot.status}'.` });
  }

  // Enforce max_cover_requests_per_slot from calendar config
  const dutyDate  = slot.duty_date;
  const month     = dutyDate.getMonth() + 1;
  const year      = dutyDate.getFullYear();

  const config = await prisma.calendarConfig.findUnique({
    where: { config_month_config_year: { config_month: month, config_year: year } },
  });
  const maxAllowed = config?.max_cover_requests_per_slot ?? 3;

  const cfg = await settingsService.getSettings();
  const coverTtlMs = cfg.cover_ttl_hours * 60 * 60 * 1000;

  try {
    const coverRequest = await prisma.$transaction(async (tx) => {
      // Check open count inside transaction to prevent race conditions
      const openCount = await tx.coverRequest.count({
        where: { duty_slot_id, status: 'open' },
      });

      if (openCount >= maxAllowed) {
        throw {
          code: 'MAX_REQUESTS_REACHED',
          message: `This slot already has the maximum number of open cover requests (${maxAllowed}).`,
        };
      }

      // Create the cover request atomically
      const newRequest = await tx.coverRequest.create({
        data: {
          duty_slot_id,
          requested_by: req.user.id,
          reason: reason ?? null,
          expires_at: new Date(Date.now() + coverTtlMs),
        },
        include: COVER_INCLUDE,
      });

      // Update slot status atomically
      await tx.dutySlot.update({
        where: { id: duty_slot_id },
        data: { status: 'cover_pending' },
      });

      return newRequest;
    });

    res.status(201).json(coverRequest);
  } catch (err) {
    // Handle Prisma P2002 unique constraint violation (duplicate open request)
    if (err.code === 'P2002') {
      return res.status(409).json({
        error: true,
        code: 'COVER_REQUEST_EXISTS',
        message: 'An open cover request already exists for this duty slot.',
      });
    }

    // Handle transaction-thrown validation errors
    if (err.code === 'MAX_REQUESTS_REACHED') {
      return res.status(409).json({
        error: true,
        code: 'MAX_REQUESTS_REACHED',
        message: err.message,
      });
    }

    throw err;
  }
}

// ─── GET /cover-requests — Admin ──────────────────────────────────────────────

async function listCoverRequests(req, res) {
  const { status, faculty_id, year, month, page = '1', limit = '20' } = req.query;

  const pageNum  = Math.max(1, parseInt(page, 10)  || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

  const where = {};
  if (status)     where.status = status;
  if (faculty_id) where.requested_by = faculty_id;
  if (year && month) {
    const y = parseInt(year, 10);
    const m = parseInt(month, 10);
    where.dutySlot = {
      duty_date: {
        gte: new Date(y, m - 1, 1),
        lte: new Date(y, m, 0, 23, 59, 59, 999),
      },
    };
  }

  const [total, requests] = await Promise.all([
    prisma.coverRequest.count({ where }),
    prisma.coverRequest.findMany({
      where,
      include:  COVER_INCLUDE,
      orderBy:  { created_at: 'desc' },
      skip:     (pageNum - 1) * pageSize,
      take:     pageSize,
    }),
  ]);

  res.json({ data: requests, meta: { total, page: pageNum, limit: pageSize, pages: Math.ceil(total / pageSize) } });
}

// ─── GET /cover-requests/open — Faculty ───────────────────────────────────────

async function getOpenRequests(req, res) {
  const requests = await prisma.coverRequest.findMany({
    where: {
      status:      'open',
      expires_at:  { gt: new Date() },
      requested_by: { not: req.user.id }, // exclude own broadcasts
    },
    include:  COVER_INCLUDE,
    orderBy:  { created_at: 'desc' },
  });

  res.json({ data: requests, total: requests.length });
}

// ─── GET /cover-requests/my — Faculty ─────────────────────────────────────────

async function getMyCoverRequests(req, res) {
  const requests = await prisma.coverRequest.findMany({
    where: {
      OR: [
        { requested_by: req.user.id },
        { volunteer_id: req.user.id },
      ],
    },
    include:  COVER_INCLUDE,
    orderBy:  { created_at: 'desc' },
  });

  res.json({ data: requests, total: requests.length });
}

// ─── POST /cover-requests/:id/volunteer — Faculty ─────────────────────────────

async function volunteer(req, res) {
  const coverRequestId = req.params.id;

  try {
    const updated = await prisma.$transaction(async (tx) => {
      // Fetch cover request with full conditions for validation
      const coverRequest = await tx.coverRequest.findUnique({
        where: { id: coverRequestId },
        include: COVER_INCLUDE,
      });

      if (!coverRequest) {
        throw { code: 'NOT_FOUND', message: 'Cover request not found.', statusCode: 404 };
      }
      if (coverRequest.status !== 'open') {
        throw { code: 'NOT_OPEN', message: `This cover request is no longer open (status: ${coverRequest.status}).`, statusCode: 409 };
      }
      if (new Date() > coverRequest.expires_at) {
        throw { code: 'EXPIRED', message: 'This cover request has expired.', statusCode: 409 };
      }
      if (coverRequest.requested_by === req.user.id) {
        throw { code: 'CONFLICT', message: 'You cannot volunteer for your own cover request.', statusCode: 409 };
      }

      // Phase 3: Double-booking check - ensure volunteer doesn't already have a duty at this time
      const volunteerConflict = await tx.dutySlot.findFirst({
        where: {
          faculty_id: req.user.id,
          duty_date: coverRequest.dutySlot.duty_date,
          session_type: coverRequest.dutySlot.session_type,
          status: { not: 'absent' }, // Can't conflict if already absent
        },
      });
      if (volunteerConflict) {
        throw {
          code: 'DOUBLE_BOOKING',
          message: 'You already have a duty scheduled for this date and time.',
          statusCode: 409,
        };
      }

      // Phase 3: Atomic volunteer claim - use updateMany with full WHERE conditions
      const updateResult = await tx.coverRequest.updateMany({
        where: {
          id: coverRequestId,
          status: 'open',
          volunteer_id: null,
          expires_at: { gt: new Date() },
        },
        data: { volunteer_id: req.user.id },
      });

      if (updateResult.count === 0) {
        throw {
          code: 'ALREADY_VOLUNTEERED',
          message: 'Another faculty member has already volunteered or request no longer open.',
          statusCode: 409,
        };
      }

      // Fetch updated cover request
      const result = await tx.coverRequest.findUnique({
        where: { id: coverRequestId },
        include: COVER_INCLUDE,
      });

      return result;
    });

    res.json(updated);
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        error: true,
        code: err.code,
        message: err.message,
      });
    }
    throw err;
  }
}

// ─── PATCH /cover-requests/:id/confirm — Admin ────────────────────────────────

async function confirmCover(req, res) {
  const coverRequestId = req.params.id;

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const coverRequest = await tx.coverRequest.findUnique({
        where: { id: coverRequestId },
        include: COVER_INCLUDE,
      });

      if (!coverRequest) {
        throw { code: 'NOT_FOUND', message: 'Cover request not found.', statusCode: 404 };
      }
      if (coverRequest.status !== 'open') {
        throw { code: 'NOT_OPEN', message: `Cannot confirm — status is '${coverRequest.status}'.`, statusCode: 409 };
      }
      if (!coverRequest.volunteer_id) {
        throw { code: 'NO_VOLUNTEER', message: 'No volunteer has come forward yet.', statusCode: 409 };
      }

      // Phase 3: Double-booking check - ensure volunteer doesn't have another duty
      const volunteerConflict = await tx.dutySlot.findFirst({
        where: {
          faculty_id: coverRequest.volunteer_id,
          duty_date: coverRequest.dutySlot.duty_date,
          session_type: coverRequest.dutySlot.session_type,
          id: { not: coverRequest.duty_slot_id }, // Exclude the slot being covered
          status: { not: 'absent' },
        },
      });
      if (volunteerConflict) {
        throw {
          code: 'DOUBLE_BOOKING',
          message: 'Volunteer has a conflicting duty. Cannot confirm coverage.',
          statusCode: 409,
        };
      }

      // Update slot to covered
      await tx.dutySlot.update({
        where: { id: coverRequest.duty_slot_id },
        data: { status: 'covered', covered_by: coverRequest.volunteer_id },
      });

      // Update the confirmed cover request
      await tx.coverRequest.update({
        where: { id: coverRequestId },
        data: { status: 'covered', confirmed_by: req.user.id, confirmed_at: new Date() },
      });

      // Phase 3: Close sibling open requests for the same slot in same transaction
      await tx.coverRequest.updateMany({
        where: {
          duty_slot_id: coverRequest.duty_slot_id,
          id: { not: coverRequestId },
          status: 'open',
        },
        data: { status: 'cancelled' },
      });

      // Fetch and return updated cover request
      const result = await tx.coverRequest.findUnique({
        where: { id: coverRequestId },
        include: COVER_INCLUDE,
      });

      return result;
    });

    res.json(updated);
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        error: true,
        code: err.code,
        message: err.message,
      });
    }
    throw err;
  }
}

// ─── DELETE /cover-requests/:id — Faculty ────────────────────────────────────

async function cancelCoverRequest(req, res) {
  const coverRequestId = req.params.id;

  const coverRequest = await prisma.coverRequest.findUnique({ where: { id: coverRequestId } });

  if (!coverRequest) {
    return res.status(404).json({ error: true, code: 'NOT_FOUND', message: 'Cover request not found.' });
  }

  // Phase 3: Only requester can cancel, and only if status is still open
  if (coverRequest.requested_by !== req.user.id) {
    return res.status(403).json({ error: true, code: 'FORBIDDEN', message: 'Only the requester can cancel this cover request.' });
  }

  if (coverRequest.status !== 'open') {
    return res.status(409).json({ error: true, code: 'CANNOT_CANCEL', message: `Cannot cancel a cover request with status '${coverRequest.status}'.` });
  }

  const updated = await prisma.coverRequest.update({
    where: { id: coverRequestId },
    data: { status: 'cancelled' },
    include: COVER_INCLUDE,
  });

  res.json(updated);
}

// ─── POST /cover-requests/:id/reject-volunteer — Admin ────────────────────────

async function rejectVolunteer(req, res) {
  const coverRequestId = req.params.id;

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const coverRequest = await tx.coverRequest.findUnique({
        where: { id: coverRequestId },
        include: COVER_INCLUDE,
      });

      if (!coverRequest) {
        throw { code: 'NOT_FOUND', message: 'Cover request not found.', statusCode: 404 };
      }
      if (coverRequest.status !== 'open') {
        throw { code: 'INVALID_STATUS', message: `Cannot reject volunteer for status '${coverRequest.status}'.`, statusCode: 409 };
      }
      if (!coverRequest.volunteer_id) {
        throw { code: 'NO_VOLUNTEER', message: 'No volunteer to reject.', statusCode: 409 };
      }

      // Phase 3: Clear the volunteer, keeping request open for others
      const result = await tx.coverRequest.update({
        where: { id: coverRequestId },
        data: { volunteer_id: null },
        include: COVER_INCLUDE,
      });

      return result;
    });

    res.json(updated);
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        error: true,
        code: err.code,
        message: err.message,
      });
    }
    throw err;
  }
}

// ─── PATCH /cover-requests/config — Admin ─────────────────────────────────────

async function updateCoverConfig(req, res) {
  const { year, month, max_cover_requests_per_slot } = req.body;

  const config = await prisma.calendarConfig.upsert({
    where:  { config_month_config_year: { config_month: month, config_year: year } },
    update: { max_cover_requests_per_slot },
    create: { config_month: month, config_year: year, max_cover_requests_per_slot },
  });

  res.json(config);
}

module.exports = {
  createCoverRequest,
  listCoverRequests,
  getOpenRequests,
  getMyCoverRequests,
  volunteer,
  confirmCover,
  cancelCoverRequest,
  rejectVolunteer,
  updateCoverConfig,
};
