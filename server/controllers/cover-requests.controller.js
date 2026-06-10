const prisma = require('../lib/prisma');
const settingsService = require('../services/settings.service');
const logger = require('../lib/logger');
const telegram = require('../lib/telegram');

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

// Returns true when userId already has a duty assignment (as assigned faculty or
// confirmed cover) on the same duty_date + session_type as the given slot.
async function hasDutyConflict(userId, dutyDate, sessionType) {
  const conflict = await prisma.dutySlot.findFirst({
    where: {
      duty_date: dutyDate,
      session_type: sessionType,
      OR: [
        { faculty_id: userId },
        { covered_by: userId },
      ],
    },
  });
  return conflict !== null;
}

// Fire-and-forget Telegram broadcast to all active faculty except excludeId.
async function notifyFaculty(excludeId, text) {
  const faculty = await prisma.user.findMany({
    where: { role: 'faculty', status: 'active', deleted_at: null, telegram_id: { not: null }, id: { not: excludeId } },
    select: { id: true, telegram_id: true },
  });
  for (const f of faculty) {
    telegram.sendMessage(f.telegram_id, text).catch((err) => {
      logger.warn(`[cover-notify] Telegram failed for faculty ${f.id}: ${err.message}`);
    });
  }
}

// Fire-and-forget to a single user by userId.
async function notifyUser(userId, text) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { telegram_id: true } });
  if (!user?.telegram_id) return;
  telegram.sendMessage(user.telegram_id, text).catch((err) => {
    logger.warn(`[cover-notify] Telegram failed for user ${userId}: ${err.message}`);
  });
}

// ─── POST /cover-requests — Faculty ───────────────────────────────────────────

async function createCoverRequest(req, res) {
  try {
    const { duty_slot_id, reason } = req.body;

    const slot = await prisma.dutySlot.findUnique({ where: { id: duty_slot_id } });
    if (!slot || slot.faculty_id !== req.user.id) {
      return res.status(403).json({ error: true, code: 'FORBIDDEN', message: 'You can only post cover requests for your own duty slots.' });
    }

    if (['covered', 'absent'].includes(slot.status)) {
      return res.status(409).json({ error: true, code: 'CONFLICT', message: `Cannot post a cover request — slot status is already '${slot.status}'.` });
    }

    // Only one open broadcast per slot at a time. If one already exists (even
    // with a volunteer awaiting confirmation) block a second creation.
    const existing = await prisma.coverRequest.findFirst({
      where: { duty_slot_id, status: 'open' },
    });
    if (existing) {
      return res.status(409).json({
        error: true,
        code: 'COVER_REQUEST_EXISTS',
        message: 'An open cover request already exists for this slot. Cancel it before creating a new one.',
      });
    }

    const cfg = await settingsService.getSettings();
    const coverTtlMs = cfg.cover_ttl_hours * 60 * 60 * 1000;

    const coverRequest = await prisma.$transaction(async (tx) => {
      const cr = await tx.coverRequest.create({
        data: {
          duty_slot_id,
          requested_by: req.user.id,
          reason:       reason ?? null,
          expires_at:   new Date(Date.now() + coverTtlMs),
        },
        include: COVER_INCLUDE,
      });
      await tx.dutySlot.update({
        where: { id: duty_slot_id },
        data:  { status: 'cover_pending' },
      });
      return cr;
    });

    res.status(201).json(coverRequest);

    // Fire-and-forget broadcast — never block or fail the response
    const dutyDate = coverRequest.dutySlot.duty_date.toISOString().slice(0, 10);
    notifyFaculty(req.user.id,
      `📢 <b>Cover Request Broadcast</b>\n\n` +
      `<b>${coverRequest.requester.name}</b> needs cover for their duty slot.\n` +
      `📅 Date: <b>${dutyDate}</b> — ${coverRequest.dutySlot.session_type}\n\n` +
      `Log in to SIMS DMS to volunteer if you are available.`
    ).catch((err) => logger.warn(`[cover-notify] broadcast failed: ${err.message}`));
  } catch (err) {
    logger.error(`createCoverRequest error: ${err.message}`);
    res.status(500).json({ error: true, code: 'SERVER_ERROR', message: 'Something went wrong. Please try again.' });
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
      status:       'open',
      expires_at:   { gt: new Date() },
      requested_by: { not: req.user.id },
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
// Atomic via updateMany with a full WHERE clause so only one faculty member can
// claim the slot even under concurrent requests.

async function volunteer(req, res) {
  try {
    const coverRequest = await prisma.coverRequest.findUnique({
      where:   { id: req.params.id },
      include: COVER_INCLUDE,
    });

    if (!coverRequest) {
      return res.status(404).json({ error: true, code: 'NOT_FOUND', message: 'Cover request not found.' });
    }
    if (coverRequest.status !== 'open') {
      return res.status(409).json({ error: true, code: 'NOT_OPEN', message: `This cover request is no longer open (status: ${coverRequest.status}).` });
    }
    if (new Date() > coverRequest.expires_at) {
      return res.status(409).json({ error: true, code: 'EXPIRED', message: 'This cover request has expired.' });
    }
    if (coverRequest.requested_by === req.user.id) {
      return res.status(409).json({ error: true, code: 'CONFLICT', message: 'You cannot volunteer for your own cover request.' });
    }
    if (coverRequest.volunteer_id) {
      return res.status(409).json({ error: true, code: 'ALREADY_VOLUNTEERED', message: 'Another faculty member has already volunteered. Waiting for Admin confirmation.' });
    }

    // Double-booking: reject if the volunteer already has a duty at the same date + session.
    const conflict = await hasDutyConflict(
      req.user.id,
      coverRequest.dutySlot.duty_date,
      coverRequest.dutySlot.session_type,
    );
    if (conflict) {
      return res.status(409).json({
        error: true,
        code: 'DOUBLE_BOOKING',
        message: 'You already have a duty assignment at the same date and session.',
      });
    }

    // Atomic claim: the WHERE conditions ensure only one concurrent winner.
    const result = await prisma.coverRequest.updateMany({
      where: {
        id:           req.params.id,
        status:       'open',
        volunteer_id: null,
        expires_at:   { gt: new Date() },
      },
      data: { volunteer_id: req.user.id },
    });

    if (result.count === 0) {
      // Lost the race — fetch current state to give a specific reason.
      const fresh = await prisma.coverRequest.findUnique({ where: { id: req.params.id } });
      if (!fresh) {
        return res.status(404).json({ error: true, code: 'NOT_FOUND', message: 'Cover request not found.' });
      }
      if (fresh.volunteer_id) {
        return res.status(409).json({ error: true, code: 'ALREADY_VOLUNTEERED', message: 'Another faculty member volunteered at the same moment.' });
      }
      if (fresh.expires_at <= new Date()) {
        return res.status(409).json({ error: true, code: 'EXPIRED', message: 'This cover request expired.' });
      }
      return res.status(409).json({ error: true, code: 'CONFLICT', message: 'Could not claim the cover request. Please try again.' });
    }

    const updated = await prisma.coverRequest.findUnique({
      where:   { id: req.params.id },
      include: COVER_INCLUDE,
    });
    res.json(updated);

    // Notify requester that someone volunteered — fire-and-forget
    const dutyDate = updated.dutySlot.duty_date.toISOString().slice(0, 10);
    notifyUser(coverRequest.requested_by,
      `✋ <b>Volunteer for Your Cover Request</b>\n\n` +
      `<b>${updated.volunteer?.name ?? 'A faculty member'}</b> has volunteered to cover your duty on ` +
      `<b>${dutyDate}</b> (${updated.dutySlot.session_type}).\n\n` +
      `An admin will confirm the arrangement shortly.`
    ).catch((err) => logger.warn(`[cover-notify] volunteer notify failed: ${err.message}`));
  } catch (err) {
    logger.error(`volunteer error: ${err.message}`);
    res.status(500).json({ error: true, code: 'SERVER_ERROR', message: 'Something went wrong. Please try again.' });
  }
}

// ─── PATCH /cover-requests/:id/confirm — Admin ────────────────────────────────

async function confirmCover(req, res) {
  try {
    const coverRequest = await prisma.coverRequest.findUnique({
      where:   { id: req.params.id },
      include: COVER_INCLUDE,
    });

    if (!coverRequest) {
      return res.status(404).json({ error: true, code: 'NOT_FOUND', message: 'Cover request not found.' });
    }
    if (coverRequest.status !== 'open') {
      return res.status(409).json({ error: true, code: 'NOT_OPEN', message: `Cannot confirm — status is '${coverRequest.status}'.` });
    }
    if (!coverRequest.volunteer_id) {
      return res.status(409).json({ error: true, code: 'NO_VOLUNTEER', message: 'No volunteer has come forward yet.' });
    }

    // Re-check double-booking in case the volunteer picked up another slot since volunteering.
    const conflict = await hasDutyConflict(
      coverRequest.volunteer_id,
      coverRequest.dutySlot.duty_date,
      coverRequest.dutySlot.session_type,
    );
    if (conflict) {
      return res.status(409).json({
        error: true,
        code: 'VOLUNTEER_CONFLICT',
        message: 'The volunteer now has a scheduling conflict. Reject this volunteer so another faculty member can step forward.',
      });
    }

    // Atomic confirmation:
    //   1. Update the duty slot (covered_by + status).
    //   2. Mark this cover request as covered.
    //   3. Cancel any other open requests for the same slot (edge-case cleanup).
    const [, updated] = await prisma.$transaction([
      prisma.dutySlot.update({
        where: { id: coverRequest.duty_slot_id },
        data:  { status: 'covered', covered_by: coverRequest.volunteer_id },
      }),
      prisma.coverRequest.update({
        where:   { id: req.params.id },
        data:    { status: 'covered', confirmed_by: req.user.id, confirmed_at: new Date() },
        include: COVER_INCLUDE,
      }),
      prisma.coverRequest.updateMany({
        where: {
          duty_slot_id: coverRequest.duty_slot_id,
          id:           { not: req.params.id },
          status:       'open',
        },
        data: { status: 'cancelled' },
      }),
    ]);

    res.json(updated);

    // Notify requester and volunteer that cover is confirmed — fire-and-forget
    const dutyDate = updated.dutySlot.duty_date.toISOString().slice(0, 10);
    const msg = `✅ <b>Cover Confirmed</b>\n\nCoverage for duty on <b>${dutyDate}</b> (${updated.dutySlot.session_type}) has been confirmed by the admin.`;
    notifyUser(coverRequest.requested_by, msg).catch((err) => logger.warn(`[cover-notify] confirm notify failed: ${err.message}`));
    notifyUser(coverRequest.volunteer_id,  msg).catch((err) => logger.warn(`[cover-notify] confirm notify failed: ${err.message}`));
  } catch (err) {
    logger.error(`confirmCover error: ${err.message}`);
    res.status(500).json({ error: true, code: 'SERVER_ERROR', message: 'Something went wrong. Please try again.' });
  }
}

// ─── PATCH /cover-requests/:id/cancel — Faculty (own) or Admin (any) ──────────
// Cancels an open cover request and reverts the duty slot back to scheduled.

async function cancelCoverRequest(req, res) {
  try {
    const coverRequest = await prisma.coverRequest.findUnique({
      where:   { id: req.params.id },
      include: COVER_INCLUDE,
    });

    if (!coverRequest) {
      return res.status(404).json({ error: true, code: 'NOT_FOUND', message: 'Cover request not found.' });
    }

    if (req.user.role === 'faculty' && coverRequest.requested_by !== req.user.id) {
      return res.status(403).json({ error: true, code: 'FORBIDDEN', message: 'You can only cancel your own cover requests.' });
    }

    if (coverRequest.status !== 'open') {
      return res.status(409).json({
        error: true,
        code: 'INVALID_STATE',
        message: `Cannot cancel a cover request with status '${coverRequest.status}'.`,
      });
    }

    const [, updated] = await prisma.$transaction([
      prisma.dutySlot.update({
        where: { id: coverRequest.duty_slot_id },
        data:  { status: 'scheduled' },
      }),
      prisma.coverRequest.update({
        where:   { id: req.params.id },
        data:    { status: 'cancelled' },
        include: COVER_INCLUDE,
      }),
    ]);

    res.json(updated);
  } catch (err) {
    logger.error(`cancelCoverRequest error: ${err.message}`);
    res.status(500).json({ error: true, code: 'SERVER_ERROR', message: 'Something went wrong. Please try again.' });
  }
}

// ─── PATCH /cover-requests/:id/reject — Admin only ────────────────────────────
// Clears the current volunteer so the request is open for another faculty member
// to claim. Does not cancel the request.

async function rejectVolunteer(req, res) {
  try {
    const coverRequest = await prisma.coverRequest.findUnique({
      where:   { id: req.params.id },
      include: COVER_INCLUDE,
    });

    if (!coverRequest) {
      return res.status(404).json({ error: true, code: 'NOT_FOUND', message: 'Cover request not found.' });
    }
    if (coverRequest.status !== 'open') {
      return res.status(409).json({
        error: true,
        code: 'INVALID_STATE',
        message: `Cannot reject a volunteer on a request with status '${coverRequest.status}'.`,
      });
    }
    if (!coverRequest.volunteer_id) {
      return res.status(409).json({ error: true, code: 'NO_VOLUNTEER', message: 'There is no volunteer to reject.' });
    }

    const updated = await prisma.coverRequest.update({
      where:   { id: req.params.id },
      data:    { volunteer_id: null },
      include: COVER_INCLUDE,
    });

    res.json(updated);
  } catch (err) {
    logger.error(`rejectVolunteer error: ${err.message}`);
    res.status(500).json({ error: true, code: 'SERVER_ERROR', message: 'Something went wrong. Please try again.' });
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
