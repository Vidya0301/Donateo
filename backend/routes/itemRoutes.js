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
  markAsDonated,
  markAsReceived,
  getMyDonations,
  getMyReceivedItems,
  toggleWishlist,
  getWishlist,
  geocodeItems,
  denyRequest
} = require('../controllers/itemController');
const { protect, optionalProtect } = require('../middleware/auth');

// Public routes
router.get('/', optionalProtect, getItems);
router.get('/:id', getItemById);

// Protected routes
router.post('/', protect, createItem);
router.put('/:id', protect, updateItem);
router.delete('/:id', protect, deleteItem);
router.post('/:id/request', protect, requestItem);
router.put('/:id/donate/:userId', protect, donateItem);

// Confirmation routes
router.put('/:id/mark-donated',   protect, markAsDonated);
router.put('/:id/mark-received',  protect, markAsReceived);

// My items routes
router.get('/my/donations',  protect, getMyDonations);
router.get('/my/received',   protect, getMyReceivedItems);

// Deny request route
router.delete('/:id/request/:userId', protect, denyRequest);

// Admin geocode route
router.post('/admin/geocode', protect, geocodeItems);

// Wishlist routes
router.post('/my/wishlist/:id', protect, toggleWishlist);
router.get('/my/wishlist',      protect, getWishlist);

module.exports = router;