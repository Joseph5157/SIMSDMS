# Design: Late-Open Recovery for Duty Slot Windows

**Date**: 2026-08-01
**Status**: Approved, ready for implementation planning

## Problem

The intended flow is that an Admin opens next month's duty-slot scheduling window
during the *prior* month (e.g. open August's window in July), giving faculty the
whole month to self-pick their duty slots.

In practice, admins have been opening a month's window *during that same month*
(e.g. opening August's window on August 15th) instead. Today the system doesn't
distinguish this case at all:

- `getAvailableSlots` / `pickSlot` (`server/controllers/duty-slots.controller.js`)
  never check whether a `duty_date` has already passed — faculty can "pick" a
  slot for a day earlier in the month that's already over.
- The Telegram "window open" notification (`notifyAllFaculty` in
  `server/controllers/calendar.controller.js`) always states the window closes
  at the end of the month (`config.closes_at`, which `openWindow` unconditionally
  sets to the last day of the target month), regardless of when it was actually
  opened — so a window opened on Aug 15 still tells faculty "Closes: 31 August,"
  implying far more time than a sane read of the situation would (most of the
  month's working days are already gone or nearly gone).

## Goals

1. When a window is opened late, faculty self-service picking is limited to a
   short near-term grace period instead of implying the whole rest of the month
   is theirs to pick from.
2. Everything outside that grace period (already-past days, and days beyond the
   grace period through month-end) is left for the Admin to assign directly,
   using the existing admin-assignment tools — no new admin UI/endpoint.
3. The Telegram notification accurately reflects whichever case applies.
4. On-time opens (prior month) are completely unaffected — this is purely a
   late-open recovery behavior.

## Non-goals

- No change to the on-time flow, `sessions_per_faculty`, or the reassignment
  system.
- No new admin screen for "days needing assignment" — the existing Duty
  Calendar / Unassigned Faculty page and `adminAssign`/`assignSlots` already
  cover this.
- No retroactive handling of days that passed *before* the window was even
  opened with zero coverage — those are simply excluded from every path (self
  -pick and the grace-period concept both start no earlier than "today").

## Design

### 1. Detecting a late open

In `openWindow` (`server/controllers/calendar.controller.js`), compute
`todayStr = formatDateIST(new Date())` and compare against the 1st of the
target `(year, month)`. If today falls on/after that date, the open is late.
No new column is needed to persist "lateness" — it's derived at read time from
the already-stored `opened_at` versus the target month, so `getAvailableSlots`
and `pickSlot` can recompute it independently of `openWindow`.

### 2. Self-pick grace period

When late, faculty may only self-pick `duty_date`s in the closed range:

```
[opened_at's IST calendar date, opened_at's IST calendar date + 2 days]
```

capped at the target month's last day. This is a **fixed** window anchored to
the moment the admin opened it — it does not slide forward as days pass. E.g.
opening Aug 15 fixes the grace period at Aug 15–17 regardless of whether a
faculty member checks the picker on the 15th or the 17th.

Enforced in two places (mirroring the existing pattern of checking
`working_days` membership in both the read and write paths):

- `getAvailableSlots` — after computing the normal `available` list from
  `working_days` minus taken slots, additionally intersect with the grace
  period when the open was late.
- `pickSlot` — after the existing `working_days.includes(duty_date)` check,
  add a grace-period check when the open was late; reject with a new
  `OUTSIDE_PICK_WINDOW` 409 (same shape as `WINDOW_CLOSED`) if the requested
  date falls outside it.

Both derive lateness/grace-period bounds from `config.opened_at` — no new
schema field.

### 3. Past-day guard (prerequisite fix, applies universally)

Neither `getAvailableSlots` nor `pickSlot` currently exclude already-elapsed
dates at all, independent of the late-open case (e.g. this already affects an
on-time window that's still open when the admin reopens it after closing it
early). Fix as part of this change since the late-open logic depends on
"today" as a hard floor:

- `getAvailableSlots` excludes any working day `< today` from the returned
  `available` list.
- `pickSlot` rejects `duty_date < today` with `INVALID_DATE` (same error the
  non-working-day case already uses).

### 4. Admin fill-in

No new mechanism. Days outside the self-pick grace period (whether already
past, or simply beyond the 2-3 day horizon through month-end) are left
unassigned for the Admin to fill via the existing `adminAssign` (single slot)
/ `assignSlots` (bulk per faculty) endpoints and the `getUnassignedFaculty`
view, exactly as they would for any other manually-covered day today.

### 5. Telegram notification

`notifyAllFaculty` (`calendar.controller.js`) branches on the same lateness
check used in `openWindow`. Late-open message:

```
📅 <b>Duty Scheduling Window Open</b>

The window for <b>{Month} {Year}</b> opened late — you can self-pick your
duty slots only for the next {N} day(s) (<b>{graceStart}–{graceEnd}</b>).
Duty for the rest of the month will be assigned by the Admin.

Pick your slots: {APP_URL}/faculty/slots
```

`{N}`/`{graceEnd}` reflect the actual capped grace period (e.g. a window
opened on the second-to-last day of the month only gets 1 day, not 2). The
on-time message is unchanged.

### 6. Frontend (`SlotPickerPage.jsx`)

`getAvailableSlots`'s response already drives which dates show as pickable
(`availMap`). Once the backend filters correctly, the calendar naturally shows
fewer pickable dates for a late-opened month — no client date-math changes
needed. The only addition: the empty-state message ("No slots set up for this
month yet") needs a second variant for "window is open, but you're outside
your pick window" so faculty aren't confused when they see a mostly-inert
calendar with only 2-3 live days.

## Data flow summary

```
Admin opens window (late) → openWindow computes late=true, sets closes_at as
today, unchanged (still month-end, kept as the hard/admin-facing close)
  → notifyAllFaculty sends the grace-period-aware message
  → getAvailableSlots/pickSlot independently derive the same grace period from
    opened_at on every call — no state to keep in sync
  → Admin manually assigns everything outside the grace period via existing
    adminAssign/assignSlots, same as they would today for any admin-assigned day
```

## Error handling

- New `OUTSIDE_PICK_WINDOW` (409) from `pickSlot` when a late-open grace
  period is active and the requested date falls outside it — distinct from
  `WINDOW_CLOSED` (no config / not open at all) and `INVALID_DATE` (not a
  working day, or now also: already past).
- No changes to existing error paths (`LIMIT_REACHED`, `SLOT_TAKEN`).

## Testing

- `server/tests/duty-slots.test.mjs` / `calendar.test.mjs`: extend with cases
  for late-open grace-period computation (available list correctly excludes
  past + beyond-grace days; pick rejects outside-grace dates with
  `OUTSIDE_PICK_WINDOW`; on-time opens unaffected).
- `server/tests/bot.test.mjs` or equivalent: assert the late-open Telegram
  message body differs from the on-time one and contains the correct grace
  dates.
- Manual quickstart: open a window mid-month against the dev DB, confirm the
  picker page and Telegram message both reflect the restricted range.
