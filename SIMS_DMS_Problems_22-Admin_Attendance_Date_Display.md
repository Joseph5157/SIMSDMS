# SIMS DMS Problems 22 — Admin Attendance Section: Missing Date Display

**Status:** Open · **Priority:** Medium · **Areas:** Admin Dashboard, Attendance Page, UI/UX

---

## Problem: Add Dynamic Date Beside Live Attendance Heading

In the Admin Dashboard → Attendance section, the page heading currently shows only `Live Attendance` but does not clearly display the current date beside the heading. Since this page is used to monitor daily faculty attendance, the admin should immediately know which date's attendance is being displayed.

---

## Current Behavior

The page shows:
```
Live Attendance

Today · Refreshes every 30s · Last updated 06:23 am
```

The actual date is not clearly displayed near the main heading.

---

## Required Change

Add the current date dynamically beside or below the Live Attendance heading.

### Examples
**Option 1 (Inline):**
```
Live Attendance — 7 July 2026
```

**Option 2 (Below):**
```
Live Attendance
Tuesday, 7 July 2026
```

---

## Expected Behavior

The date should update automatically every day:
- On 7 July 2026, it should show `Tuesday, 7 July 2026`
- On 8 July 2026, it should automatically change to `Wednesday, 8 July 2026`
- Admin should not need to refresh settings or manually update the date

---

## Why This Is Needed

- Makes the attendance page clearer
- Admin can easily confirm which day's attendance is being viewed
- Avoids confusion when checking live attendance early morning or after midnight
- Makes the page more professional and informative

---

## Implementation Notes

- Add a dynamically updating date near the heading
- The heading should show the current date automatically every day
- Format: `Live Attendance — Day, Date Month Year` (e.g., `Tuesday, 7 July 2026`)
- Ensure correct spelling: **Attendance** (not "Attendence")
- Date should update automatically without manual refresh or settings change
