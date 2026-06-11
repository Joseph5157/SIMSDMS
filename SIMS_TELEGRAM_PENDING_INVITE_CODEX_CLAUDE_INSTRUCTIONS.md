# SIMS DMS Telegram Pending Invite Auth Redesign — Claude Code / Codex Instructions

## Purpose

Redesign SIMS DMS account creation to use the cleaner Telegram onboarding pattern from `upgraded-main.zip`:

```text
Admin creates PendingInvite
→ no real User is created yet
→ admin shares Telegram invite link
→ user taps Telegram bot link
→ bot verifies the invite
→ real User is created as active with telegram_id linked
→ user logs in using Email + Telegram OTP
```

The current SIMS DMS project already has a strong login system. Keep the login system. Change only the account creation / Telegram activation design.

## Important project context

Current SIMS DMS stack:

```text
Backend: Node.js + Express + Prisma + PostgreSQL
Frontend: React + Vite + TanStack Query
Auth: Email login + Telegram OTP
Session: JWT in httpOnly cookie
CSRF: sims_csrf cookie + X-CSRF-Token header
Roles: super_admin, admin, faculty
```

Inspiration project: `upgraded-main.zip`.

Use only this idea from `upgraded-main.zip`:

```text
PendingInvite first, actual User created only after Telegram activation.
```

Do not copy the Laravel-specific implementation, Portal ID login, vendor/client concepts, SHA-256 OTP storage, or session-auth design.

## User/project assumption

There are no old created faculty/admin accounts that need migration support.

Therefore:

```text
No backward compatibility is required for old users with status=pending_telegram.
No old user-based invite tokens need to remain activatable.
A clean database/schema redesign is allowed.
```

Still preserve the seed/bootstrap super admin account, because admins are needed to create invites.

---

# Non-negotiable rules

## Keep these from SIMS DMS

- Keep login as `Email → Telegram OTP → JWT httpOnly cookie`.
- Keep bcrypt-based OTP hashing in `OtpSession.otp_hash`.
- Keep `sims_token` httpOnly cookie.
- Keep CSRF protection.
- Keep role guards and `session_version` revocation.
- Keep `super_admin`, `admin`, and `faculty` roles.
- Keep soft delete behavior for real users.
- Keep audit logging for admin actions.

## Do not add these

- Do not add password login.
- Do not use localStorage tokens.
- Do not copy Portal ID login from the Laravel project.
- Do not copy vendor/client/account-balance/order logic from the Laravel project.
- Do not store OTP using raw SHA-256.
- Do not allow admin to manually enter Telegram ID during account creation.
- Do not create a real `User` row before Telegram activation.

---

# Current files to inspect first

Inspect these before editing:

```text
prisma/schema.prisma
prisma/seed.js
server/index.js
server/lib/bot.js
server/lib/telegram.js
server/lib/prisma.js
server/controllers/auth.controller.js
server/controllers/users.controller.js
server/routes/auth.routes.js
server/routes/users.routes.js
server/routes/admin.routes.js
server/schemas/users.schema.js
server/middleware/authenticate.js
server/middleware/authorize.js
server/middleware/csrf.js
server/services/audit.service.js
client/src/hooks/useUsers.js
client/src/components/CreateUserDrawer.jsx
client/src/pages or client/src/App.jsx routes related to users/admin
client/src/utils/api.js
server/tests/auth.test.mjs
```

Reference from `upgraded-main.zip` only for the concept:

```text
app/Http/Controllers/Admin/InviteController.php
app/Models/PendingInvite.php
app/Http/Controllers/BotController.php invite activation section
```

---

# Desired final design

## New account creation flow

```text
Admin/Super Admin opens Invite User UI
→ enters name, email, role, department, designation, phone
→ backend creates PendingInvite
→ backend returns invite_link
→ admin copies/shares invite link
→ faculty/admin taps Telegram bot link
→ bot creates active User
→ PendingInvite is consumed/deleted
→ user logs in with email and receives OTP on Telegram
```

## Existing user Telegram reset flow

For a future real user who loses Telegram access, do not create a PendingInvite. Use a separate relink/reset flow:

```text
Super admin clicks Reset Login / Reset Telegram
→ existing User remains in users table
→ telegram_id is cleared
→ telegram_verified=false
→ session_version increments
→ unverified OTP sessions are deleted/expired
→ TelegramRelinkToken is created
→ user taps Telegram relink link
→ bot links new telegram_id to the same existing user
→ user status returns to active
```

This keeps new-account invites separate from existing-account Telegram relinks.

---

# Database / Prisma changes

## 1. Add `PendingInvite` model

Add this to `prisma/schema.prisma`:

```prisma
model PendingInvite {
  id                String   @id @default(uuid())
  name              String   @db.VarChar(150)
  email             String   @unique @db.VarChar(200)
  phone             String?  @db.VarChar(20)
  role              Role
  department        String?  @db.VarChar(100)
  designation       String?  @db.VarChar(100)

  invite_token      String   @unique @db.VarChar(100)
  invite_expires_at DateTime

  invited_by        String
  created_at        DateTime @default(now())
  updated_at        DateTime @updatedAt

  inviter           User     @relation("PendingInvitesCreated", fields: [invited_by], references: [id])

  @@index([invite_expires_at])
  @@index([role])
  @@map("pending_invites")
}
```

Add relation to `User`:

```prisma
pendingInvitesCreated PendingInvite[] @relation("PendingInvitesCreated")
```

## 2. Add `TelegramRelinkToken` model

Add this to `prisma/schema.prisma`:

```prisma
model TelegramRelinkToken {
  id          String    @id @default(uuid())
  user_id     String
  token       String    @unique @db.VarChar(100)
  expires_at  DateTime
  used_at     DateTime?
  created_by  String
  created_at  DateTime  @default(now())

  user        User      @relation("TelegramRelinkTokens", fields: [user_id], references: [id])
  creator     User      @relation("TelegramRelinkTokensCreated", fields: [created_by], references: [id])

  @@index([user_id])
  @@index([expires_at])
  @@map("telegram_relink_tokens")
}
```

Add relations to `User`:

```prisma
telegramRelinkTokens        TelegramRelinkToken[] @relation("TelegramRelinkTokens")
telegramRelinkTokensCreated TelegramRelinkToken[] @relation("TelegramRelinkTokensCreated")
```

## 3. Simplify invite fields on `User`

Since there are no old pending accounts, remove new-account invite state from `User`:

```prisma
telegram_invite_token
telegram_invite_expires_at
```

Do not use these fields anymore.

Recommended `UserStatus`:

```prisma
enum UserStatus {
  active
  inactive
  telegram_unlinked
}
```

Use `telegram_unlinked` only for existing users during Telegram reset/relink.

If minimizing schema churn is preferred, you may keep `pending_telegram` as a status name, but it must mean only "existing real user temporarily needs Telegram relink". It must not be used for new account creation.

## 4. Generate migration

Create a Prisma migration for:

```text
pending_invites table
telegram_relink_tokens table
removal or deprecation of user invite-token columns
updated UserStatus enum if changed
indexes and unique constraints
```

Run:

```bash
npx prisma format
npx prisma migrate dev --name telegram_pending_invites
npx prisma generate
```

If working against production later, use the proper production migration workflow instead of `migrate dev`.

---

# Backend implementation

## 1. Add invite schema

Create:

```text
server/schemas/invites.schema.js
```

Use Zod validation:

```js
const { z } = require('zod');

const createInviteSchema = z.object({
  name: z.string().trim().min(1).max(150),
  email: z.string().trim().email().max(200),
  role: z.enum(['admin', 'faculty']),
  department: z.string().trim().max(100).optional().nullable(),
  designation: z.string().trim().max(100).optional().nullable(),
  phone: z.string().trim().max(20).optional().nullable(),
});

module.exports = { createInviteSchema };
```

## 2. Add invite controller

Create:

```text
server/controllers/invites.controller.js
```

Implement these functions:

```text
createInvite
listInvites
regenerateInvite
cancelInvite
```

### `createInvite` behavior

Route: `POST /invites`

Allowed roles:

```text
admin, super_admin
```

Authorization rules:

```text
super_admin can invite admin and faculty.
admin can invite faculty only.
admin cannot invite another admin.
No one can invite super_admin through this route.
```

Validation/logic:

```text
1. Validate name, email, role, department, designation, phone.
2. Normalize email to lowercase.
3. Check users table for same email where deleted_at is null.
4. Check pending_invites table for same email.
5. If duplicate exists, return 409.
6. Generate crypto.randomBytes(32).toString('hex') token.
7. Require TELEGRAM_BOT_USERNAME.
8. Create PendingInvite with 7-day expiry.
9. Return invite and invite_link.
10. Audit log action CREATE_INVITE.
```

Response shape:

```json
{
  "invite": {
    "id": "...",
    "name": "Dr. Example",
    "email": "example@sims.edu.in",
    "role": "faculty",
    "department": "Pharmacology",
    "designation": "Assistant Professor",
    "phone": "+91...",
    "invite_expires_at": "...",
    "created_at": "..."
  },
  "invite_link": "https://t.me/BOT_USERNAME?start=invite_TOKEN"
}
```

Do not expose `invite_token` directly in normal list responses. Return only generated `invite_link` for create/regenerate.

### `listInvites` behavior

Route: `GET /invites`

Allowed roles:

```text
admin, super_admin
```

Return active, unexpired pending invites first. Include expired invites only if a query like `?include_expired=true` is provided.

Return:

```text
id, name, email, role, department, designation, phone, invite_expires_at, created_at, inviter basic info
```

### `regenerateInvite` behavior

Route: `POST /invites/:id/regenerate`

```text
1. Find PendingInvite.
2. If missing, return 404.
3. Generate new token.
4. Set invite_expires_at to now + 7 days.
5. Return new invite_link.
6. Audit log REGENERATE_INVITE.
```

### `cancelInvite` behavior

Route: `DELETE /invites/:id`

```text
1. Find PendingInvite.
2. Delete it.
3. Audit log CANCEL_INVITE.
4. Return success.
```

## 3. Add invite routes

Create:

```text
server/routes/invites.routes.js
```

Routes:

```js
const { Router } = require('express');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const asyncHandler = require('../middleware/asyncHandler');
const { createInviteSchema } = require('../schemas/invites.schema');
const ctrl = require('../controllers/invites.controller');

const router = Router();

router.use(authenticate);
router.get('/', authorize('admin', 'super_admin'), asyncHandler(ctrl.listInvites));
router.post('/', authorize('admin', 'super_admin'), validate(createInviteSchema), asyncHandler(ctrl.createInvite));
router.post('/:id/regenerate', authorize('admin', 'super_admin'), asyncHandler(ctrl.regenerateInvite));
router.delete('/:id', authorize('admin', 'super_admin'), asyncHandler(ctrl.cancelInvite));

module.exports = router;
```

Register in `server/index.js`:

```js
const invitesRoutes = require('./routes/invites.routes');
app.use('/invites', invitesRoutes);
```

## 4. Change or remove `POST /users` creation

Current `POST /users` creates a real user with `status=pending_telegram`. This must stop.

Preferred clean change:

```text
Remove POST /users as an account creation route.
Use POST /invites instead.
```

If keeping `POST /users` temporarily to avoid frontend breakage, make it return `410 Gone` or internally delegate to `createInvite`. But the final frontend should call `/invites`.

Remove manual `telegram_id` handling from `createUser` logic.

## 5. Update `listUsers`

`GET /users` should list real users only.

Since new pending invites are not users, no pending invite should appear in `/users`.

Default behavior:

```text
where: { deleted_at: null }
```

Allow filters:

```text
role, status, search, page, limit
```

Valid statuses should be:

```text
active, inactive, telegram_unlinked
```

or if status enum is not renamed:

```text
active, inactive, pending_telegram
```

## 6. Remove or replace `GET /users/pending`

`GET /users/pending` is no longer the correct concept.

Preferred:

```text
Remove it and use GET /invites.
```

If keeping it temporarily:

```text
Return 410 Gone with message: "Pending users are now pending invites. Use /invites."
```

## 7. Update Telegram bot invite activation

File:

```text
server/lib/bot.js
```

Current behavior finds a user by `telegram_invite_token` and activates that user. Replace it.

New `/start invite_TOKEN` behavior:

```text
1. Parse /start invite_TOKEN.
2. Start Prisma transaction.
3. Lock PendingInvite row using raw SQL SELECT ... FOR UPDATE.
4. Verify invite exists and invite_expires_at > NOW().
5. Check no existing user has this telegram_id.
6. Check no existing non-deleted user has invite.email.
7. Create User with:
   - name from invite
   - email from invite
   - phone from invite
   - role from invite
   - department from invite
   - designation from invite
   - telegram_id = chatId
   - telegram_verified = true
   - status = active
   - approved_by = invite.invited_by
   - approved_at = now
   - otp_failed_attempts = 0
   - session_version = 0
8. Delete PendingInvite.
9. Return success outcome.
10. Send Telegram success message instructing user to log in with email.
```

Use this response text style:

```text
Welcome Dr. Name! Your SIMS DMS account is now active.
Visit APP_URL and log in with your email: user@sims.edu.in
Your login OTP will be sent here in Telegram.
```

Failure messages:

```text
INVALID_TOKEN_OR_EXPIRED:
This invite link is invalid or has expired. Ask your admin to send a new one.

TELEGRAM_ALREADY_LINKED:
This Telegram account is already linked to a SIMS account. Contact your admin.

EMAIL_ALREADY_EXISTS:
An account with this email already exists. Contact your admin.
```

Always return HTTP 200 to Telegram webhook after processing to avoid webhook retries.

## 8. Add Telegram relink flow for existing users

Do not reuse PendingInvite for existing users.

Update `server/controllers/users.controller.js` or create a separate controller, for example:

```text
server/controllers/telegram-relink.controller.js
```

Current route:

```text
POST /admin/users/:id/reset-login
```

New behavior:

```text
1. Only super_admin can reset login.
2. Find real user.
3. Reject super_admin reset unless intentionally allowed by project policy.
4. Clear telegram_id.
5. Set telegram_verified=false.
6. Set status=telegram_unlinked, or keep pending_telegram if not renaming enum.
7. Increment session_version.
8. Delete/expire unverified OTP sessions.
9. Delete old unused TelegramRelinkToken rows for that user.
10. Create TelegramRelinkToken with 7-day expiry.
11. Return relink_link: https://t.me/BOT_USERNAME?start=relink_TOKEN
12. Audit log RESET_USER_LOGIN.
```

Update `server/lib/bot.js` to also support:

```text
/start relink_TOKEN
```

Relink behavior:

```text
1. Lock TelegramRelinkToken row using SELECT ... FOR UPDATE.
2. Ensure not expired and used_at is null.
3. Check telegram_id is not linked to another user.
4. Update target user:
   - telegram_id = chatId
   - telegram_verified = true
   - status = active
   - session_version increment optional but recommended
5. Mark token used_at = now, or delete token.
6. Send Telegram success message.
```

## 9. Update auth controller for new statuses

File:

```text
server/controllers/auth.controller.js
```

Keep successful login only for:

```text
user.status === 'active'
user.telegram_id exists
user.telegram_verified === true
```

For inactive/deleted/unknown users, continue generic response where appropriate to avoid account enumeration.

For `telegram_unlinked` users, return a clear 403:

```json
{
  "error": true,
  "code": "TELEGRAM_NOT_LINKED",
  "message": "Your Telegram account is not linked. Use the Telegram link sent by your admin."
}
```

If the enum still uses `pending_telegram`, use the same logic for that status.

## 10. Improve OTP rate limiting for shared college Wi-Fi

Current OTP route limiter is strict per IP. College users may share one public IP.

Change `server/routes/auth.routes.js`:

Recommended:

```text
IP limiter: 50 requests / 15 minutes in production
Keep existing per-user OTP cooldown in auth.controller.js: 60 seconds
Keep account lockout after 5 failed OTP attempts
```

Do not remove all rate limits. Just avoid blocking many faculty on the same campus Wi-Fi.

---

# Frontend implementation

## 1. Rename the user creation UX

Current UI says:

```text
Add user
Create account
Telegram ID optional
```

New UI should say:

```text
Invite user
Create invite
Share Telegram activation link
```

## 2. Replace CreateUserDrawer behavior

File:

```text
client/src/components/CreateUserDrawer.jsx
```

Change conceptually to:

```text
InviteUserDrawer
```

Either rename the file or keep the component name temporarily, but the UI text and behavior must be invite-based.

Remove this field completely:

```text
Telegram ID
Optional — leave blank to generate an invite link instead
```

Form fields:

```text
Full name
Email
Role: faculty/admin
Department
Designation
Phone
```

Submit button text:

```text
Create invite
```

Success panel:

```text
Invite created
Share this Telegram activation link with Dr. Name:
[link box]
Copy link
Share WhatsApp
Link expires in 7 days.
The user account will be created only after they tap this link in Telegram.
```

The frontend should expect API response:

```text
response.data.invite
response.data.invite_link
```

not:

```text
response.data.user
```

## 3. Update hooks

File:

```text
client/src/hooks/useUsers.js
```

Keep user hooks for real users:

```text
useUsers
useDeactivateUser
useReactivateUser
useDeleteUser
useResetUserLogin
```

Add invite hooks:

```js
export function useInvites(filters = {}) {
  return useQuery({
    queryKey: ['invites', filters],
    queryFn: async () => {
      const res = await api.get('/invites', { params: filters });
      return res.data;
    },
  });
}

export function useCreateInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/invites', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invites'] });
      qc.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useRegeneratePendingInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.post(`/invites/${id}/regenerate`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invites'] }),
  });
}

export function useCancelInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/invites/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invites'] }),
  });
}
```

Replace `useCreateUser` calls in invite UI with `useCreateInvite`.

## 4. Add Pending Invites UI section

In the admin/users page, add a separate section/tab/card:

```text
Pending Invites
```

Columns/cards:

```text
Name
Email
Role
Department
Expires
Created
Copy invite link / Regenerate / Cancel
```

For security, the list API may not return the raw token. So for existing pending invites, use `Regenerate` when the admin needs a fresh shareable link, or return invite_link only if you intentionally decide it is safe to reconstruct it from token server-side.

Recommended secure behavior:

```text
GET /invites does not expose token or link.
POST /invites/:id/regenerate returns a new link.
```

## 5. Users page should show only real users

Active users are created only after Telegram activation.

The users list should not show pending invites as users.

Recommended user tabs:

```text
Active Users
Inactive Users
Telegram Relink Required
Pending Invites
```

If using a compact mobile layout, use segmented tabs or filter chips.

---

# Tests to add/update

## Backend tests

Add a new test file:

```text
server/tests/invites.test.mjs
```

Test cases:

```text
1. Admin can create faculty invite.
2. Super admin can create admin invite.
3. Admin cannot create admin invite.
4. Duplicate email in users table returns 409.
5. Duplicate email in pending_invites returns 409.
6. Invite creation returns invite_link.
7. Invite list does not expose invite_token.
8. Regenerate invite returns a new invite_link.
9. Cancel invite deletes pending invite.
```

Add/update Telegram bot tests:

```text
1. /start invite_TOKEN with valid invite creates active User.
2. Valid invite consumes/deletes PendingInvite.
3. Expired invite does not create User.
4. Reused invite does not create duplicate User.
5. Telegram ID already linked rejects activation.
6. Existing user email conflict rejects activation.
7. /start relink_TOKEN links existing user to new Telegram ID.
8. Expired/used relink token is rejected.
```

Update existing auth tests:

```text
1. Active user can request OTP.
2. telegram_unlinked/pending_telegram user cannot request OTP and receives TELEGRAM_NOT_LINKED.
3. Inactive/deleted/unknown users still avoid account enumeration where appropriate.
4. Successful OTP verification still sets sims_token and sims_csrf cookies.
5. OTP hash remains bcrypt-based.
```

## Frontend checks

Run:

```bash
npm install
npm run build
```

or, if the project uses separate client/server packages:

```bash
cd client
npm install
npm run build
```

Run server tests:

```bash
cd server
npm install
npm test
```

Use the actual scripts in `package.json` if names differ.

---

# Manual acceptance checklist

After implementation, verify manually:

## Invite creation

```text
1. Login as super_admin.
2. Open Invite User drawer.
3. Create faculty invite.
4. Confirm no User row is created yet.
5. Confirm PendingInvite row exists.
6. Confirm invite link is shown.
```

## Telegram activation

```text
1. Open invite link in Telegram.
2. Bot should confirm account activation.
3. Confirm PendingInvite is removed/consumed.
4. Confirm User row is now created.
5. Confirm User has telegram_id, telegram_verified=true, status=active.
```

## Login

```text
1. Go to SIMS login page.
2. Enter activated user's email.
3. OTP should arrive in Telegram.
4. Enter OTP.
5. User should login and reach correct dashboard.
```

## Duplicate protection

```text
1. Try creating another invite with same email.
2. Should return 409.
3. Try using the same Telegram account for another invite.
4. Should be rejected by bot.
```

## Reset/relink

```text
1. Login as super_admin.
2. Reset a real user's login.
3. Confirm old sessions are revoked.
4. Confirm user cannot request OTP until relinked.
5. Open relink link in Telegram.
6. Confirm same user is reactivated with new telegram_id.
```

---

# Suggested implementation order

Use this exact order to reduce breakage:

```text
1. Add Prisma models and migration.
2. Add invite schemas/controller/routes.
3. Register /invites routes.
4. Replace bot /start invite_TOKEN logic to use PendingInvite.
5. Add /start relink_TOKEN logic.
6. Update reset-login to use TelegramRelinkToken.
7. Stop using POST /users for new account creation.
8. Update frontend hooks.
9. Update CreateUserDrawer into InviteUserDrawer behavior.
10. Add Pending Invites UI section.
11. Update tests.
12. Run formatting, Prisma generate, backend tests, frontend build.
```

---

# One-shot prompt to give Claude Code or Codex

Copy and paste this prompt into Claude Code or Codex from the root of the SIMS DMS repository:

```text
Implement a clean Telegram PendingInvite onboarding redesign for this SIMS DMS project.

Project stack:
- Node.js + Express backend
- Prisma + PostgreSQL
- React + Vite frontend
- Existing auth is Email + Telegram OTP
- JWT is stored in httpOnly cookie
- CSRF protection already exists
- Roles are super_admin, admin, faculty

Important assumption:
There are no old created faculty/admin accounts requiring migration compatibility. Preserve only the bootstrap/super_admin seed account. We can remove the old user-based pending_telegram invite-token flow for new accounts.

Goal:
Change new account creation from "create User first with pending_telegram" to "create PendingInvite first, then create the real User only after Telegram activation". Use the PendingInvite idea from upgraded-main.zip, but do not copy Laravel-specific code or Portal ID login.

Do not change:
- Email + Telegram OTP login
- bcrypt OTP hashing
- httpOnly JWT cookie auth
- CSRF double-submit protection
- session_version revocation
- role-based route guards

Do not add:
- password login
- localStorage tokens
- Portal ID login
- manual Telegram ID entry in the admin create/invite user UI

Backend tasks:
1. Add Prisma PendingInvite model with name, email, phone, role, department, designation, invite_token, invite_expires_at, invited_by, created_at, updated_at. Email and invite_token must be unique.
2. Add Prisma TelegramRelinkToken model for existing-user Telegram reset/relink. Do not use PendingInvite for existing users.
3. Remove or stop using User.telegram_invite_token and User.telegram_invite_expires_at. New users must not be created before Telegram activation.
4. Prefer UserStatus values active, inactive, telegram_unlinked. If renaming enum is too risky, keep pending_telegram only for existing-user relink state, not for new account creation.
5. Create server/schemas/invites.schema.js.
6. Create server/controllers/invites.controller.js with createInvite, listInvites, regenerateInvite, cancelInvite.
7. Create server/routes/invites.routes.js and mount it in server/index.js at /invites.
8. Authorization: super_admin can invite admin/faculty. admin can invite faculty only. No one can invite super_admin from the UI/API.
9. createInvite must check duplicate email in users and pending_invites, generate a 7-day Telegram invite token, require TELEGRAM_BOT_USERNAME, return invite_link, and audit log CREATE_INVITE.
10. listInvites must not expose invite_token.
11. regenerateInvite must rotate the token and return a fresh invite_link.
12. cancelInvite must delete the pending invite and audit log CANCEL_INVITE.
13. Replace bot /start invite_TOKEN logic in server/lib/bot.js: lock PendingInvite row, check expiry, check Telegram ID not already linked, check email not already used, create active User with telegram_id and telegram_verified=true, delete/consume PendingInvite, and send Telegram success message telling the user to login with email.
14. Add bot /start relink_TOKEN logic using TelegramRelinkToken to relink an existing real user.
15. Update POST /admin/users/:id/reset-login so it clears telegram_id, sets telegram_verified=false, changes status to telegram_unlinked or pending_telegram, increments session_version, deletes/invalidates unverified OTP sessions, creates TelegramRelinkToken, and returns relink_link.
16. Stop using POST /users for new account creation. Prefer POST /invites. Remove/deprecate GET /users/pending and /users/:id/regenerate-invite or make them return 410 with clear message.
17. Update auth.controller.js so only active users with telegram_id and telegram_verified can request OTP/login. telegram_unlinked/pending_telegram should return TELEGRAM_NOT_LINKED.
18. Relax OTP per-IP rate limit for shared college Wi-Fi: use about 50 requests per 15 minutes per IP, while keeping the existing 60-second per-user cooldown and 5 failed OTP lockout.

Frontend tasks:
1. Change the Add User/Create Account UX to Invite User/Create Invite.
2. Remove Telegram ID field completely from client/src/components/CreateUserDrawer.jsx or rename it to InviteUserDrawer.jsx.
3. Submit invites to POST /invites, not POST /users.
4. Expect response.data.invite and response.data.invite_link, not response.data.user.
5. After invite creation, show an invite success panel with link, Copy link, Share WhatsApp, and 7-day expiry note.
6. Add invite hooks in client/src/hooks/useUsers.js or a new useInvites.js: useInvites, useCreateInvite, useRegeneratePendingInvite, useCancelInvite.
7. Add Pending Invites section/tab/card in the admin users page, separate from real users.
8. Users page should show only real users. Pending invites should not appear as users.

Tests:
1. Add backend tests for invite creation, duplicate email protection, authorization rules, list hiding invite_token, regenerate, cancel.
2. Add/update bot tests for valid invite activation, expired invite, reused invite, Telegram already linked, email already exists, valid relink, expired relink.
3. Update auth tests for active vs telegram_unlinked users.
4. Ensure OTP remains bcrypt hashed and successful verify sets sims_token and sims_csrf cookies.

Run/check:
- npx prisma format
- npx prisma generate
- server tests
- client build

After implementation, summarize changed files and any commands that failed.
```

---

# Extra code-quality notes

- Use transactions for Telegram activation and relink.
- Use `SELECT ... FOR UPDATE` for PendingInvite and TelegramRelinkToken rows, as Prisma does not provide a simple first-class row-lock API.
- Keep Telegram webhook secret redaction in logs.
- Do not expose raw tokens in logs.
- Do not log OTP values.
- Do not return different responses for unknown/deleted/inactive users in a way that enables easy account enumeration, except for already-known authenticated admin workflows.
- Make invite tokens single-use.
- Keep invite expiry at 7 days unless the project config already defines a better value.
- Prefer clear API error codes: `DUPLICATE_EMAIL`, `FORBIDDEN_ROLE_INVITE`, `INVITE_NOT_FOUND`, `TELEGRAM_ALREADY_LINKED`, `INVITE_EXPIRED`, `TELEGRAM_NOT_LINKED`.
