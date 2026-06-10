const express = require('express');
const crypto = require('crypto');
const { handleWebhook } = require('../lib/bot');
const logger = require('../lib/logger');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();

function secretsMatch(candidate, expected) {
  if (!candidate || !expected) return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  // Length check must come first — timingSafeEqual throws on mismatched lengths
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * POST /bot/webhook/:secret
 * Accepts either the URL path secret or the official Telegram
 * X-Telegram-Bot-Api-Secret-Token header, both validated against
 * TELEGRAM_WEBHOOK_SECRET.
 */
router.post('/webhook/:secret', (req, res, next) => {
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (!expectedSecret) {
    logger.warn('[BOT] TELEGRAM_WEBHOOK_SECRET is not configured');
    return res.status(403).json({ error: 'Forbidden' });
  }

  const pathSecret = req.params.secret;
  const headerSecret = req.headers['x-telegram-bot-api-secret-token'];

  // Accept if either the path secret or the Telegram header matches
  const valid = secretsMatch(pathSecret, expectedSecret) || secretsMatch(headerSecret, expectedSecret);

  if (!valid) {
    logger.warn('[BOT] Invalid webhook secret');
    return res.status(403).json({ error: 'Forbidden' });
  }

  next();
});

router.post('/webhook/:secret', asyncHandler(handleWebhook));

module.exports = router;
