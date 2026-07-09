# SIMS DMS Problems 27 — User-Initiated Duty Reassignment Functionality

**Status:** Open · **Priority:** High · **Areas:** Faculty Dashboard, Duty Management, Notifications, Workflow

---

## Current System (To Be Modified)

Currently, when a faculty member is unable to attend a duty slot:

1. Faculty clicks the Reassignment button from their duty slot
2. A message popup opens
3. Faculty sends a message/request to Admin explaining:
   - Duty date
   - Session (Morning/Afternoon)
   - Reason for inability to attend
   - Request to allocate duty to another faculty member

**Example:**
```
To: Admin
Subject: Duty reassignment request — 09 Jul morning
Message: I am unable to attend my morning duty on Thursday, 9 July.
         Kindly reassign it to another faculty member.
Reason: _________
```

4. Admin reviews the request
5. Admin manually reassigns the duty to another faculty member

---

## Required Modification

The workflow needs to be fundamentally changed:

**Current (To Remove):** Faculty → Message Admin → Admin Reassigns  
**New (To Implement):** Faculty → Request Colleague → Colleague Accepts → Duty Transfers

The faculty should **no longer send reassignment requests to admin through messaging**. The new reassignment system should allow faculty members to **directly request another faculty member to take over their duty**.

---

## New Rule: Faculty-to-Faculty Reassignment

A faculty member can:
- ✅ Select another available faculty member
- ✅ Send a reassignment request
- ✅ Wait for acceptance
- ✅ Transfer the duty after approval

A faculty member cannot:
- ❌ Send reassignment requests to admin
- ❌ Use the messaging system as the reassignment workflow
- ❌ Directly transfer their duty without approval

---

## Revised User Reassignment Workflow

### Step 1: Faculty Clicks "Request Reassignment"

**Location:** My Slots section

**Current slot view:**
```
Upcoming duty:
09 July 2026
Morning Session
Scheduled

[Request Reassignment]
```

When clicked:
- A dedicated reassignment popup opens (NOT a message compose window)

---

### Step 2: Reassignment Popup

A dedicated reassignment form opens with all necessary fields:

**Form Layout:**
```
Request Duty Reassignment

Duty Date:
09 July 2026

Session:
Morning

Current Assigned Faculty:
Dr. Rahmatulla

Select Faculty:
▼
- Jbr
- Sikha
- Dr. ABC

Reason:
[Optional text box]

[Send Request]
```

---

### Step 3: Recipient Selection Rules

The faculty dropdown should contain only eligible faculty members. The system must automatically check:

- ✅ Active faculty only
- ✅ Available faculty only
- ✅ No existing duty conflict
- ✅ Not already assigned for the same date/session
- ✅ Not the same requesting faculty member

**Example Filtering:**
```
Available Faculty:
✓ Jbr (no conflict)
✓ Sikha (no conflict)

Unavailable Faculty:
✕ Dr. ABC (already assigned morning duty on 09 July)
```

---

### Step 4: Request Sent

After submission:

**System Actions:**
- Create a pending reassignment request record
- Set status: `Pending Acceptance`
- The selected faculty receives notification

**Notification to Receiving Faculty:**
- Alert in dashboard
- Pending reassignment request visible
- Request details available

---

### Step 5: Receiving Faculty Approval

The receiving faculty sees a reassignment request popup:

**Popup Content:**
```
Duty Reassignment Request

From:
Dr. Rahmatulla

Duty:
09 July 2026
Morning Session

Reason:
Unable to attend

[Accept]  [Reject]
```

---

### Step 6: Acceptance & Duty Transfer

**Only after acceptance:**
- System transfers ownership
- Original faculty slot removed/marked as reassigned
- New faculty slot added

**Before Acceptance:**
```
09 July - Morning
Assigned: Dr. Rahmatulla
Status: Scheduled
```

**After Acceptance:**
```
09 July - Morning
Assigned: Jbr
Status: Scheduled (transferred)
```

---

## Data Synchronization After Successful Acceptance

### Original Faculty View
**My Slots (Before):**
```
09 July
Morning Session
Scheduled
```

**My Slots (After):**
```
09 July
Morning Session
Reassigned to Jbr
```

Or remove from upcoming duties if admin prefers.

### New Faculty View
**My Slots (After):**
```
09 July
Morning Session
Duty received through reassignment
```

### Admin View (Duty Slots Section)
**Update Record:**
- Faculty: Jbr
- Status: Reassigned

**Maintain Reassignment History:**
```
Original: Dr. Rahmatulla
Transferred To: Jbr
Requested By: Dr. Rahmatulla
Accepted By: Jbr
Date Transferred: [date/time]
```

---

## Admin Reassignment Remains Different

The existing admin reassignment functionality remains unchanged and separate.

**Admin Authority:**
- Admin can directly reassign any duty
- No approval required
- Immediate transfer

**Admin Reassignment Flow:**
```
Admin selects faculty
        ↓
System checks eligibility
        ↓
Duty immediately transferred
        ↓
Both faculties notified
```

---

## Final System Logic: Two Separate Reassignment Methods

### Method 1: Admin-Controlled Reassignment

**Purpose:** Administrative correction/intervention

**Flow:**
```
Admin Dashboard
        ↓
Select duty slot
        ↓
Select target faculty
        ↓
Confirm reassignment
        ↓
Duty immediately transferred
        ↓
No approval required
        ↓
Both faculties notified
```

---

### Method 2: Faculty-Requested Reassignment

**Purpose:** Faculty-to-faculty duty adjustment

**Flow:**
```
Faculty Dashboard
        ↓
Click "Request Reassignment"
        ↓
Select colleague from dropdown
        ↓
Add reason (optional)
        ↓
Send request
        ↓
Colleague receives notification
        ↓
Colleague reviews and accepts/rejects
        ↓
If accepted: Duty transfers automatically
        ↓
Both faculties notified
```

---

## Important Change From Previous Design

### What to Remove

The messaging popup shown in the current system:
```
Reassignment Button
        ↓
Message Popup (Compose)
        ↓
Send Request To Admin
```

**Should be completely removed** from the faculty reassignment process.

### What to Add

The reassignment button should now open:
```
Reassignment Button
        ↓
Dedicated Reassignment Request Popup
        ↓
Select Faculty + Reason
        ↓
Send Request (Not Message)
```

### Keep Messaging Separate

Messaging functionality remains only for:
- Normal communication between Admin ↔ Faculty
- NOT part of the duty reassignment workflow

---

## Workflow Comparison

### Current System (To Remove)
```
Faculty unable to attend
        ↓
Clicks "Reassignment"
        ↓
Messaging popup opens
        ↓
Composes message to Admin
        ↓
Sends request to Admin
        ↓
Admin reviews message
        ↓
Admin manually reassigns
```

### New System (To Implement)
```
Faculty unable to attend
        ↓
Clicks "Request Reassignment"
        ↓
Reassignment popup opens
        ↓
Selects colleague from dropdown
        ↓
Adds optional reason
        ↓
Sends reassignment request
        ↓
Colleague receives notification
        ↓
Colleague accepts/rejects
        ↓
If accepted: Duty transfers automatically
```

---

## Key Benefits

✅ **Faster Resolution:** Faculty-to-faculty, no admin waiting time  
✅ **Clearer Communication:** Dedicated form, not messaging  
✅ **Better Tracking:** Reassignment history maintained  
✅ **Mutual Agreement:** Both parties involved in decision  
✅ **Reduced Admin Load:** Admin no longer handles routine reassignments  
✅ **Improved Fairness:** Colleague can accept/reject based on availability  
✅ **Audit Trail:** Complete reassignment history recorded  

---

## Implementation Notes

### Backend Requirements
- Create `duty_reassignment_requests` table
- Add fields: `from_faculty_id`, `to_faculty_id`, `duty_slot_id`, `status`, `reason`, `created_at`, `accepted_at`
- Add API endpoints for request creation, acceptance, rejection
- Add validation for recipient eligibility
- Add notification system

### Frontend Requirements
- Replace messaging popup with dedicated reassignment form
- Add faculty dropdown with real-time eligibility filtering
- Create reassignment request notification UI
- Add acceptance/rejection interface
- Update My Slots view to show reassignment status

### Database Schema
```sql
CREATE TABLE duty_reassignment_requests (
    id UUID PRIMARY KEY,
    from_faculty_id UUID NOT NULL,
    to_faculty_id UUID NOT NULL,
    duty_slot_id UUID NOT NULL,
    reason TEXT,
    status ENUM('pending', 'accepted', 'rejected'),
    created_at TIMESTAMP,
    accepted_at TIMESTAMP,
    FOREIGN KEY (from_faculty_id) REFERENCES faculty(id),
    FOREIGN KEY (to_faculty_id) REFERENCES faculty(id),
    FOREIGN KEY (duty_slot_id) REFERENCES duty_slots(id)
);
```
