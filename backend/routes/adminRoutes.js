const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  updateUserStatus,
  deleteUser,
  getAllItems,
  approveItem,
  removeItem,
  getDashboardStats,
  getPublicStats
} = require('../controllers/adminController');
const { protect, admin } = require('../middleware/auth');

// ✅ Public route — no auth required
router.get('/public-stats', getPublicStats);

// All routes below require admin authentication
router.use(protect);
router.use(admin);

// User management
router.get('/users', getAllUsers);
router.put('/users/:id', updateUserStatus);
router.delete('/users/:id', deleteUser);

// Item management
router.get('/items', getAllItems);
router.put('/items/:id/approve', approveItem);
router.delete('/items/:id', removeItem);

// Dashboard stats
router.get('/stats', getDashboardStats);

module.exports = router;