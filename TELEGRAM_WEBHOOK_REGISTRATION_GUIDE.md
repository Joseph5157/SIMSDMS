# Telegram Webhook Registration Guide

## Overview
This guide walks you through registering your webhook URL with the Telegram Bot API so that when users tap the invite link, Telegram automatically sends messages to your server.

---

## Prerequisites

You need:
1. ✅ A Telegram Bot created via BotFather
2. ✅ Bot token (from BotFather)
3. ✅ Server running and accessible from the internet
4. ✅ Webhook secret configured

---

## Step 1: Get Your Bot Token

### 1.1 Open Telegram and Search for BotFather
- Open Telegram app (or web.telegram.org)
- Search for **@BotFather**
- Start the conversation

### 1.2 Create or Find Your Bot
```
/newbot  — Create a new bot
/mybots  — List your existing bots
```

If creating new:
- BotFather asks for bot name (e.g., "SIMS DMS Bot")
- BotFather asks for username (e.g., "sims_dms_bot" - must be unique and end with "bot")

### 1.3 Copy the Token
BotFather gives you a message like:
```
Done! Congratulations on your new bot. 
You will find it at t.me/sims_dms_bot. 
You can now add a description, about section and profile picture for your bot, see /help for a list of commands.

Use this token to access the HTTP API:
1234567890:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefg

Keep your token secure and store it safely!
```

**Copy the long token** (starts with numbers, followed by `:`, then letters and symbols)

---

## Step 2: Generate Your Webhook Secret

The webhook secret is a random string that prevents unauthorized access to your webhook.

### Option A: Generate Using Node.js (Recommended)
```bash
# From your project directory
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Output example:
```
a3f7e2c9b1d4f8e3a5c6b9d2e1f4a7b8c3d5e6f7a8b9c0d1e2f3a4b5c6d7e8
```

### Option B: Generate Using OpenSSL
```bash
openssl rand -hex 32
```

### Option C: Generate Using Python
```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

**Copy this secret** — you'll need it in the next steps

---

## Step 3: Add Webhook Secret to .env File

### 3.1 Open or Create `.env` File
```bash
# Navigate to project root
cd /path/to/sims-disclipne

# Open .env (or create if doesn't exist)
nano .env
# or use your text editor
```

### 3.2 Add the Secret
```env
# Telegram Bot
TELEGRAM_BOT_TOKEN=1234567890:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefg
TELEGRAM_BOT_USERNAME=sims_dms_bot
TELEGRAM_WEBHOOK_SECRET=a3f7e2c9b1d4f8e3a5c6b9d2e1f4a7b8c3d5e6f7a8b9c0d1e2f3a4b5c6d7e8
```

### 3.3 Save and Restart Server
```bash
# If using dev server, restart it
# Kill current process: Ctrl+C
# Restart: npm run dev
```

---

## Step 4: Prepare Your Webhook URL

Your webhook URL format:
```
https://{DOMAIN}/bot/webhook/{SECRET}
```

### For Production (Railway)
```
https://sims-dms.railway.app/bot/webhook/a3f7e2c9b1d4f8e3a5c6b9d2e1f4a7b8c3d5e6f7a8b9c0d1e2f3a4b5c6d7e8
```

### For Local Testing
```
https://localhost:3000/bot/webhook/your-secret
# OR use ngrok for public URL (see troubleshooting)
```

**Important:** 
- URL must be HTTPS (not HTTP)
- Domain must be accessible from the internet
- Port must be accessible to Telegram's servers
- Path must include `/bot/webhook/` (exact path)

---

## Step 5: Register Webhook with Telegram

### 5.1 Using Curl (Terminal/Command Prompt)

**Replace these values:**
- `{BOT_TOKEN}` — Your token from BotFather
- `{WEBHOOK_URL}` — Your full webhook URL (with secret)

```bash
curl -X POST "https://api.telegram.org/bot{BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{
    \"url\": \"{WEBHOOK_URL}\",
    \"allowed_updates\": [\"message\"]
  }"
```

**Example (with real values):**
```bash
curl -X POST "https://api.telegram.org/bot1234567890:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefg/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{
    \"url\": \"https://sims-dms.railway.app/bot/webhook/a3f7e2c9b1d4f8e3a5c6b9d2e1f4a7b8c3d5e6f7a8b9c0d1e2f3a4b5c6d7e8\",
    \"allowed_updates\": [\"message\"]
  }"
```

### 5.2 Expected Response (Success)
```json
{
  "ok": true,
  "result": true,
  "description": "Webhook was set"
}
```

### 5.3 Expected Response (Error)
```json
{
  "ok": false,
  "error_code": 400,
  "description": "Bad Request: URL must be HTTPS"
}
```

---

## Step 6: Verify Webhook Registration

### 6.1 Check Webhook Status
```bash
curl -X GET "https://api.telegram.org/bot{BOT_TOKEN}/getWebhookInfo" \
  -H "Content-Type: application/json"
```

**Example:**
```bash
curl -X GET "https://api.telegram.org/bot1234567890:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefg/getWebhookInfo"
```

### 6.2 Successful Response
```json
{
  "ok": true,
  "result": {
    "url": "https://sims-dms.railway.app/bot/webhook/a3f7e2c9b1d4f8e3a5c6b9d2e1f4a7b8c3d5e6f7a8b9c0d1e2f3a4b5c6d7e8",
    "has_custom_certificate": false,
    "pending_update_count": 0,
    "ip_address": "123.45.67.89",
    "last_error_date": 0,
    "max_connections": 40,
    "allowed_updates": ["message"]
  }
}
```

Key fields:
- `url` — Your registered webhook URL
- `pending_update_count` — Number of updates waiting to be processed (should be 0)
- `last_error_date` — 0 = no errors, or timestamp of last error

### 6.3 If There Are Errors
```json
{
  "ok": true,
  "result": {
    "url": "https://...",
    "has_custom_certificate": false,
    "pending_update_count": 0,
    "ip_address": "123.45.67.89",
    "last_error_date": 1717896543,
    "last_error_message": "Connection timeout",
    "max_connections": 40,
    "allowed_updates": ["message"]
  }
}
```

See **Troubleshooting** section below.

---

## Step 7: Test the Webhook

### 7.1 Get Your Bot's Username
From the BotFather message, you have: `t.me/sims_dms_bot`
The username is: `sims_dms_bot`

### 7.2 Test in Telegram
1. Open Telegram
2. Find your bot: `t.me/sims_dms_bot`
3. Start the bot: `/start`

### 7.3 Send Test Command
```
/start test_invite_abc123xyz
```

### 7.4 Check Server Logs
```bash
# Terminal running the server should show:
[TELEGRAM] Webhook error: ...
# or
[TELEGRAM] Account activated: user_id (email@example.com)
```

---

## Step 8: Test with Real Invite Link

### 8.1 Create a Test User via Admin UI
1. Open http://localhost:5173 (or production URL)
2. Login as admin
3. Go to **Admin → User Management**
4. Click **+ Add User**
5. Fill in:
   - Name: "Test User"
   - Email: "test@sims.edu"
   - Telegram ID: **[leave blank]**
   - Role: Faculty
6. Click **Create account**
7. Copy the generated invite link

### 8.2 Share with Test User
The link looks like:
```
https://t.me/sims_dms_bot?start=invite_abc123xyz789
```

Send this to a test Telegram user (or yourself)

### 8.3 User Taps Link
- Open link in Telegram
- Bot chat opens with `/start invite_abc123xyz789` command
- Bot should respond with:
  ```
  Welcome Test User! Your SIMS DMS account is now active. 
  Visit https://sims-dms.railway.app to log in. 
  Enter your Telegram ID when prompted.
  ```

### 8.4 Verify Account Activated
```bash
# Check database
psql $DATABASE_URL -c "SELECT id, name, email, status, telegram_id FROM users WHERE email='test@sims.edu';"
```

Expected output:
```
                  id                  |   name    |     email     |  status  | telegram_id
--------------------------------------+-----------+---------------+----------+-------------
 a1b2c3d4-e5f6-4g7h-8i9j-0k1l2m3n4o5p | Test User | test@sims.edu | active   | 123456789
```

---

## Troubleshooting

### Issue: "Bad Request: URL must be HTTPS"
**Problem:** You used `http://` instead of `https://`

**Solution:** 
- Production: Always use `https://sims-dms.railway.app`
- Local: Use ngrok (see below)

### Issue: "Webhook connection timeout"
**Problem:** Telegram can't reach your server

**Solutions:**
1. Verify domain is correct (typos?)
2. Check server is running: `curl https://sims-dms.railway.app/health`
3. Check firewall isn't blocking port 443 (HTTPS)
4. For local: Use ngrok to expose local server

### Issue: "Bad Request: CERTIFICATE_VERIFY_FAILED"
**Problem:** SSL certificate issues

**Solution:**
- Railway automatically provides valid SSL certificates
- Make sure you're using the correct Railway domain
- Don't use self-signed certificates in production

### Issue: "Webhook error: Connection refused"
**Problem:** The webhook endpoint doesn't exist

**Solutions:**
1. Verify path is exactly: `/bot/webhook/{secret}`
2. Check the server has the bot.routes properly loaded
3. Check server logs for the /bot route being registered

### Issue: "The project is not accessible"
**Problem:** Railway deployment is down

**Solution:**
1. Check Railway dashboard: https://railway.app
2. Check service status
3. Check deployment logs
4. Verify the latest code was deployed

### Local Testing: Use Ngrok

If testing locally before deployment:

```bash
# Install ngrok
# https://ngrok.com/download

# Start ngrok tunnel
ngrok http 3000

# Output:
# Forwarding: https://abc123def456.ngrok.io -> http://localhost:3000
# Copy the HTTPS URL
```

Then register webhook with:
```bash
curl -X POST "https://api.telegram.org/bot{TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{
    \"url\": \"https://abc123def456.ngrok.io/bot/webhook/{SECRET}\",
    \"allowed_updates\": [\"message\"]
  }"
```

---

## Complete Registration Script

Save as `register-webhook.sh`:

```bash
#!/bin/bash

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}Telegram Webhook Registration${NC}\n"

# Get inputs
read -p "Enter your Bot Token: " BOT_TOKEN
read -p "Enter your Webhook Secret: " WEBHOOK_SECRET
read -p "Enter your Domain (e.g., sims-dms.railway.app): " DOMAIN

WEBHOOK_URL="https://${DOMAIN}/bot/webhook/${WEBHOOK_SECRET}"

echo -e "\n${BLUE}Configuration:${NC}"
echo "  Bot Token: ${BOT_TOKEN:0:20}..."
echo "  Webhook Secret: ${WEBHOOK_SECRET:0:20}..."
echo "  Webhook URL: ${WEBHOOK_URL}"

read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  exit 1
fi

# Register webhook
echo -e "\n${BLUE}Registering webhook...${NC}"
RESPONSE=$(curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{
    \"url\": \"${WEBHOOK_URL}\",
    \"allowed_updates\": [\"message\"]
  }")

echo "Response: $RESPONSE"

# Check response
if echo "$RESPONSE" | grep -q '"ok":true'; then
  echo -e "\n${GREEN}✓ Webhook registered successfully!${NC}"
else
  echo -e "\n${RED}✗ Registration failed${NC}"
  exit 1
fi

# Get webhook info
echo -e "\n${BLUE}Checking webhook status...${NC}"
curl -s -X GET "https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo" | jq .

echo -e "\n${GREEN}Done!${NC}"
```

Run it:
```bash
chmod +x register-webhook.sh
./register-webhook.sh
```

---

## Quick Checklist

Before starting:
- [ ] Bot created via @BotFather
- [ ] Bot token copied
- [ ] Webhook secret generated
- [ ] `.env` file updated with both values
- [ ] Server restarted after .env change

During registration:
- [ ] Webhook URL is HTTPS
- [ ] Webhook URL includes the secret at the end
- [ ] Curl command executed successfully
- [ ] Response includes `"ok":true`

After registration:
- [ ] `getWebhookInfo` shows correct URL
- [ ] No recent errors in webhook info
- [ ] Bot responds to test message in Telegram
- [ ] Server logs show webhook hits

---

## Example: Complete Flow

### Setup
```bash
# 1. Get token from BotFather
BOT_TOKEN="1234567890:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefg"

# 2. Generate secret
WEBHOOK_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
echo $WEBHOOK_SECRET
# Output: a3f7e2c9b1d4f8e3a5c6b9d2e1f4a7b8c3d5e6f7a8b9c0d1e2f3a4b5c6d7e8

# 3. Add to .env
echo "TELEGRAM_BOT_TOKEN=$BOT_TOKEN" >> .env
echo "TELEGRAM_WEBHOOK_SECRET=$WEBHOOK_SECRET" >> .env
```

### Registration
```bash
# 4. Register webhook
curl -X POST "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{
    \"url\": \"https://sims-dms.railway.app/bot/webhook/${WEBHOOK_SECRET}\",
    \"allowed_updates\": [\"message\"]
  }"

# Expected: {"ok":true,"result":true,"description":"Webhook was set"}
```

### Verification
```bash
# 5. Check status
curl -X GET "https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo"

# 6. Create test user and tap invite link in Telegram
# 7. Check server logs for activation
```

---

## Support

If you hit issues:

1. **Check server logs:**
   ```bash
   # Terminal where server is running
   # Look for: [TELEGRAM] messages
   ```

2. **Test endpoint directly:**
   ```bash
   curl -X POST http://localhost:3000/bot/webhook/test-secret \
     -H "Content-Type: application/json" \
     -d '{"message":{"text":"/start invite_test","chat":{"id":123}}}'
   ```

3. **Check environment:**
   ```bash
   # Verify .env is loaded
   echo $TELEGRAM_WEBHOOK_SECRET
   # Should print the secret
   ```

4. **Check Railway:**
   - Dashboard: https://railway.app
   - Service → Logs
   - Look for errors or "SIMS DMS server running"

---

Done! Your webhook is now registered and ready to activate Telegram users! 🎉
