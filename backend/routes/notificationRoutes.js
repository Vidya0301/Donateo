const express = require('express');
const router = express.Router();
const {
  getMyNotifications,
  markAllAsRead,
  markAsRead,
  clearNotifications
} = require('../controllers/Notificationcontroller');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', getMyNotifications);
router.put('/read-all', markAllAsRead);
router.put('/:id/read', markAsRead);
router.delete('/', clearNotifications);

module.exports = router;