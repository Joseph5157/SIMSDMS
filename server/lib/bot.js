const crypto = require('crypto');
const prisma = require('./prisma');
const logger = require('./logger');

/**
 * Handle Telegram webhook callback
 * Processes /start invite_TOKEN (new account activation)
 * and /start relink_TOKEN (existing user Telegram relink)
 */
async function handleWebhook(req, res) {
  try {
    const message = req.body?.message;

    if (!message) {
      return res.status(200).json({ ok: true });
    }

    const chatId = String(message.chat.id);
    const text = message.text;

    // Check if message matches /start invite_TOKEN or /start relink_TOKEN patterns
    const inviteMatch = text?.match(/^\/start\s+invite_(.+)$/);
    const relinkMatch = text?.match(/^\/start\s+relink_(.+)$/);

    if (inviteMatch) {
      // New account activation from PendingInvite
      const token = inviteMatch[1];
      const result = await handleInviteActivation(chatId, token);
      let replyText;

      if (result.success) {
        const appUrl = process.env.APP_URL || 'https://sims-dms.railway.app';
        replyText = `Welcome ${result.user.name}! Your SIMS DMS account is now active.\nVisit ${appUrl} and log in with your email: ${result.user.email}\nYour login OTP will be sent here in Telegram.`;
        logger.info(`[TELEGRAM] Account activated: ${result.user.id} (${result.user.email})`);
      } else if (result.error === 'ALREADY_LINKED') {
        replyText = 'This Telegram account is already linked to a SIMS account. Contact your admin.';
        logger.warn(`[TELEGRAM] Duplicate Telegram ID attempted: ${chatId}`);
      } else if (result.error === 'EMAIL_CONFLICT') {
        replyText = 'An account with this email already exists. Contact your admin.';
        logger.warn(`[TELEGRAM] Email conflict for invite: ${result.invite?.email}`);
      } else {
        replyText = 'This invite link is invalid or has expired. Ask your admin to send a new one.';
        logger.warn(`[TELEGRAM] Invalid/expired invite token attempted: ${token}`);
      }

      // Send message via Telegram API (async, don't wait)
      sendTelegramMessage(chatId, replyText).catch((err) => {
        logger.error(`[TELEGRAM] Failed to send message to ${chatId}:`, err);
      });

      return res.status(200).json({ ok: true });
    } else if (relinkMatch) {
      // Existing user Telegram relink
      const token = relinkMatch[1];
      const result = await handleRelinkActivation(chatId, token);
      let replyText;

      if (result.success) {
        replyText = `Welcome back, ${result.user.name}! Your SIMS DMS account has been relinked to this Telegram. You can now log in.`;
        logger.info(`[TELEGRAM] Account relinked: ${result.user.id}`);
      } else if (result.error === 'ALREADY_LINKED') {
        replyText = 'This Telegram account is already linked to a SIMS account. Contact your admin.';
        logger.warn(`[TELEGRAM] Duplicate Telegram ID in relink: ${chatId}`);
      } else {
        replyText = 'This relink link is invalid, has expired, or has already been used. Ask your admin to generate a new one.';
        logger.warn(`[TELEGRAM] Invalid/expired/used relink token attempted: ${token}`);
      }

      // Send message via Telegram API (async, don't wait)
      sendTelegramMessage(chatId, replyText).catch((err) => {
        logger.error(`[TELEGRAM] Failed to send message to ${chatId}:`, err);
      });

      return res.status(200).json({ ok: true });
    } else if (text === '/myid') {
      // Handle /myid command — reply with the user's Telegram chat ID
      const replyText = `Your Telegram ID is: ${chatId}`;
      sendTelegramMessage(chatId, replyText).catch((err) => {
        logger.error(`[TELEGRAM] Failed to send /myid response to ${chatId}:`, err);
      });
      return res.status(200).json({ ok: true });
    } else {
      // Not an invite, relink, or /myid command — ignore
      return res.status(200).json({ ok: true });
    }
  } catch (error) {
    logger.error('[TELEGRAM] Webhook error:', error);
    return res.status(200).json({ ok: true }); // Always return 200 to acknowledge receipt
  }
}

/**
 * Handle /start invite_TOKEN activation from PendingInvite
 * Creates a new real User and deletes the PendingInvite
 */
async function handleInviteActivation(chatId, token) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Step 1: Find and lock the PendingInvite row
      // Raw SQL used here because Prisma does not support FOR UPDATE natively — this is
      // the sole constitution exception for non-report raw SQL in this file.
      const invites = await tx.$queryRaw`
        SELECT id, name, email, phone, role, department, designation, invited_by
        FROM pending_invites
        WHERE invite_token = ${token}
        AND invite_expires_at > NOW()
        FOR UPDATE
      `;

      if (!invites || invites.length === 0) {
        return { success: false, error: 'INVALID_TOKEN' };
      }

      const invite = invites[0];

      // Step 2: Check if this Telegram ID is already linked to another user
      const existingUser = await tx.user.findFirst({
        where: { telegram_id: chatId },
        select: { id: true },
      });

      if (existingUser) {
        return { success: false, error: 'ALREADY_LINKED', invite };
      }

      // Step 3: Check if an active user with this email already exists (edge case)
      const emailConflict = await tx.user.findFirst({
        where: { email: invite.email, deleted_at: null },
        select: { id: true },
      });

      if (emailConflict) {
        return { success: false, error: 'EMAIL_CONFLICT', invite };
      }

      // Step 4: Create the real User from the PendingInvite
      const newUser = await tx.user.create({
        data: {
          name: invite.name,
          email: invite.email,
          phone: invite.phone || null,
          role: invite.role,
          department: invite.department || null,
          designation: invite.designation || null,
          telegram_id: chatId,
          telegram_verified: true,
          status: 'active',
          approved_at: new Date(),
          approved_by: invite.invited_by,
        },
      });

      // Step 5: Delete the PendingInvite (it's been consumed)
      await tx.pendingInvite.delete({ where: { id: invite.id } });

      return { success: true, user: { id: newUser.id, name: newUser.name, email: newUser.email } };
    });

    return result;
  } catch (error) {
    logger.error('[TELEGRAM] Error in handleInviteActivation:', error);
    return { success: false, error: 'SYSTEM_ERROR' };
  }
}

/**
 * Handle /start relink_TOKEN for existing users
 * Updates user's telegram_id and marks the relink token as used
 */
async function handleRelinkActivation(chatId, token) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Step 1: Find and lock the TelegramRelinkToken row
      const tokens = await tx.$queryRaw`
        SELECT id, user_id, used_at
        FROM telegram_relink_tokens
        WHERE token = ${token}
        AND expires_at > NOW()
        AND used_at IS NULL
        FOR UPDATE
      `;

      if (!tokens || tokens.length === 0) {
        return { success: false, error: 'INVALID_TOKEN' };
      }

      const relinkToken = tokens[0];

      // Step 2: Check if chatId is not already linked to a different user
      const conflict = await tx.user.findFirst({
        where: { telegram_id: chatId, id: { not: relinkToken.user_id } },
        select: { id: true },
      });

      if (conflict) {
        return { success: false, error: 'ALREADY_LINKED' };
      }

      // Step 3: Mark token as used
      await tx.telegramRelinkToken.update({
        where: { id: relinkToken.id },
        data: { used_at: new Date() },
      });

      // Step 4: Update user with new telegram_id and set status to active
      const updated = await tx.user.update({
        where: { id: relinkToken.user_id },
        data: {
          telegram_id: chatId,
          telegram_verified: true,
          status: 'active',
        },
        select: { id: true, name: true, email: true },
      });

      return { success: true, user: updated };
    });

    return result;
  } catch (error) {
    logger.error('[TELEGRAM] Error in handleRelinkActivation:', error);
    return { success: false, error: 'SYSTEM_ERROR' };
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
