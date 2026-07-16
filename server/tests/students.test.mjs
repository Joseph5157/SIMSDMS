import { createRequire } from 'module';
const _require = createRequire(import.meta.url);

const prisma = _require('../lib/prisma');
const {
  promoteStudent, deleteStudent, bulkPromoteStudents, bulkDeleteStudents,
} = _require('../controllers/students.controller');

function makeReq({ params = {}, body = {}, user = { id: 'admin-1', role: 'admin' } } = {}) {
  return { params, body, user };
}
function makeRes() {
  const res = { _status: 200, _body: null };
  res.status = (c) => { res._status = c; return res; };
  res.json   = (b) => { res._body = b; return res; };
  return res;
}

describe('promoteStudent', () => {
  afterEach(() => vi.restoreAllMocks());

  it('promotes an existing student and logs the action', async () => {
    vi.spyOn(prisma.student, 'findUnique').mockResolvedValue({
      id: 's1', deleted_at: null, year: 1, semester: 1, academic_year: '2025-26',
    });
    vi.spyOn(prisma.student, 'update').mockResolvedValue({ id: 's1', year: 2, semester: 1 });
    vi.spyOn(prisma.adminAuditLog, 'create').mockResolvedValue(null);

    const res = makeRes();
    await promoteStudent(makeReq({ params: { id: 's1' }, body: { year: 2, semester: 1 } }), res);

    expect(res._status).toBe(200);
    expect(prisma.student.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 's1' },
        data:  expect.objectContaining({ year: 2, semester: 1, semester_or_year: 'Year 2 Sem 1' }),
      }),
    );
  });

  it('returns 404 for a soft-deleted student', async () => {
    vi.spyOn(prisma.student, 'findUnique').mockResolvedValue({ id: 's1', deleted_at: new Date() });
    const update = vi.spyOn(prisma.student, 'update');

    const res = makeRes();
    await promoteStudent(makeReq({ params: { id: 's1' }, body: { year: 2, semester: 1 } }), res);

    expect(res._status).toBe(404);
    expect(update).not.toHaveBeenCalled();
  });
});

describe('deleteStudent', () => {
  afterEach(() => vi.restoreAllMocks());

  it('hard-deletes a student with no violation history', async () => {
    vi.spyOn(prisma.student, 'findUnique').mockResolvedValue({ id: 's1', student_name: 'A', registration_number: 'R1' });
    vi.spyOn(prisma.violation, 'count').mockResolvedValue(0);
    const del = vi.spyOn(prisma.student, 'delete').mockResolvedValue({});
    vi.spyOn(prisma.adminAuditLog, 'create').mockResolvedValue(null);

    const res = makeRes();
    await deleteStudent(makeReq({ params: { id: 's1' } }), res);

    expect(res._status).toBe(200);
    expect(res._body.deleted).toBe(true);
    expect(del).toHaveBeenCalledWith({ where: { id: 's1' } });
  });

  it('blocks deletion (409) when the student has disciplinary records', async () => {
    vi.spyOn(prisma.student, 'findUnique').mockResolvedValue({ id: 's1', student_name: 'A', registration_number: 'R1' });
    vi.spyOn(prisma.violation, 'count').mockResolvedValue(2);
    const del = vi.spyOn(prisma.student, 'delete');

    const res = makeRes();
    await deleteStudent(makeReq({ params: { id: 's1' } }), res);

    expect(res._status).toBe(409);
    expect(res._body.code).toBe('HAS_VIOLATIONS');
    expect(del).not.toHaveBeenCalled();
  });

  it('returns 404 for a non-existent student', async () => {
    vi.spyOn(prisma.student, 'findUnique').mockResolvedValue(null);
    const res = makeRes();
    await deleteStudent(makeReq({ params: { id: 'missing' } }), res);
    expect(res._status).toBe(404);
  });
});

// Both bulk endpoints batch their existence/eligibility checks into a single
// findMany (+ groupBy for violations) instead of one findUnique/count per id —
// these tests assert that batched shape, not just the end result, since the
// whole point of the fix was eliminating N+1 round-trips (see students.controller.js).
describe('bulkPromoteStudents', () => {
  afterEach(() => vi.restoreAllMocks());

  function tx({ found = [], updateCount = 0 }) {
    vi.spyOn(prisma, '$transaction').mockImplementationOnce(async (fn) => fn({
      student: {
        findMany:   vi.fn().mockResolvedValue(found),
        updateMany: vi.fn().mockResolvedValue({ count: updateCount }),
      },
    }));
  }

  it('promotes every found student in a single updateMany call, skips the rest', async () => {
    let capturedTx;
    vi.spyOn(prisma, '$transaction').mockImplementationOnce(async (fn) => {
      capturedTx = {
        student: {
          findMany:   vi.fn().mockResolvedValue([{ id: 's1' }, { id: 's2' }]),
          updateMany: vi.fn().mockResolvedValue({ count: 2 }),
        },
      };
      return fn(capturedTx);
    });
    vi.spyOn(prisma.adminAuditLog, 'create').mockResolvedValue(null);

    const res = makeRes();
    await bulkPromoteStudents(makeReq({
      body: { ids: ['s1', 's2', 's3'], year: 2, semester: 1, academic_year: '2026-27' },
    }), res);

    expect(res._status).toBe(200);
    expect(res._body.updated).toBe(2);
    expect(res._body.skipped).toEqual([{ id: 's3', reason: 'not found' }]);
    // One findMany to resolve eligibility, one updateMany to apply — never a
    // per-id call.
    expect(capturedTx.student.findMany).toHaveBeenCalledTimes(1);
    expect(capturedTx.student.updateMany).toHaveBeenCalledTimes(1);
    expect(capturedTx.student.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['s1', 's2'] } },
      data: expect.objectContaining({ year: 2, semester: 1, academic_year: '2026-27' }),
    });
  });

  it('skips every id and makes no updateMany call when none are found', async () => {
    tx({ found: [] });
    vi.spyOn(prisma.adminAuditLog, 'create').mockResolvedValue(null);

    const res = makeRes();
    await bulkPromoteStudents(makeReq({ body: { ids: ['s1'], year: 2, semester: 1 } }), res);

    expect(res._body.updated).toBe(0);
    expect(res._body.skipped).toEqual([{ id: 's1', reason: 'not found' }]);
  });
});

describe('bulkDeleteStudents', () => {
  afterEach(() => vi.restoreAllMocks());

  it('deletes clean students in one deleteMany, skips not-found and has-violations', async () => {
    let capturedTx;
    vi.spyOn(prisma, '$transaction').mockImplementationOnce(async (fn) => {
      capturedTx = {
        student: {
          findMany:   vi.fn().mockResolvedValue([{ id: 's1' }, { id: 's2' }, { id: 's3' }]),
          deleteMany: vi.fn().mockResolvedValue({ count: 2 }),
        },
        violation: {
          groupBy: vi.fn().mockResolvedValue([{ student_id: 's2', _count: 3 }]),
        },
      };
      return fn(capturedTx);
    });
    vi.spyOn(prisma.adminAuditLog, 'create').mockResolvedValue(null);

    const res = makeRes();
    await bulkDeleteStudents(makeReq({ body: { ids: ['s1', 's2', 's3', 's4'] } }), res);

    expect(res._status).toBe(200);
    expect(res._body.deleted).toBe(2);
    expect(res._body.skipped).toEqual(
      expect.arrayContaining([
        { id: 's4', reason: 'not found' },
        { id: 's2', reason: 'has disciplinary records' },
      ]),
    );
    expect(capturedTx.student.findMany).toHaveBeenCalledTimes(1);
    expect(capturedTx.violation.groupBy).toHaveBeenCalledTimes(1);
    expect(capturedTx.student.deleteMany).toHaveBeenCalledTimes(1);
    expect(capturedTx.student.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['s1', 's3'] } },
    });
  });

  it('makes no deleteMany call when every id is skipped', async () => {
    let capturedTx;
    vi.spyOn(prisma, '$transaction').mockImplementationOnce(async (fn) => {
      capturedTx = {
        student: {
          findMany:   vi.fn().mockResolvedValue([]),
          deleteMany: vi.fn(),
        },
        violation: {
          groupBy: vi.fn().mockResolvedValue([]),
        },
      };
      return fn(capturedTx);
    });
    vi.spyOn(prisma.adminAuditLog, 'create').mockResolvedValue(null);

    const res = makeRes();
    await bulkDeleteStudents(makeReq({ body: { ids: ['s1'] } }), res);

    expect(res._body.deleted).toBe(0);
    expect(res._body.skipped).toEqual([{ id: 's1', reason: 'not found' }]);
    expect(capturedTx.student.deleteMany).not.toHaveBeenCalled();
  });
});
