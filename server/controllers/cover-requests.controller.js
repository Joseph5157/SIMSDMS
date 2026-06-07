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

  const openCount = await prisma.coverRequest.count({
    where: { duty_slot_id, status: 'open' },
  });
  if (openCount >= maxAllowed) {
    return res.status(409).json({
      error: true,
      code: 'MAX_REQUESTS_REACHED',
      message: `This slot already has the maximum number of open cover requests (${maxAllowed}).`,
    });
  }

  const cfg = await settingsService.getSettings();
  const coverTtlMs = cfg.cover_ttl_hours * 60 * 60 * 1000;

  const coverRequest = await prisma.coverRequest.create({
    data: {
      duty_slot_id,
      requested_by: req.user.id,
      reason:       reason ?? null,
      expires_at:   new Date(Date.now() + coverTtlMs),
    },
    include: COVER_INCLUDE,
  });

  await prisma.dutySlot.update({
    where: { id: duty_slot_id },
    data:  { status: 'cover_pending' },
  });

  res.status(201).json(coverRequest);
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

  const updated = await prisma.coverRequest.update({
    where:   { id: req.params.id },
    data:    { volunteer_id: req.user.id },
    include: COVER_INCLUDE,
  });

  res.json(updated);
}

// ─── PATCH /cover-requests/:id/confirm — Admin ────────────────────────────────

async function confirmCover(req, res) {
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

  // Slot update runs first so the include in coverRequest sees the updated status
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
  ]);

  res.json(updated);
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
  updateCoverConfig,
};
