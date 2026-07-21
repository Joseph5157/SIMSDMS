import { createRequire } from 'module';
const _require = createRequire(import.meta.url);

const prisma          = _require('../lib/prisma');
const settingsService = _require('../services/settings.service');
const { getViolationSettings, updateViolationSettings } = _require('../controllers/violation-settings.controller');

function makeReq(body = {}, user = { id: 'admin-1', role: 'admin' }) {
  return { body, user };
}
function makeRes() {
  const r = { _status: 200, _body: null };
  r.status = (c) => { r._status = c; return r; };
  r.json   = (b) => { r._body = b; return r; };
  return r;
}

const currentSettings = {
  id: 'cfg-1',
  repeat_violation_threshold: 4,
  // Fields outside repeat_violation_threshold — must never leak through this
  // endpoint (unrelated to the duty-timing surface).
  session_start_morning_hour: 8,
};

describe('getViolationSettings', () => {
  afterEach(() => vi.restoreAllMocks());

  it('exposes only the counselling threshold, never other system_config fields', async () => {
    vi.spyOn(settingsService, 'getSettings').mockResolvedValue(currentSettings);
    const res = makeRes();
    await getViolationSettings(makeReq(), res);

    expect(res._status).toBe(200);
    expect(res._body).toEqual({ repeat_violation_threshold: 4 });
    expect(res._body).not.toHaveProperty('id');
    expect(res._body).not.toHaveProperty('session_start_morning_hour');
  });
});

describe('updateViolationSettings', () => {
  const updatedRow = { ...currentSettings, repeat_violation_threshold: 2 };

  beforeEach(() => {
    vi.spyOn(settingsService, 'updateSettings').mockResolvedValue(updatedRow);
    vi.spyOn(prisma.adminAuditLog, 'create').mockResolvedValue({});
  });
  afterEach(() => vi.restoreAllMocks());

  it('persists the new threshold and returns only the picked field', async () => {
    const body = { repeat_violation_threshold: 2 };
    const res = makeRes();
    await updateViolationSettings(makeReq(body), res);

    expect(settingsService.updateSettings).toHaveBeenCalledWith(body, 'admin-1');
    expect(res._status).toBe(200);
    expect(res._body).toEqual({ repeat_violation_threshold: 2 });
  });

  it('writes a VIOLATION_SETTINGS_UPDATE audit log entry', async () => {
    const body = { repeat_violation_threshold: 2 };
    await updateViolationSettings(makeReq(body), makeRes());

    expect(prisma.adminAuditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actor_id:    'admin-1',
        action:      'VIOLATION_SETTINGS_UPDATE',
        target_id:   updatedRow.id,
        target_type: 'system_config',
        metadata:    body,
      }),
    });
  });
});
