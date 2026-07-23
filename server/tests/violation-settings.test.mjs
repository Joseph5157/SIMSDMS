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
  trend_stable_band_pct: 10,
  // Fields outside these two — must never leak through this endpoint
  // (unrelated to the duty-timing surface).
  session_start_morning_hour: 8,
};

describe('getViolationSettings', () => {
  afterEach(() => vi.restoreAllMocks());

  it('exposes the counselling threshold and trend stable-band, never other system_config fields', async () => {
    vi.spyOn(settingsService, 'getSettings').mockResolvedValue(currentSettings);
    const res = makeRes();
    await getViolationSettings(makeReq(), res);

    expect(res._status).toBe(200);
    expect(res._body).toEqual({ repeat_violation_threshold: 4, trend_stable_band_pct: 10 });
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

  it('persists the new threshold and returns both fields', async () => {
    const body = { repeat_violation_threshold: 2 };
    const res = makeRes();
    await updateViolationSettings(makeReq(body), res);

    expect(settingsService.updateSettings).toHaveBeenCalledWith(body, 'admin-1');
    expect(res._status).toBe(200);
    expect(res._body).toEqual({ repeat_violation_threshold: 2, trend_stable_band_pct: 10 });
  });

  it('can update the trend stable-band independently of the repeat-violation threshold', async () => {
    const body = { trend_stable_band_pct: 15 };
    const updatedBandRow = { ...currentSettings, trend_stable_band_pct: 15 };
    settingsService.updateSettings.mockResolvedValue(updatedBandRow);

    const res = makeRes();
    await updateViolationSettings(makeReq(body), res);

    expect(settingsService.updateSettings).toHaveBeenCalledWith(body, 'admin-1');
    expect(res._body).toEqual({ repeat_violation_threshold: 4, trend_stable_band_pct: 15 });
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
