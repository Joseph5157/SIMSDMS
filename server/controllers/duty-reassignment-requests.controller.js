const prisma = require('../lib/prisma');
const logger = require('../lib/logger');
const telegram = require('../lib/telegram');
const { formatDateIST } = require('../lib/time');

// Faculty-to-faculty duty reassignment requests (Method 2, alongside the
// separate Admin Duty Reassignment in duty-slots.controller.js). A request
// only transfers the duty once the target faculty approves it — never
// automatically.

// Same eligibility window as the admin-controlled reassignment: only an
// upcoming, still-scheduled, un-attended duty can change hands.
function assertSlotReassignable(slot) {
  if (!slot) return { status: 404, code: 'NOT_FOUND', message: 'Duty slot not found.' };
  if (slot.status !== 'scheduled') {
    return { status: 409, code: 'SLOT_NOT_REASSIGNABLE', message: `This duty cannot be reassigned because its status is '${slot.status}'.` };
  }
  if (formatDateIST(slot.duty_date) < formatDateIST(new Date())) {
    return { status: 409, code: 'PAST_DUTY', message: 'This duty date has already passed and cannot be reassigned.' };
  }
  if (slot.attendance) {
    return { status: 409, code: 'ATTENDANCE_EXISTS', message: 'Attendance has already been recorded for this duty and it cannot be reassigned.' };
  }
  return null;
}

// ─── GET /duty-reassignment-requests/eligible-faculty/:dutySlotId ──────────
// Dropdown data source — active faculty, excluding the requester and anyone
// already holding a duty at the same date/session.

async function getEligibleFaculty(req, res) {
  const slot = await prisma.dutySlot.findUnique({ where: { id: req.params.dutySlotId } });
  if (!slot) {
    return res.status(404).json({ error: true, code: 'NOT_FOUND', message: 'Duty slot not found.' });
  }
  if (slot.faculty_id !== req.user.id) {
    return res.status(403).json({ error: true, code: 'FORBIDDEN', message: 'Not your duty slot.' });
  }

  const conflicting = await prisma.dutySlot.findMany({
    where: { duty_date: slot.duty_date, session_type: slot.session_type },
    select: { faculty_id: true },
  });
  const excludeIds = new Set([...conflicting.map((c) => c.faculty_id), req.user.id]);

  const faculty = await prisma.user.findMany({
    where: { role: 'faculty', status: 'active', deleted_at: null, id: { notIn: [...excludeIds] } },
    select: { id: true, name: true, department: true },
    orderBy: { name: 'asc' },
  });

  res.json({ data: faculty });
}

// ─── POST /duty-reassignment-requests ───────────────────────────────────────

async function createRequest(req, res) {
  const { duty_slot_id, to_faculty_id, reason } = req.body;
  const from_faculty_id = req.user.id;

  const slot = await prisma.dutySlot.findUnique({
    where: { id: duty_slot_id },
    include: { attendance: true },
  });

  if (!slot || slot.faculty_id !== from_faculty_id) {
    return res.status(403).json({ error: true, code: 'FORBIDDEN', message: 'Not authorized to request reassignment for this slot.' });
  }

  const guardErr = assertSlotReassignable(slot);
  if (guardErr) return res.status(guardErr.status).json({ error: true, code: guardErr.code, message: guardErr.message });

  if (to_faculty_id === from_faculty_id) {
    return res.status(422).json({ error: true, code: 'VALIDATION_ERROR', message: 'Cannot request reassignment to yourself.' });
  }

  const toFaculty = await prisma.user.findUnique({ where: { id: to_faculty_id } });
  if (!toFaculty || toFaculty.deleted_at || toFaculty.role !== 'faculty' || toFaculty.status !== 'active') {
    return res.status(404).json({ error: true, code: 'NOT_FOUND', message: 'Target faculty member not found or inactive.' });
  }

  const conflict = await prisma.dutySlot.findFirst({
    where: { faculty_id: to_faculty_id, duty_date: slot.duty_date, session_type: slot.session_type },
  });
  if (conflict) {
    return res.status(409).json({ error: true, code: 'CONFLICT', message: 'Target faculty already has a duty slot at this time.' });
  }

  const existingPending = await prisma.dutyReassignmentRequest.findFirst({
    where: { duty_slot_id, status: 'pending' },
  });
  if (existingPending) {
    return res.status(409).json({ error: true, code: 'REQUEST_EXISTS', message: 'A reassignment request for this duty is already pending.' });
  }

  let request;
  try {
    // The findFirst check above is a fast-path, not a guarantee — two
    // concurrent requests for the same slot can both pass it. The DB's
    // partial unique index (one pending row per duty_slot_id) is the real
    // guard; P2002 here means we lost that race.
    request = await prisma.dutyReassignmentRequest.create({
      data: { duty_slot_id, from_faculty_id, to_faculty_id, reason: reason || null },
      include: {
        fromFaculty: { select: { id: true, name: true, telegram_id: true } },
        toFaculty:   { select: { id: true, name: true, telegram_id: true } },
        dutySlot:    { select: { duty_date: true, session_type: true } },
      },
    });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: true, code: 'REQUEST_EXISTS', message: 'A reassignment request for this duty is already pending.' });
    }
    throw err;
  }

  res.status(201).json(request);

  // Fire-and-forget — never block/fail the response on a notification error.
  const dutyDate = formatDateIST(slot.duty_date);
  const sessionLabel = slot.session_type === 'morning' ? 'Morning' : 'Afternoon';
  if (request.toFaculty.telegram_id) {
    telegram.sendMessage(request.toFaculty.telegram_id,
      `🔄 <b>Duty Reassignment Request</b>\n\n${request.fromFaculty.name} asked you to take over their duty on <b>${dutyDate}</b> (${sessionLabel}).` +
      (reason ? `\nReason: ${reason}` : '') +
      `\n\nRespond below, or in the app.`,
      {
        reply_markup: {
          inline_keyboard: [[
            { text: '✅ Accept', callback_data: `rr:approved:${request.id}` },
            { text: '❌ Reject', callback_data: `rr:declined:${request.id}` },
          ]],
        },
      }
    ).catch((err) => logger.warn(`[reassign-request-notify] to-faculty notify failed: ${err.message}`));
  }
}

// ─── GET /duty-reassignment-requests — pending requests sent TO me ─────────

async function listPendingRequests(req, res) {
  const requests = await prisma.dutyReassignmentRequest.findMany({
    where: { to_faculty_id: req.user.id, status: 'pending' },
    include: {
      fromFaculty: { select: { id: true, name: true, email: true, department: true } },
      dutySlot:    { select: { duty_date: true, session_type: true } },
    },
    orderBy: { created_at: 'desc' },
  });
  res.json({ data: requests });
}

// ─── GET /duty-reassignment-requests/sent — requests I sent, any status ────

async function listSentRequests(req, res) {
  const requests = await prisma.dutyReassignmentRequest.findMany({
    where: { from_faculty_id: req.user.id },
    include: {
      toFaculty: { select: { id: true, name: true } },
      dutySlot:  { select: { id: true, duty_date: true, session_type: true } },
    },
    orderBy: { created_at: 'desc' },
    take: 50,
  });
  res.json({ data: requests });
}

// ─── Shared approve/decline logic ──────────────────────────────────────────
// Used by both the HTTP endpoint below and the Telegram inline Accept/Reject
// buttons (server/lib/bot.js), so the two entry points can never drift apart
// on eligibility checks, authorization, or what gets written to the DB.
// Returns { ok: true, data } or { ok: false, httpStatus, code, message }.

async function respondToRequestCore({ id, respondedById, status }) {
  if (!['approved', 'declined'].includes(status)) {
    return { ok: false, httpStatus: 422, code: 'VALIDATION_ERROR', message: 'Status must be "approved" or "declined".' };
  }

  const request = await prisma.dutyReassignmentRequest.findUnique({
    where: { id },
    include: {
      dutySlot:    { include: { attendance: true } },
      fromFaculty: { select: { id: true, name: true, telegram_id: true } },
      toFaculty:   { select: { id: true, name: true, telegram_id: true } },
    },
  });

  if (!request) {
    return { ok: false, httpStatus: 404, code: 'NOT_FOUND', message: 'Reassignment request not found.' };
  }
  if (request.to_faculty_id !== respondedById) {
    return { ok: false, httpStatus: 403, code: 'FORBIDDEN', message: 'Only the target faculty can respond to this request.' };
  }
  if (request.status !== 'pending') {
    return { ok: false, httpStatus: 409, code: 'CONFLICT', message: `Request has already been ${request.status}.` };
  }

  const RESPONSE_INCLUDE = {
    fromFaculty: { select: { id: true, name: true } },
    toFaculty:   { select: { id: true, name: true } },
    dutySlot:    { select: { id: true, duty_date: true, session_type: true } },
  };

  if (status === 'declined') {
    // Conditional on status = 'pending' so a concurrent responder (e.g. the
    // web app and a Telegram Accept/Reject tap landing at the same time)
    // can't both act on the same request — the initial findUnique above is
    // only a fast-path check, not a guarantee, since another writer could
    // land between that read and this write.
    const claim = await prisma.dutyReassignmentRequest.updateMany({
      where: { id, status: 'pending', to_faculty_id: respondedById },
      data: { status: 'declined', responded_by_id: respondedById, response_at: new Date() },
    });
    if (claim.count !== 1) {
      return { ok: false, httpStatus: 409, code: 'CONFLICT', message: 'Request has already been processed.' };
    }
    const updated = await prisma.dutyReassignmentRequest.findUnique({ where: { id }, include: RESPONSE_INCLUDE });

    if (request.fromFaculty.telegram_id) {
      const declinedSessionLabel = request.dutySlot.session_type === 'morning' ? 'Morning' : 'Afternoon';
      telegram.sendMessage(request.fromFaculty.telegram_id,
        `❌ <b>Reassignment Request Declined</b>\n\n${request.toFaculty.name} declined your request to take over your duty on <b>${formatDateIST(request.dutySlot.duty_date)}</b> (${declinedSessionLabel}).\n\nYou can request a different colleague from My Slots.`
      ).catch((err) => logger.warn(`[reassign-response-notify] decline notify failed: ${err.message}`));
    }
    return { ok: true, data: updated };
  }

  // Approving — re-check eligibility, since time may have passed between the
  // request being sent and now (the duty could have started, been attended,
  // or passed its date in the meantime).
  const guardErr = assertSlotReassignable(request.dutySlot);
  if (guardErr) return { ok: false, httpStatus: guardErr.status, code: guardErr.code, message: guardErr.message };

  // Same conditional-claim guard as decline, but the claim has to be the
  // first statement inside the same transaction as the duty transfer: an
  // array-form $transaction runs every statement unconditionally, so only
  // the interactive (callback) form lets us abort the whole transaction —
  // no slot transfer, no history row, no sibling auto-decline — when we
  // lose the race.
  let updatedRequest;
  try {
    updatedRequest = await prisma.$transaction(async (tx) => {
      const claim = await tx.dutyReassignmentRequest.updateMany({
        where: { id, status: 'pending', to_faculty_id: respondedById },
        data: { status: 'approved', responded_by_id: respondedById, response_at: new Date() },
      });
      if (claim.count !== 1) {
        const conflictErr = new Error('Request has already been processed.');
        conflictErr.code = 'ALREADY_PROCESSED';
        throw conflictErr;
      }

      await tx.dutySlot.update({
        where: { id: request.duty_slot_id },
        data:  { faculty_id: request.to_faculty_id },
      });
      await tx.dutyReassignment.create({
        data: {
          duty_slot_id:    request.duty_slot_id,
          from_faculty_id: request.from_faculty_id,
          to_faculty_id:   request.to_faculty_id,
          duty_date:       request.dutySlot.duty_date,
          session_type:    request.dutySlot.session_type,
          reason:          request.reason,
          reassigned_by:   respondedById,
        },
      });
      // The slot is spoken for now — any other pending request against it is moot.
      await tx.dutyReassignmentRequest.updateMany({
        where: { duty_slot_id: request.duty_slot_id, status: 'pending', id: { not: id } },
        data: { status: 'declined', responded_by_id: respondedById, response_at: new Date() },
      });

      return tx.dutyReassignmentRequest.findUnique({ where: { id }, include: RESPONSE_INCLUDE });
    });
  } catch (err) {
    if (err.code === 'ALREADY_PROCESSED') {
      return { ok: false, httpStatus: 409, code: 'CONFLICT', message: 'Request has already been processed.' };
    }
    throw err;
  }

  const dutyDate = formatDateIST(request.dutySlot.duty_date);
  const acceptedSessionLabel = request.dutySlot.session_type === 'morning' ? 'Morning' : 'Afternoon';
  if (request.fromFaculty.telegram_id) {
    telegram.sendMessage(request.fromFaculty.telegram_id,
      `✅ <b>Reassignment Accepted</b>\n\n${request.toFaculty.name} accepted your duty on <b>${dutyDate}</b> (${acceptedSessionLabel}). It has been transferred to them.`
    ).catch((err) => logger.warn(`[reassign-response-notify] from-faculty notify failed: ${err.message}`));
  }
  if (request.toFaculty.telegram_id) {
    telegram.sendMessage(request.toFaculty.telegram_id,
      `✅ <b>Duty Transferred to You</b>\n\nYou now own the duty on <b>${dutyDate}</b> (${acceptedSessionLabel}), originally assigned to ${request.fromFaculty.name}.`
    ).catch((err) => logger.warn(`[reassign-response-notify] to-faculty notify failed: ${err.message}`));
  }

  return { ok: true, data: updatedRequest };
}

// ─── PATCH /duty-reassignment-requests/:id — approve or decline ───────────

async function respondToRequest(req, res) {
  const result = await respondToRequestCore({
    id: req.params.id,
    respondedById: req.user.id,
    status: req.body.status, // 'approved' or 'declined'
  });

  if (!result.ok) {
    return res.status(result.httpStatus).json({ error: true, code: result.code, message: result.message });
  }
  res.json(result.data);
}

// ─── PATCH /duty-reassignment-requests/:id/cancel — requester withdraws their
// own still-pending sent request. Distinct from respondToRequest: that's the
// target faculty deciding; this is the sender changing their mind before
// anyone has responded. No slot/attendance re-check needed — nothing has
// transferred yet.

async function cancelRequest(req, res) {
  const request = await prisma.dutyReassignmentRequest.findUnique({
    where: { id: req.params.id },
    include: {
      dutySlot:    { select: { duty_date: true, session_type: true } },
      fromFaculty: { select: { id: true, name: true } },
      toFaculty:   { select: { id: true, name: true, telegram_id: true } },
    },
  });

  if (!request) {
    return res.status(404).json({ error: true, code: 'NOT_FOUND', message: 'Reassignment request not found.' });
  }
  if (request.from_faculty_id !== req.user.id) {
    return res.status(403).json({ error: true, code: 'FORBIDDEN', message: 'Only the requester can cancel this request.' });
  }
  if (request.status !== 'pending') {
    return res.status(409).json({ error: true, code: 'CONFLICT', message: `Request has already been ${request.status}.` });
  }

  // Conditional on status = 'pending' — guards the same race as
  // respondToRequestCore: the requester cancelling while the target
  // concurrently approves/declines the same request.
  const claim = await prisma.dutyReassignmentRequest.updateMany({
    where: { id: req.params.id, status: 'pending', from_faculty_id: req.user.id },
    data: { status: 'cancelled', responded_by_id: req.user.id, response_at: new Date() },
  });
  if (claim.count !== 1) {
    return res.status(409).json({ error: true, code: 'CONFLICT', message: 'Request has already been processed.' });
  }

  const updated = await prisma.dutyReassignmentRequest.findUnique({
    where: { id: req.params.id },
    include: {
      fromFaculty: { select: { id: true, name: true } },
      toFaculty:   { select: { id: true, name: true } },
      dutySlot:    { select: { id: true, duty_date: true, session_type: true } },
    },
  });

  res.json(updated);

  // Fire-and-forget — never block/fail the response on a notification error.
  if (request.toFaculty.telegram_id) {
    const sessionLabel = request.dutySlot.session_type === 'morning' ? 'Morning' : 'Afternoon';
    telegram.sendMessage(request.toFaculty.telegram_id,
      `🚫 <b>Reassignment Request Withdrawn</b>\n\n${request.fromFaculty.name} withdrew their request for you to take over their duty on <b>${formatDateIST(request.dutySlot.duty_date)}</b> (${sessionLabel}).`
    ).catch((err) => logger.warn(`[reassign-cancel-notify] to-faculty notify failed: ${err.message}`));
  }
}

module.exports = { createRequest, listPendingRequests, listSentRequests, respondToRequest, respondToRequestCore, getEligibleFaculty, cancelRequest };
