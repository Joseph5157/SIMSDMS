import { createRequire } from 'module';
const _require = createRequire(import.meta.url);

const prisma          = _require('../lib/prisma');
const settingsService  = _require('../services/settings.service');
const { getDutyTimingSettings, updateDutyTimingSettings } = _require('../controllers/duty-timing-settings.controller');

function makeReq(body = {}, user = { id: 'admin-1', role: 'admin' }) {
  return { body, user };
}
function makeRes() {
  const r = { _status: 200, _body: null };
  r.status = (c) => { r._status = c; return r; };
  r.json   = (b) => { r._body = b; return r; };
  return r;
}

// Valid, in-order baseline (matches admin-settings.test.mjs's convention):
// 8:00 < 8:15 ≤ 16:30 / 13:00 < 13:15 ≤ 16:30.
const currentSettings = {
  id: 'cfg-1',
  session_start_morning_hour:    8,  session_start_morning_min:    0,
  session_start_afternoon_hour:  13, session_start_afternoon_min:  0,
  late_threshold_morning_hour:   8,  late_threshold_morning_min:   15,
  late_threshold_afternoon_hour: 13, late_threshold_afternoon_min: 15,
  auto_checkout_morning_hour:    16, auto_checkout_morning_min:    30,
  auto_checkout_afternoon_hour:  16, auto_checkout_afternoon_min:  30,
  // Fields outside the 12 exposed timing fields — must never leak through
  // this endpoint (that's the Super-Admin-only /admin/settings surface).
  some_other_system_config_field: 'secret',
};

describe('getDutyTimingSettings', () => {
  afterEach(() => vi.restoreAllMocks());

  it('exposes only the 12 timing fields, never other system_config fields', async () => {
    vi.spyOn(settingsService, 'getSettings').mockResolvedValue(currentSettings);
    const res = makeRes();
    await getDutyTimingSettings(makeReq(), res);

    expect(res._status).toBe(200);
    expect(res._body).not.toHaveProperty('id');
    expect(res._body).not.toHaveProperty('some_other_system_config_field');
    expect(res._body).toEqual({
      session_start_morning_hour:    8,  session_start_morning_min:    0,
      session_start_afternoon_hour:  13, session_start_afternoon_min:  0,
      late_threshold_morning_hour:   8,  late_threshold_morning_min:   15,
      late_threshold_afternoon_hour: 13, late_threshold_afternoon_min: 15,
      auto_checkout_morning_hour:    16, auto_checkout_morning_min:    30,
      auto_checkout_afternoon_hour:  16, auto_checkout_afternoon_min:  30,
    });
  });
});

describe('updateDutyTimingSettings', () => {
  const updatedRow = { ...currentSettings, auto_checkout_morning_hour: 17, auto_checkout_morning_min: 0 };

  beforeEach(() => {
    vi.spyOn(settingsService, 'getSettings').mockResolvedValue(currentSettings);
    vi.spyOn(settingsService, 'updateSettings').mockResolvedValue(updatedRow);
    vi.spyOn(prisma.adminAuditLog, 'create').mockResolvedValue({});
  });
  afterEach(() => vi.restoreAllMocks());

  it('persists a valid change and returns only the picked timing fields', async () => {
    const body = { auto_checkout_morning_hour: 17, auto_checkout_morning_min: 0 };
    const res = makeRes();
    await updateDutyTimingSettings(makeReq(body), res);

    expect(settingsService.updateSettings).toHaveBeenCalledWith(body, 'admin-1');
    expect(res._status).toBe(200);
    expect(res._body.auto_checkout_morning_hour).toBe(17);
    expect(res._body).not.toHaveProperty('some_other_system_config_field');
  });

  it('writes a DUTY_TIMING_SETTINGS_UPDATE audit log entry', async () => {
    const body = { auto_checkout_morning_hour: 17, auto_checkout_morning_min: 0 };
    await updateDutyTimingSettings(makeReq(body), makeRes());

    expect(prisma.adminAuditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actor_id: 'admin-1',
        action: 'DUTY_TIMING_SETTINGS_UPDATE',
        target_id: updatedRow.id,
        target_type: 'system_config',
        metadata: body,
      }),
    });
  });

  it('rejects an out-of-order PATCH (422) via the shared ordering check, without persisting', async () => {
    // Pushes morning auto_checkout before both session_start and late_threshold.
    const body = { auto_checkout_morning_hour: 7, auto_checkout_morning_min: 0 };
    const res = makeRes();
    await updateDutyTimingSettings(makeReq(body), res);

    expect(res._status).toBe(422);
    expect(res._body.code).toBe('VALIDATION_ERROR');
    expect(settingsService.updateSettings).not.toHaveBeenCalled();
    expect(prisma.adminAuditLog.create).not.toHaveBeenCalled();
  });
});
