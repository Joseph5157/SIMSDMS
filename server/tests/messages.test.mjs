import { createRequire } from 'module';
const _require = createRequire(import.meta.url);

const prisma = _require('../lib/prisma');
const { sendMessage, getMessage, deleteMessage } = _require('../controllers/messages.controller');

function makeReq({ params = {}, body = {}, user = {} } = {}) {
  return { params, body, user };
}
function makeRes() {
  const res = { _status: 200, _body: null };
  res.status = (c) => { res._status = c; return res; };
  res.json   = (b) => { res._body = b; return res; };
  return res;
}

describe('sendMessage', () => {
  afterEach(() => vi.restoreAllMocks());

  it('rejects sending a message to yourself (400)', async () => {
    const res = makeRes();
    await sendMessage(makeReq({ body: { to_user_id: 'f1' }, user: { id: 'f1', role: 'faculty' } }), res);
    expect(res._status).toBe(400);
    expect(res._body.code).toBe('BAD_REQUEST');
  });

  it('returns 404 when the recipient does not exist or is inactive', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);
    const res = makeRes();
    await sendMessage(makeReq({ body: { to_user_id: 'ghost' }, user: { id: 'f1', role: 'faculty' } }), res);
    expect(res._status).toBe(404);
  });

  it('blocks faculty from messaging another faculty member (403)', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({ id: 'f2', role: 'faculty', status: 'active', deleted_at: null });
    const create = vi.spyOn(prisma.message, 'create');
    const res = makeRes();
    await sendMessage(makeReq({ body: { to_user_id: 'f2' }, user: { id: 'f1', role: 'faculty' } }), res);
    expect(res._status).toBe(403);
    expect(create).not.toHaveBeenCalled();
  });

  it('allows faculty to message an admin', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({ id: 'a1', role: 'admin', status: 'active', deleted_at: null });
    vi.spyOn(prisma.message, 'create').mockResolvedValue({ id: 'm1', from_user_id: 'f1', to_user_id: 'a1' });
    const res = makeRes();
    await sendMessage(makeReq({ body: { to_user_id: 'a1', subject: 'Hi', body: 'Hello' }, user: { id: 'f1', role: 'faculty' } }), res);
    expect(res._status).toBe(201);
  });

  it('allows admin to message a faculty member', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({ id: 'f1', role: 'faculty', status: 'active', deleted_at: null });
    vi.spyOn(prisma.message, 'create').mockResolvedValue({ id: 'm1', from_user_id: 'a1', to_user_id: 'f1' });
    const res = makeRes();
    await sendMessage(makeReq({ body: { to_user_id: 'f1', subject: 'Hi', body: 'Hello' }, user: { id: 'a1', role: 'admin' } }), res);
    expect(res._status).toBe(201);
  });
});

describe('getMessage', () => {
  afterEach(() => vi.restoreAllMocks());

  const baseMessage = {
    id: 'm1', from_user_id: 'a1', to_user_id: 'f1',
    is_read: false, read_at: null,
    deleted_by_sender: false, deleted_by_receiver: false,
  };

  it('returns 403 when the caller is neither sender nor receiver', async () => {
    vi.spyOn(prisma.message, 'findUnique').mockResolvedValue(baseMessage);
    const res = makeRes();
    await getMessage(makeReq({ params: { id: 'm1' }, user: { id: 'outsider' } }), res);
    expect(res._status).toBe(403);
  });

  it("returns 404 when the receiver soft-deleted it from their own view", async () => {
    vi.spyOn(prisma.message, 'findUnique').mockResolvedValue({ ...baseMessage, deleted_by_receiver: true });
    const res = makeRes();
    await getMessage(makeReq({ params: { id: 'm1' }, user: { id: 'f1' } }), res);
    expect(res._status).toBe(404);
  });

  it('marks an unread message as read when the receiver views it', async () => {
    vi.spyOn(prisma.message, 'findUnique').mockResolvedValue({ ...baseMessage });
    const update = vi.spyOn(prisma.message, 'update').mockResolvedValue({});
    const res = makeRes();
    await getMessage(makeReq({ params: { id: 'm1' }, user: { id: 'f1' } }), res);

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'm1' }, data: expect.objectContaining({ is_read: true }) }),
    );
    expect(res._body.is_read).toBe(true);
  });

  it('does not re-mark an already-read message, or touch it when the sender views it', async () => {
    vi.spyOn(prisma.message, 'findUnique').mockResolvedValue({ ...baseMessage, is_read: true });
    const update = vi.spyOn(prisma.message, 'update');
    const res = makeRes();
    await getMessage(makeReq({ params: { id: 'm1' }, user: { id: 'a1' } }), res);

    expect(update).not.toHaveBeenCalled();
    expect(res._status).toBe(200);
  });
});

// Exercises the constitution's one documented physical-delete exception
// outside Super Admin hard-delete: a message row is only ever really removed
// once BOTH parties have dismissed it from their own view.
describe('deleteMessage', () => {
  afterEach(() => vi.restoreAllMocks());

  const baseMessage = { id: 'm1', from_user_id: 'a1', to_user_id: 'f1', deleted_by_sender: false, deleted_by_receiver: false };

  it("soft-deletes from the sender's view only, without physically deleting", async () => {
    vi.spyOn(prisma.message, 'findUnique').mockResolvedValue(baseMessage);
    vi.spyOn(prisma.message, 'update').mockResolvedValue({ ...baseMessage, deleted_by_sender: true });
    const hardDelete = vi.spyOn(prisma.message, 'delete');

    const res = makeRes();
    await deleteMessage(makeReq({ params: { id: 'm1' }, user: { id: 'a1' } }), res);

    expect(prisma.message.update).toHaveBeenCalledWith({ where: { id: 'm1' }, data: { deleted_by_sender: true } });
    expect(hardDelete).not.toHaveBeenCalled();
    expect(res._status).toBe(200);
  });

  it('physically deletes the row once both sender and receiver have dismissed it', async () => {
    vi.spyOn(prisma.message, 'findUnique').mockResolvedValue({ ...baseMessage, deleted_by_sender: true });
    vi.spyOn(prisma.message, 'update').mockResolvedValue({ ...baseMessage, deleted_by_sender: true, deleted_by_receiver: true });
    const hardDelete = vi.spyOn(prisma.message, 'delete').mockResolvedValue({});

    const res = makeRes();
    // Receiver deletes second, tipping both flags true.
    await deleteMessage(makeReq({ params: { id: 'm1' }, user: { id: 'f1' } }), res);

    expect(hardDelete).toHaveBeenCalledWith({ where: { id: 'm1' } });
  });

  it('returns 403 when the caller is neither sender nor receiver', async () => {
    vi.spyOn(prisma.message, 'findUnique').mockResolvedValue(baseMessage);
    const update = vi.spyOn(prisma.message, 'update');
    const res = makeRes();
    await deleteMessage(makeReq({ params: { id: 'm1' }, user: { id: 'outsider' } }), res);
    expect(res._status).toBe(403);
    expect(update).not.toHaveBeenCalled();
  });
});
