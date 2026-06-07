const { Router } = require('express');
const authenticate = require('../middleware/authenticate');
const validate = require('../middleware/validate');
const { sendMessageSchema } = require('../schemas/messages.schema');
const ctrl = require('../controllers/messages.controller');

const router = Router();

router.use(authenticate);

// Named routes BEFORE /:id

// GET /messages/inbox — All Auth
router.get('/inbox', ctrl.getInbox);

// GET /messages/sent — All Auth
router.get('/sent', ctrl.getSent);

// POST /messages — All Auth
router.post('/', validate(sendMessageSchema), ctrl.sendMessage);

// GET /messages/:id — All Auth (also auto-marks as read for receiver)
router.get('/:id', ctrl.getMessage);

// PATCH /messages/:id/read — Receiver only
router.patch('/:id/read', ctrl.markAsRead);

// DELETE /messages/:id — All Auth
router.delete('/:id', ctrl.deleteMessage);

module.exports = router;
