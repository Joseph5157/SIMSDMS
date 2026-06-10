# Production Deployment Verification Checklist

**Branch:** `001-auth-user-accounts` (commit a8dd8b2)
**Pushed:** ✅ Yes
**Date:** 2026-06-10

---

## Phase 1: Production Database Pre-Checks

### 1.1 Check for Duplicate Duty Slots
**Risk:** Migration `20260610000005_phase2_duty_slot_unique_safe` adds unique constraint on `(duty_date, session_type)`. If duplicates exist, migration fails.

**Command:**
```sql
SELECT duty_date, session_type, COUNT(*) AS count
FROM duty_slots
GROUP BY duty_date, session_type
HAVING COUNT(*) > 1
ORDER BY count DESC, duty_date DESC;
```

**Expected Result:** ✅ 0 rows (no duplicates)
**If Found:** ❌ BLOCKER - Run cleanup before deploying:
```sql
DELETE FROM duty_slots
WHERE id NOT IN (
  SELECT MAX(id) FROM duty_slots
  GROUP BY duty_date, session_type
);
```

**Status:** [ ] PASS / [ ] FAIL / [ ] NOT_RUN

---

### 1.2 Check for Duplicate Open Cover Requests
**Risk:** Migration `20260610000003_cover_request_open_unique` adds partial unique index on `(duty_slot_id)` WHERE `status='open'`. Duplicates will cause migration to fail.

**Command:**
```sql
SELECT duty_slot_id, COUNT(*) AS count
FROM cover_requests
WHERE status = 'open'
GROUP BY duty_slot_id
HAVING COUNT(*) > 1
ORDER BY count DESC;
```

**Expected Result:** ✅ 0 rows (no duplicate open requests per slot)
**If Found:** ❌ BLOCKER - Close duplicates before deploying:
```sql
UPDATE cover_requests SET status = 'cancelled'
WHERE id NOT IN (
  SELECT MAX(id) FROM cover_requests
  WHERE status = 'open'
  GROUP BY duty_slot_id
);
```

**Status:** [ ] PASS / [ ] FAIL / [ ] NOT_RUN

---

### 1.3 Verify session_version Column Not Already Present
**Risk:** If `session_version` already exists, migration will fail. Check if previous attempt left partial state.

**Command:**
```sql
SELECT EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_name = 'users' AND column_name = 'session_version'
) AS column_exists;
```

**Expected Result:** ✅ false (0 rows or column_exists = false)
**If true:** ⚠️ Column already exists - verify migration state with:
```sql
SELECT version FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 1;
```

**Status:** [ ] PASS / [ ] FAIL / [ ] NOT_RUN

---

## Phase 2: Prisma Migration Safety

### 2.1 Test Migrations in Staging
**Command:**
```bash
cd sims-disclipne
git checkout 001-auth-user-accounts
npx prisma migrate status
```

**Expected Output:**
- Shows 4 pending migrations (if none applied yet):
  - `20260610000003_cover_request_open_unique`
  - `20260610000004_phase1_session_version_fixed`
  - `20260610000005_phase2_duty_slot_unique_safe`
  - `20260610000006_phase5_message_indexes`

**Status:** [ ] PASS / [ ] FAIL / [ ] NOT_RUN

---

### 2.2 Apply Migrations (Staging Only)
**Command:**
```bash
npx prisma migrate deploy
```

**Expected:**
- All 4 migrations apply successfully
- No SQL errors
- `_prisma_migrations` table updated with new entries

**Success Indicators:**
```sql
SELECT migration_name FROM _prisma_migrations 
WHERE migration_name LIKE '202606100000%'
ORDER BY finished_at;
```
Should return:
- ✅ `20260610000003_cover_request_open_unique`
- ✅ `20260610000004_phase1_session_version_fixed`
- ✅ `20260610000005_phase2_duty_slot_unique_safe`
- ✅ `20260610000006_phase5_message_indexes`

**Status:** [ ] PASS / [ ] FAIL / [ ] NOT_RUN

---

## Phase 3: CSRF & Cookie Safety

### 3.1 CSRF Middleware Does Not Block OTP Login
**Route:** `POST /auth/request-otp`

**Test:**
```bash
curl -X POST http://localhost:3000/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"telegram_id": "123456789"}' \
  -i
```

**Expected:**
- ✅ Status 200 or 409 (user not found is OK)
- ✅ NOT 403 (CSRF error)
- ✅ Response header includes `Set-Cookie: sims_csrf=...` (new CSRF token)

**Reason:** GET request to `/auth/request-otp` should set CSRF token before mutating. OTP endpoint should NOT require X-CSRF-Token (first request has no token yet).

**Status:** [ ] PASS / [ ] FAIL / [ ] NOT_RUN

---

### 3.2 CSRF Middleware Does Not Block Telegram Webhook
**Route:** `POST /bot/webhook/:secret`

**Verification (code review only):**
```bash
grep -A 5 "router.use(.*csrf" server/index.js
```

**Expected:**
```javascript
app.use((req, res, next) => {
  if (req.path.startsWith('/bot') || req.path === '/health') {
    return next();
  }
  csrfMiddleware(req, res, next);
});
```

✅ `/bot` routes are exempt from CSRF middleware

**Status:** [ ] PASS / [ ] FAIL / [ ] CONFIRMED_IN_CODE

---

### 3.3 New Login Creates Both Cookies
**Test:**
1. Create test user via admin
2. Login with OTP flow
3. Inspect response headers

**Command (after successful OTP verification):**
```bash
curl -i http://localhost:3000/users/me \
  -H "Cookie: sims_token=YOUR_TOKEN"
```

**Expected Response Headers:**
```
Set-Cookie: sims_token=...; HttpOnly; Secure; SameSite=...
Set-Cookie: sims_csrf=...; Secure; SameSite=...
```

**Verify:**
- ✅ `sims_token` present and HttpOnly
- ✅ `sims_csrf` present and NOT HttpOnly (readable by JS for X-CSRF-Token header)
- ✅ Both have Secure flag in production

**Status:** [ ] PASS / [ ] FAIL / [ ] NOT_RUN

---

### 3.4 Mutations Send X-CSRF-Token Header
**Test:** Submit mutation from frontend

**Command (using Firefox/Chrome DevTools Network tab):**
1. Open app
2. Navigate to any profile edit form
3. Open DevTools → Network tab
4. Submit form
5. Inspect the PATCH request headers

**Expected Request Headers:**
```
X-CSRF-Token: <token from sims_csrf cookie>
```

**Alternative (curl with cookies):**
```bash
# Get CSRF token from cookie first
CSRF=$(curl -s http://localhost:3000 | grep -oP 'sims_csrf=\K[^;]+')

# Send mutation with token
curl -X PATCH http://localhost:3000/users/me/profile \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF" \
  -H "Cookie: sims_csrf=$CSRF; sims_token=YOUR_JWT" \
  -d '{"name": "Updated Name"}' \
  -i
```

**Expected:**
- ✅ Status 200 (success) or 403 (CSRF mismatch - only if token is wrong)
- ✅ NOT missing token error

**Status:** [ ] PASS / [ ] FAIL / [ ] NOT_RUN

---

## Phase 4: Session Invalidation

### 4.1 Old JWT Sessions Revoked on User State Change
**Test:**
1. Login and get JWT token
2. Deactivate user from admin panel
3. Try to use old JWT to call `/users/me`

**Expected:**
- ✅ Status 401 SESSION_REVOKED
- ✅ Message: "Your session has been revoked"

**Verification (code review):**
```bash
grep -A 10 "session_version !== user.session_version" server/middleware/authenticate.js
```

**Expected:**
```javascript
if (payload.session_version !== undefined && payload.session_version !== user.session_version) {
  return res.status(401).json({ error: true, code: 'SESSION_REVOKED', ... });
}
```

✅ JWT session_version must match DB value

**Status:** [ ] PASS / [ ] FAIL / [ ] CONFIRMED_IN_CODE

---

### 4.2 Deactivate/Reactivate/Delete Increment session_version
**Verification (code review):**
```bash
grep -B 2 "session_version.*increment" server/controllers/users.controller.js
```

**Expected to find:**
- ✅ `deactivateUser`: `session_version: { increment: 1 }`
- ✅ `reactivateUser`: `session_version: { increment: 1 }`
- ✅ `deleteUser`: `session_version: { increment: 1 }`
- ✅ `resetUserLogin`: `session_version: { increment: 1 }`

**Status:** [ ] PASS / [ ] FAIL / [ ] CONFIRMED_IN_CODE

---

## Phase 5: Telegram Verification Safety

### 5.1 Manual telegram_id Entry Does Not Activate User
**Verification (code review):**
```bash
grep -A 10 "async function createUser" server/controllers/users.controller.js | head -20
```

**Expected:**
```javascript
status: 'pending_telegram',        // ✅ Always pending, never active
telegram_verified: false,          // ✅ Always false
telegram_invite_token: token,      // ✅ Requires token verification
```

✅ Even if admin provides `telegram_id`, user stays `pending_telegram`

**Status:** [ ] PASS / [ ] FAIL / [ ] CONFIRMED_IN_CODE

---

### 5.2 resetUserLogin Clears Telegram and Resets Status
**Verification (code review):**
```bash
grep -A 10 "async function resetUserLogin" server/controllers/users.controller.js | head -15
```

**Expected:**
```javascript
telegram_id: null,                 // ✅ Clears Telegram ID
telegram_verified: false,          // ✅ Removes verification flag
status: 'pending_telegram',        // ✅ Returns to pending state
telegram_invite_token: token,      // ✅ New token issued
session_version: { increment: 1 }  // ✅ Revokes all sessions
```

✅ Proper state reset + session invalidation

**Status:** [ ] PASS / [ ] FAIL / [ ] CONFIRMED_IN_CODE

---

## Phase 6: Covered Duty Workflows

### 6.1 Covered Faculty Can Check In/Out
**Verification (code review):**
```bash
grep -A 5 "covered_by !== facultyId" server/controllers/attendance.controller.js
```

**Expected:**
```javascript
if (slot.faculty_id !== facultyId && slot.covered_by !== facultyId) {
  return res.status(403).json(...);
}
```

✅ Faculty can access slot if they're covering it (covered_by = facultyId)

**Test:**
1. Create duty slot assigned to Faculty A
2. Create cover request
3. Faculty B volunteers and is confirmed as covering
4. Faculty B checks in to the slot
5. Faculty B checks out

**Expected:**
- ✅ Faculty B can POST `/attendance/:slotId/check-in`
- ✅ Faculty B can POST `/attendance/:slotId/check-out`
- ✅ Slot status changes to 'completed'

**Status:** [ ] PASS / [ ] FAIL / [ ] NOT_RUN

---

### 6.2 Covered Faculty Can Record Violations
**Verification (code review):**
```bash
grep -A 5 "covered_by !== req.user.id" server/controllers/violations.controller.js
```

**Expected:**
```javascript
if (!slot || (slot.faculty_id !== req.user.id && slot.covered_by !== req.user.id)) {
  return res.status(403).json({ error: true, code: 'FORBIDDEN', ... });
}
```

✅ Faculty can record violations if they're covering the slot

**Test:**
1. Faculty B is covering Slot (Faculty A assigned)
2. Faculty B records violation during duty
3. Violation is created with faculty_id = Faculty B

**Expected:**
- ✅ Status 201 (created)
- ✅ `faculty_id` in violation = Faculty B (who recorded it)
- ✅ `duty_slot_id` = correct slot

**Status:** [ ] PASS / [ ] FAIL / [ ] NOT_RUN

---

### 6.3 getLive Exposes covering_faculty and performed_by_id
**Verification (code review):**
```bash
grep -A 20 "async function getLive" server/controllers/attendance.controller.js | grep -E "covering|performed"
```

**Expected:**
```javascript
covering_faculty: s.coveringFaculty ?? null,    // ✅ Shows who's covering
performed_by_id: s.covered_by ?? s.faculty_id,  // ✅ Shows actual performer
```

✅ Admin dashboard can see who's actually performing duty

**Test:**
1. GET `/attendance/live`
2. Inspect response for slots with coverage

**Expected JSON:**
```json
{
  "slot_id": "...",
  "faculty": { "id": "A", "name": "Faculty A" },
  "covering_faculty": { "id": "B", "name": "Faculty B" },
  "performed_by_id": "B",
  ...
}
```

**Status:** [ ] PASS / [ ] FAIL / [ ] NOT_RUN

---

## Phase 7: Cover Request Workflows

### 7.1 One Open Request Per Slot (Unique Index)
**Test:**
1. Create two open cover requests for the same duty slot
2. Second request should be rejected

**Expected:**
- ✅ First request: Status 201 (created)
- ✅ Second request: Status 409 (P2002 unique constraint violation)
- ✅ Error message: "An open cover request already exists for this duty slot"

**SQL Verification:**
```sql
-- Check that unique index exists
SELECT indexname FROM pg_indexes 
WHERE tablename = 'cover_requests' 
AND indexname LIKE '%open_unique%';
```

Expected result: `cover_requests_duty_slot_id_open_unique`

**Status:** [ ] PASS / [ ] FAIL / [ ] NOT_RUN

---

### 7.2 Volunteer Claim Is Atomic (Double-Booking Check)
**Test:**
1. Create duty slot for Faculty A
2. Faculty B has another duty at same time
3. Faculty B tries to volunteer for Faculty A's duty

**Expected:**
- ✅ Status 409 DOUBLE_BOOKING
- ✅ Message: "You already have a duty scheduled for this date and time"
- ✅ Cover request remains 'open' (volunteer_id still null)

**Code Verification:**
```bash
grep -A 5 "Double-booking check" server/controllers/cover-requests.controller.js
```

Expected to find check for conflicting duties before volunteer claim

**Status:** [ ] PASS / [ ] FAIL / [ ] NOT_RUN

---

### 7.3 Confirm Closes Sibling Open Requests
**Test:**
1. Create multiple open cover requests for same slot
2. Confirm one volunteer
3. Check status of other requests

**Expected:**
- ✅ Confirmed request: Status 'covered'
- ✅ Other open requests for same slot: Status 'cancelled' (automatically closed)
- ✅ Slot status: 'covered'

**Code Verification:**
```bash
grep -A 15 "Phase 3: Close sibling" server/controllers/cover-requests.controller.js
```

Expected: UpdateMany to cancel other open requests in transaction

**Status:** [ ] PASS / [ ] FAIL / [ ] NOT_RUN

---

## Phase 8: Duty Slot Duplicate Prevention

### 8.1 pickSlot Transaction Prevents Race Condition
**Test (concurrent requests):**
```bash
# Terminal 1 & 2 - Run simultaneously
for i in {1..5}; do
  curl -X POST http://localhost:3000/duty-slots/pick \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer FACULTY_TOKEN" \
    -d '{"duty_date": "2026-06-20", "session_type": "morning"}' &
done
```

**Expected:**
- ✅ Exactly ONE succeeds with 201
- ✅ Others get 409 SLOT_TAKEN (not 500 error)
- ✅ No duplicate slots created

**SQL Verification:**
```sql
SELECT COUNT(*) FROM duty_slots 
WHERE duty_date = '2026-06-20' AND session_type = 'morning';
```

Expected: 1

**Status:** [ ] PASS / [ ] FAIL / [ ] NOT_RUN

---

### 8.2 adminAssign Uses Transaction
**Verification (code review):**
```bash
grep -B 2 "await prisma.\$transaction" server/controllers/duty-slots.controller.js | head -10
```

Expected: adminAssign wrapped in transaction with P2002 error handling

**Status:** [ ] PASS / [ ] FAIL / [ ] CONFIRMED_IN_CODE

---

### 8.3 assignSlots Has Global Conflict Detection
**Verification (code review):**
```bash
grep "Phase 2: Global conflict check" server/controllers/calendar.controller.js
```

Expected: Check for existing slots globally (not per-faculty)

**Status:** [ ] PASS / [ ] FAIL / [ ] CONFIRMED_IN_CODE

---

## Summary

| Check | Status | Notes |
|-------|--------|-------|
| 1.1 Duplicate Duty Slots | [ ] | SQL command provided |
| 1.2 Duplicate Open Requests | [ ] | SQL command provided |
| 1.3 session_version Not Pre-existing | [ ] | SQL command provided |
| 2.1 Migrations Pending | [ ] | Run `prisma migrate status` |
| 2.2 Migrations Apply | [ ] | Run `prisma migrate deploy` |
| 3.1 OTP Login Not Blocked | [ ] | Curl command provided |
| 3.2 Telegram Webhook Exempt | [ ] | Code review passed |
| 3.3 Both Cookies Created | [ ] | Manual browser test |
| 3.4 X-CSRF-Token Sent | [ ] | DevTools or curl |
| 4.1 Session Revoked on Deactivate | [ ] | Manual test |
| 4.2 session_version Incremented | [ ] | Code review passed |
| 5.1 Manual Telegram No Activation | [ ] | Code review passed |
| 5.2 resetUserLogin Resets State | [ ] | Code review passed |
| 6.1 Covered Faculty Check In/Out | [ ] | Manual test |
| 6.2 Covered Faculty Record Violations | [ ] | Manual test |
| 6.3 getLive Exposes Coverage Info | [ ] | Manual test |
| 7.1 One Open Request Per Slot | [ ] | Manual test + SQL |
| 7.2 Volunteer Double-Booking Check | [ ] | Manual test |
| 7.3 Confirm Closes Siblings | [ ] | Manual test |
| 8.1 pickSlot Race Condition Safe | [ ] | Concurrent test |
| 8.2 adminAssign Uses Transaction | [ ] | Code review passed |
| 8.3 assignSlots Global Conflict Check | [ ] | Code review passed |

---

## Blockers Before Deployment

- [ ] No SQL errors from duplicate checks
- [ ] No migration failures
- [ ] CSRF not blocking OTP/webhook
- [ ] Both cookies set on login
- [ ] X-CSRF-Token header sent on mutations
- [ ] Covered duty workflows functional
- [ ] No duplicate prevention bypasses

**If all items pass → SAFE TO MERGE TO MAIN**

