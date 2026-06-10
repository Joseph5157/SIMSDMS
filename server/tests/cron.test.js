const { vi, describe, it, expect, beforeEach } = require('vitest');

// ─── Mocks (hoisted by vitest before any require) ─────────────────────────────

vi.mock('../lib/prisma', () => ({
  dutyAttendance: {
    findMany: vi.fn(),
    updateMany: vi.fn(),
  },
  dutySlot: {
    updateMany: vi.fn(),
  },
}));

vi.mock('../services/settings.service', () => ({
  getSettings: vi.fn(),
}));

vi.mock('../lib/logger', () => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

vi.mock('../lib/time', () => ({
  nowInIST: vi.fn(() => ({ year: 2026, month: 6, day: 10, hour: 16, minute: 30 })),
  istDayRangeUTC: vi.fn(() => ({
    gte: new Date('2026-06-10T00:00:00.000Z'),
    lte: new Date('2026-06-10T23:59:59.999Z'),
  })),
  istWallToUTC: vi.fn(() => new Date('2026-06-10T11:00:00.000Z')), // 16:30 IST = 11:00 UTC
}));

// ─── Imports (after mocks are set up) ─────────────────────────────────────────

const prisma = require('../lib/prisma');
const settingsService = require('../services/settings.service');
const { autoClockOut } = require('../lib/cron');

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('autoClockOut', () => {
  const defaultSettings = { auto_checkout_hour: 16, auto_checkout_min: 30 };

  beforeEach(() => {
    vi.clearAllMocks();
    settingsService.getSettings.mockResolvedValue(defaultSettings);
    prisma.dutyAttendance.updateMany.mockResolvedValue({ count: 0 });
    prisma.dutySlot.updateMany.mockResolvedValue({ count: 0 });
  });

  it('calls dutyAttendance.updateMany with auto_out: true and out_status: "auto"', async () => {
    const openRecords = [
      { id: 'att-1', duty_slot_id: 'slot-1' },
      { id: 'att-2', duty_slot_id: 'slot-2' },
    ];
    prisma.dutyAttendance.findMany.mockResolvedValue(openRecords);

    await autoClockOut();

    expect(prisma.dutyAttendance.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ['att-1', 'att-2'] } },
        data: expect.objectContaining({ auto_out: true, out_status: 'auto' }),
      }),
    );
  });

  it('also updates the corresponding duty slots to "completed"', async () => {
    const openRecords = [{ id: 'att-1', duty_slot_id: 'slot-1' }];
    prisma.dutyAttendance.findMany.mockResolvedValue(openRecords);

    await autoClockOut();

    expect(prisma.dutySlot.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ['slot-1'] } },
        data: { status: 'completed' },
      }),
    );
  });

  it('returns early without any DB writes when no open attendance records exist', async () => {
    prisma.dutyAttendance.findMany.mockResolvedValue([]);

    await autoClockOut();

    expect(prisma.dutyAttendance.updateMany).not.toHaveBeenCalled();
    expect(prisma.dutySlot.updateMany).not.toHaveBeenCalled();
  });
});
