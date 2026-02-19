const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  updateUserStatus,
  deleteUser,
  getAllItems,
  approveItem,
  removeItem,
  getDashboardStats
} = require('../controllers/adminController');
const { protect, admin } = require('../middleware/auth');

// All routes require admin authentication
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
