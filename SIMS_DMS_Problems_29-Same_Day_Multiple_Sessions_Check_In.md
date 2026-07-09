# SIMS DMS Problems 29 — Same-Day Multiple Duty Session Check-in Availability Issue

**Status:** Open · **Priority:** Critical · **Areas:** Attendance, Duty Management, User Dashboard, Admin Dashboard

---

## Current Issue

A faculty user can be assigned multiple duty slots on the same day (e.g., Morning and Afternoon sessions), but the current system is not handling multiple sessions on the same date correctly.

### Example Scenario

A faculty member has on **08 July 2026**:

**Morning Session:**
- Status: Scheduled
- Assigned Duty

**Afternoon Session:**
- Status: Scheduled
- Assigned Duty

---

## Current Behaviour (Bug)

### Morning Session - Works Correctly
```
Morning Session
Starts: 10:30 AM

[Check In]

After check-in:
Checked In
[Check Out]
```

The system correctly displays check-in and check-out options.

### Afternoon Session - BUG: No Check-in Option
```
Afternoon Session
Assigned Duty

(No Check-in button available)
(No Check-out button available)
```

**Consequences:**
- ❌ User cannot mark attendance for afternoon duty
- ❌ Attendance record is not created
- ❌ Session completion status cannot be updated
- ❌ Admin live attendance dashboard shows incorrect information
- ❌ Attendance reports show incomplete data

---

## Expected Behaviour

The system must treat each duty session independently.

A single user can have:
- **Morning duty**
- **Afternoon duty**

on the same date, and **both should have their own complete attendance workflow**.

---

## Root Cause Analysis

### Current Problematic Logic

The system appears to check:
```
Does this user have duty today?
```

**Problem:** Once the morning duty is completed, the system considers the day's attendance completed, blocking afternoon check-in.

### Required Logic

The check should change to:
```
Does this user have an ACTIVE DUTY SESSION NOW?

Checking:
  ✓ Date
  ✓ Session type (Morning/Afternoon)
  ✓ Session start time
  ✓ Session status
```

The validation must include both date AND session type.

---

## System Changes Required

### 1. Update Duty Validation Logic

#### Current Logic (Incorrect)
```
User ID + Date
        ↓
Check if user has any duty on this date
        ↓
If yes, don't allow attendance for other sessions
```

#### New Logic (Correct)
```
User ID + Date + Session Type
        ↓
Check if user has duty for THIS specific session
        ↓
Check if session start time has passed
        ↓
Allow attendance marking for this session
```

**Implementation Details:**
- Extract and validate `session_type` (Morning/Afternoon) from request
- Query duty slots using: `user_id`, `duty_date`, `session_type`
- Check current time against session start time
- Allow check-in/check-out only for active sessions

---

### 2. Separate Attendance Records Per Session

#### Current Structure (Problematic)
```
Attendance Table:
user_id | date | status
```

#### New Structure (Correct)
```
Attendance Table:
user_id | date | session_type | check_in_time | check_out_time | status
```

### Example Data

```
Rahmatulla Syed | 08 July 2026 | Morning   | 10:35 AM | 12:30 PM | Completed
Rahmatulla Syed | 08 July 2026 | Afternoon | 02:35 PM | 05:30 PM | Completed
```

### Database Schema Update

```sql
ALTER TABLE attendance ADD COLUMN session_type ENUM('morning', 'afternoon');
ALTER TABLE attendance ADD COLUMN check_in_time TIMESTAMP;
ALTER TABLE attendance ADD COLUMN check_out_time TIMESTAMP;

CREATE UNIQUE INDEX idx_attendance_session 
ON attendance(user_id, duty_date, session_type);
```

---

### 3. User Dashboard Update

#### Current Display (Problematic)
```
Today's Duties

Morning Session
Status: Completed
✓ Checked In
✓ Checked Out

Afternoon Session
(No check-in controls)
```

#### New Display (Correct)
```
Today's Duties

Morning Session
Status: Completed
✓ Checked In
✓ Checked Out

Afternoon Session
Status: Upcoming
[Check In]  (when session starts)

After check-in:
Status: Checked In
[Check Out]
```

---

### 4. Admin Live Attendance Dashboard Update

#### Current Display (Problematic)
```
Live Attendance - 08 July 2026

Rahmatulla Syed
Status: Completed
```

Shows only one status regardless of multiple sessions.

#### New Display (Correct)
```
Live Attendance - 08 July 2026

Morning Session
Rahmatulla Syed       Status: Completed

Afternoon Session
Rahmatulla Syed       Status: Checked In
```

Shows both sessions with independent status.

---

### 5. Prevent Duplicate Attendance Issues

#### Allowed Scenarios ✅
```
Same user, same date, DIFFERENT sessions:

08 July 2026 | Morning   | Checked In
08 July 2026 | Afternoon | Checked In

✅ ALLOWED
```

#### Not Allowed Scenarios ❌
```
Same user, same date, SAME session, multiple check-ins:

08 July 2026 | Morning | Checked In
08 July 2026 | Morning | Checked In again

❌ NOT ALLOWED (Prevent duplicate)
```

### Validation Rules

1. **One check-in per session per day**
   - Block multiple check-ins for same session
   - Allow only one active check-in per session at a time

2. **Proper sequencing**
   - Check-in before check-out
   - Prevent check-out without check-in

3. **Time-based validation**
   - Check-in allowed only after session start time
   - Check-out allowed only after check-in

---

## Correct Workflow Example

### Morning Session
```
08 July 2026

Morning Duty
Session Start: 10:30 AM

10:30 AM onwards:
[Check In]

After check-in:
Status: Checked In
[Check Out]

After checkout:
Status: Completed
✓ Checked In at 10:35 AM
✓ Checked Out at 12:30 PM
```

### Afternoon Session (Same Date)
```
08 July 2026

Afternoon Duty
Session Start: 02:30 PM

02:30 PM onwards:
[Check In]

After check-in:
Status: Checked In
[Check Out]

After checkout:
Status: Completed
✓ Checked In at 02:35 PM
✓ Checked Out at 05:30 PM
```

**Both sessions work independently with separate attendance tracking.**

---

## Implementation Checklist

### Backend Changes
- [ ] Update attendance table schema to include `session_type`
- [ ] Modify check-in endpoint to validate `session_type` + `user_id` + `date`
- [ ] Modify check-out endpoint similarly
- [ ] Update attendance query logic to use all three criteria
- [ ] Add unique constraint for `(user_id, duty_date, session_type)`
- [ ] Update admin live attendance query to show both sessions
- [ ] Update attendance report queries

### Frontend Changes
- [ ] Update user dashboard to show separate check-in buttons for each session
- [ ] Add session type to check-in/check-out requests
- [ ] Update admin attendance dashboard to display both sessions
- [ ] Update status displays to show per-session information

### Database Migration
```sql
-- Add session_type column
ALTER TABLE attendance ADD COLUMN session_type ENUM('morning', 'afternoon');

-- Add check-in/check-out time columns
ALTER TABLE attendance ADD COLUMN check_in_time TIMESTAMP;
ALTER TABLE attendance ADD COLUMN check_out_time TIMESTAMP;

-- Create unique index for session-based attendance
CREATE UNIQUE INDEX idx_attendance_session 
ON attendance(user_id, duty_date, session_type);

-- Update existing records
UPDATE attendance 
SET session_type = 'morning' 
WHERE session_type IS NULL;
```

---

## Testing Scenarios

### Test Case 1: Morning Session Check-in
```
✓ Faculty has morning duty on 08 July
✓ System allows check-in after 10:30 AM
✓ Check-in is recorded
```

### Test Case 2: Afternoon Session Check-in (Same Day)
```
✓ Faculty has afternoon duty on same day
✓ System allows separate check-in after 02:30 PM
✓ Afternoon check-in doesn't affect morning record
```

### Test Case 3: Both Sessions in Dashboard
```
✓ Dashboard shows both morning and afternoon sessions
✓ Each has independent status display
✓ Both check-in/check-out options visible at appropriate times
```

### Test Case 4: Admin Attendance Dashboard
```
✓ Admin sees both sessions for the same faculty on same date
✓ Each session shows separate attendance status
✓ Live attendance reflects both sessions
```

---

## Final Requirement

Fix the attendance system so that morning and afternoon duties on the same day are treated as **two independent duty sessions**.

When a faculty member is assigned **both sessions on the same date**:
- ✅ Morning session must show its own check-in/check-out controls
- ✅ Afternoon session must show its own check-in/check-out controls
- ✅ Both attendance records must be stored separately
- ✅ Dashboard shows both sessions with independent status
- ✅ Attendance reports reflect both sessions correctly
- ✅ Admin live attendance dashboard shows both sessions
- ✅ System prevents duplicate check-ins for the same session
- ✅ No conflicts between morning and afternoon attendance

**The system must support multiple duty sessions per faculty member per day without any conflicts or data loss.**
