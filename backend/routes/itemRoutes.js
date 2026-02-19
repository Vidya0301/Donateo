const express = require('express');
const router = express.Router();
const {
  createItem,
  getItems,
  getItemById,
  updateItem,
  deleteItem,
  requestItem,
  donateItem,
  getMyDonations,
  getMyReceivedItems
} = require('../controllers/itemController');
const { protect } = require('../middleware/auth');

// Public routes
router.get('/', getItems);
router.get('/:id', getItemById);

// Protected routes - ALL AUTHENTICATED USERS CAN DO BOTH
router.post('/', protect, createItem);
router.put('/:id', protect, updateItem);
router.delete('/:id', protect, deleteItem);
router.post('/:id/request', protect, requestItem);
router.put('/:id/donate/:userId', protect, donateItem);

// My items routes
router.get('/my/donations', protect, getMyDonations);
router.get('/my/received', protect, getMyReceivedItems);

module.exports = router;