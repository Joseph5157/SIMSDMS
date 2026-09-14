import { createRequire } from 'module';
const _require = createRequire(import.meta.url);

const prisma = _require('../lib/prisma');
const { editViolation, createViolation } = _require('../controllers/violations.controller');

function makeReq({ params = {}, body = {}, user = {} } = {}) {
  return { params, body, user };
}
function makeRes() {
  const res = { _status: 200, _body: null };
  res.status = (c) => { res._status = c; return res; };
  res.json = (b) => { res._body = b; return res; };
  return res;
}

describe('editViolation', () => {
  const ownViolation = {
    id: 'v-1',
    faculty_id: 'f1',
    deleted_at: null,
    is_flagged: false,
    custom_violation: null,
    fine_amount: '100',
    is_warning_only: false,
    remarks: 'original remarks',
    record_status: 'active',
    flag_note: null,
  };

  beforeEach(() => {
    vi.spyOn(prisma.violation, 'findUnique').mockResolvedValue(null);
    vi.spyOn(prisma.violation, 'update').mockResolvedValue(null);
    vi.spyOn(prisma.violationAuditLog, 'create').mockResolvedValue(null);
  });
  afterEach(() => vi.restoreAllMocks());

  it('allows the owning faculty to edit their own unflagged violation', async () => {
    prisma.violation.findUnique.mockResolvedValue(ownViolation);
    prisma.violation.update.mockResolvedValue({ ...ownViolation, remarks: 'updated remarks' });

    const req = makeReq({
      params: { id: ownViolation.id },
      body: { remarks: 'updated remarks' },
      user: { id: 'f1', role: 'faculty' },
    });
    const res = makeRes();
    await editViolation(req, res);

    expect(res._status).toBe(200);
    expect(prisma.violation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: ownViolation.id },
        data: expect.objectContaining({ remarks: 'updated remarks' }),
      }),
    );
  });

  it('rejects editing a violation that has already been flagged — 409, no data changes', async () => {
    prisma.violation.findUnique.mockResolvedValue({ ...ownViolation, is_flagged: true });

    const req = makeReq({
      params: { id: ownViolation.id },
      body: { remarks: 'trying to sneak an edit in' },
      user: { id: 'f1', role: 'faculty' },
    });
    const res = makeRes();
    await editViolation(req, res);

    expect(res._status).toBe(409);
    expect(res._body.code).toBe('ALREADY_FLAGGED');
    expect(prisma.violation.update).not.toHaveBeenCalled();
  });

  it("rejects a faculty editing another faculty's violation — 403, no data changes", async () => {
    prisma.violation.findUnique.mockResolvedValue({ ...ownViolation, faculty_id: 'other-faculty' });

    const req = makeReq({
      params: { id: ownViolation.id },
      body: { remarks: 'not mine to edit' },
      user: { id: 'f1', role: 'faculty' },
    });
    const res = makeRes();
    await editViolation(req, res);

    expect(res._status).toBe(403);
    expect(res._body.code).toBe('FORBIDDEN');
    expect(prisma.violation.update).not.toHaveBeenCalled();
  });
});

describe('createViolation', () => {
  const { nowInIST } = _require('../lib/time');

  // A duty_date that `isSlotToday` accepts as "today" regardless of when this
  // suite actually runs — built the same way the controller evaluates it
  // (IST calendar date), not a naive `new Date()` UTC truncation.
  function todayDutyDateUTC() {
    const ist = nowInIST();
    return new Date(Date.UTC(ist.year, ist.month - 1, ist.day));
  }
  function yesterdayDutyDateUTC() {
    const ist = nowInIST();
    return new Date(Date.UTC(ist.year, ist.month - 1, ist.day - 1));
  }

  const student = { id: 's1', deleted_at: null, status: 'active' };
  const violationType = { id: 'vt1', name: 'Late Entry', is_active: true, default_fine: 100 };

  function mockTx({ createResult, auditError = null } = {}) {
    const created = createResult ?? {
      id: 'v-new', fine_amount: '100', is_warning_only: false,
      custom_violation: null, remarks: null, record_status: 'active',
      is_flagged: false, flag_note: null,
    };
    const tx = {
      violation:         { create: vi.fn().mockResolvedValue(created) },
      violationAuditLog: { create: auditError ? vi.fn().mockRejectedValue(auditError) : vi.fn().mockResolvedValue(null) },
    };
    prisma.$transaction.mockImplementationOnce(async (fn) => fn(tx));
    return tx;
  }

  beforeEach(() => {
    vi.spyOn(prisma.dutySlot, 'findUnique').mockResolvedValue(null);
    vi.spyOn(prisma.dutyAttendance, 'findUnique').mockResolvedValue(null);
    vi.spyOn(prisma.student, 'findUnique').mockResolvedValue(student);
    vi.spyOn(prisma.violationType, 'findUnique').mockResolvedValue(violationType);
    vi.spyOn(prisma, '$transaction');
  });
  afterEach(() => vi.restoreAllMocks());

  it('records the violation and its audit-log entry atomically for a faculty member actively checked in to today\'s slot', async () => {
    prisma.dutySlot.findUnique.mockResolvedValue({ id: 'slot-1', faculty_id: 'f1', duty_date: todayDutyDateUTC() });
    prisma.dutyAttendance.findUnique.mockResolvedValue({ in_time: new Date(), out_time: null });
    const tx = mockTx();

    const req = makeReq({
      body: { student_id: 's1', duty_slot_id: 'slot-1', violation_type_id: 'vt1', is_warning_only: false },
      user: { id: 'f1', role: 'faculty' },
    });
    const res = makeRes();
    await createViolation(req, res);

    expect(res._status).toBe(201);
    expect(tx.violation.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ duty_slot_id: 'slot-1', student_id: 's1' }) }),
    );
    expect(tx.violationAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ violation_id: 'v-new', change_type: 'created' }) }),
    );
  });

  it('rejects a faculty member who has a today slot but never checked in — 409 NOT_ON_DUTY, no transaction attempted', async () => {
    prisma.dutySlot.findUnique.mockResolvedValue({ id: 'slot-1', faculty_id: 'f1', duty_date: todayDutyDateUTC() });
    prisma.dutyAttendance.findUnique.mockResolvedValue(null);

    const req = makeReq({
      body: { student_id: 's1', duty_slot_id: 'slot-1', violation_type_id: 'vt1' },
      user: { id: 'f1', role: 'faculty' },
    });
    const res = makeRes();
    await createViolation(req, res);

    expect(res._status).toBe(409);
    expect(res._body.code).toBe('NOT_ON_DUTY');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects a faculty member who has already checked out of today\'s slot — 409 NOT_ON_DUTY', async () => {
    prisma.dutySlot.findUnique.mockResolvedValue({ id: 'slot-1', faculty_id: 'f1', duty_date: todayDutyDateUTC() });
    prisma.dutyAttendance.findUnique.mockResolvedValue({ in_time: new Date(), out_time: new Date() });

    const req = makeReq({
      body: { student_id: 's1', duty_slot_id: 'slot-1', violation_type_id: 'vt1' },
      user: { id: 'f1', role: 'faculty' },
    });
    const res = makeRes();
    await createViolation(req, res);

    expect(res._status).toBe(409);
    expect(res._body.code).toBe('NOT_ON_DUTY');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects a historical/non-today slot even though it still belongs to the faculty member — 409 NOT_ON_DUTY, attendance never checked', async () => {
    prisma.dutySlot.findUnique.mockResolvedValue({ id: 'slot-old', faculty_id: 'f1', duty_date: yesterdayDutyDateUTC() });

    const req = makeReq({
      body: { student_id: 's1', duty_slot_id: 'slot-old', violation_type_id: 'vt1' },
      user: { id: 'f1', role: 'faculty' },
    });
    const res = makeRes();
    await createViolation(req, res);

    expect(res._status).toBe(409);
    expect(res._body.code).toBe('NOT_ON_DUTY');
    expect(prisma.dutyAttendance.findUnique).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('lets an admin record a violation with no duty slot at all, bypassing faculty eligibility', async () => {
    const tx = mockTx({ createResult: { id: 'v-admin', fine_amount: '100', is_warning_only: false, custom_violation: null, remarks: null, record_status: 'active', is_flagged: false, flag_note: null } });

    const req = makeReq({
      body: { student_id: 's1', violation_type_id: 'vt1' },
      user: { id: 'admin1', role: 'admin' },
    });
    const res = makeRes();
    await createViolation(req, res);

    expect(res._status).toBe(201);
    expect(prisma.dutySlot.findUnique).not.toHaveBeenCalled();
    expect(tx.violation.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ duty_slot_id: null, faculty_id: 'admin1' }) }),
    );
  });

  it('never reports success when the audit-log write inside the transaction fails', async () => {
    prisma.dutySlot.findUnique.mockResolvedValue({ id: 'slot-1', faculty_id: 'f1', duty_date: todayDutyDateUTC() });
    prisma.dutyAttendance.findUnique.mockResolvedValue({ in_time: new Date(), out_time: null });
    mockTx({ auditError: new Error('audit insert failed') });

    const req = makeReq({
      body: { student_id: 's1', duty_slot_id: 'slot-1', violation_type_id: 'vt1' },
      user: { id: 'f1', role: 'faculty' },
    });
    const res = makeRes();

    await expect(createViolation(req, res)).rejects.toThrow('audit insert failed');
    // The transaction rejected before createViolation ever reached res.json(201) —
    // the caller (asyncHandler) sees a failed request, matching the fact that a
    // real interactive $transaction rolls the violation row back too.
    expect(res._status).toBe(200);
    expect(res._body).toBeNull();
  });
});
