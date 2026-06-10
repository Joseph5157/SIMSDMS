const express = require('express');
const crypto = require('crypto');
const { handleWebhook } = require('../lib/bot');
const logger = require('../lib/logger');

const router = express.Router();

/**
 * POST /bot/webhook/:secret
 * Receives Telegram webhook updates
 * Must be registered BEFORE global rate limiter
 */
router.post('/webhook/:secret', (req, res, next) => {
  const { secret } = req.params;
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const xTelegramSecret = req.get('X-Telegram-Bot-Api-Secret-Token');

  // Validate secret using timing-safe comparison
  if (!expectedSecret) {
    logger.warn('[BOT] TELEGRAM_WEBHOOK_SECRET not configured');
    return res.status(403).json({ error: 'Forbidden' });
  }

  // Check both URL secret and X-Telegram-Bot-Api-Secret-Token header
  // (Telegram v6.9+ sends the token in the header as well)
  let isValid = false;

  // Length-safe comparison: ensure both buffers are same length before comparing
  if (secret) {
    const secretBuffer = Buffer.from(secret);
    const expectedBuffer = Buffer.from(expectedSecret);
    if (secretBuffer.length === expectedBuffer.length) {
      try {
        isValid = crypto.timingSafeEqual(secretBuffer, expectedBuffer);
      } catch (err) {
        isValid = false;
      }
    }
  }

  // Also check header-based secret if URL secret failed
  if (!isValid && xTelegramSecret) {
    const headerBuffer = Buffer.from(xTelegramSecret);
    const expectedBuffer = Buffer.from(expectedSecret);
    if (headerBuffer.length === expectedBuffer.length) {
      try {
        isValid = crypto.timingSafeEqual(headerBuffer, expectedBuffer);
      } catch (err) {
        isValid = false;
      }
    }
  }

  if (!isValid) {
    logger.warn('[BOT] Invalid webhook secret provided');
    return res.status(403).json({ error: 'Forbidden' });
  }

  // Secret is valid, proceed to webhook handler
  next();
});

// Handle the webhook update
router.post('/webhook/:secret', handleWebhook);

module.exports = router;
