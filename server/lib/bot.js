const crypto = require('crypto');
const prisma = require('./prisma');
const logger = require('./logger');

/**
 * Handle Telegram webhook callback
 * Processes /start invite_TOKEN messages and activates pending accounts
 */
async function handleWebhook(req, res) {
  try {
    const { message, chat } = req.body.message ? req.body : {};

    if (!message || !chat) {
      return res.status(200).json({ ok: true });
    }

    const { text } = message;
    const chatId = String(chat.id);

    // Check if message is /start invite_TOKEN format
    const inviteMatch = text?.match(/^\/start\s+invite_(.+)$/);

    if (!inviteMatch) {
      // Not an invite activation — ignore
      return res.status(200).json({ ok: true });
    }

    const token = inviteMatch[1];

    // Process the activation with row-level locking
    const result = await prisma.$transaction(async (tx) => {
      // Step 1: Find user with valid invite token (row-level lock with SELECT FOR UPDATE)
      const user = await tx.$queryRaw`
        SELECT id, name, email, status, telegram_id
        FROM users
        WHERE telegram_invite_token = ${token}
        AND telegram_invite_expires_at > NOW()
        FOR UPDATE
      `;

      if (!user || user.length === 0) {
        return { success: false, error: 'INVALID_TOKEN' };
      }

      const targetUser = user[0];

      // Step 2: Check if this Telegram ID is already linked to another account
      const existingUser = await tx.$queryRaw`
        SELECT id FROM users
        WHERE telegram_id = ${chatId}
        AND id != ${targetUser.id}
        LIMIT 1
      `;

      if (existingUser && existingUser.length > 0) {
        return { success: false, error: 'ALREADY_LINKED' };
      }

      // Step 3: Update the user atomically
      await tx.user.update({
        where: { id: targetUser.id },
        data: {
          telegram_id: chatId,
          telegram_verified: true,
          status: 'active',
          telegram_invite_token: null,
          telegram_invite_expires_at: null,
        },
      });

      return { success: true, user: targetUser };
    });

    // Step 4: Send response message based on result
    let replyText;

    if (result.success) {
      const appUrl = process.env.APP_URL || 'https://sims-dms.railway.app';
      replyText = `Welcome ${result.user.name}! Your SIMS DMS account is now active. Visit ${appUrl} and login with your email. You'll receive an OTP here in Telegram.`;
      logger.info(`[TELEGRAM] Account activated: ${result.user.id} (${result.user.email})`);
    } else if (result.error === 'ALREADY_LINKED') {
      replyText =
        'This Telegram account is already linked to a SIMS account. Contact your admin.';
      logger.warn(`[TELEGRAM] Duplicate Telegram ID attempted: ${chatId}`);
    } else {
      replyText =
        'This invite link is invalid or has expired. Ask your admin to send a new one.';
      logger.warn(`[TELEGRAM] Invalid/expired token attempted: ${token}`);
    }

    // Send message via Telegram API (async, don't wait)
    sendTelegramMessage(chatId, replyText).catch((err) => {
      logger.error(`[TELEGRAM] Failed to send message to ${chatId}:`, err);
    });

    return res.status(200).json({ ok: true });
  } catch (error) {
    logger.error('[TELEGRAM] Webhook error:', error);
    return res.status(200).json({ ok: true }); // Always return 200 to acknowledge receipt
  }
}

/**
 * Send a message via Telegram Bot API
 */
async function sendTelegramMessage(chatId, text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN not set');
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Telegram API error: ${JSON.stringify(error)}`);
  }

  return await response.json();
}

module.exports = {
  handleWebhook,
  sendTelegramMessage,
};
