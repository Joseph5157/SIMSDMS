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

  // Validate secret using timing-safe comparison
  if (!expectedSecret || !secret) {
    logger.warn('[BOT] Missing webhook secret');
    return res.status(403).json({ error: 'Forbidden' });
  }

  const isValid = crypto.timingSafeEqual(
    Buffer.from(secret),
    Buffer.from(expectedSecret)
  );

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
