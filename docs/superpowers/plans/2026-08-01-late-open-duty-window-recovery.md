# Late-Open Duty Window Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When an Admin opens a duty-slot scheduling window late (during the month it governs, instead of the prior month), restrict faculty self-pick to a fixed 2-3 day grace period from the moment it opened, leave the rest of the month for the Admin to assign directly, and make the Telegram notification say so accurately.

**Architecture:** A single new pure-function helper (`server/lib/dutyWindow.js`) derives "is this open late, and what's the grace period" from the `CalendarConfig.opened_at` timestamp that already exists — no new schema. Both `duty-slots.controller.js` (faculty-facing availability/picking) and `calendar.controller.js` (the open-window Telegram notification) call this same helper, so the two surfaces can never disagree about the grace period. A companion, previously-missing past-day guard is added alongside it since the late-open logic depends on "today" as a hard floor anyway.

**Tech Stack:** Node.js/Express/Prisma backend (CommonJS), Vitest test runner (`server/tests/*.test.mjs`, globals enabled), React 18 frontend, no new dependencies.

**Reference:** Design doc at `specs/029-late-open-duty-window-recovery/design.md`.

## Global Constraints

- No new database columns/migrations — the grace period is always derived from the existing `CalendarConfig.opened_at` (`DateTime?`) field.
- On-time opens (window opened in a prior month) must be byte-for-byte unaffected — every date computation here is gated on the "is this late" check first.
- No new admin UI or endpoints — days outside the grace period are left for the existing `adminAssign` / `assignSlots` / `getUnassignedFaculty` tools, unchanged.
- All date math is done via `Date.UTC(...)`/IST-calendar-string comparisons (`YYYY-MM-DD` lexicographic compare), never via `new Date(str).getDate()/getMonth()` or bare local-timezone `Date` getters — this project has an established, hard-learned rule about that exact bug class (see `server/lib/reportRange.js`'s header comment and the SlotPickerPage fix earlier in this project's history).
- Match existing test conventions exactly: Vitest with `globals: true` (no `describe`/`it`/`expect`/`vi` imports), `createRequire` for requiring CommonJS controllers/libs, the `makeReq`/`makeRes` helpers already defined per test file.

---

### Task 1: `computeGracePeriod` helper

**Files:**
- Create: `server/lib/dutyWindow.js`
- Test: `server/tests/dutyWindow.test.mjs`

**Interfaces:**
- Produces: `computeGracePeriod(openedAt: Date, year: number, month: number) => { isLate: boolean, graceStart: string|null, graceEnd: string|null }` — `graceStart`/`graceEnd` are `"YYYY-MM-DD"` strings (or `null` when `isLate` is `false`). Consumed by Tasks 2 and 3.

- [ ] **Step 1: Write the failing test**

Create `server/tests/dutyWindow.test.mjs`:

```js
import { createRequire } from 'module';
const _require = createRequire(import.meta.url);

const { computeGracePeriod } = _require('../lib/dutyWindow');

describe('computeGracePeriod', () => {
  it('is not late when opened before the target month starts', () => {
    const openedAt = new Date('2026-07-15T10:00:00.000Z'); // opened in July for August
    const result = computeGracePeriod(openedAt, 2026, 8);
    expect(result).toEqual({ isLate: false, graceStart: null, graceEnd: null });
  });

  it('is late when opened on the 1st of the target month', () => {
    const openedAt = new Date('2026-08-01T03:00:00.000Z'); // 08:30 IST on Aug 1
    const result = computeGracePeriod(openedAt, 2026, 8);
    expect(result.isLate).toBe(true);
    expect(result.graceStart).toBe('2026-08-01');
    expect(result.graceEnd).toBe('2026-08-03');
  });

  it('is late when opened mid-month, grace period is a fixed 3-day window from the open date', () => {
    const openedAt = new Date('2026-08-15T04:00:00.000Z');
    const result = computeGracePeriod(openedAt, 2026, 8);
    expect(result).toEqual({ isLate: true, graceStart: '2026-08-15', graceEnd: '2026-08-17' });
  });

  it('caps the grace period at the last day of the month', () => {
    const openedAt = new Date('2026-08-30T03:00:00.000Z');
    const result = computeGracePeriod(openedAt, 2026, 8);
    expect(result.isLate).toBe(true);
    expect(result.graceStart).toBe('2026-08-30');
    expect(result.graceEnd).toBe('2026-08-31'); // capped, not Sept 1
  });

  it('handles a month with 30 days correctly (no Date.UTC overflow bugs)', () => {
    const openedAt = new Date('2026-09-29T03:00:00.000Z');
    const result = computeGracePeriod(openedAt, 2026, 9);
    expect(result.graceEnd).toBe('2026-09-30'); // capped, not Oct 1
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx vitest run tests/dutyWindow.test.mjs`
Expected: FAIL — `Cannot find module '../lib/dutyWindow'`

- [ ] **Step 3: Write minimal implementation**

Create `server/lib/dutyWindow.js`:

```js
const { formatDateIST } = require('./time');

// Fixed number of extra days (beyond the day it opened) that self-pick stays
// available for when a monthly window is opened late. GRACE_DAYS=2 means
// opening on the 15th keeps self-pick open through the 17th (3 calendar days
// total, inclusive).
const GRACE_DAYS = 2;

function addDaysToDateStr(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function lastDayOfMonthStr(year, month) {
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}

// Determines whether opening a window for (year, month) at `openedAt` counts
// as "late" (opened on/after the 1st of the month it governs) and, if so, the
// fixed self-pick grace period faculty get before the Admin must assign the
// rest of the month directly. Works entirely in IST calendar-date strings to
// match duty_date's own UTC-midnight-per-IST-day storage convention (see
// lib/time.js) — never touches the process's local timezone.
function computeGracePeriod(openedAt, year, month) {
  const openedDateStr = formatDateIST(openedAt);
  const monthStartStr = `${year}-${String(month).padStart(2, '0')}-01`;

  if (openedDateStr < monthStartStr) {
    return { isLate: false, graceStart: null, graceEnd: null };
  }

  const monthEndStr = lastDayOfMonthStr(year, month);
  const rawGraceEnd = addDaysToDateStr(openedDateStr, GRACE_DAYS);

  return {
    isLate: true,
    graceStart: openedDateStr,
    graceEnd: rawGraceEnd < monthEndStr ? rawGraceEnd : monthEndStr,
  };
}

module.exports = { computeGracePeriod };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && npx vitest run tests/dutyWindow.test.mjs`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add server/lib/dutyWindow.js server/tests/dutyWindow.test.mjs
git commit -m "feat(duty-slots): add computeGracePeriod helper for late-opened windows"
```

---

### Task 2: Enforce the grace period in `duty-slots.controller.js`

**Files:**
- Modify: `server/controllers/duty-slots.controller.js` (`getAvailableSlots`, `pickSlot`)
- Modify: `server/tests/duty-slots.test.mjs`

**Interfaces:**
- Consumes: `computeGracePeriod` from Task 1 (`server/lib/dutyWindow.js`).
- Produces: `GET /duty-slots/available/:year/:month` response gains two fields: `pick_window_late: boolean`, `pick_window_grace_end: string|null`. `POST /duty-slots/pick` gains a new 409 error code `OUTSIDE_PICK_WINDOW`, and reuses the existing 400 `INVALID_DATE` code for past dates. Consumed by Task 4 (frontend).

This task first makes the existing `pickSlot` test suite time-independent (it currently hardcodes `duty_date: '2026-06-10'`, which the new past-day guard would break once real time passes that date — pin the clock so the suite stays correct forever), then adds the new behavior test-first.

- [ ] **Step 1: Pin system time in the existing `pickSlot` tests and add `opened_at` to the fixture (no behavior change yet)**

In `server/tests/duty-slots.test.mjs`, replace:

```js
const openConfig = { is_window_open: true, working_days: ['2026-06-10'], sessions_per_faculty: 3 };
const validBody  = { duty_date: '2026-06-10', session_type: 'morning' };

describe('pickSlot', () => {
  beforeEach(() => {
    vi.spyOn(prisma.calendarConfig, 'findUnique').mockResolvedValue(openConfig);
    vi.spyOn(prisma, '$transaction');
  });
  afterEach(() => vi.restoreAllMocks());
```

with:

```js
const openConfig = {
  is_window_open: true,
  working_days: ['2026-06-10'],
  sessions_per_faculty: 3,
  opened_at: new Date('2026-05-20T04:00:00.000Z'), // opened in May, on time for June
};
const validBody  = { duty_date: '2026-06-10', session_type: 'morning' };

describe('pickSlot', () => {
  beforeEach(() => {
    // Pinned so 'today' never drifts past the fixture's 2026-06-10 duty_date —
    // the past-day guard added in this file would otherwise start rejecting
    // these fixtures for real once the calendar catches up to June 2026.
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-08T04:00:00.000Z'));
    vi.spyOn(prisma.calendarConfig, 'findUnique').mockResolvedValue(openConfig);
    vi.spyOn(prisma, '$transaction');
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });
```

- [ ] **Step 2: Run the full file to confirm nothing broke yet**

Run: `cd server && npx vitest run tests/duty-slots.test.mjs`
Expected: PASS (same tests as before — this step only pinned time/added an unused fixture field)

- [ ] **Step 3: Write the failing tests for the new behavior**

In `server/tests/duty-slots.test.mjs`, change the import line at the top from:

```js
const { pickSlot, getMonthSlots, reassignSlot } = _require('../controllers/duty-slots.controller');
```

to:

```js
const { pickSlot, getAvailableSlots, getMonthSlots, reassignSlot } = _require('../controllers/duty-slots.controller');
```

Then add these tests inside the existing `describe('pickSlot', ...)` block, after the `'returns 201 with the created slot on the success path'` test (before its closing `});`):

```js

  it('returns 400 INVALID_DATE when the requested date has already passed', async () => {
    prisma.calendarConfig.findUnique.mockResolvedValue({
      ...openConfig, working_days: ['2026-06-05'],
    });
    const res = makeRes();
    await pickSlot(makeReq({ duty_date: '2026-06-05', session_type: 'morning' }), res);
    expect(res._status).toBe(400);
    expect(res._body.code).toBe('INVALID_DATE');
  });

  it('returns 409 OUTSIDE_PICK_WINDOW when the window opened late and the date is beyond the grace period', async () => {
    prisma.calendarConfig.findUnique.mockResolvedValue({
      ...openConfig,
      working_days: ['2026-06-08', '2026-06-25'],
      opened_at: new Date('2026-06-08T04:00:00.000Z'), // opened late, same month as 'today'
    });
    const res = makeRes();
    await pickSlot(makeReq({ duty_date: '2026-06-25', session_type: 'morning' }), res);
    expect(res._status).toBe(409);
    expect(res._body.code).toBe('OUTSIDE_PICK_WINDOW');
  });

  it('allows picking within the grace period of a late-opened window', async () => {
    tx({ count: 0, createResult: { id: 's1' } });
    prisma.calendarConfig.findUnique.mockResolvedValue({
      ...openConfig,
      working_days: ['2026-06-08'],
      opened_at: new Date('2026-06-08T04:00:00.000Z'),
    });
    const res = makeRes();
    await pickSlot(makeReq({ duty_date: '2026-06-08', session_type: 'morning' }), res);
    expect(res._status).toBe(201);
  });
```

Then add a new top-level `describe` block, after the closing `});` of `describe('pickSlot', ...)` and before `describe('getMonthSlots', ...)`:

```js
describe('getAvailableSlots', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  function mockNoPicksYet() {
    vi.spyOn(prisma.dutySlot, 'findMany').mockResolvedValue([]); // no taken slots
    vi.spyOn(prisma.dutySlot, 'count').mockResolvedValue(0);      // no picks by this faculty yet
  }

  it('excludes already-passed days from an on-time (prior-month) open', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-05T04:00:00.000Z')); // 5 Aug, ~9:30am IST
    vi.spyOn(prisma.calendarConfig, 'findUnique').mockResolvedValue({
      is_window_open: true,
      opened_at: new Date('2026-07-20T04:00:00.000Z'), // opened in July, on time
      working_days: ['2026-08-04', '2026-08-05', '2026-08-06'],
      sessions_per_faculty: 3,
    });
    mockNoPicksYet();

    const req = { params: { year: '2026', month: '8' }, user: { id: 'f1', role: 'faculty' } };
    const res = makeRes();
    await getAvailableSlots(req, res);

    expect(res._body.pick_window_late).toBe(false);
    const dates = new Set(res._body.data.map((s) => s.duty_date));
    expect(dates.has('2026-08-04')).toBe(false); // already past
    expect(dates.has('2026-08-05')).toBe(true);
    expect(dates.has('2026-08-06')).toBe(true);
  });

  it('caps availability to the fixed grace period for a late open', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-16T04:00:00.000Z')); // faculty checking a day into the window
    vi.spyOn(prisma.calendarConfig, 'findUnique').mockResolvedValue({
      is_window_open: true,
      opened_at: new Date('2026-08-15T04:00:00.000Z'), // opened late, on the 15th
      working_days: ['2026-08-15', '2026-08-16', '2026-08-17', '2026-08-18', '2026-08-20'],
      sessions_per_faculty: 3,
    });
    mockNoPicksYet();

    const req = { params: { year: '2026', month: '8' }, user: { id: 'f1', role: 'faculty' } };
    const res = makeRes();
    await getAvailableSlots(req, res);

    expect(res._body.pick_window_late).toBe(true);
    expect(res._body.pick_window_grace_end).toBe('2026-08-17');
    const dates = new Set(res._body.data.map((s) => s.duty_date));
    expect(dates.has('2026-08-16')).toBe(true);  // within [today, graceEnd]
    expect(dates.has('2026-08-17')).toBe(true);  // last day of grace
    expect(dates.has('2026-08-18')).toBe(false); // beyond grace — admin-only
    expect(dates.has('2026-08-20')).toBe(false); // beyond grace — admin-only
  });
});
```

- [ ] **Step 4: Run tests to verify the new ones fail**

Run: `cd server && npx vitest run tests/duty-slots.test.mjs`
Expected: the 5 new tests FAIL (past-date/grace checks don't exist yet in `pickSlot`; `getAvailableSlots` doesn't filter by day or return the new fields yet), all prior tests still PASS.

- [ ] **Step 5: Implement the controller changes**

In `server/controllers/duty-slots.controller.js`, add the import after the existing `settingsService` import (around line 6):

```js
const { computeGracePeriod } = require('../lib/dutyWindow');
```

Replace the `getAvailableSlots` function body from `const workingDays = ...` through the final `res.json({...})` (the whole function after the `WINDOW_CLOSED` check) with:

```js
  const { isLate, graceEnd } = computeGracePeriod(config.opened_at, year, month);
  const todayStr = formatDateIST(new Date());

  const workingDays = Array.isArray(config.working_days) ? config.working_days : [];

  if (workingDays.length === 0) {
    return res.json({
      data: [],
      total: 0,
      sessions_per_faculty: config.sessions_per_faculty,
      slots_picked: 0,
      slots_remaining: config.sessions_per_faculty,
      pick_window_late: isLate,
      pick_window_grace_end: graceEnd,
    });
  }

  const takenSlots = await prisma.dutySlot.findMany({
    where: { duty_date: { in: workingDays.map((d) => new Date(d)) } },
    select: { duty_date: true, session_type: true },
  });

  const takenSet = new Set(
    takenSlots.map((s) => `${s.duty_date.toISOString().slice(0, 10)}|${s.session_type}`),
  );

  // Self-pick is never open for a day that's already passed, and — when the
  // window was opened late (see lib/dutyWindow.js) — is further capped to the
  // fixed grace period so faculty can't pick days the Admin is expected to
  // assign directly instead.
  const available = [];
  for (const dateStr of workingDays) {
    if (dateStr < todayStr) continue;
    if (isLate && dateStr > graceEnd) continue;
    for (const session of ['morning', 'afternoon']) {
      if (!takenSet.has(`${dateStr}|${session}`)) {
        available.push({ duty_date: dateStr, session_type: session });
      }
    }
  }

  const pickedCount = await prisma.dutySlot.count({
    where: { faculty_id: req.user.id, duty_date: monthDateRange(year, month) },
  });

  res.json({
    data: available,
    total: available.length,
    sessions_per_faculty: config.sessions_per_faculty,
    slots_picked: pickedCount,
    slots_remaining: Math.max(0, config.sessions_per_faculty - pickedCount),
    pick_window_late: isLate,
    pick_window_grace_end: graceEnd,
  });
}
```

In the same file, in `pickSlot`, replace:

```js
  const workingDays = Array.isArray(config.working_days) ? config.working_days : [];
  if (!workingDays.includes(duty_date)) {
    return res.status(400).json({
      error: true,
      code: 'INVALID_DATE',
      message: 'That date is not a scheduled working day.',
    });
  }

  try {
```

with:

```js
  const workingDays = Array.isArray(config.working_days) ? config.working_days : [];
  if (!workingDays.includes(duty_date)) {
    return res.status(400).json({
      error: true,
      code: 'INVALID_DATE',
      message: 'That date is not a scheduled working day.',
    });
  }

  const todayStr = formatDateIST(new Date());
  if (duty_date < todayStr) {
    return res.status(400).json({
      error: true,
      code: 'INVALID_DATE',
      message: 'That date has already passed.',
    });
  }

  const { isLate, graceEnd } = computeGracePeriod(config.opened_at, year, month);
  if (isLate && duty_date > graceEnd) {
    return res.status(409).json({
      error: true,
      code: 'OUTSIDE_PICK_WINDOW',
      message: `This window opened late — self-pick is only open through ${graceEnd}. Ask your Admin to assign this date.`,
    });
  }

  try {
```

- [ ] **Step 6: Run tests to verify everything passes**

Run: `cd server && npx vitest run tests/duty-slots.test.mjs`
Expected: PASS (all tests, old and new)

- [ ] **Step 7: Commit**

```bash
git add server/controllers/duty-slots.controller.js server/tests/duty-slots.test.mjs
git commit -m "feat(duty-slots): reject past/beyond-grace picks and filter availability accordingly"
```

---

### Task 3: Grace-aware Telegram message in `calendar.controller.js`

**Files:**
- Modify: `server/controllers/calendar.controller.js` (`notifyAllFaculty`, `module.exports`)
- Modify: `server/tests/calendar.test.mjs`

**Interfaces:**
- Consumes: `computeGracePeriod` from Task 1.
- Produces: `notifyAllFaculty(year: number, month: number, config) => Promise<void>` becomes an exported member of `calendar.controller.js` (previously internal-only), so it can be unit-tested directly instead of only through the fire-and-forget call inside `openWindow`.

- [ ] **Step 1: Write the failing tests**

In `server/tests/calendar.test.mjs`, change the import line at the top from:

```js
const {
  getConfig, openWindow, closeWindow, updateBlockedDates, assignSlots,
} = _require('../controllers/calendar.controller');
```

to:

```js
const {
  getConfig, openWindow, closeWindow, updateBlockedDates, assignSlots, notifyAllFaculty,
} = _require('../controllers/calendar.controller');
```

Then add a new `describe` block, after the closing `});` of `describe('openWindow', ...)` and before `describe('closeWindow', ...)`:

```js
describe('notifyAllFaculty', () => {
  afterEach(() => vi.restoreAllMocks());

  it('sends the standard message for an on-time (prior-month) open', async () => {
    vi.spyOn(prisma.user, 'findMany').mockResolvedValue([{ id: 'f1', telegram_id: 111, name: 'Fac One' }]);
    const sendMessage = vi.spyOn(telegram, 'sendMessage').mockResolvedValue({});

    const config = {
      sessions_per_faculty: 3,
      opened_at: new Date('2026-07-20T04:00:00.000Z'),
      closes_at: new Date('2026-08-31T18:29:59.999Z'),
    };
    await notifyAllFaculty(2026, 8, config);

    expect(sendMessage).toHaveBeenCalledTimes(1);
    const text = sendMessage.mock.calls[0][1];
    expect(text).toContain('now open');
    expect(text).not.toContain('opened late');
    expect(text).toContain('Closes:');
  });

  it('sends the grace-period message for a late (same-month) open', async () => {
    vi.spyOn(prisma.user, 'findMany').mockResolvedValue([{ id: 'f1', telegram_id: 111, name: 'Fac One' }]);
    const sendMessage = vi.spyOn(telegram, 'sendMessage').mockResolvedValue({});

    const config = {
      sessions_per_faculty: 3,
      opened_at: new Date('2026-08-15T04:00:00.000Z'), // opened Aug 15, for August itself
      closes_at: new Date('2026-08-31T18:29:59.999Z'),
    };
    await notifyAllFaculty(2026, 8, config);

    const text = sendMessage.mock.calls[0][1];
    expect(text).toContain('opened late');
    expect(text).toContain('through');
    expect(text).toContain('17 August 2026');
    expect(text).not.toContain('Closes:');
  });

  it('sends nothing when no active faculty have a linked telegram_id', async () => {
    vi.spyOn(prisma.user, 'findMany').mockResolvedValue([]);
    const sendMessage = vi.spyOn(telegram, 'sendMessage').mockResolvedValue({});
    await notifyAllFaculty(2026, 8, {
      sessions_per_faculty: 3,
      opened_at: new Date('2026-07-01T00:00:00.000Z'),
      closes_at: null,
    });
    expect(sendMessage).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `cd server && npx vitest run tests/calendar.test.mjs`
Expected: FAIL — `notifyAllFaculty` is `undefined` (not exported yet)

- [ ] **Step 3: Implement the change**

In `server/controllers/calendar.controller.js`, add the import near the top (after the `logger` import, around line 4):

```js
const { computeGracePeriod } = require('../lib/dutyWindow');
```

Replace the entire `notifyAllFaculty` function with:

```js
async function notifyAllFaculty(year, month, config) {
  const faculty = await prisma.user.findMany({
    where: { role: 'faculty', status: 'active', deleted_at: null, telegram_id: { not: null } },
    select: { id: true, telegram_id: true, name: true },
  });

  const monthLabel = `${MONTH_NAMES[month - 1]} ${year}`;
  const slotCount = config.sessions_per_faculty;
  const slotsLabel = `${slotCount} duty slot${slotCount === 1 ? '' : 's'}`;
  const appUrl = process.env.APP_URL || 'https://sims-dms.railway.app';

  const { isLate, graceEnd } = computeGracePeriod(config.opened_at, year, month);

  let text;
  if (isLate) {
    const graceEndLabel = formatFriendlyDateIST(graceEnd);
    text =
      `📅 <b>Duty Scheduling Window Open</b>\n\n` +
      `The window for <b>${monthLabel}</b> opened late — you can self-pick your duty slots only through <b>${graceEndLabel}</b>.\n` +
      `Duty for the rest of the month will be assigned by the Admin.\n\n` +
      `Pick your slots: ${appUrl}/faculty/slots`;
  } else {
    const closesLabel = config.closes_at ? formatFriendlyDateIST(config.closes_at) : null;
    text =
      `📅 <b>Duty Scheduling Window Open</b>\n\n` +
      `The duty slot selection window for <b>${monthLabel}</b> is now open.\n\n` +
      `You need to pick <b>${slotsLabel}</b> this month.` +
      (closesLabel ? `\n⏰ Closes: <b>${closesLabel}</b>` : '') +
      `\n\nPick your slots: ${appUrl}/faculty/slots`;
  }

  for (const f of faculty) {
    telegram.sendMessage(f.telegram_id, text).catch((err) => {
      logger.warn(`Telegram notify failed for faculty ${f.id}: ${err.message}`);
    });
    await sleep(50);
  }
}
```

Finally, add `notifyAllFaculty` to `module.exports` at the bottom of the file:

```js
module.exports = {
  getConfig,
  openWindow,
  closeWindow,
  updateBlockedDates,
  updateWorkingDays,
  updateSessionsPerFaculty,
  getUnassignedFaculty,
  assignSlots,
  notifyAllFaculty,
  MONTH_NAMES,
  formatFriendlyDateIST,
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd server && npx vitest run tests/calendar.test.mjs`
Expected: PASS (all tests, old and new)

- [ ] **Step 5: Run the full server suite to confirm no cross-file regressions**

Run: `cd server && npx vitest run`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add server/controllers/calendar.controller.js server/tests/calendar.test.mjs
git commit -m "feat(duty-slots): send a grace-period-aware Telegram message for late window opens"
```

---

### Task 4: Frontend empty-state message for the restricted pick window

**Files:**
- Modify: `client/src/pages/faculty/SlotPickerPage.jsx:328-334`

**Interfaces:**
- Consumes: `pick_window_late`, `pick_window_grace_end` fields on the `available` object returned by `useAvailableSlots` (Task 2's response shape) — already flows through unchanged via the existing hook in `client/src/hooks/useDutySlots.js`, no hook change needed.

This repo has no automated frontend test harness (confirmed in `specs/003-admin-duty-timing-settings/plan.md`'s own Testing section: "no frontend test harness currently in repo"). This task substitutes a manual verification pass against the local dev environment for the write-test/run-test steps used elsewhere in this plan.

- [ ] **Step 1: Implement the change**

In `client/src/pages/faculty/SlotPickerPage.jsx`, replace:

```jsx
        {/* No slots message when window is open but empty */}
        {windowOpen && !loadingAvail && (available?.data ?? []).length === 0 && (
          <div className="mt-4 px-3.5 py-3 bg-[var(--color-amber-bg)] border border-[var(--color-amber-border)] rounded-[var(--radius-lg)]">
            <p className="text-[12px] text-[var(--color-amber-text)] m-0">
              ⚠️ No slots set up for this month yet. Ask your Admin to configure working days on the Duty Calendar page.
            </p>
          </div>
        )}
```

with:

```jsx
        {/* No slots message when window is open but empty */}
        {windowOpen && !loadingAvail && (available?.data ?? []).length === 0 && (
          <div className="mt-4 px-3.5 py-3 bg-[var(--color-amber-bg)] border border-[var(--color-amber-border)] rounded-[var(--radius-lg)]">
            <p className="text-[12px] text-[var(--color-amber-text)] m-0">
              {available?.pick_window_late
                ? `⚠️ This window opened late — self-pick was only open through ${available.pick_window_grace_end}. Ask your Admin to assign any remaining dates.`
                : '⚠️ No slots set up for this month yet. Ask your Admin to configure working days on the Duty Calendar page.'}
            </p>
          </div>
        )}
```

- [ ] **Step 2: Manual verification against the local dev environment**

1. Ensure the dev Postgres container is running and seeded (see memory: `sims-dms-postgres` on port 5434).
2. Start the server (`cd server && npm run dev`) and client (`cd client && npm run dev`).
3. As an Admin/Super Admin, open a duty window for the *current* real month (i.e. today's month) via the Duty Calendar page — this is a late open by construction.
4. Log in as a faculty member with no picks yet for that month, go to "My Duty Slots".
5. Confirm: only dates within `[today, today+2 days]` (capped at month-end) show as pickable in the calendar; picking a date outside that range is impossible from the UI (no available session buttons render for those dates).
6. Attempt to pick a date beyond the grace period directly via the API (e.g. browser devtools `fetch` to `POST /duty-slots/pick` with a future in-month date) — confirm the server responds `409 OUTSIDE_PICK_WINDOW` even though the UI itself wouldn't offer it.
7. If working days for the visible calendar month are entirely outside the grace window (e.g. testing near month-end), confirm the amber banner reads the new "window opened late..." message with the correct grace-end date substituted in.
8. Open a window for *next* month (on-time case) and confirm behavior/messaging is completely unchanged from before this plan.

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/faculty/SlotPickerPage.jsx
git commit -m "feat(duty-slots): explain the restricted pick window in the empty-state banner"
```
