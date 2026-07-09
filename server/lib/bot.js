const crypto = require('crypto');
const prisma = require('./prisma');
const logger = require('./logger');
const { generateTempPassword, hashPassword } = require('./password');
const { logAction } = require('../services/audit.service');

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
        replyText = `✅ Your SIMS DMS account is active!\n\nLogin at: ${appUrl}/login\nEmail: ${result.user.email}\nTemporary password: <code>${result.tempPassword}</code>\n\nYou'll be asked to set a new password on first login.`;
        logger.info(`[TELEGRAM] Account activated: ${result.user.id} (${result.user.email})`);

        // The invite token is already consumed at this point (PendingInvite deleted,
        // User row created) — if this notification never reaches the user, they have
        // no way to recover the temp password themselves. Retry before giving up, and
        // flag the account for Admin follow-up if all retries fail.
        notifyActivationSuccess(chatId, replyText, result.user).catch((err) => {
          logger.error(`[TELEGRAM] Failed to send message to ${chatId}:`, err);
        });

        return res.status(200).json({ ok: true });
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
    } else if (text === '/start') {
      // Handle bare /start (no payload) — provide helpful message to guide user
      const replyText = `Welcome to SIMS DMS! 👋\n\nIf you received an activation link from your Admin, please send the full command they shared with you:\n\n<code>/start invite_xxxxx</code>\n\nIf you don't have an activation link, contact your administrator to send you an invite.`;
      sendTelegramMessage(chatId, replyText).catch((err) => {
        logger.error(`[TELEGRAM] Failed to send /start response to ${chatId}:`, err);
      });
      return res.status(200).json({ ok: true });
    } else if (text === '/myid') {
      // Handle /myid command — reply with the user's Telegram chat ID
      const replyText = `Your Telegram ID is: ${chatId}`;
      sendTelegramMessage(chatId, replyText).catch((err) => {
        logger.error(`[TELEGRAM] Failed to send /myid response to ${chatId}:`, err);
      });
      return res.status(200).json({ ok: true });
    } else if (text === '/resetpassword') {
      // Handle /resetpassword command — reset password for linked user
      const result = await handlePasswordReset(chatId);

      if (result.success) {
        const replyText = `✅ Your password has been reset!\n\nLogin at: ${process.env.APP_URL || 'https://sims-dms.railway.app'}/login\nEmail: ${result.email}\nTemporary password: <code>${result.tempPassword}</code>\n\nYou'll be asked to set a new password on first login.`;
        logger.info(`[TELEGRAM] Password reset: ${result.userId}`);

        // The password is already changed at this point — if this notification
        // never reaches the user, they're locked out of their account with no
        // recovery path until the 1-hour rate limit clears. Retry before giving
        // up, and flag the account for Admin follow-up if all retries fail
        // (same recovery path as invite activation).
        notifyPasswordResetSuccess(chatId, replyText, { id: result.userId, email: result.email }).catch((err) => {
          logger.error(`[TELEGRAM] Failed to send message to ${chatId}:`, err);
        });

        return res.status(200).json({ ok: true });
      }

      let replyText;
      if (result.error === 'NOT_LINKED') {
        replyText = 'No SIMS DMS account linked to this Telegram account. Contact your Admin.';
      } else if (result.error === 'RATE_LIMITED') {
        replyText = `Please wait before requesting another reset (max 1 per hour). Try again in ${result.minutesWait} minute(s).`;
      } else {
        replyText = 'An error occurred. Please try again or contact your admin.';
        logger.warn(`[TELEGRAM] Password reset error: ${result.error}`);
      }

      sendTelegramMessage(chatId, replyText).catch((err) => {
        logger.error(`[TELEGRAM] Failed to send /resetpassword response to ${chatId}:`, err);
      });
      return res.status(200).json({ ok: true });
    } else {
      // Not an invite, relink, /myid, or /resetpassword command — ignore
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
        SELECT id, name, email, phone, role, department, designation, title, invited_by
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

      // Step 4: Generate temporary password for the new user
      const tempPassword = generateTempPassword();
      const passwordHash = await hashPassword(tempPassword);

      // Step 5: Create the real User from the PendingInvite
      const newUser = await tx.user.create({
        data: {
          name: invite.name,
          email: invite.email,
          phone: invite.phone || null,
          role: invite.role,
          department: invite.department || null,
          designation: invite.designation || null,
          title: invite.title || null,
          telegram_id: chatId,
          telegram_verified: true,
          status: 'active',
          password_hash: passwordHash,
          must_change_password: true,
          approved_at: new Date(),
          approved_by: invite.invited_by,
        },
      });

      // Step 6: Delete the PendingInvite (it's been consumed)
      await tx.pendingInvite.delete({ where: { id: invite.id } });

      return {
        success: true,
        user: { id: newUser.id, name: newUser.name, email: newUser.email },
        tempPassword,
      };
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
 * Handle /resetpassword command — reset password for a user
 * Rate-limited to 1 reset per hour
 */
async function handlePasswordReset(chatId) {
  try {
    const telegramId = String(chatId);

    // Step 1: Find user by telegram_id
    const user = await prisma.user.findUnique({
      where: { telegram_id: telegramId },
      select: { id: true, email: true, status: true, deleted_at: true, last_password_reset_at: true },
    });

    if (!user || user.deleted_at || user.status !== 'active') {
      return { success: false, error: 'NOT_LINKED' };
    }

    // Step 2: Rate limit check — max 1 reset per hour
    const now = new Date();
    if (user.last_password_reset_at) {
      const lastResetTime = new Date(user.last_password_reset_at);
      const minutesSince = Math.floor((now - lastResetTime) / (1000 * 60));
      if (minutesSince < 60) {
        const minutesWait = 60 - minutesSince;
        return { success: false, error: 'RATE_LIMITED', minutesWait };
      }
    }

    // Step 3: Generate temporary password and hash it
    const tempPassword = generateTempPassword();
    const passwordHash = await hashPassword(tempPassword);

    // Step 4: Update user with new password and timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password_hash: passwordHash,
        must_change_password: true,
        last_password_reset_at: now,
        session_version: { increment: 1 },
      },
    });

    // Step 5: Log the password reset action
    await logAction({
      actorId: user.id,
      action: 'PASSWORD_RESET_VIA_BOT',
      targetId: user.id,
      targetType: 'user',
      metadata: { reset_method: 'telegram_bot' },
    });

    return { success: true, userId: user.id, email: user.email, tempPassword };
  } catch (error) {
    logger.error('[TELEGRAM] Error in handlePasswordReset:', error);
    return { success: false, error: 'SYSTEM_ERROR' };
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Send a Telegram notification that follows an already-committed, unrecoverable
 * account change (new temp password, etc.) — retrying on failure since there's
 * no way for the user to request it again through the same channel. If every
 * attempt fails, flag the account (activation_notification_failed) so it
 * surfaces on the Admin Users page, and write an audit log entry with the
 * given action name for context on which flow failed.
 */
async function sendWithRetryOrFlag(chatId, text, user, auditAction) {
  const RETRY_DELAYS_MS = [1000, 3000];

  for (let attempt = 0; ; attempt += 1) {
    try {
      await sendTelegramMessage(chatId, text);
      return;
    } catch (err) {
      if (attempt >= RETRY_DELAYS_MS.length) {
        logger.error(
          `[TELEGRAM] Notification permanently failed for user ${user.id} (${user.email}) after ${attempt + 1} attempts:`,
          err
        );

        await prisma.user.update({
          where: { id: user.id },
          data: { activation_notification_failed: true },
        }).catch((updateErr) => {
          logger.error(`[TELEGRAM] Failed to flag user ${user.id} after notification failure:`, updateErr);
        });

        await logAction({
          actorId: user.id,
          action: auditAction,
          targetId: user.id,
          targetType: 'user',
          metadata: { chatId, error: err.message },
        }).catch((auditErr) => {
          logger.error(`[TELEGRAM] Failed to write audit log for notification failure on user ${user.id}:`, auditErr);
        });

        return;
      }

      logger.warn(`[TELEGRAM] Notification attempt ${attempt + 1} failed for user ${user.id}, retrying:`, err.message);
      await sleep(RETRY_DELAYS_MS[attempt]);
    }
  }
}

/**
 * Invite-activation success message — the PendingInvite is already deleted and
 * the User row already created by this point.
 */
async function notifyActivationSuccess(chatId, text, user) {
  return sendWithRetryOrFlag(chatId, text, user, 'ACTIVATION_NOTIFICATION_FAILED');
}

/**
 * /resetpassword success message — the new password is already committed by
 * this point, so a failed send here actively locks the user out (no recovery
 * until the 1-hour rate limit on /resetpassword clears).
 */
async function notifyPasswordResetSuccess(chatId, text, user) {
  return sendWithRetryOrFlag(chatId, text, user, 'PASSWORD_RESET_NOTIFICATION_FAILED');
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
  handleInviteActivation,
  handleRelinkActivation,
  handlePasswordReset,
  sendTelegramMessage,
};
