const express = require('express');
const router  = express.Router();
const {
  submitMessage, getAllMessages, getUnreadCount,
  markAsRead, replyToMessage, resolveMessage, deleteMessage
} = require('../controllers/supportController');
const { protect, admin } = require('../middleware/auth');

// Public — submit a message (optionally authenticated)
router.post('/', protect, submitMessage);         // logged-in users
router.post('/guest', submitMessage);             // guests (no token required)

// Admin only
router.get('/',               protect, admin, getAllMessages);
router.get('/unread-count',   protect, admin, getUnreadCount);
router.put('/:id/read',       protect, admin, markAsRead);
router.post('/:id/reply',     protect, admin, replyToMessage);
router.put('/:id/resolve',    protect, admin, resolveMessage);
router.delete('/:id',         protect, admin, deleteMessage);

module.exports = router;