const express = require('express');
const router = express.Router();
const { register, verifyOTP, resendOTP, login, getMe, updateProfile } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// Public routes
router.post('/register', register);         // Step 1: Register → sends OTP
router.post('/verify-otp', verifyOTP);      // Step 2: Verify OTP → activate account
router.post('/resend-otp', resendOTP);      // Resend OTP if expired
router.post('/login', login);               // Login (only verified users)

// Protected routes
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);

module.exports = router;