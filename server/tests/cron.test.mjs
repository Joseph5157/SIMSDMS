import { createRequire } from 'module';
const _require = createRequire(import.meta.url);

const prisma          = _require('../lib/prisma');
const settingsService = _require('../services/settings.service');
const { nowInIST }     = _require('../lib/time');
const { autoClockOut } = _require('../lib/cron');

const ist = nowInIST();
const todayUTC     = new Date(Date.UTC(ist.year, ist.month - 1, ist.day));
const yesterdayUTC = new Date(Date.UTC(ist.year, ist.month - 1, ist.day - 1));

// Cutoffs derived relative to the actual current IST time so "today" groups
// deterministically fall on either side of their session's cutoff no matter
// when this suite runs — clamped to stay within a single day (0–1439 mins).
const nowMins    = ist.hour * 60 + ist.minute;
const pastMins   = Math.max(0, nowMins - 60);
const futureMins = Math.min(1439, nowMins + 60);

const defaultSettings = {
  auto_checkout_morning_hour:   Math.floor(pastMins / 60),
  auto_checkout_morning_min:    pastMins % 60,
  auto_checkout_afternoon_hour: Math.floor(futureMins / 60),
  auto_checkout_afternoon_min:  futureMins % 60,
};

describe('autoClockOut', () => {
  beforeEach(() => {
    vi.spyOn(prisma.dutyAttendance, 'findMany').mockResolvedValue([]);
    vi.spyOn(prisma.dutyAttendance, 'updateMany').mockResolvedValue({ count: 0 });
    vi.spyOn(prisma.dutySlot,       'updateMany').mockResolvedValue({ count: 0 });
    vi.spyOn(settingsService,       'getSettings').mockResolvedValue(defaultSettings);
    // Real $transaction validates its array elements are branded Prisma
    // promises, which mocked sub-calls aren't — replace it with a plain
    // Promise.all so the mocked updateMany calls above are actually awaited.
    vi.spyOn(prisma, '$transaction').mockImplementation((ops) => Promise.all(ops));
  });
  afterEach(() => vi.restoreAllMocks());

  it('calls dutyAttendance.updateMany with out_status "auto" and auto_out true for a past-day straggler', async () => {
    prisma.dutyAttendance.findMany.mockResolvedValue([
      { id: 'att-1', duty_slot_id: 'slot-1', dutySlot: { duty_date: yesterdayUTC, session_type: 'morning' } },
      { id: 'att-2', duty_slot_id: 'slot-2', dutySlot: { duty_date: yesterdayUTC, session_type: 'morning' } },
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
    prisma.dutyAttendance.findMany.mockResolvedValue([
      { id: 'att-1', duty_slot_id: 'slot-1', dutySlot: { duty_date: yesterdayUTC, session_type: 'morning' } },
    ]);
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

  it('clocks out a today session whose own cutoff has already passed, but not a today session whose cutoff has not', async () => {
    prisma.dutyAttendance.findMany.mockResolvedValue([
      { id: 'att-morning',   duty_slot_id: 'slot-morning',   dutySlot: { duty_date: todayUTC, session_type: 'morning' } },
      { id: 'att-afternoon', duty_slot_id: 'slot-afternoon', dutySlot: { duty_date: todayUTC, session_type: 'afternoon' } },
    ]);
    await autoClockOut();
    expect(prisma.dutyAttendance.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: ['att-morning'] } } }),
    );
    expect(prisma.dutyAttendance.updateMany).not.toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: ['att-afternoon'] } } }),
    );
    expect(prisma.dutyAttendance.updateMany).toHaveBeenCalledTimes(1);
  });
});
