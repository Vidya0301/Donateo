const express = require('express');
const router = express.Router();
const { register, verifyOTP, resendOTP, login, getMe, updateProfile, getNotificationPreferences, updateNotificationPreferences, getPublicProfile } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// Public routes
router.post('/register', register);         // Step 1: Register → sends OTP
router.post('/verify-otp', verifyOTP);      // Step 2: Verify OTP → activate account
router.post('/resend-otp', resendOTP);      // Resend OTP if expired
router.post('/login', login);               // Login (only verified users)

// Protected routes
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);

// Notification preferences
router.get('/notification-preferences', protect, getNotificationPreferences);
router.put('/notification-preferences', protect, updateNotificationPreferences);

// Public profile (no auth needed)
router.get('/user/:userId/public', getPublicProfile);

module.exports = router;