# Telegram Invite Flow - Testing Guide

## Overview
The Telegram invite flow allows admins to create user accounts without collecting Telegram IDs upfront. Instead, users receive a time-limited invite link that they tap in Telegram to activate their account.

## Architecture

### Flow Diagram
```
Admin creates user → No Telegram ID provided
                    ↓
         Generate 7-day invite token
                    ↓
    Return invite link to admin
                    ↓
Admin shares link (copy/WhatsApp)
                    ↓
User taps link in Telegram
                    ↓
Bot receives /start invite_TOKEN
                    ↓
Webhook validates token & links account
                    ↓
User account activated (status='active')
```

## Components Implemented

### Backend
1. **server/lib/bot.js** - Telegram webhook handler
   - `handleWebhook(req, res)` - Processes `/start invite_TOKEN` messages
   - Uses Prisma row-level locking (SELECT FOR UPDATE) for atomic transactions
   - Validates token expiry
   - Detects duplicate Telegram linkages
   - Sends confirmation via Telegram API

2. **server/routes/bot.routes.js** - Webhook route registration
   - `POST /bot/webhook/:secret` - Secret validation using timing-safe comparison
   - Must be registered BEFORE global rate limiter

3. **server/controllers/users.controller.js** - User creation with two paths
   - **Path A**: Telegram ID provided → Account immediately active
   - **Path B**: No Telegram ID → Generate token, account pending_telegram
   - Response includes `invite_link` if token was generated

4. **server/controllers/auth.controller.js** - Auth guard
   - Prevents pending_telegram users from requesting OTP
   - Returns 403 with message to tap invite link

### Frontend
1. **client/src/components/CreateUserDrawer.jsx** - Two-state UI
   - **State 1**: Form - Collect user details (Telegram ID optional)
   - **State 2**: Invite Panel - Display link with copy/WhatsApp share buttons
   - Shows "Link expires in 7 days" message

2. **client/src/hooks/useUsers.js** - API integration
   - `useCreateUser()` - Creates user, receives invite_link if applicable
   - `useRegenerateInvite()` - Generates new token for expired links

3. **client/src/pages/admin/UsersPage.jsx** - Handler integration
   - Calls `onSubmit(form, callback)`
   - Shows appropriate toast based on invite_link presence

## Testing Steps

### Phase 1: UI Testing (Local Browser)

#### 1.1 Verify Admin Panel Loads
```
1. Navigate to http://localhost:5173
2. Login as admin
3. Go to Admin → User Management
4. Click "+ Add User" button
5. Verify Vaul bottom-sheet drawer opens smoothly
```

#### 1.2 Test User Creation without Telegram ID
```
1. Fill in the form:
   - Name: "Dr. Priya Sharma"
   - Email: "priya.sharma@sims.edu"
   - Telegram ID: [leave blank]
   - Role: Faculty
   - Department: Pharmacology
   - Designation: Assistant Professor
   - Phone: [optional]

2. Click "Create account"
3. Verify drawer transitions to invite panel:
   ✓ Shows "✅ Account created" message
   ✓ Displays invite link (long string starting with https://t.me/)
   ✓ "Copy link" button is clickable
   ✓ "Share WhatsApp" button is clickable
   ✓ Shows "Link expires in 7 days" message
```

#### 1.3 Test Copy Link Button
```
1. Click "📋 Copy link"
2. Open a text editor
3. Paste (Ctrl+V / Cmd+V)
4. Verify the full invite link was copied
   Expected format: https://t.me/BOTUSERNAME?start=invite_TOKENSTRING
```

#### 1.4 Test WhatsApp Share Button
```
1. Click "💬 Share WhatsApp"
2. Verify WhatsApp Web opens with pre-filled message
3. Message should contain:
   - User's name
   - The invite link
   - Example: "Hi Dr. Priya Sharma, tap this link to activate your SIMS account: https://t.me/..."
```

#### 1.5 Test Form Path (with Telegram ID)
```
1. Open "Add User" again
2. Fill in the same form but also provide a Telegram ID:
   - Example: "123456789" or "@telegramusername"
3. Click "Create account"
4. Verify drawer closes immediately
5. Toast shows: "User created and activated."
6. User is immediately active (no invite link needed)
```

### Phase 2: API Testing (Curl/Postman)

#### 2.1 Create User Without Telegram ID
```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "name": "Dr. Test User",
    "email": "test@sims.edu",
    "telegram_id": "",
    "role": "faculty",
    "department": "Engineering"
  }'
```

**Expected Response:**
```json
{
  "user": {
    "id": "uuid",
    "name": "Dr. Test User",
    "email": "test@sims.edu",
    "status": "pending_telegram",
    "telegram_id": null,
    "telegram_invite_token": "RANDOM_TOKEN",
    "telegram_invite_expires_at": "2026-06-16T..." // 7 days from now
  },
  "invite_link": "https://t.me/BOTUSERNAME?start=invite_RANDOM_TOKEN"
}
```

#### 2.2 Create User With Telegram ID
```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "name": "Dr. Immediate User",
    "email": "immediate@sims.edu",
    "telegram_id": "123456789",
    "role": "admin"
  }'
```

**Expected Response:**
```json
{
  "user": {
    "id": "uuid",
    "name": "Dr. Immediate User",
    "email": "immediate@sims.edu",
    "status": "active",
    "telegram_id": "123456789",
    "telegram_verified": true,
    "telegram_invite_token": null,
    "telegram_invite_expires_at": null
  },
  "invite_link": null
}
```

#### 2.3 Verify Auth Guard for Pending Telegram
```bash
# Try to request OTP as pending_telegram user
curl -X POST http://localhost:3000/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@sims.edu"
  }'
```

**Expected Response:**
```json
{
  "error": true,
  "code": "TELEGRAM_NOT_LINKED",
  "message": "Your account is not yet activated. Tap the invite link your admin sent you."
}
```

### Phase 3: Telegram Webhook Testing

#### 3.1 Register Webhook with Telegram
You need to register the webhook URL with Telegram Bot API:

```bash
curl -X POST "https://api.telegram.org/bot{YOUR_BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://sims-dms.railway.app/bot/webhook/{YOUR_WEBHOOK_SECRET}",
    "allowed_updates": ["message"]
  }'
```

#### 3.2 Simulate Webhook (Local Testing)
```bash
# Simulate a user tapping the invite link and bot sending /start command
INVITE_TOKEN="extracted_from_invite_link"
CHAT_ID="123456789"
SECRET="your_webhook_secret"

curl -X POST "http://localhost:3000/bot/webhook/$SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "message": {
      "text": "/start invite_'$INVITE_TOKEN'",
      "chat": {
        "id": '$CHAT_ID'
      }
    }
  }'
```

**Expected Response:**
```json
{
  "ok": true
}
```

**Check logs:**
```
[TELEGRAM] Account activated: user_id (email@sims.edu)
```

#### 3.3 End-to-End Flow
```
1. Create user via UI without Telegram ID
2. Note the invite token from the link
3. Find a Telegram user (could be yourself)
4. Manually send /start invite_TOKEN to the bot
5. Verify bot responds with:
   "Welcome {name}! Your SIMS DMS account is now active. Visit https://sims-dms.railway.app to log in. Enter your Telegram ID when prompted."
6. Login to the app with the user's email/OTP
7. Verify you can now access the system
```

## Troubleshooting

### Issue: Invite link not showing in UI
- Check browser console for errors
- Verify API returned `invite_link` in response
- Check that `response.invite_link` is not null

### Issue: Webhook returns 403 Forbidden
- Verify the secret in URL matches `TELEGRAM_WEBHOOK_SECRET` env var
- Check that timing-safe comparison is working
- Ensure the path is `/bot/webhook/{secret}` (note: not `/api/bot`)

### Issue: Token validation fails in webhook
- Verify token hasn't expired (7-day window)
- Verify token format matches what was generated
- Check database for the user with that token
- Run: `SELECT * FROM users WHERE telegram_invite_token = 'TOKEN';`

### Issue: "ALREADY_LINKED" error in webhook
- User tried to activate with a Telegram ID that's already linked to another account
- This is intentional to prevent duplicate links
- Tell user to contact admin to resolve

### Issue: Health check still timing out on Railway
- The fix moves the health endpoint before the rate limiter
- If deployments still fail, check Railway's detailed logs
- May indicate a different issue (e.g., database migration, missing env vars)

## Key Files Reference

| File | Purpose |
|------|---------|
| `server/lib/bot.js` | Webhook handler logic |
| `server/routes/bot.routes.js` | Route registration with secret validation |
| `server/controllers/users.controller.js` | User creation with dual paths |
| `server/controllers/auth.controller.js` | Auth guard for pending_telegram |
| `client/src/components/CreateUserDrawer.jsx` | UI with two states |
| `prisma/schema.prisma` | Database schema with new fields |
| `.env.example` | Environment variable documentation |

## Status Summary

✅ **Completed:**
- Backend webhook handler with row-level locking
- Token generation and 7-day expiry
- Auth guard preventing pending_telegram access
- Frontend UI with invite panel
- Copy and WhatsApp share functionality
- Health check fix for Railway deployments

⏳ **Next Steps:**
- Register webhook URL with Telegram Bot API
- Test end-to-end with real Telegram bot
- Monitor production logs for any issues
- Plan for regenerate-invite feature (if needed)

