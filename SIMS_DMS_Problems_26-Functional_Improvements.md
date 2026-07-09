# SIMS DMS Problems 26 — Functional Improvements & Issue Descriptions

**Status:** Open · **Priority:** High · **Areas:** Dashboard, Violations, Duties, Calendar, Settings

---

## 1. Automatic Fine Amount Selection Based on Violation Type

### Current Problem

When a faculty/user records a student violation, the system currently requires the user to manually enter the fine amount. This creates problems because:
- Users may enter incorrect fine amounts
- Different faculty may assign different fines for the same violation type
- There is no consistency in penalty calculation
- Admin-defined violation rules are not being properly utilized

### Required Change

The fine amount should automatically populate based on the selected violation type.

### Expected Workflow

**Admin Setup:**
```
Violation Type: Uniform Violation
Default Fine: ₹50
```

**Faculty Recording:**
```
Student: Nikhil
Violation Type: Uniform Violation
Fine Amount: ₹50 (auto-populated)
```

### Logic

```
Select Student Violation Type
        ↓
System Retrieves Configured Fine Amount
        ↓
Auto Populate Fine Field
        ↓
Faculty Submits
```

### Benefits
- ✅ Prevents incorrect fine entries
- ✅ Maintains standardized disciplinary action
- ✅ Reduces manual work
- ✅ Ensures accurate reports

### Implementation Note
The manual custom fine input field should be removed or made read-only (display only).

---

## 2. Flagged Student Violations – Popup Based Review System

### Current Problem

In the Admin Dashboard there is a "FLAGGED - Awaiting Review" card. Currently, clicking it redirects the admin to another page to view flagged violations, creating unnecessary navigation.

### Required Change

When admin clicks the Flagged Card, a popup/modal should open displaying all flagged violations directly on the dashboard.

### Popup Content

Display flagged violations in a table:

| Student | Violation | Faculty | Date | Reason | Action |
|---------|-----------|---------|------|--------|--------|
| Nikhil | Uniform | Jbr | 01 Jul | Shouting | Review |
| Rahul | Late Coming | Dr. ABC | 02 Jul | Repeated | Review |

### Actions Inside Popup

**Review Button**
- Opens violation details
- Shows full context and remarks

**Confirm / Resolve Button**
- After checking the violation
- Admin clicks "Confirm Review"
- Violation status changes from "Flagged/Awaiting Review" to "Reviewed/Resolved"
- Record disappears from flagged count

### Expected Outcome

Admin can:
- ✅ View flagged violations
- ✅ Review them
- ✅ Resolve them
- ✅ All without leaving the dashboard

---

## 3. Dynamic Full Name in Dashboard Greeting

### Current Problem

Dashboard greeting currently displays:
```
Good afternoon, SIMS
```

This is generic and does not personalize the experience.

### Required Change

Display the logged-in user's full name dynamically.

### Examples

**Admin Account:**
```
Good afternoon, Syed Rahmatulla
```

**Faculty Account:**
```
Good morning, Dr. Rahmatulla
```

### Logic

```
Authenticate User
        ↓
Retrieve Full Name from User Profile
        ↓
Display in Dashboard Header
```

### Requirement

Should automatically update for:
- Admin accounts
- Faculty accounts
- Any other authenticated user role

---

## 4. Remove "Not Checked-in Cutoff" Functionality

### Current Problem

Duty Timing Settings currently contains:
- Session Start
- Late Arrival Cutoff
- Not Checked-in Cutoff ← **To be removed**
- Auto Clock-out

The "Not Checked-in Cutoff" functionality is no longer required.

### Required Change

Remove completely from all areas:

#### UI Removal
Remove from:
- Duty Timing Settings page
- Forms
- Settings display

#### Backend Removal
Remove:
- Database fields related to this feature
- API handling
- Validation logic
- Attendance calculations related to this feature

### Expected Timing Settings (After Removal)

Only keep these three settings:

**1. Session Start**
```
Example: 10:30 AM
```

**2. Late Arrival Cutoff**
```
Example: 11:00 AM
```

**3. Auto Clock-out**
```
Example: 12:30 PM
```

---

## 5. Calendar Legend Cleanup

### Current Problem

Admin Calendar section currently displays:
```
Calendar Legend
Red - blocked holiday date
Green - working day
Default - normal working day
```

The additional explanations are unnecessary and cluttered.

### Required Change

Simplify the legend.

**Before:**
```
Red = blocked holiday date
Green = working day
Default = normal working day
```

**After:**
```
Red = Blocked Date
```

### Final Legend

Only show:
- Red — Blocked Date

---

## 6. Remove Slot Unpick Functionality

### Current Problem

When the admin opens the slot booking window, faculty can select available duty slots. Currently, after selecting a slot, there is an option to unpick/remove the selected slot, creating unnecessary complexity that can affect duty allocation consistency.

### Required Change

Once faculty selects a slot, the selection becomes final. Remove unpick functionality.

### Expected Behaviour

**Before:**
```
Faculty selects slot
        ↓
Can remove/unpick selection
```

**After:**
```
Faculty selects slot
        ↓
Slot remains booked (final)
```

### If Changes Are Required

Any changes to duty allocation should happen through:
- Admin reassignment process
- Not by faculty unpicking slots

---

## 7. Real-Time Calendar Slot Booking Indicators

### Current Problem

The calendar displays available/picked slots visually, but the indicators are not fully connected with real booking data. Risk of:
- Duplicate bookings
- Incorrect availability display
- Multiple users selecting the same slot

### Required Change

Calendar indicators should be completely dynamic and based on actual database booking status.

### Calendar Dot Logic

**Example:** A day with multiple sessions

```
8
🟢 🟢

Morning Slot:  Booked (Green dot 1)
Afternoon Slot: Booked (Green dot 2)
```

### Status Mapping

| Booking Status | Calendar Display |
|---|---|
| No booking | No dots |
| Morning booked | 🟢 |
| Afternoon booked | 🟢 |
| Both sessions booked | 🟢 🟢 |

### Real-Time Requirement

When one faculty books a slot:
- Immediately update calendar
- Immediately update availability
- Immediately update other users' view
- **Without requiring page refresh**

### Booking Protection

Before confirming a booking:

**System must check:**
```
Is slot already booked by another faculty?
        ↓
If YES: Prevent duplicate allocation
If NO: Allow booking
```

**Error Message (if duplicate attempt):**
```
This slot has already been booked by another faculty.
Please choose another slot.
```

---

## Final Expected System Behaviour

After implementing all these improvements:

✅ Fine amounts are automatically controlled by violation type  
✅ Admin can review flagged violations directly from dashboard  
✅ Dashboard greetings are personalized with user's full name  
✅ Unnecessary "Not Checked-in Cutoff" logic removed  
✅ Calendar legend simplified  
✅ Slot booking cannot be reversed by users  
✅ Calendar reflects real-time booking status  
✅ Duplicate slot booking is prevented  
✅ Duty allocation becomes accurate and reliable  

These changes will make SIMS DMS more automated, secure, and easier to manage operationally.

---

## Implementation Priority

**Phase 1 (Critical):**
- Automatic fine amount selection
- Remove "Not Checked-in Cutoff"
- Remove slot unpick functionality

**Phase 2 (High):**
- Dynamic full name greeting
- Flagged violations popup review
- Real-time calendar indicators

**Phase 3 (Medium):**
- Calendar legend cleanup
