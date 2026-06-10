import { createRequire } from 'module';
const _require = createRequire(import.meta.url);

const prisma          = _require('../lib/prisma');
const settingsService = _require('../services/settings.service');
const { autoClockOut } = _require('../lib/cron');

const defaultSettings = { auto_checkout_hour: 16, auto_checkout_min: 30 };

describe('autoClockOut', () => {
  beforeEach(() => {
    vi.spyOn(prisma.dutyAttendance, 'findMany').mockResolvedValue([]);
    vi.spyOn(prisma.dutyAttendance, 'updateMany').mockResolvedValue({ count: 0 });
    vi.spyOn(prisma.dutySlot,       'updateMany').mockResolvedValue({ count: 0 });
    vi.spyOn(settingsService,       'getSettings').mockResolvedValue(defaultSettings);
  });
  afterEach(() => vi.restoreAllMocks());

  it('calls dutyAttendance.updateMany with out_status "auto" and auto_out true', async () => {
    prisma.dutyAttendance.findMany.mockResolvedValue([
      { id: 'att-1', duty_slot_id: 'slot-1' },
      { id: 'att-2', duty_slot_id: 'slot-2' },
    ]);
    await autoClockOut();
    expect(prisma.dutyAttendance.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ['att-1', 'att-2'] } },
        data:  expect.objectContaining({ auto_out: true, out_status: 'auto' }),
      }),
    );
  });

  it('updates corresponding duty slots to "completed"', async () => {
    prisma.dutyAttendance.findMany.mockResolvedValue([{ id: 'att-1', duty_slot_id: 'slot-1' }]);
    await autoClockOut();
    expect(prisma.dutySlot.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: ['slot-1'] } }, data: { status: 'completed' } }),
    );
  });

  it('returns early without any DB writes when no open attendance records exist', async () => {
    prisma.dutyAttendance.findMany.mockResolvedValue([]);
    await autoClockOut();
    expect(prisma.dutyAttendance.updateMany).not.toHaveBeenCalled();
    expect(prisma.dutySlot.updateMany).not.toHaveBeenCalled();
  });
});
