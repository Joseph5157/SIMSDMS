# SIMS DMS Problems 25 — User Dashboard: Personalize Student Violations to Individual Faculty

**Status:** Open · **Priority:** High · **Areas:** Faculty Dashboard, Data Privacy, Security, Student Violations

---

## Current Problem

The current Student Violations section inside the Faculty/User Dashboard is showing student violation data globally. This means a faculty user can see violations recorded by other faculty members as well, which is not the intended behaviour.

Each faculty member should have their own personalized violation view based only on the violations they recorded themselves.

---

## Why This Matters

- **Data Privacy:** Faculty should not see other faculty members' records
- **Security:** Role-based access control must be enforced at the backend
- **User Experience:** Faculty should see personalized data relevant to their role
- **Compliance:** User data access should be restricted to their own records

---

## Required Change

The Student Violations section in the Faculty/User Dashboard should be personalized.

### Data Filtering Logic

The system should filter violation records based on the logged-in user's ID:

```
student_violations.faculty_id = logged_in_user_id
```

Only matching records should be returned. No other faculty violation records should be visible.

---

## Expected Behaviour

When a faculty member logs in:

**Example:** Dr. Rahmatulla

The Student Violations section should show only:
- Students whose violations were recorded by Dr. Rahmatulla
- Violation types recorded by Dr. Rahmatulla
- Dates when Dr. Rahmatulla recorded violations
- Fine details (if applicable)
- Remarks/comments added by Dr. Rahmatulla

---

## 1. User Violation Dashboard Layout

### Summary Cards

**Total Violations Recorded**
```
Total Violations Recorded
25
```

**Students Reported**
```
Students Reported
18
(Unique students with violations recorded by this faculty)
```

**Most Common Violation**
```
Most Common
Uniform Violation
8 cases
```

**This Month**
```
This Month
12 violations
```

---

## 2. Violation List Table

Display only their recorded violations:

| Student | Violation Type | Date | Fine | Status |
|---------|---|---|---|---|
| Rahul | Uniform | 05 Jul | ₹50 | Recorded |
| Sneha | Late Coming | 06 Jul | ₹100 | Recorded |
| Amit | Mobile Usage | 07 Jul | ₹200 | Recorded |

---

## 3. Personal Analytics (Optional)

Since the admin dashboard has detailed analytics, the faculty dashboard can have a simplified personal analytics view.

### Monthly Violation Trend Graph
Graph showing the number of violations recorded by that faculty every month:
```
Violations
|
|        *
|     *
|  *
|________________
 Jan Feb Mar Apr
```

### Violation Type Breakdown
```
Uniform Violation     10
Late Coming            5
Mobile Usage           3
Misbehaviour           2
Other                  5
```

---

## 4. Student Detail View

When faculty clicks a student violation record:
- Show only the violations recorded by that faculty member
- Do not show violations recorded by other faculty members
- Do not show college-wide violation history for that student

---

## 5. Security Requirement (CRITICAL)

This is also a data privacy and security issue.

### ❌ Incorrect Approach
```
Fetch All Violations
        ↓
Filter in Frontend (JavaScript)
        ↓
Hide Unwanted Records
```

**Problem:** All data is sent to client; frontend filtering can be bypassed.

### ✅ Correct Approach
```
Logged-in Faculty ID
        ↓
Backend API Query Filter
        ↓
Return Only Their Violations
        ↓
Display Dashboard
```

**Requirement:** The filtering MUST happen at the backend/API level, not in the frontend.

### Backend Implementation
The API endpoint should:
1. Extract `logged_in_user_id` from the JWT token/session
2. Filter the query: `WHERE faculty_id = logged_in_user_id`
3. Return only matching records
4. Never return all violations and expect frontend to filter

---

## Final Expected Outcome

Each faculty member gets a personalized Student Violations dashboard.

### Faculty Can See ✅
- Students they personally reported
- Their recorded violation history
- Their monthly/yearly violation statistics
- Their own discipline tracking data
- Only violations they created

### Faculty Cannot See ❌
- Other faculty members' violation records
- Complete college violation database
- Violations recorded by colleagues
- Global discipline statistics

---

## Implementation Notes

### Backend Changes Required
- Modify the Student Violations API endpoint to filter by `faculty_id`
- Ensure JWT token contains the logged-in faculty ID
- Validate that the user has permission to view their own data

### Frontend Changes Required
- Update dashboard to call the personalized API endpoint
- Display personalized summary cards
- Show only the faculty member's violations in tables and graphs
- Remove any global violation data display

### Database Query Example
```sql
SELECT * FROM student_violations 
WHERE faculty_id = @logged_in_user_id
ORDER BY recorded_date DESC;
```

---

## Security Checklist

- [ ] Filtering happens at backend API level
- [ ] Frontend cannot bypass filters
- [ ] JWT token validation in place
- [ ] Logged-in user ID correctly extracted
- [ ] Only authorized violations returned
- [ ] No global violation data exposed to faculty dashboard
- [ ] Test: Faculty A cannot see Faculty B's records
