# Implementation Plan — Telegram Invite Link Flow
**Feature**: Account activation via Telegram bot invite link
**Branch**: `002-telegram-invite-flow`
**Depends on**: `001-auth-user-accounts` fully merged

---

## What We're Building

When admin creates a user **without** a Telegram ID, the system automatically
generates a one-time invite link (`https://t.me/SIMSDMSBOT?start=invite_TOKEN`).
Admin copies and shares this with the faculty member. Faculty taps it in Telegram,
the bot activates their account.

If admin already knows the Telegram ID, they type it directly and the account
activates immediately as today — no change to that path.

---

## Files to Change — 9 Total

```
prisma/schema.prisma                        ← add 2 fields + new enum value
server/lib/bot.js                           ← NEW — webhook handler
server/routes/bot.routes.js                 ← NEW — POST /bot/webhook/:secret
server/controllers/users.controller.js      ← createUser + new regenerateInvite
server/routes/users.routes.js               ← add regenerate-invite route
server/controllers/auth.controller.js       ← requestOtp guard for pending_telegram
server/index.js                             ← register /bot route
client/src/components/CreateUserDrawer.jsx  ← show invite link panel after creation
client/src/hooks/useUsers.js                ← add useRegenerateInvite mutation
```

---

## Step 1 — Schema Migration

**Migration name**: `add_telegram_invite_flow`

### Two new fields on the `users` table

```prisma
telegram_invite_token      String?   @unique @db.VarChar(100)
telegram_invite_expires_at DateTime?
```

### `UserStatus` enum — add one value

```prisma
enum UserStatus {
  pending_telegram   // NEW: account exists, Telegram not yet linked, cannot log in
  pending
  active
  inactive
}
```

> No existing data is affected. All current users are `active` or `inactive`.
> The new value is only assigned to newly created accounts going forward.

---

## Step 2 — `server/lib/bot.js` (new file)

Handles the Telegram webhook. Telegram calls this endpoint when a user
messages the bot.

### Responsibilities

- Validate the webhook secret from the URL parameter
- Extract `chat_id` and `text` from the Telegram update payload
- If text matches `/start invite_TOKEN` → run the activation transaction
- Send a confirmation or error message back via `telegram.sendMessage`

### Activation Transaction (`prisma.$transaction`)

Run these steps atomically — if any step fails, nothing commits:

1. Find user where `telegram_invite_token = TOKEN` AND `telegram_invite_expires_at > NOW()`
2. Check no other user already has `telegram_id = chatId` (duplicate guard)
3. Update the user:
   - `telegram_id = chatId`
   - `telegram_verified = true`
   - `status = 'active'`
   - `telegram_invite_token = null`
   - `telegram_invite_expires_at = null`

### Bot Reply Messages

| Outcome | Message to send |
|---|---|
| Token not found or expired | "This invite link is invalid or has expired. Ask your admin to send a new one." |
| Telegram already linked to another account | "This Telegram account is already linked to a SIMS account. Contact your admin." |
| Success | "Welcome {name}! Your SIMS DMS account is now active. Visit {APP_URL} to log in. Enter your Telegram ID when prompted." |

### What This File Does NOT Handle

No other bot commands (`/login`, `/help`, etc.) — those are future scope.
This file handles only the `/start invite_TOKEN` activation path.

---

## Step 3 — `server/routes/bot.routes.js` (new file)

Single public route, no JWT middleware:

```
POST /bot/webhook/:secret
```

The `:secret` param is compared against `TELEGRAM_WEBHOOK_SECRET` env var
using `crypto.timingSafeEqual`. If it does not match → `403`, no further processing.

Register in `server/index.js`:

```js
app.use('/bot', botRoutes);
```

> Register this route **before** the global rate limiter, or give it its own
> exemption. Telegram's servers hit this endpoint on every user message and
> must not be rate-limited.

---

## Step 4 — `server/controllers/users.controller.js`

### Changes to `createUser`

**Current behaviour**: requires `telegram_id`, always sets `status = 'active'`.

**New behaviour — two paths based on whether `telegram_id` was provided:**

**Path A — Telegram ID provided by admin:**
- Behaviour identical to today
- `status = 'active'`
- No invite token generated
- Response: `{ user: {...}, invite_link: null }`

**Path B — Telegram ID left blank:**
- Generate token: `crypto.randomBytes(32).toString('hex')`
- Set `status = 'pending_telegram'`
- Set `telegram_invite_token = token`
- Set `telegram_invite_expires_at = now + 7 days`
- Build invite link: `https://t.me/${process.env.TELEGRAM_BOT_USERNAME}?start=invite_${token}`
- Response: `{ user: {...}, invite_link: "https://t.me/..." }`

### New Function — `regenerateInvite`

Called when the 7-day window expires and admin needs to resend the link.

- Find user by `req.params.id`
- If `status !== 'pending_telegram'` → `400 ALREADY_ACTIVE`: "This user's Telegram is already linked."
- Generate a fresh token, reset `telegram_invite_expires_at = now + 7 days`
- Return `{ invite_link: "https://t.me/..." }`

---

## Step 5 — `server/routes/users.routes.js`

Add one new route:

```js
router.post('/:id/regenerate-invite', authorize('admin', 'super_admin'), ctrl.regenerateInvite);
```

---

## Step 6 — `server/controllers/auth.controller.js`

### Change to `requestOtp`

Add one guard after the existing `USER_NOT_FOUND` check, before the `ACCOUNT_LOCKED` check:

```js
if (user.status === 'pending_telegram') {
  return res.status(403).json({
    error: true,
    code: 'TELEGRAM_NOT_LINKED',
    message: 'Your account is not yet activated. Tap the invite link your admin sent you.',
  });
}
```

No other changes to the auth flow.

---

## Step 7 — `client/src/components/CreateUserDrawer.jsx`

### Change to post-submit behaviour

**If response `invite_link` is null** (Telegram ID was provided):
- Close drawer immediately — behaviour unchanged from today

**If response `invite_link` is non-null** (invite was generated):
- Stay open, replace form content with an invite link panel:

```
┌──────────────────────────────────────┐
│  ✅ Account created                  │
│                                      │
│  Share this link with {name}:        │
│                                      │
│  ┌────────────────────────────────┐  │
│  │ https://t.me/SIMSDMSBOT?sta…   │  │
│  └────────────────────────────────┘  │
│                                      │
│  [📋 Copy link]  [💬 Share WhatsApp] │
│                                      │
│  Link expires in 7 days.             │
│  Status changes to Active once       │
│  they tap it.                        │
│                                      │
│               [Done]                 │
└──────────────────────────────────────┘
```

**WhatsApp share URL format:**
```
https://wa.me/?text=Hi%20{name}%2C%20tap%20this%20link%20to%20activate%20your%20SIMS%20account%3A%20{encodedInviteLink}
```

### Change to the Telegram ID field label

Add helper text below the field:

> "Optional — leave blank to generate an invite link instead"

---

## Step 8 — `client/src/hooks/useUsers.js`

Add one new mutation at the bottom of the file:

```js
export function useRegenerateInvite() {
  return useMutation({
    mutationFn: (id) => api.post(`/users/${id}/regenerate-invite`),
  });
}
```

The `UsersPage` row action menu can call this for users with
`status = 'pending_telegram'`, displaying the new link in a small modal.

---

## Step 9 — Environment Variables

### `.env.example` — add one new variable

`TELEGRAM_BOT_USERNAME` already exists. Add:

```
# Telegram Webhook
# Set this to a long random string — used to authenticate Telegram's webhook calls
TELEGRAM_WEBHOOK_SECRET=replace_with_long_random_string
```

---

## One-Time Telegram Setup (Required Before Testing)

Register your webhook URL with Telegram once after deployment:

```
POST https://api.telegram.org/bot{YOUR_BOT_TOKEN}/setWebhook
Content-Type: application/json

{
  "url": "https://yourdomain.com/bot/webhook/YOUR_WEBHOOK_SECRET"
}
```

**For local development**: use ngrok or a Railway preview URL to get a public
HTTPS URL, then register that. Re-register if the URL changes.

---

## New Endpoints Summary

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/bot/webhook/:secret` | Public (secret-gated) | Telegram webhook — handles invite activation |
| POST | `/users/:id/regenerate-invite` | Admin, Super Admin | Regenerate an expired invite link |

Two new endpoints. Everything else is a modification to existing files.

---

## What Does NOT Change

- OTP login flow — identical
- JWT and cookie handling — untouched
- All other controllers, routes, and frontend pages
- Prisma schema for all tables other than `users`
- The `safeUser` helper — `status` is already included

---

## Acceptance Criteria

1. Admin creates a user with no Telegram ID → response contains a valid invite link
2. Admin creates a user with a Telegram ID → account is immediately active, no invite link
3. Faculty taps the invite link → bot replies with welcome message, account status becomes `active`
4. Same invite link tapped twice → second tap gets "invalid or expired" message, account unchanged
5. Expired token tapped → "invalid or expired" message
6. Admin clicks Regenerate on a `pending_telegram` user → new link returned, old token invalid
7. Calling `POST /auth/request-otp` for a `pending_telegram` user → `403 TELEGRAM_NOT_LINKED`
8. Telegram ID already in use on another account → bot sends "already linked" message, no changes made

---

*Plan version: 1.0 — Created: June 2026*
*Implements: Telegram invite link account activation*
*Constitution version: 2.6*
