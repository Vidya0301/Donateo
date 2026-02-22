const express = require('express');
const router = express.Router();
const {
  createChat,
  getChatById,
  sendMessage,
  getMyChats,
  getAllChats,
  updatePickupDetails
} = require('../controllers/chatController');
const { protect, admin } = require('../middleware/auth');

router.post('/', protect, createChat);
router.get('/my', protect, getMyChats);
router.get('/admin/all', protect, admin, getAllChats);
router.get('/:id', protect, getChatById);
router.post('/:id/message', protect, sendMessage);
router.put('/:id/pickup', protect, updatePickupDetails);

module.exports = router;